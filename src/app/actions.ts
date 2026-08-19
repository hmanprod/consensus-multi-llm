"use server";

import { z } from "zod";
import type { ActiveConfig, OrchestrationConfig } from "@/contracts/workflow";
import { getProfile, resolveAvailableSpecs } from "@/config/profiles";
import { runWorkflow } from "@/orchestrator";
import { generate, setGatewayContext, getAdapter, KNOWN_PROVIDERS } from "@/gateway";
import { getStore } from "@/lib/store";
import { clearProgress, getProgress, recordProgress } from "@/lib/progress";
import { ensureUserSetup } from "@/lib/setup";
import { encryptSecret } from "@/lib/crypto";
import { getAuthUserId, userStorage } from "@/lib/user-context";
import { NATIVE_SEARCH_PROVIDERS } from "@/research/gateway";
import type { KnownProvider } from "@/gateway";

const PROVIDER_SCHEMA = z.enum(KNOWN_PROVIDERS as unknown as [string, ...string[]]);
const MODEL_SPEC_SCHEMA = z.object({
  provider: PROVIDER_SCHEMA,
  model: z.string().trim().min(1).max(200),
});
const CONFIG_SCHEMA = z.object({
  profile: z.enum(["economical", "best", "custom"]).optional(),
  orchestrator: MODEL_SPEC_SCHEMA,
  analysts: z.array(MODEL_SPEC_SCHEMA).min(1).max(3),
  consensus: MODEL_SPEC_SCHEMA,
  synthesis: MODEL_SPEC_SCHEMA,
  maxTokensPerCall: z.number().int().min(256).max(65_536),
  timeoutMs: z.number().int().min(5_000).max(600_000),
  minAgreementScore: z.number().int().min(0).max(100),
  search: z.boolean().optional(),
});
const ACTIVE_CONFIG_SCHEMA = z.object({ type: z.literal("saved"), id: z.string().min(1) });

export type AskResult = {
  runId: string;
  conversationId: string;
  isNewConversation: boolean;
};

async function bindStoredKeys() {
  const store = await getStore();
  setGatewayContext({
    async getApiKey(provider) {
      const stored = await store.getCredential(provider);
      if (stored) {
        const { decryptSecret } = await import("@/lib/crypto");
        return decryptSecret(stored.encryptedKey, stored.keyIv);
      }
      return process.env[`${provider.toUpperCase()}_API_KEY`] ?? null;
    },
  });
}

async function resolveConfig(base: OrchestrationConfig): Promise<OrchestrationConfig> {
  const store = await getStore();
  const hasKey = async (provider: string) => {
    if (provider === "mock") return true;
    const stored = await store.getCredential(provider);
    if (stored) return true;
    return Boolean(process.env[`${provider.toUpperCase()}_API_KEY`]);
  };
  const keys: Record<string, boolean> = {};
  for (const p of KNOWN_PROVIDERS) keys[p] = await hasKey(p);
  return resolveAvailableSpecs(base, (p) => Boolean(keys[p]));
}

async function savedConfigBase(id: string): Promise<OrchestrationConfig | null> {
  const store = await getStore();
  const saved = await store.getConfig(id);
  if (!saved) return null;
  return { ...saved.config, profile: "custom" };
}

async function resolveConfigRef(ref: ActiveConfig): Promise<OrchestrationConfig> {
  if (ref.type === "saved") {
    const base = await savedConfigBase(ref.id);
    if (base) return resolveConfig(base);
  }
  const store = await getStore();
  const active = await store.getActiveConfig();
  if (active.type === "saved") {
    const fallback = await savedConfigBase(active.id);
    if (fallback) return resolveConfig(fallback);
  }
  return resolveConfig(getProfile("economical"));
}

async function getActiveConfigRef(): Promise<ActiveConfig> {
  const store = await getStore();
  return store.getActiveConfig();
}

export async function getActiveConfiguration(): Promise<{
  ref: ActiveConfig;
  config: OrchestrationConfig;
}> {
  return asUser(async () => {
    await ensureUserSetup();
    const store = await getStore();
    const ref = await store.getActiveConfig();
    if (ref.type !== "saved") throw new Error("active_config_invalid");
    const saved = await store.getConfig(ref.id);
    const base: OrchestrationConfig = saved
      ? { ...saved.config, profile: "custom" }
      : getProfile("economical");
    return { ref, config: base };
  });
}

