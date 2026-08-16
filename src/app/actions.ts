"use server";

import { z } from "zod";
import type { OrchestrationConfig, Profile } from "@/contracts/workflow";
import { getProfile, describeProfile, resolveAvailableSpecs } from "@/config/profiles";
import { runWorkflow } from "@/orchestrator";
import { generate, setGatewayContext, getAdapter, KNOWN_PROVIDERS } from "@/gateway";
import { getStore } from "@/lib/store";
import { encryptSecret } from "@/lib/crypto";
import { getAuthUserId, userStorage } from "@/lib/user-context";
import type { KnownProvider } from "@/gateway";

const PROFILE_SCHEMA = z.enum(["economical", "balanced", "custom"]);
const PROVIDER_SCHEMA = z.enum(KNOWN_PROVIDERS as unknown as [string, ...string[]]);

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

async function buildConfig(profile: Profile): Promise<OrchestrationConfig> {
  const base = getProfile(profile);
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

export async function askQuestion(input: {
  question: string;
  profile?: string;
  conversationId?: string;
}): Promise<AskResult> {
  const question = input.question.trim();
  if (!question) throw new Error("question_required");
  if (question.length > 2000) throw new Error("question_too_long");

  return userStorage.run(await getAuthUserId(), async () => {
    const profileResult = PROFILE_SCHEMA.safeParse(input.profile ?? "balanced");
    const profile: Profile = profileResult.success ? profileResult.data : "balanced";
    const config = await buildConfig(profile);

    await bindStoredKeys();

    const store = await getStore();
    let conversationId = input.conversationId;
    let isNewConversation = false;
    if (!conversationId || !(await store.getConversation(conversationId))) {
      conversationId = (await store.createConversation(question.slice(0, 60))).id;
      isNewConversation = true;
    }

    const run = await store.createRun(conversationId, question);
    await store.addMessage(conversationId, "user", question, run.runId);

    try {
      const result = await runWorkflow(question, config, { generate });
      await store.setRunResult(run.runId, result);
      await store.addMessage(conversationId, "assistant", result.synthesis, run.runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "erreur inconnue";
      await store.failRun(run.runId, message);
      await store.addMessage(conversationId, "assistant", `Une erreur est survenue : ${message}`, run.runId);
    }

    return { runId: run.runId, conversationId, isNewConversation };
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

export async function getProfileDescription(profile: string) {
  const result = PROFILE_SCHEMA.safeParse(profile);
  const p: Profile = result.success ? result.data : "balanced";
  return describeProfile(p);
}

export async function getProfiles() {
  return (["economical", "balanced", "custom"] as const).map((p) => ({
    profile: p,
    config: getProfile(p),
    description: describeProfile(p),
  }));
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
    const store = await getStore();
    const credentials = await store.listCredentials();
    const configured = new Set(credentials.map((c) => c.provider));
    return KNOWN_PROVIDERS.map((p) => {
      const cred = credentials.find((c) => c.provider === p);
      const envKey = process.env[`${p.toUpperCase()}_API_KEY`];
      return {
        provider: p,
        enabled: p === "mock" || configured.has(p) || Boolean(envKey),
        maskedKey: cred?.maskedKey ?? null,
        source: p === "mock" ? "built-in" : configured.has(p) ? "stored" : envKey ? "env" : null,
      };
    });
  });
}

export async function testProviderConnection(input: { provider: string }) {
  return asUser(async () => {
    const provider = PROVIDER_SCHEMA.parse(input.provider);
    if (provider === "mock") return { ok: true, detail: "Provider mock (démo) toujours disponible." };
    await bindStoredKeys();
    const adapter = getAdapter({ provider, model: "x" });
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
    const store = await getStore();
    return store.saveConfig(name, "custom", input.config);
  });
}

export async function listSavedConfigs() {
  return asUser(async () => {
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