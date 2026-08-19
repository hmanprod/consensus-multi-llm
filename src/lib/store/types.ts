import type { ActiveConfig, OrchestrationConfig, RunResult, RunStatus } from "@/contracts/workflow";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  runId?: string;
  createdAt: number;
}

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredRun extends RunStatus {
  result?: RunResult;
}

export interface StoredCredential {
  provider: string;
  maskedKey: string;
  hasKey: boolean;
  updatedAt: number;
}

export interface StoredConfig {
  id: string;
  name: string;
  profile: OrchestrationConfig["profile"];
  config: OrchestrationConfig;
  createdAt: number;
  updatedAt: number;
}

export interface ConfigPatch {
  name?: string;
  config?: OrchestrationConfig;
}

export interface Store {
  createConversation(title: string): Promise<StoredConversation>;
  renameConversation(id: string, title: string): Promise<StoredConversation>;
  deleteConversation(id: string): Promise<void>;
  listConversations(): Promise<StoredConversation[]>;
  getConversation(id: string): Promise<StoredConversation | null>;
  getMessages(conversationId: string): Promise<StoredMessage[]>;
  addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    runId?: string
  ): Promise<StoredMessage>;
  createRun(conversationId: string, question: string): Promise<StoredRun>;
  getRun(runId: string): Promise<StoredRun | null>;
  listRuns(conversationId: string): Promise<StoredRun[]>;
  setRunResult(runId: string, result: RunResult): Promise<StoredRun>;
  failRun(runId: string, error: string): Promise<StoredRun>;
  saveCredential(provider: string, encryptedKey: string, keyIv: string): Promise<void>;
  getCredential(provider: string): Promise<{ encryptedKey: string; keyIv: string } | null>;
  listCredentials(): Promise<StoredCredential[]>;
  saveConfig(name: string, profile: OrchestrationConfig["profile"], config: OrchestrationConfig): Promise<StoredConfig>;
  listConfigs(): Promise<StoredConfig[]>;
  getConfig(id: string): Promise<StoredConfig | null>;
  updateConfig(id: string, patch: ConfigPatch): Promise<StoredConfig>;
  deleteConfig(id: string): Promise<void>;
  setActiveConfig(ref: ActiveConfig): Promise<void>;
  getActiveConfig(): Promise<ActiveConfig>;
}