export async function setActiveConfiguration(input: { ref: ActiveConfig }) {
  return asUser(async () => {
    await ensureUserSetup();
    const ref = ACTIVE_CONFIG_SCHEMA.parse(input.ref);
    const store = await getStore();
    if (!(await store.getConfig(ref.id))) throw new Error("configuration_not_found");
    await store.setActiveConfig(ref);
    return { ok: true, ref };
  });
}

export async function startQuestion(input: {
  question: string;
  configRef?: ActiveConfig;
  conversationId?: string;
}): Promise<AskResult> {
  const question = input.question.trim();
  if (!question) throw new Error("question_required");
  if (question.length > 2000) throw new Error("question_too_long");

  return userStorage.run(await getAuthUserId(), async () => {
    await ensureUserSetup();
    const store = await getStore();
    let conversationId = input.conversationId;
    let isNewConversation = false;
    if (!conversationId || !(await store.getConversation(conversationId))) {
      conversationId = (await store.createConversation(question.slice(0, 60))).id;
      isNewConversation = true;
    }

    const run = await store.createRun(conversationId, question);
    await store.addMessage(conversationId, "user", question, run.runId);

    return { runId: run.runId, conversationId, isNewConversation };
  });
}

export async function executeRun(input: {
  runId: string;
  question: string;
  configRef?: ActiveConfig;
}) {
  return userStorage.run(await getAuthUserId(), async () => {
    const store = await getStore();
    const run = await store.getRun(input.runId);
    if (!run) throw new Error("run_not_found");
    if (run.status !== "running") return { ok: true };

    const refResult = input.configRef ? ACTIVE_CONFIG_SCHEMA.safeParse(input.configRef) : { success: true, data: null };
    const config = refResult.success && refResult.data
      ? await resolveConfigRef(refResult.data)
      : await resolveConfigRef(await getActiveConfigRef());

    const userId = userStorage.getStore() ?? "demo";
    void userStorage.run(userId, () =>
      runWorkflowInBackground(input.runId, run.conversationId, input.question, config)
    );
    return { ok: true };
  });
}

