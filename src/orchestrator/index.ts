import type {
  AnalysisOutput,
  FinalSynthesisOutput,
  OrchestrationConfig,
  ResumedStep,
  RunBudget,
  RunResult,
  StepBudget,
  TimelineEntry,
  WorkflowCheckpoint,
  WorkflowProgress,
  WorkflowStep,
} from "@/contracts/workflow";
import type { ChatMessage, GenerationRequest, GenerationResult, ModelSpec, Usage } from "@/contracts/gateway";
import type { AnalystDossier, ResearchSource } from "@/contracts/research";
import { estimateCost, tokensToUsd } from "@/gateway/cost";
import { friendlyMessage } from "@/gateway/errors";
import { parseConsensusReport } from "@/lib/consensus-report";
import { sanitizeFinalResponse } from "@/lib/sanitize";
import { runAnalystAgent } from "@/research/analyst-agent";
import { DEFAULT_RESEARCH_POLICY } from "@/config/research";
import {
  consolidationPrompt,
  consensusPrompt,
  describeConfig,
  finalSynthesisPrompt,
  orchestratorAnalysisPrompt,
  revisionPrompt,
  type SourceRef,
} from "./prompts";

export interface OrchestratorDeps {
  generate(req: GenerationRequest): Promise<GenerationResult>;
  onProgress?(progress: WorkflowProgress): void;
  onCheckpoint?(checkpoint: WorkflowCheckpoint): void;
}

const WORDS_PER_TOKEN = 0.75;

function roughTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / WORDS_PER_TOKEN));
}

function message(err: unknown): string {
  return friendlyMessage(err);
}

const ANALYST_STAGGER_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AnalysisWithLatency = AnalysisOutput & { latencyMs: number };

export function runWorkflow(
  question: string,
  config: OrchestrationConfig,
  deps: OrchestratorDeps,
  resume?: WorkflowCheckpoint
): Promise<RunResult> {
  return new Orchestrator(question, config, deps, resume).run();
}

interface StepCharge {
  promptTokens: number;
  completionTokens: number;
  costCents: number;
  latencyMs: number;
}

interface EstimateStep {
  step: WorkflowStep;
  label: string;
  model: ModelSpec;
  estimatedCostCents: number;
}

class Orchestrator {
  private timeline: TimelineEntry[] = [];
  private totalCostCents = 0;
  private totalTokens = 0;
  private totalLatency = 0;
  private stepCharges = new Map<WorkflowStep, StepCharge>();
  private stepStatus = new Map<WorkflowStep, StepBudget["status"]>();
  private lastAnalystTexts: string[] = [];
  private checkpoint: WorkflowCheckpoint;

  constructor(
    private question: string,
    private config: OrchestrationConfig,
    private deps: OrchestratorDeps,
    private resume?: WorkflowCheckpoint
  ) {
    this.checkpoint = { ...(resume ?? { config }), config };
  }

  private tick(step: TimelineEntry["step"], label: string, status: TimelineEntry["status"], durationMs: number, detail?: string) {
    this.timeline.push({ step, label, status, durationMs, detail });
  }

  private emit(progress: WorkflowProgress) {
    this.deps.onProgress?.(progress);
  }

  private pushCheckpoint() {
    this.deps.onCheckpoint?.(this.checkpoint);
  }

  private analystLabel(index: number): string {
    return String.fromCharCode(66 + index); // B, C, ...
  }

  private isValidAnalysis(a: AnalysisOutput): boolean {
    const text = (a?.text ?? "").trim();
    return text.length > 0 && !text.startsWith("[");
  }

  private account(spec: ModelSpec, usage: Usage, latencyMs: number, step: WorkflowStep) {
    const costCents = tokensToUsd(spec, usage) * 100;
    this.totalCostCents += costCents;
    this.totalTokens += usage.promptTokens + usage.completionTokens;
    this.totalLatency += latencyMs;
    const cur = this.stepCharges.get(step);
    this.stepCharges.set(step, {
      promptTokens: (cur?.promptTokens ?? 0) + usage.promptTokens,
      completionTokens: (cur?.completionTokens ?? 0) + usage.completionTokens,
      costCents: (cur?.costCents ?? 0) + costCents,
      latencyMs: (cur?.latencyMs ?? 0) + latencyMs,
    });
  }

