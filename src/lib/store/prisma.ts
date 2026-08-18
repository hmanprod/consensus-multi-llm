import type { ActiveConfig, RunResult } from "@/contracts/workflow";
import { DEFAULT_ACTIVE_CONFIG } from "@/contracts/workflow";
import { getPrisma } from "@/lib/db";
import { currentUserId } from "@/lib/user-context";
import type {
  StoredConfig,
  StoredCredential,
  StoredMessage,
  StoredRun,
  Store,
} from "./types";

async function ensureUser() {
  const clerkId = currentUserId();
  const prisma = getPrisma();
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    user = await prisma.user.create({ data: { clerkId, email: `${clerkId}@consensus.local` } });
  }
  let workspace = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: "Défaut", ownerId: user.id } });
  }
  return { userId: user.id, workspaceId: workspace.id };
}

export const prismaStore: Store = {
  async createConversation(title) {
    const { userId, workspaceId } = await ensureUser();
    const c = await getPrisma().conversation.create({
      data: { title, userId, workspaceId },
    });
    return { id: c.id, title: c.title, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() };
  },

  async renameConversation(id, title) {
    const c = await getPrisma().conversation.update({
      where: { id },
      data: { title },
    });
    return { id: c.id, title: c.title, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() };
  },

  async deleteConversation(id) {
    await getPrisma().conversation.delete({ where: { id } });
  },

  async listConversations() {
    const { userId } = await ensureUser();
    const all = await getPrisma().conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return all.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.getTime(),
      updatedAt: c.updatedAt.getTime(),
    }));
  },

  async getConversation(id) {
    const c = await getPrisma().conversation.findUnique({ where: { id } });
    if (!c) return null;
    return { id: c.id, title: c.title, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() };
  },

  async getMessages(conversationId) {
    const all = await getPrisma().message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return all.map((m) => ({
      id: m.id,
      role: m.role as StoredMessage["role"],
      content: m.content,
      runId: m.runId ?? undefined,
      createdAt: m.createdAt.getTime(),
    }));
  },

  async addMessage(conversationId, role, content, runId) {
    const m = await getPrisma().message.create({
      data: { conversationId, role, content, runId: runId ?? null },
    });
    return {
      id: m.id,
      role: m.role as StoredMessage["role"],
      content: m.content,
      runId: m.runId ?? undefined,
      createdAt: m.createdAt.getTime(),
    };
  },

  async createRun(conversationId, question) {
    const r = await getPrisma().workflowRun.create({
      data: { conversationId, question, status: "running" },
    });
    return {
      runId: r.id,
      conversationId: r.conversationId,
      status: "running" as const,
      question: r.question,
      createdAt: r.createdAt.getTime(),
    };
  },

  async getRun(runId) {
    const r = await getPrisma().workflowRun.findUnique({ where: { id: runId } });
    if (!r) return null;
    return {
      runId: r.id,
      conversationId: r.conversationId,
      status: r.status as StoredRun["status"],
      question: r.question,
      error: r.error ?? undefined,
      result: r.resultJson as unknown as RunResult | undefined,
      createdAt: r.createdAt.getTime(),
    };
  },

  async listRuns(conversationId) {
    const all = await getPrisma().workflowRun.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });
    return all.map((r) => ({
      runId: r.id,
      conversationId: r.conversationId,
      status: r.status as StoredRun["status"],
      question: r.question,
      error: r.error ?? undefined,
      result: r.resultJson as unknown as RunResult | undefined,
      createdAt: r.createdAt.getTime(),
    }));
  },

  async setRunResult(runId, result) {
    const r = await getPrisma().workflowRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        resultJson: result as unknown as object,
        actualCostCents: result.actualCostCents,
        estimatedCostCents: result.estimatedCostCents,
        durationMs: result.totalLatencyMs,
        score: null,
        confidence: null,
        rounds: 0,
      },
    });
    return {
      runId: r.id,
      conversationId: r.conversationId,
      status: "completed" as const,
      question: r.question,
      result,
      createdAt: r.createdAt.getTime(),
    };
  },

  async failRun(runId, error) {
    const r = await getPrisma().workflowRun.update({
      where: { id: runId },
      data: { status: "failed", error },
    });
    return {
      runId: r.id,
      conversationId: r.conversationId,
      status: "failed" as const,
      question: r.question,
      error,
      createdAt: r.createdAt.getTime(),
    };
  },

  async saveCredential(provider, encryptedKey, keyIv) {
    const { userId } = await ensureUser();
    const providerRow = await getPrisma().provider.upsert({
      where: { slug: provider },
      create: { slug: provider, name: provider },
      update: {},
    });
    await getPrisma().credential.upsert({
      where: { userId_providerId: { userId, providerId: providerRow.id } },
      create: { userId, providerId: providerRow.id, encryptedKey, keyIv },
      update: { encryptedKey, keyIv },
    });
  },

  async getCredential(provider) {
    const { userId } = await ensureUser();
    const providerRow = await getPrisma().provider.findUnique({ where: { slug: provider } });
    if (!providerRow) return null;
    const cred = await getPrisma().credential.findUnique({
      where: { userId_providerId: { userId, providerId: providerRow.id } },
    });
    if (!cred) return null;
    return { encryptedKey: cred.encryptedKey, keyIv: cred.keyIv ?? "" };
  },

  async listCredentials() {
    const { userId } = await ensureUser();
    const all = await getPrisma().credential.findMany({
      where: { userId },
      include: { provider: true },
    });
    return all.map((c): StoredCredential => ({
      provider: c.provider.slug,
      maskedKey: mask(c.encryptedKey),
      hasKey: true,
      updatedAt: c.updatedAt.getTime(),
    }));
  },

  async saveConfig(name, profile, config) {
    const { userId } = await ensureUser();
    const c = await getPrisma().orchestrationConfiguration.create({
      data: {
        userId,
        name,
        profile,
        configJson: config as unknown as object,
        maxRounds: config.maxRounds,
        maxBudgetCents: config.maxBudgetCents,
        maxTokens: config.maxTokensPerCall,
        timeoutMs: config.timeoutMs,
        minAgreementScore: config.minAgreementScore,
        analystModelIds: config.analysts.map((a) => `${a.provider}/${a.model}`),
      },
    });
    return { id: c.id, name: c.name, profile: c.profile as StoredConfig["profile"], config, createdAt: c.createdAt.getTime() };
  },

  async listConfigs() {
    const { userId } = await ensureUser();
    const all = await getPrisma().orchestrationConfiguration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return all.map((c) => ({
      id: c.id,
      name: c.name,
      profile: c.profile as StoredConfig["profile"],
      config: decodeConfig(c),
      createdAt: c.createdAt.getTime(),
    }));
  },

  async getConfig(id) {
    const c = await getPrisma().orchestrationConfiguration.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      profile: c.profile as StoredConfig["profile"],
      config: decodeConfig(c),
      createdAt: c.createdAt.getTime(),
    };
  },

  async setActiveConfig(ref) {
    const { userId } = await ensureUser();
    await getPrisma().user.update({
      where: { id: userId },
      data: { activeConfig: ref as unknown as object },
    });
  },

  async getActiveConfig() {
    const { userId } = await ensureUser();
    const user = await getPrisma().user.findUnique({ where: { id: userId } });
    const ref = user?.activeConfig as ActiveConfig | null;
    if (ref && ref.type === "profile" && (ref.profile === "economical" || ref.profile === "best")) return ref;
    if (ref && ref.type === "saved" && typeof ref.id === "string") return ref;
    return { ...DEFAULT_ACTIVE_CONFIG };
  },
};

function mask(encryptedKey: string): string {
  return `••••${encryptedKey.slice(-4)}`;
}

type ConfigRow = {
  profile: string;
  configJson: unknown;
  maxRounds: number;
  maxBudgetCents: number;
  maxTokens: number;
  timeoutMs: number;
  minAgreementScore: number;
};

function decodeConfig(c: ConfigRow) {
  const json = c.configJson as { orchestrator?: unknown; analysts?: unknown } | null;
  if (json && json.orchestrator && Array.isArray(json.analysts)) {
    return json as unknown as StoredConfig["config"];
  }
  return {
    profile: c.profile as StoredConfig["profile"],
    orchestrator: { provider: "mock", model: "orchestrator" },
    analysts: [{ provider: "mock", model: "analyst" }],
    consensus: { provider: "mock", model: "consensus" },
    synthesis: { provider: "mock", model: "synthesis" },
    maxRounds: c.maxRounds,
    maxBudgetCents: c.maxBudgetCents,
    maxTokensPerCall: c.maxTokens,
    timeoutMs: c.timeoutMs,
    minAgreementScore: c.minAgreementScore,
  } satisfies StoredConfig["config"];
}