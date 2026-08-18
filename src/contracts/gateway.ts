import type { ResearchPolicy, ResearchResult } from "./research";

export type Role =
  | "orchestrator"
  | "analyst"
  | "critique"
  | "consensus"
  | "synthesis"
  | "targeted";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelSpec {
  provider: string;
  model: string;
}

export interface GenerationRequest {
  spec: ModelSpec;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  search?: ResearchPolicy;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

export interface GenerationResult {
  text: string;
  usage: Usage;
  latencyMs: number;
  raw?: unknown;
  research?: ResearchResult;
}

export interface ProviderAdapter {
  readonly provider: string;
  generate(req: GenerationRequest): Promise<GenerationResult>;
  validateCredentials?(): Promise<boolean>;
}

export interface GatewayContext {
  getApiKey(provider: string): Promise<string | null>;
}