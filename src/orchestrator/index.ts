import type {
  AnalysisOutput,
  FinalSynthesisOutput,
  OrchestrationConfig,
  RunResult,
  TimelineEntry,
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

export function runWorkflow(
  question: string,
  config: OrchestrationConfig,
  deps: OrchestratorDeps
): Promise<RunResult> {
  return new Orchestrator(question, config, deps).run();
}

class Orchestrator {
  private timeline: TimelineEntry[] = [];
  private totalCostCents = 0;
  private totalTokens = 0;
  private totalLatency = 0;

  constructor(
    private question: string,
    private config: OrchestrationConfig,
    private deps: OrchestratorDeps
  ) {}

  private tick(step: TimelineEntry["step"], label: string, status: TimelineEntry["status"], durationMs: number, detail?: string) {
    this.timeline.push({ step, label, status, durationMs, detail });
  }

  private emit(progress: WorkflowProgress) {
    this.deps.onProgress?.(progress);
  }

  private analystLabel(index: number): string {
    return String.fromCharCode(66 + index); // B, C, ...
  }

  private isValidAnalysis(a: AnalysisOutput): boolean {
    const text = (a?.text ?? "").trim();
    return text.length > 0 && !text.startsWith("[");
  }

  private account(spec: ModelSpec, usage: Usage, latencyMs: number) {
    this.totalCostCents += tokensToUsd(spec, usage) * 100;
    this.totalTokens += usage.promptTokens + usage.completionTokens;
    this.totalLatency += latencyMs;
  }

  private async call(spec: ModelSpec, messages: ChatMessage[]): Promise<GenerationResult> {
    const res = await this.deps.generate({
      spec,
      messages,
      maxTokens: this.config.maxTokensPerCall,
      timeoutMs: this.config.timeoutMs,
      temperature: 0.7,
    });
    this.account(spec, res.usage, res.latencyMs);
    return res;
  }

  private async safeCall(spec: ModelSpec, messages: ChatMessage[]): Promise<{ text: string; usage: Usage; error?: string }> {
    try {
      const res = await this.call(spec, messages);
      return { text: res.text, usage: res.usage };
    } catch (err) {
      const msg = message(err);
      return {
        text: `[étape non effectuée : ${msg}]`,
        usage: { promptTokens: 0, completionTokens: 0 },
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

  private async runResearchAnalysis(
    label: string,
    spec: ModelSpec,
    role: "orchestrator" | "analyst",
    index?: number,
    prompt?: (question: string, label: string) => { system: string; user: string }
  ): Promise<AnalysisOutput> {
    const step = label as WorkflowStep;
    const t = Date.now();
    this.emit({ step, status: "searching", label: `Analyse ${label}`, detail: "Recherche en cours" });
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
          onPhase: (phase) => this.emit({ step, status: phase, label: `Analyse ${label}` }),
        }
      );
      this.account(spec, res.usage, res.latencyMs);
      this.tick(step, `Analyse ${label} (${role})`, "done", Date.now() - t, `${spec.provider}/${spec.model} · ${res.dossier.mode}`);
      this.emit({ step, status: "done", label: `Analyse ${label}`, durationMs: Date.now() - t, content: res.dossier.analysis });
      if (index !== undefined) this.lastAnalystTexts[index] = res.dossier.analysis;
      return {
        label,
        role,
        analystIndex: index,
        model: spec,
        text: res.dossier.analysis,
        usage: res.usage,
        dossier: res.dossier,
      };
    } catch (err) {
      const msg = message(err);
      this.tick(step, `Analyse ${label} (${role})`, "error", Date.now() - t, msg);
      this.emit({ step, status: "error", label: `Analyse ${label}`, durationMs: Date.now() - t, detail: msg });
      if (index !== undefined) this.lastAnalystTexts[index] = `[étape non effectuée : ${msg}]`;
      return {
        label,
        role,
        analystIndex: index,
        model: spec,
        text: `[étape non effectuée : ${msg}]`,
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }
  }

  private async runOrchestratorAnalysis(): Promise<AnalysisOutput> {
    return this.runResearchAnalysis("A", this.config.orchestrator, "orchestrator", undefined, orchestratorAnalysisPrompt);
  }

  private async runAnalyst(index: number, spec: ModelSpec): Promise<AnalysisOutput> {
    return this.runResearchAnalysis(this.analystLabel(index), spec, "analyst", index);
  }

  private async runRevision(
    index: number,
    spec: ModelSpec,
    fullLabel: string,
    fullText: string
  ): Promise<AnalysisOutput> {
    const letter = this.analystLabel(index);
    const label = `${letter}+${fullLabel}`;
    const step = label as WorkflowStep;
    const t = Date.now();
    this.emit({ step, status: "writing", label: `Révision ${label}` });
    const res = await this.safeCall(
      spec,
      this.messages(revisionPrompt(letter, this.lastAnalystText(index), fullLabel, fullText))
    );
    this.tick(step, `Révision ${label} (analyste)`, res.error ? "error" : "done", Date.now() - t, res.error);
    this.emit({
      step,
      status: res.error ? "error" : "done",
      label: `Révision ${label}`,
      durationMs: Date.now() - t,
      detail: res.error,
      content: res.error ? undefined : res.text,
    });
    return {
      label,
      role: "analyst",
      analystIndex: index,
      model: spec,
      text: res.text,
      usage: res.usage,
    };
  }

  private lastAnalystText(index: number): string {
    return this.lastAnalystTexts[index] ?? this.analystLabel(index);
  }

  private lastAnalystTexts: string[] = [];

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

  async run(): Promise<RunResult> {
    const started = Date.now();
    const estimatedCostCents = this.estimate();
    const analystCount = this.config.analysts.length;

    // A — Analyse orchestrateur (première analyse, avec recherche si dispo)
    const analysisA = await this.runOrchestratorAnalysis();

    // B, C — analyses indépendantes des analystes (parallèle, démarrage décalé)
    const analystAnalyses = await Promise.all(
      this.config.analysts.map(async (spec, i) => {
        if (i > 0) await sleep(ANALYST_STAGGER_MS * i);
        return this.runAnalyst(i, spec);
      })
    );
    const analyses = [analysisA, ...analystAnalyses];

    // On ne consolide/révise que les analystes dont l'analyse a abouti.
    const validAnalystIndices = analystAnalyses
      .map((a, i) => [a, i] as const)
      .filter(([a]) => this.isValidAnalysis(a))
      .map(([, i]) => i);

    // AB, ABC — confrontations successives des analyses (séquentiel)
    const consolidations: AnalysisOutput[] = [];
    let currentText = analysisA.text;
    let currentLabel = "A";
    let currentDossier = analysisA.dossier;
    for (let i = 0; i < analystCount; i++) {
      const newLabel = this.analystLabel(i);
      const nextLabel = currentLabel + newLabel;
      const step = nextLabel as WorkflowStep;
      if (!validAnalystIndices.includes(i)) {
        const skipDetail = "Analyste en échec — analyse ignorée.";
        this.tick(step, `Analyse ${nextLabel} (orchestrateur)`, "skipped", 0, skipDetail);
        this.emit({ step, status: "skipped", label: `Analyse ${nextLabel}`, detail: skipDetail });
        continue;
      }
      this.emit({ step, status: "writing", label: `Analyse ${nextLabel}` });
      const tC = Date.now();
      const newRefs = this.toSourceRefs(analystAnalyses[i].dossier?.sources);
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
            newRefs
          )
        )
      );
      const merged: AnalysisOutput = {
        label: nextLabel,
        role: "orchestrator",
        model: this.config.orchestrator,
        text: res.text,
        usage: res.usage,
        dossier: this.mergedDossier(analyses.slice(0, i + 2)),
      };
      consolidations.push(merged);
      this.tick(step, `Analyse ${nextLabel} (orchestrateur)`, res.error ? "error" : "done", Date.now() - tC);
      this.emit({
        step,
        status: res.error ? "error" : "done",
        label: `Analyse ${nextLabel}`,
        durationMs: Date.now() - tC,
        detail: res.error,
        content: res.error ? undefined : res.text,
      });
      currentText = res.text;
      currentLabel = nextLabel;
      currentDossier = merged.dossier;
    }

    // B+ABD, C+ABC — révisions des analystes (parallèle, démarrage décalé)
    const fullLabel = consolidations.length > 0 ? consolidations[consolidations.length - 1].label : "A";
    const fullText = consolidations.length > 0 ? consolidations[consolidations.length - 1].text : analysisA.text;
    const revisions = await Promise.all(
      validAnalystIndices.map((i, pos) => {
        const launch = () => this.runRevision(i, this.config.analysts[i], fullLabel, fullText);
        return pos > 0 ? sleep(ANALYST_STAGGER_MS * pos).then(launch) : launch();
      })
    );
    for (let i = 0; i < analystCount; i++) {
      if (validAnalystIndices.includes(i)) continue;
      const letter = this.analystLabel(i);
      const step = `${letter}+${fullLabel}` as WorkflowStep;
      const skipDetail = "Analyste en échec — révision ignorée.";
      this.tick(step, `Révision ${letter}+${fullLabel} (analyste)`, "skipped", 0, skipDetail);
      this.emit({ step, status: "skipped", label: `Révision ${letter} + ${fullLabel}`, detail: skipDetail });
    }

    // S — Consensus (config.consensus)
    const consensusInput = [
      { label: fullLabel, text: fullText },
      ...revisions.map((r) => ({ label: r.label, text: r.text })),
    ];
    this.emit({ step: "S", status: "writing", label: "Consensus" });
    const tS = Date.now();
    const cRes = await this.safeCall(
      this.config.consensus,
      this.messages(consensusPrompt(this.question, consensusInput))
    );
    const consensusText = sanitizeFinalResponse(cRes.text);
    const consensus: FinalSynthesisOutput = {
      label: "S",
      role: "orchestrator",
      model: this.config.consensus,
      text: consensusText,
      usage: cRes.usage,
      report: parseConsensusReport(consensusText) ?? undefined,
    };
    this.tick("S", "Consensus", cRes.error ? "error" : "done", Date.now() - tS, cRes.error);
    this.emit({
      step: "S",
      status: cRes.error ? "error" : "done",
      label: "Consensus",
      durationMs: Date.now() - tS,
      detail: cRes.error,
      content: cRes.error ? undefined : consensusText,
    });

    // F — Synthèse finale (config.synthesis)
    this.emit({ step: "F", status: "writing", label: "Synthèse finale" });
    const tF = Date.now();
    const fRes = await this.safeCall(
      this.config.synthesis,
      this.messages(finalSynthesisPrompt(this.question, consensusText))
    );
    const finalText = sanitizeFinalResponse(fRes.text);
    const finalSynthesis: FinalSynthesisOutput = {
      label: "F",
      role: "orchestrator",
      model: this.config.synthesis,
      text: finalText,
      usage: fRes.usage,
    };
    this.tick("F", "Synthèse finale", fRes.error ? "error" : "done", Date.now() - tF, fRes.error);
    this.emit({
      step: "F",
      status: fRes.error ? "error" : "done",
      label: "Synthèse finale",
      durationMs: Date.now() - tF,
      detail: fRes.error,
      content: fRes.error ? undefined : finalText,
    });

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
    };
  }

  private estimate(): number {
    const promptLen = roughTokens(describeConfig(this.config) + this.question);
    let total = 0;
    total += estimateCost(this.config.orchestrator, promptLen, 500); // analyse A orchestrateur avec recherche
    for (const a of this.config.analysts) {
      total += estimateCost(a, promptLen, 500); // analyse indépendante avec recherche
    }
    const n = this.config.analysts.length;
    for (let i = 0; i < n; i++) {
      total += estimateCost(this.config.orchestrator, promptLen * 3, 400); // consolidation
    }
    for (let i = 0; i < n; i++) {
      total += estimateCost(this.config.analysts[i], promptLen * 5, 400); // révision
    }
    total += estimateCost(this.config.consensus, promptLen * 6, 700); // consensus
    total += estimateCost(this.config.synthesis, promptLen * 2, 500); // synthèse finale
    return total / 100;
  }
}