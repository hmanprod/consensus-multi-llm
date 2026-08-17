import type {
  AnalysisOutput,
  FinalSynthesisOutput,
  OrchestrationConfig,
  RunResult,
  TimelineEntry,
} from "@/contracts/workflow";
import type { ChatMessage, GenerationRequest, GenerationResult, ModelSpec, Usage } from "@/contracts/gateway";
import { estimateCost, tokensToUsd } from "@/gateway/cost";
import { parseConsensusReport } from "@/lib/consensus-report";
import { sanitizeFinalResponse } from "@/lib/sanitize";
import {
  analystAnalysisPrompt,
  consolidationPrompt,
  describeConfig,
  finalSynthesisPrompt,
  orchestratorAnalysisPrompt,
  revisionPrompt,
} from "./prompts";

export interface OrchestratorDeps {
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

interface BudgetState {
  cents: number;
  over: boolean;
}

const WORDS_PER_TOKEN = 0.75;

function roughTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / WORDS_PER_TOKEN));
}

function analystLabel(index: number): string {
  return String.fromCharCode(66 + index); // B, C, D, ...
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
  private budget: BudgetState = { cents: 0, over: false };
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

  private async call(spec: ModelSpec, messages: ChatMessage[]): Promise<GenerationResult> {
    const res = await this.deps.generate({
      spec,
      messages,
      maxTokens: this.config.maxTokensPerCall,
      timeoutMs: this.config.timeoutMs,
      temperature: 0.7,
    });
    this.budget.cents += tokensToUsd(spec, res.usage) * 100;
    if (this.budget.cents > this.config.maxBudgetCents) this.budget.over = true;
    this.totalTokens += res.usage.promptTokens + res.usage.completionTokens;
    this.totalLatency += res.latencyMs;
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

  async run(): Promise<RunResult> {
    const started = Date.now();
    const estimatedCostCents = this.estimate();

    // A — Analyse A (orchestrateur)
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

    // B — Analyses initiales des analystes (parallèle)
    const tB = Date.now();
    const initialAnalyses = await Promise.all(
      this.config.analysts.map(async (spec, i) => {
        const label = analystLabel(i);
        const res = await this.safeCall(spec, this.messages(analystAnalysisPrompt(this.question, label)));
        return {
          label,
          role: "analyst" as const,
          analystIndex: i,
          model: spec,
          text: res.text,
          usage: res.usage,
        };
      })
    );
    this.tick("B", "Analyses initiales (analystes)", "done", Date.now() - tB, `${initialAnalyses.length} analystes`);

    // S — Consolidation par l'orchestrateur : A → AB → ABC → ...
    const tS = Date.now();
    let consolidatedText = analysisA.text;
    let consolidatedLabel = "A";
    let consolidationError: string | undefined;
    for (let i = 0; i < this.config.analysts.length; i++) {
      const fromLabel = consolidatedLabel;
      const nextLabel = consolidatedLabel + analystLabel(i);
      const res = await this.safeCall(
        this.config.orchestrator,
        this.messages(
          consolidationPrompt(this.question, fromLabel, nextLabel, consolidatedText, initialAnalyses[i].text)
        )
      );
      consolidatedText = res.text;
      consolidatedLabel = nextLabel;
      if (res.error) consolidationError = res.error;
    }
    const consolidated: AnalysisOutput = {
      label: consolidatedLabel,
      role: "orchestrator",
      model: this.config.orchestrator,
      text: consolidatedText,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
    this.tick("S", "Consolidation orchestrateur", consolidationError ? "error" : "done", Date.now() - tS, `analyse ${consolidatedLabel}`);

    // R — Révisions des analystes (parallèle) : chaque analyste intègre l'analyse consolidée
    const tR = Date.now();
    const revisedAnalyses = await Promise.all(
      this.config.analysts.map(async (spec, i) => {
        const label = analystLabel(i);
        const res = await this.safeCall(
          spec,
          this.messages(
            revisionPrompt(this.question, label, initialAnalyses[i].text, consolidated.label, consolidated.text)
          )
        );
        return {
          label: `${label}${consolidated.label}`,
          role: "analyst" as const,
          analystIndex: i,
          model: spec,
          text: res.text,
          usage: res.usage,
        };
      })
    );
    this.tick("R", "Révisions des analystes", "done", Date.now() - tR, `${revisedAnalyses.length} révisions`);

    // F — Analyse finale par l'orchestrateur
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

    const stoppedEarly = this.budget.over;

    return {
      analysisA,
      initialAnalyses,
      consolidated,
      revisedAnalyses,
      finalSynthesis,
      timeline: this.timeline,
      estimatedCostCents: Math.round(estimatedCostCents * 100) / 100,
      actualCostCents: Math.round(this.budget.cents * 100) / 100,
      totalLatencyMs: Date.now() - started,
      totalTokens: this.totalTokens,
      stoppedEarly,
    };
  }

  private estimate(): number {
    const promptLen = roughTokens(describeConfig(this.config) + this.question);
    // A(1) + initiales(n) + consolidations(n) + révisions(n) + finale(1)
    let total = estimateCost(this.config.orchestrator, promptLen, 400);
    for (const a of this.config.analysts) {
      total += estimateCost(a, promptLen, 500); // analyse initiale
      total += estimateCost(this.config.orchestrator, promptLen * 3, 400); // consolidation
      total += estimateCost(a, promptLen * 4, 400); // révision
    }
    total += estimateCost(this.config.orchestrator, promptLen * 6, 700); // synthèse finale
    return total / 100;
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}