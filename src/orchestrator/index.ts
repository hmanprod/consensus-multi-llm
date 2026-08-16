import type {
  AnalysisResult,
  Complexity,
  ConsensusB2,
  OrchestrationConfig,
  RunResult,
  TimelineEntry,
  WorkflowPlan,
} from "@/contracts/workflow";
import type { ChatMessage, GenerationRequest, GenerationResult, ModelSpec } from "@/contracts/gateway";
import { estimateCost, tokensToUsd } from "@/gateway/cost";
import { compareAnalyses } from "./comparison";
import { buildConsensus } from "./consensus";
import {
  analystPrompt,
  consensusPrompt,
  describeConfig,
  orchestratorPrompt,
  synthesisPrompt,
  targetedAnalystPrompt,
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

  async run(): Promise<RunResult> {
    const started = Date.now();
    const estimatedCostCents = this.estimate();

    // A0 — Compréhension
    const t0 = Date.now();
    let plan: WorkflowPlan;
    try {
      const { system, user } = orchestratorPrompt(this.question);
      const res = await this.call(this.config.orchestrator, [
        { role: "system", content: system },
        { role: "user", content: user },
      ],);
      plan = parsePlan(res.text) ?? deterministicPlan(this.question);
    } catch {
      plan = deterministicPlan(this.question);
    }
    this.tick("A0", "Compréhension", "done", Date.now() - t0, plan.summary);

    // A1 — Analyses indépendantes en parallèle
    const t1 = Date.now();
    const analyses = await Promise.all(
      this.config.analysts.map(async (spec, i) => {
        try {
          const { system, user } = analystPrompt(this.question, plan.focusPoints);
          const res = await this.call(spec, [
            { role: "system", content: system },
            { role: "user", content: user },
          ],);
          return { analystIndex: i, model: spec, text: res.text, usage: res.usage };
        } catch (err) {
          return {
            analystIndex: i,
            model: spec,
            text: `[analyst #${i + 1} failed: ${message(err)}]`,
            usage: { promptTokens: 0, completionTokens: 0 },
          };
        }
      })
    );
    this.tick("A1", "Analyses parallèles", "done", Date.now() - t1, `${analyses.length} analystes`);

    // B1 — Comparaison
    const t2 = Date.now();
    const comparison = compareAnalyses(analyses);
    this.tick("B1", "Comparaison", "done", Date.now() - t2, `${comparison.convergences.length} convergences, ${comparison.contradictions.length} contradictions`);

    // B2 — Consensus
    const t3 = Date.now();
    let consensus = buildConsensus(analyses, comparison, this.config);
    consensus = await this.enrichConsensus(consensus, analyses);
    this.tick("B2", "Consensus", "done", Date.now() - t3, `${consensus.score}/100 — ${consensus.status}`);

    // B3 — Round ciblé (max config.maxRounds)
    let targetedAnalyses: AnalysisResult[] = [];
    if (consensus.targetedRoundTriggered && this.config.maxRounds >= 1) {
      const t4 = Date.now();
      targetedAnalyses = await this.runTargetedRound(consensus);
      if (targetedAnalyses.length > 0) {
        const merged = analyses.map((a) => targetedAnalyses.find((t) => t.analystIndex === a.analystIndex) ?? a);
        const cmp = compareAnalyses(merged);
        consensus = buildConsensus(merged, cmp, this.config);
        this.tick("B3", "Round ciblé", "done", Date.now() - t4, `${targetedAnalyses.length} analystes réexaminés`);
      } else {
        this.tick("B3", "Round ciblé", "skipped", 0);
      }
    }

    // C — Synthèse finale
    const t5 = Date.now();
    const limits = [
      ...consensus.missingInfo,
      ...(this.budget.over ? [`Budget dépassé : coût réel ${this.budget.cents.toFixed(2)} cents (max ${this.config.maxBudgetCents}).`] : []),
    ];
    const { synthesis, synthesisLimits } = await this.synthesize(consensus, analyses, limits);
    this.tick("C", "Synthèse finale", "done", Date.now() - t5);

    const stoppedEarly = this.budget.over || consensus.status === "budget_exceeded";

    return {
      plan,
      analyses,
      comparison,
      consensus,
      targetedAnalyses,
      synthesis,
      synthesisLimits,
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
    const calls = 1 + this.config.analysts.length + 2 + (this.config.maxRounds >= 1 ? this.config.analysts.length : 0);
    let total = estimateCost(this.config.orchestrator, promptLen, 200);
    for (const a of this.config.analysts) total += estimateCost(a, promptLen, 500);
    total += estimateCost(this.config.consensus, promptLen * 4, 200);
    total += estimateCost(this.config.synthesis, promptLen * 5, 600);
    if (this.config.maxRounds >= 1) {
      for (const a of this.config.analysts) total += estimateCost(a, promptLen * 2, 300);
    }
    return total * calls / 100;
  }

  private async enrichConsensus(consensus: ConsensusB2, analyses: AnalysisResult[]): Promise<ConsensusB2> {
    try {
      const { system, user } = consensusPrompt(this.question, analyses.map((a) => a.text), consensus.score);
      const res = await this.call(this.config.consensus, [
        { role: "system", content: system },
        { role: "user", content: user },
      ],);
      const parsed = parseConsensusJson(res.text);
      if (!parsed) return consensus;
      return {
        ...consensus,
        recommendedAction: parsed.recommendedAction ?? consensus.recommendedAction,
        missingInfo: parsed.missingInfo?.length ? parsed.missingInfo : consensus.missingInfo,
      };
    } catch {
      return consensus;
    }
  }

  private async runTargetedRound(consensus: ConsensusB2): Promise<AnalysisResult[]> {
    const indexes = consensus.targetedAnalystIndexes;
    if (indexes.length === 0) return [];
    const description = consensus.disagreements
      .filter((d) => d.type === "factual" || d.type === "conclusion_changing")
      .map((d) => d.description)
      .join(" | ") || consensus.disagreements.map((d) => d.description).join(" | ");
    return Promise.all(
      indexes.map(async (idx) => {
        const spec = this.config.analysts[idx];
        if (!spec) return null;
        try {
          const { system, user } = targetedAnalystPrompt(this.question, description);
          const res = await this.call(spec, [
            { role: "system", content: system },
            { role: "user", content: user },
          ],);
          return { analystIndex: idx, model: spec, text: res.text, usage: res.usage };
        } catch (err) {
          return {
            analystIndex: idx,
            model: spec,
            text: `[targeted round #${idx + 1} failed: ${message(err)}]`,
            usage: { promptTokens: 0, completionTokens: 0 },
          };
        }
      })
    ).then((r) => r.filter((x): x is AnalysisResult => x !== null));
  }

  private async synthesize(
    consensus: ConsensusB2,
    analyses: AnalysisResult[],
    limits: string[]
  ): Promise<{ synthesis: string; synthesisLimits: string[] }> {
    const summary = [
      `Statut : ${consensus.status}`,
      `Score d'accord : ${consensus.score}/100`,
      ...consensus.agreements.map((a) => `Accord : ${a}`),
      ...consensus.disagreements.map((d) => `Désaccord (${d.type}) : ${d.description}`),
    ].join("\n");

    try {
      const { system, user } = synthesisPrompt(this.question, analyses.map((a) => a.text), summary, limits);
      const res = await this.call(this.config.synthesis, [
        { role: "system", content: system },
        { role: "user", content: user },
      ],);
      return { synthesis: res.text, synthesisLimits: limits };
    } catch (err) {
      const fallback = [
        `Synthèse (arbitre indisponible : ${message(err)})`,
        summary,
        ...analyses.map((a, i) => `Analyste ${i + 1} : ${a.text.slice(0, 300)}`),
        ...(limits.length ? ["Limites :", ...limits] : []),
      ].join("\n");
      return { synthesis: fallback, synthesisLimits: limits };
    }
  }
}

function deterministicPlan(question: string): WorkflowPlan {
  const len = question.length;
  const complexity: Complexity = len > 400 || /\b(pourquoi|comparer|explique|analyse|contexte|références|sources)\b/i.test(question)
    ? "complex"
    : len > 120
      ? "moderate"
      : "simple";
  return {
    complexity,
    summary: `Question traitée en mode ${complexity}.`,
    focusPoints: ["faits", "interprétations", "recommandation"],
  };
}

function parsePlan(text: string): WorkflowPlan | null {
  const json = extractJson(text);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Partial<WorkflowPlan>;
    if (typeof parsed.summary !== "string") return null;
    const complexity: Complexity =
      parsed.complexity === "simple" || parsed.complexity === "moderate" || parsed.complexity === "complex"
        ? parsed.complexity
        : "moderate";
    return {
      complexity,
      summary: parsed.summary,
      focusPoints: Array.isArray(parsed.focusPoints) ? parsed.focusPoints.slice(0, 5) : [],
    };
  } catch {
    return null;
  }
}

function parseConsensusJson(text: string): { recommendedAction?: string; missingInfo?: string[] } | null {
  const json = extractJson(text);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { recommendedAction?: string; missingInfo?: string[] };
    if (typeof parsed.recommendedAction !== "string" && !Array.isArray(parsed.missingInfo)) return null;
    return {
      recommendedAction: typeof parsed.recommendedAction === "string" ? parsed.recommendedAction : undefined,
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : undefined,
    };
  } catch {
    return null;
  }
}

function extractJson(text: string): string | null {
  const match = /{[\s\S]*}/.exec(text);
  return match ? match[0] : null;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}