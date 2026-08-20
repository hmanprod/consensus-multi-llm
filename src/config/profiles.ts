import type { ActiveConfig, OrchestrationConfig, Profile, ProfileRef } from "@/contracts/workflow";
import type { StoredConfig } from "@/lib/store/types";

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

export function describeProfile(profile: Profile): string {
  const cfg = getProfile(profile);
  const line = (label: string, spec: OrchestrationConfig["orchestrator"]) =>
    `${label}: ${spec.provider}/${spec.model}`;
  const label = profile === "custom" ? "Personnalisé" : PROFILE_META[profile].name;
  return [
    `Profil ${label}`,
    `Processus collaboratif : Analyse A (orchestrateur) → analyses indépendantes → consolidations → révisions → consensus → synthèse finale.`,
    line("Orchestrateur (Analyse A + consolidations)", cfg.orchestrator),
    line("Consensus", cfg.consensus),
    line("Synthèse", cfg.synthesis),
    `Analystes (${cfg.analysts.length + 1} au total, orchestrateur inclus)`,
    ...cfg.analysts.map((a, i) => `  ${String.fromCharCode(66 + i)} — ${a.provider}/${a.model}`),
  ].join("\n");
}