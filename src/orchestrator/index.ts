import type {
  AnalysisOutput,
  FinalSynthesisOutput,
  OrchestrationConfig,
  RunResult,
  TimelineEntry,
  WorkflowProgress,
} from "@/contracts/workflow";
import type { ChatMessage, GenerationRequest, GenerationResult, ModelSpec, Usage } from "@/contracts/gateway";
import type { AnalystDossier, ResearchSource } from "@/contracts/research";
import { estimateCost, tokensToUsd } from "@/gateway/cost";
import { parseConsensusReport } from "@/lib/consensus-report";
import { sanitizeFinalResponse } from "@/lib/sanitize";
import { runAnalystAgent } from "@/research/analyst-agent";
import { DEFAULT_RESEARCH_POLICY } from "@/config/research";
import {
  consolidationPrompt,
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

function analystLabel(index: number): string {
  return String.fromCharCode(66 + index); // B, C, D, ...
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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

  private async runAnalyst(index: number, spec: ModelSpec): Promise<AnalysisOutput> {
    const label = analystLabel(index);
    const t = Date.now();
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
        },
        { generate: this.deps.generate }
      );
      this.account(spec, res.usage, res.latencyMs);
      this.tick("B", `Recherche + analyse initiale ${label}`, "done", Date.now() - t, `${spec.provider}/${spec.model} · ${res.dossier.mode}`);
      return {
        label,
        role: "analyst",
        analystIndex: index,
        model: spec,
        text: res.dossier.analysis,
        usage: res.usage,
        dossier: res.dossier,
      };
    } catch (err) {
      const msg = message(err);
      this.tick("B", `Recherche + analyse initiale ${label}`, "error", Date.now() - t, msg);
      return {
        label,
        role: "analyst",
        analystIndex: index,
        model: spec,
        text: `[étape non effectuée : ${msg}]`,
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }
  }

  private toSourceRefs(sources: ResearchSource[] | undefined, cap = 6): SourceRef[] {
    return (sources ?? []).slice(0, cap).map((s) => ({ url: s.url, title: s.title }));
  }

  private extractSection(text: string, heading: string): string | null {
    const out: string[] = [];
    let capture = false;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      const h = /^#{1,4}\s+(.*)$/.exec(line);
      if (h) {
        if (h[1].toLowerCase().startsWith(heading.toLowerCase())) {
          capture = true;
          continue;
        }
        if (capture) break;
      }
      if (capture) out.push(line);
    }
    return out.length ? out.join("\n").trim() : null;
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

    // A — Analyse A (orchestrateur)
    this.emit({ step: "A", status: "running", label: "Compréhension de la question" });
    const tA = Date.now();
    const aRes = await this.safeCall(
      this.config.orchestrator,
      this.messages(orchestratorAnalysisPrompt(this.question))
    );
    const analysisA: AnalysisOutput = {
      label: "A",
      role: "orchestrator",
      model: this.config.orchestrator,
      text: aRes.text,
      usage: aRes.usage,
    };
    this.tick("A", "Analyse A (orchestrateur)", aRes.error ? "error" : "done", Date.now() - tA);
    this.emit({
      step: "A",
      status: aRes.error ? "error" : "done",
      label: "Compréhension de la question",
      durationMs: Date.now() - tA,
      detail: aRes.error,
    });

    // B — Recherches + analyses initiales des analystes (parallèle)
    this.emit({ step: "B", status: "running", label: "Analyses indépendantes", completed: 0, total: analystCount });
    const tB = Date.now();
    let bDone = 0;
    const bTasks = this.config.analysts.map((spec, i) => {
      const task = this.runAnalyst(i, spec);
      task.then(() => {
        bDone += 1;
        this.emit({
          step: "B",
          status: "running",
          label: "Analyses indépendantes",
          completed: bDone,
          total: analystCount,
        });
      });
      return task;
    });
    const initialAnalyses = await Promise.all(bTasks);
    this.emit({
      step: "B",
      status: "done",
      label: "Analyses indépendantes",
      completed: analystCount,
      total: analystCount,
      durationMs: Date.now() - tB,
    });
    this.tick("B", "Recherches et analyses initiales", "done", Date.now() - tB, `${initialAnalyses.length} analystes`);

    // S — Consolidation A → AB → ABC → ... avec provenance des sources
    this.emit({ step: "S", status: "running", label: "Mise en commun" });
    const tS = Date.now();
    let consolidatedText = analysisA.text;
    let consolidatedLabel = "A";
    let mergedSources: SourceRef[] = [];
    let consolidationError: string | undefined;
    for (let i = 0; i < this.config.analysts.length; i++) {
      const fromLabel = consolidatedLabel;
      const nextLabel = consolidatedLabel + analystLabel(i);
      const newRefs = this.toSourceRefs(initialAnalyses[i].dossier?.sources);
      const res = await this.safeCall(
        this.config.orchestrator,
        this.messages(
          consolidationPrompt(
            this.question,
            fromLabel,
            nextLabel,
            consolidatedText,
            initialAnalyses[i].text,
            mergedSources,
            newRefs
          )
        )
      );
      consolidatedText = res.text;
      consolidatedLabel = nextLabel;
      mergedSources = [...mergedSources, ...newRefs]
        .filter((s, idx, arr) => arr.findIndex((x) => x.url === s.url) === idx)
        .slice(0, 12);
      if (res.error) consolidationError = res.error;
    }
    const consolidated: AnalysisOutput = {
      label: consolidatedLabel,
      role: "orchestrator",
      model: this.config.orchestrator,
      text: consolidatedText,
      usage: { promptTokens: 0, completionTokens: 0 },
      dossier: this.mergedDossier(initialAnalyses),
    };
    this.tick("S", "Consolidation orchestrateur", consolidationError ? "error" : "done", Date.now() - tS, `analyse ${consolidatedLabel}`);
    this.emit({
      step: "S",
      status: consolidationError ? "error" : "done",
      label: "Mise en commun",
      durationMs: Date.now() - tS,
      detail: consolidationError,
    });

    // R — Révisions des analystes (parallèle) : consolidation + contradictions détectées
    this.emit({ step: "R", status: "running", label: "Révisions", completed: 0, total: analystCount });
    const tR = Date.now();
    const contradictions = this.extractSection(consolidatedText, "contradictions") ?? undefined;
    let rDone = 0;
    const rTasks = this.config.analysts.map((spec, i) => {
      const label = analystLabel(i);
      const task = this.safeCall(
        spec,
        this.messages(
          revisionPrompt(this.question, label, initialAnalyses[i].text, consolidated.label, consolidated.text, contradictions)
        )
      );
      task.then(() => {
        rDone += 1;
        this.emit({
          step: "R",
          status: "running",
          label: "Révisions",
          completed: rDone,
          total: analystCount,
        });
      });
      return task;
    });
    const rResults = await Promise.all(rTasks);
    const revisedAnalyses = rResults.map((res, i) => {
      const label = analystLabel(i);
      return {
        label: `${label}${consolidated.label}`,
        role: "analyst" as const,
        analystIndex: i,
        model: this.config.analysts[i],
        text: res.text,
        usage: res.usage,
        dossier: initialAnalyses[i].dossier,
      };
    });
    this.emit({
      step: "R",
      status: "done",
      label: "Révisions",
      completed: analystCount,
      total: analystCount,
      durationMs: Date.now() - tR,
    });
    this.tick("R", "Révisions des analystes", "done", Date.now() - tR, `${revisedAnalyses.length} révisions`);

    // F — Analyse finale par l'orchestrateur
    this.emit({ step: "F", status: "running", label: "Synthèse finale" });
    const tF = Date.now();
    const contributions = [
      { label: consolidated.label, text: consolidated.text },
      ...revisedAnalyses.map((r) => ({ label: r.label, text: r.text })),
    ];
    const fRes = await this.safeCall(
      this.config.orchestrator,
      this.messages(finalSynthesisPrompt(this.question, contributions))
    );
    const finalText = sanitizeFinalResponse(fRes.text);
    const finalSynthesis: FinalSynthesisOutput = {
      label: "Final",
      role: "orchestrator",
      model: this.config.orchestrator,
      text: finalText,
      usage: fRes.usage,
      report: parseConsensusReport(finalText) ?? undefined,
    };
    this.tick("F", "Synthèse finale", fRes.error ? "error" : "done", Date.now() - tF);
    this.emit({
      step: "F",
      status: fRes.error ? "error" : "done",
      label: "Synthèse finale",
      durationMs: Date.now() - tF,
      detail: fRes.error,
    });

    return {
      analysisA,
      initialAnalyses,
      consolidated,
      revisedAnalyses,
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
    // A(1) + initiales(n) + consolidations(n) + révisions(n) + finale(1)
    let total = estimateCost(this.config.orchestrator, promptLen, 400);
    for (const a of this.config.analysts) {
      total += estimateCost(a, promptLen, 500); // analyse initiale avec recherche
      total += estimateCost(this.config.orchestrator, promptLen * 3, 400); // consolidation
      total += estimateCost(a, promptLen * 4, 400); // révision
    }
    total += estimateCost(this.config.orchestrator, promptLen * 6, 700); // synthèse finale
    return total / 100;
  }
}