  private async call(spec: ModelSpec, messages: ChatMessage[], step: WorkflowStep): Promise<GenerationResult> {
    const res = await this.deps.generate({
      spec,
      messages,
      maxTokens: this.config.maxTokensPerCall,
      timeoutMs: this.config.timeoutMs,
      temperature: 0.7,
    });
    this.account(spec, res.usage, res.latencyMs, step);
    return res;
  }

  private async safeCall(
    spec: ModelSpec,
    messages: ChatMessage[],
    step: WorkflowStep
  ): Promise<{ text: string; usage: Usage; latencyMs: number; error?: string }> {
    try {
      const res = await this.call(spec, messages, step);
      return { text: res.text, usage: res.usage, latencyMs: res.latencyMs };
    } catch (err) {
      const msg = message(err);
      return {
        text: `[étape non effectuée : ${msg}]`,
        usage: { promptTokens: 0, completionTokens: 0 },
        latencyMs: 0,
        error: msg,
      };
    }
  }

  private messages(p: { system: string; user: string }): ChatMessage[] {
    return [
      { role: "system", content: p.system },
      { role: "user", content: p.user },
    ];
  }

  private reuseStep(step: WorkflowStep, label: string, resumed: ResumedStep): AnalysisWithLatency {
    this.account(resumed.output.model, resumed.output.usage, resumed.latencyMs, step);
    this.stepStatus.set(step, "done");
    this.tick(step, label, "done", resumed.latencyMs);
    this.emit({
      step,
      status: "done",
      label,
      durationMs: resumed.latencyMs,
      content: resumed.output.text,
      model: resumed.output.model,
    });
    return { ...resumed.output, latencyMs: resumed.latencyMs };
  }

  private async runResearchAnalysis(
    label: string,
    spec: ModelSpec,
    role: "orchestrator" | "analyst",
    index?: number,
    prompt?: (question: string, label: string) => { system: string; user: string },
    opts?: { throwOnError?: boolean }
  ): Promise<AnalysisWithLatency> {
    const step = label as WorkflowStep;
    const t = Date.now();
    this.emit({ step, status: "searching", label: `Analyse ${label}`, detail: "Recherche en cours", model: spec });
    try {
      const res = await runAnalystAgent(
        {
          question: this.question,
          label,
          spec,
          policy: {
            ...DEFAULT_RESEARCH_POLICY,
            enabled: this.config.search !== false,
            timeoutMs: Math.min(DEFAULT_RESEARCH_POLICY.timeoutMs, this.config.timeoutMs),
          },
          maxTokens: this.config.maxTokensPerCall,
          timeoutMs: this.config.timeoutMs,
          prompt,
        },
        {
          generate: this.deps.generate,
          onPhase: (phase) => this.emit({ step, status: phase, label: `Analyse ${label}`, model: spec }),
        }
      );
      this.account(spec, res.usage, res.latencyMs, step);
      this.stepStatus.set(step, "done");
      this.tick(step, `Analyse ${label} (${role})`, "done", Date.now() - t, `${spec.provider}/${spec.model} · ${res.dossier.mode}`);
      this.emit({ step, status: "done", label: `Analyse ${label}`, durationMs: Date.now() - t, content: res.dossier.analysis, model: spec });
      if (index !== undefined) this.lastAnalystTexts[index] = res.dossier.analysis;
      return {
        label,
        role,
        analystIndex: index,
        model: spec,
        text: res.dossier.analysis,
        usage: res.usage,
        dossier: res.dossier,
        latencyMs: Date.now() - t,
      };
    } catch (err) {
      const msg = message(err);
      this.stepStatus.set(step, "error");
      this.tick(step, `Analyse ${label} (${role})`, "error", Date.now() - t, msg);
      this.emit({ step, status: "error", label: `Analyse ${label}`, durationMs: Date.now() - t, detail: msg, model: spec });
      if (opts?.throwOnError) throw new Error(`Étape ${label} : ${msg}`);
      if (index !== undefined) this.lastAnalystTexts[index] = `[étape non effectuée : ${msg}]`;
      return {
        label,
        role,
        analystIndex: index,
        model: spec,
        text: `[étape non effectuée : ${msg}]`,
        usage: { promptTokens: 0, completionTokens: 0 },
        latencyMs: Date.now() - t,
      };
    }
  }

  private async runOrchestratorAnalysis(): Promise<AnalysisWithLatency> {
    return this.runResearchAnalysis("A", this.config.orchestrator, "orchestrator", undefined, orchestratorAnalysisPrompt, { throwOnError: true });
  }

