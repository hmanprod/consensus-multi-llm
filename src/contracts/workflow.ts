import type { ModelSpec, Usage } from "./gateway";
import type { AnalystDossier } from "./research";

export type Profile = "economical" | "best" | "custom";

export type ProfileRef = "economical" | "best";

export type ActiveConfig =
  | { type: "profile"; profile: ProfileRef }
  | { type: "saved"; id: string };

export const DEFAULT_ACTIVE_CONFIG: ActiveConfig = { type: "profile", profile: "economical" };

export interface OrchestrationConfig {
  profile: Profile;
  orchestrator: ModelSpec;
  analysts: ModelSpec[];
  consensus: ModelSpec;
  synthesis: ModelSpec;
  maxTokensPerCall: number;
  timeoutMs: number;
  minAgreementScore: number;
  search?: boolean;
}

export interface AnalysisOutput {
  label: string;
  role: "orchestrator" | "analyst";
  analystIndex?: number;
  model: ModelSpec;
  text: string;
  usage: Usage;
  dossier?: AnalystDossier;
}

export interface ConsensusReport {
  recommendation: string;
  confidence?: "low" | "medium" | "high";
  summary: string[];
  agreements: string[];
  disagreements: string[];
  limitations: string[];
  nextSteps: string[];
  sources?: string[];
  unverified?: string[];
}

export interface FinalSynthesisOutput extends AnalysisOutput {
  report?: ConsensusReport;
}

export type WorkflowStep = "A" | "B" | "S" | "R" | "F";

export type WorkflowProgressStatus = "pending" | "running" | "done" | "error";

export interface WorkflowProgress {
  step: WorkflowStep;
  status: WorkflowProgressStatus;
  completed?: number;
  total?: number;
  label: string;
  detail?: string;
  durationMs?: number;
}

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
  finalSynthesis: FinalSynthesisOutput;
  timeline: TimelineEntry[];
  estimatedCostCents: number;
  actualCostCents: number;
  totalLatencyMs: number;
  totalTokens: number;
}

export interface RunStatus {
  runId: string;
  conversationId: string;
  status: "running" | "completed" | "failed";
  question: string;
  result?: RunResult;
  error?: string;
  createdAt: number;
}