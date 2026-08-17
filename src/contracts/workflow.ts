import type { ModelSpec, Usage } from "./gateway";

export type Profile = "economical" | "custom";

export interface OrchestrationConfig {
  profile: Profile;
  orchestrator: ModelSpec;
  analysts: ModelSpec[];
  consensus: ModelSpec;
  synthesis: ModelSpec;
  maxRounds: number;
  maxBudgetCents: number;
  maxTokensPerCall: number;
  timeoutMs: number;
  minAgreementScore: number;
}

export interface AnalysisOutput {
  label: string;
  role: "orchestrator" | "analyst";
  analystIndex?: number;
  model: ModelSpec;
  text: string;
  usage: Usage;
}

export type WorkflowStep = "A" | "B" | "S" | "R" | "F";

export interface TimelineEntry {
  step: WorkflowStep;
  label: string;
  status: "done" | "error" | "skipped";
  durationMs: number;
  detail?: string;
}

export interface RunResult {
  analysisA: AnalysisOutput;
  initialAnalyses: AnalysisOutput[];
  consolidated: AnalysisOutput;
  revisedAnalyses: AnalysisOutput[];
  finalSynthesis: AnalysisOutput;
  timeline: TimelineEntry[];
  estimatedCostCents: number;
  actualCostCents: number;
  totalLatencyMs: number;
  totalTokens: number;
  stoppedEarly: boolean;
}

export interface RunStatus {
  runId: string;
  conversationId: string;
  status: "running" | "completed" | "failed" | "budget_exceeded";
  question: string;
  result?: RunResult;
  error?: string;
  createdAt: number;
}