import type { RunResult } from "@/contracts/workflow";
import { getPrisma } from "@/lib/db";
import type {
  StoredConfig,
  StoredCredential,
  StoredMessage,
  StoredRun,
  Store,
} from "./types";

let demo: { userId: string; workspaceId: string } | null = null;

async function ensureDemo() {
  if (demo) return demo;
  const prisma = getPrisma();
  let user = await prisma.user.findUnique({ where: { clerkId: "demo" } });
  if (!user) {
    user = await prisma.user.create({ data: { clerkId: "demo", email: "demo@consensus.local" } });
  }
  let workspace = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: "Défaut", ownerId: user.id } });
  }
  demo = { userId: user.id, workspaceId: workspace.id };
  return demo;
}

export const prismaStore: Store = {
  async createConversation(title) {
    const { userId, workspaceId } = await ensureDemo();
    const c = await getPrisma().conversation.create({
      data: { title, userId, workspaceId },
    });
    return { id: c.id, title: c.title, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() };
  },

  async listConversations() {
    const { userId } = await ensureDemo();
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
        score: result.consensus.score,
        confidence: result.consensus.confidence,
        rounds: result.targetedAnalyses.length > 0 ? 1 : 0,
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
    const { userId } = await ensureDemo();
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
    const { userId } = await ensureDemo();
    const providerRow = await getPrisma().provider.findUnique({ where: { slug: provider } });
    if (!providerRow) return null;
    const cred = await getPrisma().credential.findUnique({
      where: { userId_providerId: { userId, providerId: providerRow.id } },
    });
    if (!cred) return null;
    return { encryptedKey: cred.encryptedKey, keyIv: cred.keyIv ?? "" };
  },

  async listCredentials() {
    const { userId } = await ensureDemo();
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
    const { userId } = await ensureDemo();
    const c = await getPrisma().orchestrationConfiguration.create({
      data: {
        userId,
        name,
        profile,
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
    const { userId } = await ensureDemo();
    const all = await getPrisma().orchestrationConfiguration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return all.map((c) => ({
      id: c.id,
      name: c.name,
      profile: c.profile as StoredConfig["profile"],
      config: {
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
      },
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
      config: {
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
      },
      createdAt: c.createdAt.getTime(),
    };
  },
};

function mask(encryptedKey: string): string {
  return `••••${encryptedKey.slice(-4)}`;
}