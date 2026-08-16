import type { OrchestrationConfig, Profile } from "@/contracts/workflow";

export const MOCK_MODE = process.env.MOCK_MODE === "true" ||
  (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY);

const PROFILES: Record<Exclude<Profile, "custom">, OrchestrationConfig> = {
  economical: {
    profile: "economical",
    orchestrator: { provider: "gemini", model: "gemini-3.5-flash" },
    analysts: [
      { provider: "deepseek", model: "deepseek-v4" },
      { provider: "glm", model: "glm-5.3" },
      { provider: "kimi", model: "kimi-k3" },
    ],
    consensus: { provider: "glm", model: "glm-5.3" },
    synthesis: { provider: "deepseek", model: "deepseek-v4" },
    maxRounds: 0,
    maxBudgetCents: 30,
    maxTokensPerCall: 1500,
    timeoutMs: 90_000,
    minAgreementScore: 65,
  },
  balanced: {
    profile: "balanced",
    orchestrator: { provider: "anthropic", model: "claude-opus-5" },
    analysts: [
      { provider: "openai", model: "chatgpt-5.6" },
      { provider: "gemini", model: "gemini-3.5-flash" },
      { provider: "qwen", model: "qwen-3.8-max" },
    ],
    consensus: { provider: "anthropic", model: "claude-opus-5" },
    synthesis: { provider: "anthropic", model: "claude-opus-5" },
    maxRounds: 1,
    maxBudgetCents: 80,
    maxTokensPerCall: 2500,
    timeoutMs: 120_000,
    minAgreementScore: 70,
  },
};

export function getProfile(profile: Profile): OrchestrationConfig {
  if (profile === "custom") return { ...PROFILES.balanced, profile: "custom" };
  return { ...PROFILES[profile] };
}

export function effectiveConfig(profile: Profile): OrchestrationConfig {
  const cfg = getProfile(profile);
  if (!MOCK_MODE) return cfg;
  const toMock = (spec: OrchestrationConfig["orchestrator"]) => ({ ...spec, provider: "mock" as const });
  return {
    ...cfg,
    orchestrator: toMock(cfg.orchestrator),
    analysts: cfg.analysts.map(toMock),
    consensus: toMock(cfg.consensus),
    synthesis: toMock(cfg.synthesis),
  };
}

export function resolveAvailableSpecs(
  cfg: OrchestrationConfig,
  hasKey: (provider: string) => boolean
): OrchestrationConfig {
  const pick = (spec: OrchestrationConfig["orchestrator"]) => (hasKey(spec.provider) ? spec : { ...spec, provider: "mock" });
  return {
    ...cfg,
    orchestrator: pick(cfg.orchestrator),
    analysts: cfg.analysts.map(pick),
    consensus: pick(cfg.consensus),
    synthesis: pick(cfg.synthesis),
  };
}

export function describeProfile(profile: Profile): string {
  const cfg = getProfile(profile);
  const line = (label: string, spec: OrchestrationConfig["orchestrator"]) =>
    `${label}: ${MOCK_MODE ? "mock/" : ""}${spec.provider}/${spec.model}`;
  return [
    `Profil ${profile}`,
    ...(MOCK_MODE ? ["Mode démo actif (provider mock, aucun coût réel)."] : []),
    line("Orchestrateur", cfg.orchestrator),
    `Analystes (${cfg.analysts.length})`,
    ...cfg.analysts.map((a) => `  - ${a.provider}/${a.model}`),
    line("Consensus B2", cfg.consensus),
    line("Synthèse", cfg.synthesis),
    `Round ciblé max : ${cfg.maxRounds}`,
    `Budget max : ${cfg.maxBudgetCents} cents`,
  ].join("\n");
}