async function runWorkflowInBackground(
  runId: string,
  conversationId: string,
  question: string,
  config: OrchestrationConfig
) {
  try {
    await bindStoredKeys();
    const result = await runWorkflow(question, config, {
      generate,
      onProgress: async (progress) => {
        await recordProgress(runId, progress);
      },
    });
    const store = await getStore();
    await store.setRunResult(runId, result);
    await store.addMessage(conversationId, "assistant", result.finalSynthesis.text, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur inconnue";
    try {
      const store = await getStore();
      await store.failRun(runId, message);
      await store.addMessage(conversationId, "assistant", `Une erreur est survenue : ${message}`, runId);
    } catch {
      // Le run a peut-être déjà disparu : on ignore.
    }
  } finally {
    await clearProgress(runId);
  }
}

export async function getRunProgress(runId: string) {
  return asUser(async () => getProgress(runId));
}

export async function getRunSnapshot(runId: string) {
  return asUser(async () => {
    const store = await getStore();
    const run = await store.getRun(runId);
    const progress = await getProgress(runId);
    return {
      status: run?.status ?? "unknown",
      question: run?.question ?? null,
      progress,
    };
  });
}

async function asUser<T>(fn: () => Promise<T>): Promise<T> {
  return userStorage.run(await getAuthUserId(), fn);
}

export async function getConversationData(conversationId: string) {
  return asUser(async () => {
    const store = await getStore();
    const convo = await store.getConversation(conversationId);
    if (!convo) return null;
    return {
      conversation: convo,
      messages: await store.getMessages(conversationId),
      runs: await store.listRuns(conversationId),
    };
  });
}

export async function getRunData(runId: string) {
  return asUser(async () => {
    const store = await getStore();
    return store.getRun(runId);
  });
}

export async function listAllConversations() {
  return asUser(async () => {
    const store = await getStore();
    return store.listConversations();
  });
}

export async function renameConversation(input: { conversationId: string; title: string }) {
  return asUser(async () => {
    const title = input.title.trim();
    if (!title) throw new Error("title_required");
    const store = await getStore();
    return store.renameConversation(input.conversationId, title);
  });
}

export async function deleteConversation(input: { conversationId: string }) {
  return asUser(async () => {
    const store = await getStore();
    await store.deleteConversation(input.conversationId);
    return { ok: true };
  });
}

// --- Credentials (Providers) ---

export async function saveApiKey(input: { provider: string; apiKey: string }) {
  return asUser(async () => {
    const provider = PROVIDER_SCHEMA.parse(input.provider);
    const apiKey = input.apiKey.trim();
    if (!apiKey) throw new Error("api_key_required");
    const { ciphertext, iv } = encryptSecret(apiKey);
    const store = await getStore();
    await store.saveCredential(provider, ciphertext, iv);
    return { ok: true, provider };
  });
}

export async function listProvidersStatus() {
  return asUser(async () => {
    await ensureUserSetup();
    const store = await getStore();
    const credentials = await store.listCredentials();
    const configured = new Set(credentials.map((c) => c.provider));

    const neededSet = new Set<string>();
    const addSpec = (spec: { provider: string }) => {
      if (spec.provider !== "mock") neededSet.add(spec.provider);
    };
    for (const c of await store.listConfigs()) {
      [c.config.orchestrator, c.config.consensus, c.config.synthesis, ...c.config.analysts].forEach(addSpec);
    }

    return KNOWN_PROVIDERS.map((p) => {
      const cred = credentials.find((c) => c.provider === p);
      const envKey = process.env[`${p.toUpperCase()}_API_KEY`];
      return {
        provider: p,
        enabled: p === "mock" || configured.has(p) || Boolean(envKey),
        maskedKey: cred?.maskedKey ?? null,
        updatedAt: cred?.updatedAt ?? null,
        source: p === "mock" ? "built-in" : configured.has(p) ? "stored" : envKey ? "env" : null,
        needed: neededSet.has(p),
        webSearch: NATIVE_SEARCH_PROVIDERS.has(p),
      };
    });
  });
}

export async function testProviderConnection(input: { provider: string }) {
  return asUser(async () => {
    const provider = PROVIDER_SCHEMA.parse(input.provider);
    if (provider === "mock") return { ok: true, detail: "Provider mock (démo) toujours disponible." };
    await bindStoredKeys();
    const adapter = await getAdapter({ provider, model: "x" });
    if (!adapter.validateCredentials) return { ok: false, detail: "validateCredentials_non_supported" };
    const ok = await adapter.validateCredentials();
    return { ok, detail: ok ? "Connexion valide." : "Clé refusée par le fournisseur." };
  });
}

// --- Configurations ---

export async function saveCustomConfig(input: { name: string; config: OrchestrationConfig }) {
  return asUser(async () => {
    const name = input.name.trim();
    if (!name) throw new Error("name_required");
    const config = CONFIG_SCHEMA.parse(input.config);
    await ensureUserSetup();
    const store = await getStore();
    return store.saveConfig(name, "custom", { ...config, profile: "custom" });
  });
}

export async function updateCustomConfig(input: {
  id: string;
  name?: string;
  config?: OrchestrationConfig;
}) {
  return asUser(async () => {
    const id = z.string().min(1).parse(input.id);
    const name = input.name?.trim();
    if (input.name !== undefined && !name) throw new Error("name_required");
    const config = input.config ? CONFIG_SCHEMA.parse(input.config) : undefined;
    const store = await getStore();
    const current = await store.getConfig(id);
    if (!current) throw new Error("configuration_not_found");
    return store.updateConfig(id, {
      name,
      config: config ? { ...config, profile: "custom" } : undefined,
    });
  });
}

export async function duplicateCustomConfig(input: { id: string }) {
  return asUser(async () => {
    const id = z.string().min(1).parse(input.id);
    await ensureUserSetup();
    const store = await getStore();
    const source = await store.getConfig(id);
    if (!source) throw new Error("configuration_not_found");
    return store.saveConfig(`${source.name} (copie)`, "custom", source.config);
  });
}

export async function deleteCustomConfig(input: { id: string }) {
  return asUser(async () => {
    const id = z.string().min(1).parse(input.id);
    await ensureUserSetup();
    const store = await getStore();
    const configs = await store.listConfigs();
    if (!configs.some((c) => c.id === id)) throw new Error("configuration_not_found");
    if (configs.length <= 1) throw new Error("cannot_delete_last_configuration");
    const ref = await store.getActiveConfig();
    if (ref.type === "saved" && ref.id === id) throw new Error("cannot_delete_active_configuration");
    await store.deleteConfig(id);
    return { ok: true };
  });
}

export async function listSavedConfigs() {
  return asUser(async () => {
    await ensureUserSetup();
    const store = await getStore();
    return store.listConfigs();
  });
}

export async function getSavedConfig(id: string) {
  return asUser(async () => {
    const store = await getStore();
    return store.getConfig(id);
  });
}

export type { KnownProvider };