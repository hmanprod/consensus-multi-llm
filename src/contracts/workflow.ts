import type { ModelSpec, Usage } from "./gateway";

export type Profile = "economical" | "balanced" | "custom";

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

export type Complexity = "simple" | "moderate" | "complex";

export interface WorkflowPlan {
  complexity: Complexity;
  summary: string;
  focusPoints: string[];
}

export interface AnalysisResult {
  analystIndex: number;
  model: ModelSpec;
  text: string;
  usage: Usage;
}

export interface Contradiction {
  topic: string;
  positions: string[];
  analystIndexes: number[];
}

export interface ComparisonB1 {
  convergences: string[];
  contradictions: Contradiction[];
  uniqueInsights: Array<{ point: string; analystIndexes: number[] }>;
}

export type DisagreementType =
  | "formulation"
  | "hypothesis"
  | "factual"
  | "conclusion_changing";

export interface DisagreementPoint {
  topic: string;
  type: DisagreementType;
  analystIndexes: number[];
  description: string;
}

export type ConsensusStatus =
  | "consensus_reached"
  | "partial"
  | "major_disagreement"
  | "insufficient_info"
  | "budget_exceeded";

export interface ConsensusB2 {
  status: ConsensusStatus;
  score: number;
  confidence: number;
  agreements: string[];
  disagreements: DisagreementPoint[];
  missingInfo: string[];
  recommendedAction: string;
  targetedRoundTriggered: boolean;
  targetedAnalystIndexes: number[];
}

export type WorkflowStep = "A0" | "A1" | "B1" | "B2" | "B3" | "C";

export interface TimelineEntry {
  step: WorkflowStep;
  label: string;
  status: "done" | "error" | "skipped";
  durationMs: number;
  detail?: string;
}

export interface RunResult {
  plan: WorkflowPlan;
  analyses: AnalysisResult[];
  comparison: ComparisonB1;
  consensus: ConsensusB2;
  targetedAnalyses: AnalysisResult[];
  synthesis: string;
  synthesisLimits: string[];
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