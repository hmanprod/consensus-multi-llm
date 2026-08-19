import type { ActiveConfig, OrchestrationConfig, Profile, ProfileRef } from "@/contracts/workflow";
import type { StoredConfig } from "@/lib/store/types";

export const MOCK_MODE = process.env.MOCK_MODE === "true" ||
  (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.ZENMUX_API_KEY && !process.env.XAI_API_KEY && !process.env.MODEL_API_KEY && !process.env.KIMI_API_KEY);

export const PROFILE_META: Record<ProfileRef, { name: string; tagline: string; speed: string }> = {
  economical: {
    name: "Économique",
    tagline: "Pour les questions simples, une réponse rapide à coût réduit.",
    speed: "Rapide",
  },
  best: {
    name: "Approfondi",
    tagline: "Pour les décisions complexes ou sensibles nécessitant plusieurs points de vue.",
    speed: "Qualité maximale",
  },
};

export function resolveActiveRef(ref: ActiveConfig, saved: StoredConfig[]): OrchestrationConfig {
  if (ref.type === "saved") {
    const found = saved.find((c) => c.id === ref.id);
    if (found) return { ...found.config, profile: "custom" };
    if (saved.length > 0) return { ...saved[0].config, profile: "custom" };
    return getProfile("economical");
  }
  if (saved.length > 0) return { ...saved[0].config, profile: "custom" };
  return getProfile(ref.profile);
}

export function configRefKey(ref: ActiveConfig): string {
  return ref.type === "profile" ? `profile:${ref.profile}` : `saved:${ref.id}`;
}

export function parseConfigRefKey(key: string): ActiveConfig {
  if (key.startsWith("saved:")) return { type: "saved", id: key.slice("saved:".length) };
  if (key === "profile:best") return { type: "profile", profile: "best" };
  return { type: "profile", profile: "economical" };
}

const PROFILES: Record<Exclude<Profile, "custom">, OrchestrationConfig> = {
  economical: {
    profile: "economical",
    orchestrator: { provider: "openai", model: "chatgpt-5.6" },
    analysts: [
      { provider: "gemini", model: "gemini-3.7-flash" },
      { provider: "xai", model: "grok-4.6" },
      { provider: "kimi", model: "kimi-k3" },
    ],
    consensus: { provider: "openai", model: "chatgpt-5.6" },
    synthesis: { provider: "openai", model: "chatgpt-5.6" },
    maxTokensPerCall: 2048,
    timeoutMs: 120_000,
    minAgreementScore: 70,
  },
  best: {
    profile: "best",
    orchestrator: { provider: "openai", model: "chatgpt-5.6" },
    analysts: [
      { provider: "openai", model: "chatgpt-5.6" },
      { provider: "gemini", model: "gemini-3.7-flash" },
      { provider: "meta", model: "muse-spark-1.2" },
      { provider: "xai", model: "grok-4.6" },
      { provider: "kimi", model: "kimi-k3" },
    ],
    consensus: { provider: "openai", model: "chatgpt-5.6" },
    synthesis: { provider: "openai", model: "chatgpt-5.6" },
    maxTokensPerCall: 4000,
    timeoutMs: 180_000,
    minAgreementScore: 75,
  },
};

export function getProfile(profile: Profile): OrchestrationConfig {
  if (profile === "custom") return { ...PROFILES.economical, profile: "custom" };
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
  const label = profile === "custom" ? "Personnalisé" : PROFILE_META[profile].name;
  return [
    `Profil ${label}`,
    ...(MOCK_MODE ? ["Mode démo actif (provider mock, aucun coût réel)."] : []),
    `Processus collaboratif : Analyse A (orchestrateur) → consolidation → révisions → analyse finale.`,
    line("Orchestrateur (Analyse A + consolidation + finale)", cfg.orchestrator),
    `Analystes (${cfg.analysts.length})`,
    ...cfg.analysts.map((a, i) => `  ${String.fromCharCode(66 + i)} — ${a.provider}/${a.model}`),
  ].join("\n");
}