  private async runAnalyst(index: number, spec: ModelSpec): Promise<AnalysisWithLatency> {
    return this.runResearchAnalysis(this.analystLabel(index), spec, "analyst", index);
  }

  private async runRevision(
    index: number,
    spec: ModelSpec,
    fullLabel: string,
    fullText: string
  ): Promise<AnalysisWithLatency> {
    const letter = this.analystLabel(index);
    const label = `${letter}+${fullLabel}`;
    const step = label as WorkflowStep;
    const t = Date.now();
    this.emit({ step, status: "writing", label: `Révision ${label}`, model: spec });
    const res = await this.safeCall(
      spec,
      this.messages(revisionPrompt(letter, this.lastAnalystText(index), fullLabel, fullText)),
      step
    );
    if (res.error) {
      this.stepStatus.set(step, "error");
      this.tick(step, `Révision ${label} (analyste)`, "error", Date.now() - t, res.error);
      this.emit({ step, status: "error", label: `Révision ${label}`, durationMs: Date.now() - t, detail: res.error, model: spec });
      throw new Error(`Étape ${label} : ${res.error}`);
    }
    this.stepStatus.set(step, "done");
    this.tick(step, `Révision ${label} (analyste)`, "done", Date.now() - t);
    this.emit({ step, status: "done", label: `Révision ${label}`, durationMs: Date.now() - t, content: res.text, model: spec });
    return {
      label,
      role: "analyst",
      analystIndex: index,
      model: spec,
      text: res.text,
      usage: res.usage,
      latencyMs: Date.now() - t,
    };
  }

  private lastAnalystText(index: number): string {
    return this.lastAnalystTexts[index] ?? this.analystLabel(index);
  }

  private toSourceRefs(sources: ResearchSource[] | undefined, cap = 6): SourceRef[] {
    return (sources ?? []).slice(0, cap).map((s) => ({ url: s.url, title: s.title }));
  }

  private mergedDossier(analyses: AnalysisOutput[]): AnalystDossier {
    const seen = new Set<string>();
    const sources: ResearchSource[] = [];
    for (const a of analyses) {
      for (const s of a.dossier?.sources ?? []) {
        if (seen.has(s.url)) continue;
        seen.add(s.url);
        sources.push(s);
      }
    }
    const sourceIds = new Set(sources.map((s) => s.id));
    const evidence = analyses
      .flatMap((a) => a.dossier?.evidence ?? [])
      .filter((e) => e.sourceIds.some((id) => sourceIds.has(id)))
      .slice(0, 20);
    const claims = analyses.flatMap((a) => a.dossier?.claims ?? []).slice(0, 20);
    const uncertainties = analyses.flatMap((a) => a.dossier?.uncertainties ?? []).slice(0, 10);
    const queries = analyses.flatMap((a) => a.dossier?.queries ?? []).slice(0, 20);
    const modes = analyses.map((a) => a.dossier?.mode).filter(Boolean);
    const mode: AnalystDossier["mode"] = modes.includes("native") ? "native" : modes.includes("mock") ? "mock" : "disabled";
    return {
      analysis: "",
      conclusion: "",
      queries,
      sources,
      evidence,
      claims,
      uncertainties,
      mode,
    };
  }

  private async runPhaseA(): Promise<AnalysisWithLatency> {
    if (this.resume?.analysisA) {
      return this.reuseStep("A", "Analyse A (orchestrateur)", this.resume.analysisA);
    }
    try {
      const analysisA = await this.runOrchestratorAnalysis();
      this.checkpoint.analysisA = { output: analysisA, latencyMs: analysisA.latencyMs };
      this.pushCheckpoint();
      return analysisA;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Étape A")) throw err;
      throw new Error(`Étape A : ${message(err)}`);
    }
  }

  private async runPhaseAnalysts(): Promise<AnalysisWithLatency[]> {
    const resumed = this.resume?.analystAnalyses ?? [];
    const results = await Promise.all(
      this.config.analysts.map(async (spec, i) => {
        if (resumed[i]) {
          return this.reuseStep(this.analystLabel(i) as WorkflowStep, `Analyse ${this.analystLabel(i)} (analyste)`, resumed[i]);
        }
        if (i > 0) await sleep(ANALYST_STAGGER_MS * i);
        return this.runAnalyst(i, spec);
      })
    );
    results.forEach((out, i) => {
      this.lastAnalystTexts[i] = out.text;
      if (resumed[i]) return;
      this.checkpoint.analystAnalyses ??= [];
      this.checkpoint.analystAnalyses[i] = this.isValidAnalysis(out)
        ? { output: out, latencyMs: out.latencyMs }
        : null;
    });
    this.pushCheckpoint();
    return results;
  }

