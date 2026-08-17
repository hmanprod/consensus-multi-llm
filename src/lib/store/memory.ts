import type { OrchestrationConfig, RunResult } from "@/contracts/workflow";
import type {
  StoredConfig,
  StoredConversation,
  StoredMessage,
  StoredRun,
  Store,
} from "./types";

const conversations = new Map<string, StoredConversation>();
const messages = new Map<string, StoredMessage[]>();
const runs = new Map<string, StoredRun>();
const credentials = new Map<string, { encryptedKey: string; keyIv: string }>();
const configs = new Map<string, StoredConfig>();

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export const memoryStore: Store = {
  async createConversation(title) {
    const now = Date.now();
    const convo: StoredConversation = { id: id("conv"), title, createdAt: now, updatedAt: now };
    conversations.set(convo.id, convo);
    messages.set(convo.id, []);
    return convo;
  },

  async renameConversation(id, title) {
    const convo = conversations.get(id);
    if (!convo) throw new Error("conversation_not_found");
    convo.title = title;
    convo.updatedAt = Date.now();
    return convo;
  },

  async deleteConversation(id) {
    conversations.delete(id);
    messages.delete(id);
    for (const [key, value] of runs) {
      if (value.conversationId === id) runs.delete(key);
    }
  },

  async listConversations() {
    return [...conversations.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getConversation(id) {
    return conversations.get(id) ?? null;
  },

  async getMessages(conversationId) {
    return messages.get(conversationId) ?? [];
  },

  async addMessage(conversationId, role, content, runId) {
    const convo = conversations.get(conversationId);
    if (!convo) throw new Error("conversation_not_found");
    const msg: StoredMessage = { id: id("msg"), role, content, runId, createdAt: Date.now() };
    const list = messages.get(conversationId) ?? [];
    list.push(msg);
    messages.set(conversationId, list);
    convo.updatedAt = Date.now();
    return msg;
  },

  async createRun(conversationId, question) {
    const run: StoredRun = {
      runId: id("run"),
      conversationId,
      status: "running",
      question,
      createdAt: Date.now(),
    };
    runs.set(run.runId, run);
    return run;
  },

  async getRun(runId) {
    return runs.get(runId) ?? null;
  },

  async listRuns(conversationId) {
    return [...runs.values()]
      .filter((r) => r.conversationId === conversationId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async setRunResult(runId, result: RunResult) {
    const run = runs.get(runId);
    if (!run) throw new Error("run_not_found");
    run.result = result;
    run.status = "completed";
    return run;
  },

  async failRun(runId, error) {
    const run = runs.get(runId);
    if (!run) throw new Error("run_not_found");
    run.status = "failed";
    run.error = error;
    return run;
  },

  async saveCredential(provider, encryptedKey, keyIv) {
    credentials.set(provider, { encryptedKey, keyIv });
  },

  async getCredential(provider) {
    return credentials.get(provider) ?? null;
  },

  async listCredentials() {
    return [...credentials.entries()].map(([provider, c]) => ({
      provider,
      maskedKey: mask(c.encryptedKey),
      hasKey: true,
      updatedAt: Date.now(),
    }));
  },

  async saveConfig(name, profile, config: OrchestrationConfig) {
    const saved: StoredConfig = {
      id: id("cfg"),
      name,
      profile,
      config,
      createdAt: Date.now(),
    };
    configs.set(saved.id, saved);
    return saved;
  },

  async listConfigs() {
    return [...configs.values()].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getConfig(id) {
    return configs.get(id) ?? null;
  },
};

function mask(encryptedKey: string): string {
  const raw = encryptedKey;
  const tail = raw.slice(-4);
  return `••••${tail}`;
}