  private async runPhaseConsolidations(
    analyses: AnalysisOutput[],
    analystAnalyses: AnalysisOutput[],
    validIndices: number[]
  ): Promise<{ consolidations: AnalysisOutput[]; currentText: string; currentLabel: string; currentDossier?: AnalystDossier }> {
    const resumed = this.resume?.consolidations ?? [];
    const consolidations: AnalysisOutput[] = [];
    let currentText = analyses[0].text;
    let currentLabel = "A";
    let currentDossier = analyses[0].dossier;
    for (let i = 0; i < this.config.analysts.length; i++) {
      const newLabel = this.analystLabel(i);
      const nextLabel = currentLabel + newLabel;
      const step = nextLabel as WorkflowStep;
      if (!validIndices.includes(i)) {
        const skipDetail = "Analyste en échec — analyse ignorée.";
        this.tick(step, `Analyse ${nextLabel} (orchestrateur)`, "skipped", 0, skipDetail);
        this.emit({ step, status: "skipped", label: `Analyse ${nextLabel}`, detail: skipDetail, model: this.config.orchestrator });
        continue;
      }
      let merged: AnalysisOutput;
      if (resumed[i]) {
        const reused = this.reuseStep(step, `Analyse ${nextLabel} (orchestrateur)`, resumed[i]);
        merged = reused;
      } else {
        this.emit({ step, status: "writing", label: `Analyse ${nextLabel}`, model: this.config.orchestrator });
        const tC = Date.now();
        const res = await this.safeCall(
          this.config.orchestrator,
          this.messages(
            consolidationPrompt(
              this.question,
              currentLabel,
              nextLabel,
              currentText,
              analystAnalyses[i].text,
              this.toSourceRefs(currentDossier?.sources),
              this.toSourceRefs(analystAnalyses[i].dossier?.sources)
            )
          ),
          step
        );
        if (res.error) {
          this.stepStatus.set(step, "error");
          this.tick(step, `Analyse ${nextLabel} (orchestrateur)`, "error", Date.now() - tC, res.error);
          this.emit({ step, status: "error", label: `Analyse ${nextLabel}`, durationMs: Date.now() - tC, detail: res.error, model: this.config.orchestrator });
          throw new Error(`Étape ${nextLabel} : ${res.error}`);
        }
        merged = {
          label: nextLabel,
          role: "orchestrator",
          model: this.config.orchestrator,
          text: res.text,
          usage: res.usage,
          dossier: this.mergedDossier(analyses.slice(0, i + 2)),
        };
        this.stepStatus.set(step, "done");
        this.tick(step, `Analyse ${nextLabel} (orchestrateur)`, "done", res.latencyMs);
        this.emit({ step, status: "done", label: `Analyse ${nextLabel}`, durationMs: res.latencyMs, content: res.text, model: this.config.orchestrator });
        this.checkpoint.consolidations ??= [];
        this.checkpoint.consolidations[i] = { output: merged, latencyMs: res.latencyMs };
        this.pushCheckpoint();
      }
      consolidations.push(merged);
      currentText = merged.text;
      currentLabel = nextLabel;
      currentDossier = merged.dossier;
    }
    return { consolidations, currentText, currentLabel, currentDossier };
  }

  private async runPhaseRevisions(validIndices: number[], fullLabel: string, fullText: string): Promise<AnalysisOutput[]> {
    const resumed = this.resume?.revisions ?? [];
    const revisions = await Promise.all(
      validIndices.map((i, pos) => {
        if (resumed[i]) {
          return this.reuseStep(
            `${this.analystLabel(i)}+${fullLabel}` as WorkflowStep,
            `Révision ${this.analystLabel(i)}+${fullLabel} (analyste)`,
            resumed[i]
          );
        }
        const launch = () => this.runRevision(i, this.config.analysts[i], fullLabel, fullText);
        return pos > 0 ? sleep(ANALYST_STAGGER_MS * pos).then(launch) : launch();
      })
    );
    validIndices.forEach((i, pos) => {
      if (resumed[i]) return;
      this.checkpoint.revisions ??= [];
      this.checkpoint.revisions[i] = { output: revisions[pos], latencyMs: revisions[pos].latencyMs };
    });
    this.pushCheckpoint();
    return revisions;
  }

  private async runPhaseConsensus(
    fullLabel: string,
    fullText: string,
    revisions: AnalysisOutput[]
  ): Promise<FinalSynthesisOutput> {
    if (this.resume?.consensus) {
      const c = this.resume.consensus;
      this.account(c.model, c.usage, c.latencyMs, "S");
      this.stepStatus.set("S", "done");
      this.tick("S", "Consensus", "done", c.latencyMs);
      this.emit({ step: "S", status: "done", label: "Consensus", durationMs: c.latencyMs, content: c.text, model: c.model });
      return c;
    }
    const consensusInput = [
      { label: fullLabel, text: fullText },
      ...revisions.map((r) => ({ label: r.label, text: r.text })),
    ];
    this.emit({ step: "S", status: "writing", label: "Consensus", model: this.config.consensus });
    const tS = Date.now();
    const cRes = await this.safeCall(
      this.config.consensus,
      this.messages(consensusPrompt(this.question, consensusInput)),
      "S"
    );
    if (cRes.error) {
      this.stepStatus.set("S", "error");
      this.tick("S", "Consensus", "error", Date.now() - tS, cRes.error);
      this.emit({ step: "S", status: "error", label: "Consensus", durationMs: Date.now() - tS, detail: cRes.error, model: this.config.consensus });
      throw new Error(`Étape S : ${cRes.error}`);
    }
    const consensusText = sanitizeFinalResponse(cRes.text);
    const consensus: FinalSynthesisOutput = {
      label: "S",
      role: "orchestrator",
      model: this.config.consensus,
      text: consensusText,
      usage: cRes.usage,
      report: parseConsensusReport(consensusText) ?? undefined,
    };
    this.stepStatus.set("S", "done");
    this.tick("S", "Consensus", "done", Date.now() - tS);
    this.emit({ step: "S", status: "done", label: "Consensus", durationMs: Date.now() - tS, content: consensusText, model: this.config.consensus });
    this.checkpoint.consensus = { ...consensus, latencyMs: Date.now() - tS };
    this.pushCheckpoint();
    return consensus;
  }

  private async runPhaseSynthesis(consensusText: string): Promise<FinalSynthesisOutput> {
    this.emit({ step: "F", status: "writing", label: "Synthèse finale", model: this.config.synthesis });
    const tF = Date.now();
    const fRes = await this.safeCall(
      this.config.synthesis,
      this.messages(finalSynthesisPrompt(this.question, consensusText)),
      "F"
    );
    if (fRes.error) {
      this.stepStatus.set("F", "error");
      this.tick("F", "Synthèse finale", "error", Date.now() - tF, fRes.error);
      this.emit({ step: "F", status: "error", label: "Synthèse finale", durationMs: Date.now() - tF, detail: fRes.error, model: this.config.synthesis });
      throw new Error(`Étape F : ${fRes.error}`);
    }
    const finalText = sanitizeFinalResponse(fRes.text);
    const finalSynthesis: FinalSynthesisOutput = {
      label: "F",
      role: "orchestrator",
      model: this.config.synthesis,
      text: finalText,
      usage: fRes.usage,
    };
    this.stepStatus.set("F", "done");
    this.tick("F", "Synthèse finale", "done", Date.now() - tF);
    this.emit({ step: "F", status: "done", label: "Synthèse finale", durationMs: Date.now() - tF, content: finalText, model: this.config.synthesis });
    return finalSynthesis;
  }

  async run(): Promise<RunResult> {
    const started = Date.now();
    const estimate = this.estimate();
    const estimatedCostCents = estimate.totalCents;
    const analystCount = this.config.analysts.length;

    // A — Analyse orchestrateur (première analyse, avec recherche si dispo)
    const analysisA = await this.runPhaseA();

    // B, C — analyses indépendantes des analystes (parallèle, démarrage décalé)
    const analystAnalyses = await this.runPhaseAnalysts();
    const analyses = [analysisA, ...analystAnalyses];

    // On ne consolide/révise que les analystes dont l'analyse a abouti.
    const validAnalystIndices = analystAnalyses
      .map((a, i) => [a, i] as const)
      .filter(([a]) => this.isValidAnalysis(a))
      .map(([, i]) => i);

    // AB, ABC — confrontations successives des analyses (séquentiel)
    const { consolidations, currentText } = await this.runPhaseConsolidations(analyses, analystAnalyses, validAnalystIndices);

    // B+ABD, C+ABC — révisions des analystes (parallèle, démarrage décalé)
    const fullLabel = consolidations.length > 0 ? consolidations[consolidations.length - 1].label : "A";
    const fullText = consolidations.length > 0 ? consolidations[consolidations.length - 1].text : currentText;
    const revisions = await this.runPhaseRevisions(validAnalystIndices, fullLabel, fullText);
    for (let i = 0; i < analystCount; i++) {
      if (validAnalystIndices.includes(i)) continue;
      const letter = this.analystLabel(i);
      const step = `${letter}+${fullLabel}` as WorkflowStep;
      const skipDetail = "Analyste en échec — révision ignorée.";
      this.tick(step, `Révision ${letter}+${fullLabel} (analyste)`, "skipped", 0, skipDetail);
      this.emit({ step, status: "skipped", label: `Révision ${letter} + ${fullLabel}`, detail: skipDetail, model: this.config.analysts[i] });
    }

    // S — Consensus (config.consensus)
    const consensus = await this.runPhaseConsensus(fullLabel, fullText, revisions);

    // F — Synthèse finale (config.synthesis)
    const finalSynthesis = await this.runPhaseSynthesis(consensus.text);

    return {
      analyses,
      consolidations,
      revisions,
      consensus,
      finalSynthesis,
      timeline: this.timeline,
      estimatedCostCents: Math.round(estimatedCostCents * 100) / 100,
      actualCostCents: Math.round(this.totalCostCents * 100) / 100,
      totalLatencyMs: Date.now() - started,
      totalTokens: this.totalTokens,
      budget: this.buildBudget(estimate.steps),
    };
  }

  private estimate(): { totalCents: number; steps: EstimateStep[] } {
    const promptLen = roughTokens(describeConfig(this.config) + this.question);
    const steps: EstimateStep[] = [];
    const push = (step: WorkflowStep, label: string, model: ModelSpec, estimatedCostCents: number) =>
      steps.push({ step, label, model, estimatedCostCents });

    push("A", "Analyse A (orchestrateur)", this.config.orchestrator, estimateCost(this.config.orchestrator, promptLen, 500));
    this.config.analysts.forEach((a, i) => {
      const letter = this.analystLabel(i);
      push(letter as WorkflowStep, `Analyse ${letter} (analyste)`, a, estimateCost(a, promptLen, 500));
    });
    let label = "A";
    for (let i = 0; i < this.config.analysts.length; i++) {
      const letter = this.analystLabel(i);
      const next = label + letter;
      push(next as WorkflowStep, `Consolidation ${next} (orchestrateur)`, this.config.orchestrator, estimateCost(this.config.orchestrator, promptLen * 3, 400));
      label = next;
    }
    for (let i = 0; i < this.config.analysts.length; i++) {
      const letter = this.analystLabel(i);
      const step = `${letter}+${label}` as WorkflowStep;
      push(step, `Révision ${letter}+${label} (analyste)`, this.config.analysts[i], estimateCost(this.config.analysts[i], promptLen * 5, 400));
    }
    push("S", "Consensus", this.config.consensus, estimateCost(this.config.consensus, promptLen * 6, 700));
    push("F", "Synthèse finale", this.config.synthesis, estimateCost(this.config.synthesis, promptLen * 2, 500));

    const totalCents = steps.reduce((acc, s) => acc + s.estimatedCostCents, 0);
    return { totalCents, steps };
  }

  private buildBudget(estimates: EstimateStep[]): RunBudget {
    const steps: StepBudget[] = estimates.map((e) => {
      const charge = this.stepCharges.get(e.step);
      return {
        step: e.step,
        label: e.label,
        model: e.model,
        status: this.stepStatus.get(e.step) ?? "skipped",
        estimatedCostCents: Math.round(e.estimatedCostCents * 100) / 100,
        actualCostCents: Math.round((charge?.costCents ?? 0) * 100) / 100,
        promptTokens: charge?.promptTokens ?? 0,
        completionTokens: charge?.completionTokens ?? 0,
        latencyMs: charge?.latencyMs ?? 0,
      };
    });
    return {
      estimatedCostCents: Math.round(steps.reduce((a, s) => a + s.estimatedCostCents, 0) * 100) / 100,
      actualCostCents: Math.round(steps.reduce((a, s) => a + s.actualCostCents, 0) * 100) / 100,
      currency: "USD",
      steps,
    };
  }
}