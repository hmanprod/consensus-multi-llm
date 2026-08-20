import type { ModelSpec } from "@/contracts/gateway";

interface Pricing {
  promptPer1M: number;
  completionPer1M: number;
  cacheInputPer1M?: number;
}

const PRICING: Record<string, Pricing> = {
  // OpenAI
  "openai/chatgpt-5.6": { promptPer1M: 1.25, completionPer1M: 7.5, cacheInputPer1M: 0.125 },
  // Anthropic
  "anthropic/claude-opus-5": { promptPer1M: 5, completionPer1M: 25, cacheInputPer1M: 0.5 },
  // Gemini
  "gemini/gemini-3.7-flash": { promptPer1M: 0.375, completionPer1M: 1.875, cacheInputPer1M: 0.0375 },
  // DeepSeek (slug générique ambigu : tarif Flash par défaut)
  "deepseek/deepseek-v4": { promptPer1M: 0.09, completionPer1M: 0.18 },
  // Qwen (Alibaba)
  "qwen/qwen-3.8-max": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.25 },
  // Kimi (Moonshot)
  "kimi/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  // GLM (Zhipu)
  "glm/glm-5.3": { promptPer1M: 1.4, completionPer1M: 4.4, cacheInputPer1M: 0.26 },
  // xAI (Grok)
  "xai/grok-4.6": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.5 },
  // Meta
  "meta/muse-spark-1.2": { promptPer1M: 1.25, completionPer1M: 4.25, cacheInputPer1M: 0.15 },
  // OpenRouter — routage automatique
  "openrouter/auto": { promptPer1M: 1, completionPer1M: 3 },
  // OpenRouter — modèles explicites (tarifs OpenRouter)
  "openrouter/openai/gpt-5.6-sol": { promptPer1M: 1.25, completionPer1M: 7.5, cacheInputPer1M: 0.125 },
  "openrouter/openai/gpt-5.6-luna": { promptPer1M: 4, completionPer1M: 16 },
  "openrouter/google/gemini-3.7-flash": { promptPer1M: 0.375, completionPer1M: 1.875, cacheInputPer1M: 0.0375 },
  "openrouter/x-ai/grok-4.5": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.5 },
  "openrouter/meta/muse-spark-1.2": { promptPer1M: 1.25, completionPer1M: 4.25, cacheInputPer1M: 0.15 },
  "openrouter/deepseek/deepseek-v4-flash": { promptPer1M: 0.09, completionPer1M: 0.18 },
  "openrouter/deepseek/deepseek-v4-pro": { promptPer1M: 0.435, completionPer1M: 0.87, cacheInputPer1M: 0.003625 },
  "openrouter/moonshotai/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  "openrouter/qwen/qwen-3.8-max": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.25 },
  "openrouter/z-ai/glm-5.3": { promptPer1M: 1.4, completionPer1M: 4.4, cacheInputPer1M: 0.26 },
  "openrouter/anthropic/claude-opus-5": { promptPer1M: 5, completionPer1M: 25, cacheInputPer1M: 0.5 },
  "openrouter/anthropic/claude-sonnet-5": { promptPer1M: 2, completionPer1M: 10, cacheInputPer1M: 0.2 },
  // ZenMux — routage automatique
  "zenmux/auto": { promptPer1M: 1, completionPer1M: 3 },
  // ZenMux — modèles explicites
  "zenmux/openai/gpt-5.6-sol": { promptPer1M: 1.25, completionPer1M: 7.5, cacheInputPer1M: 0.125 },
  "zenmux/openai/gpt-5.6-luna": { promptPer1M: 4, completionPer1M: 16 },
  "zenmux/google/gemini-3.7-flash": { promptPer1M: 0.375, completionPer1M: 1.875, cacheInputPer1M: 0.0375 },
  "zenmux/x-ai/grok-4.5": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.5 },
  "zenmux/meta/muse-spark-1.2": { promptPer1M: 1.25, completionPer1M: 4.25, cacheInputPer1M: 0.15 },
  "zenmux/deepseek/deepseek-v4-flash": { promptPer1M: 0.09, completionPer1M: 0.18 },
  "zenmux/deepseek/deepseek-v4-pro": { promptPer1M: 0.435, completionPer1M: 0.87, cacheInputPer1M: 0.003625 },
  "zenmux/moonshotai/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  "zenmux/qwen/qwen-3.8-max": { promptPer1M: 2, completionPer1M: 6, cacheInputPer1M: 0.25 },
  "zenmux/z-ai/glm-5.3": { promptPer1M: 1.4, completionPer1M: 4.4, cacheInputPer1M: 0.26 },
  "zenmux/anthropic/claude-opus-5": { promptPer1M: 5, completionPer1M: 25, cacheInputPer1M: 0.5 },
  "zenmux/anthropic/claude-sonnet-5": { promptPer1M: 2, completionPer1M: 10, cacheInputPer1M: 0.2 },
};

const DEFAULT_PRICING: Pricing = { promptPer1M: 1, completionPer1M: 3 };

export function hasPricing(spec: ModelSpec): boolean {
  return `${spec.provider}/${spec.model}` in PRICING;
}

export function getPricing(spec: ModelSpec): Pricing {
  const key = `${spec.provider}/${spec.model}`;
  return PRICING[key] ?? DEFAULT_PRICING;
}

export function estimateCost(
  spec: ModelSpec,
  promptTokens: number,
  completionTokens: number
): number {
  const p = getPricing(spec);
  const usd =
    (promptTokens / 1_000_000) * p.promptPer1M +
    (completionTokens / 1_000_000) * p.completionPer1M;
  return Math.ceil(usd * 100 * 100) / 100;
}

export function tokensToUsd(spec: ModelSpec, usage: { promptTokens: number; completionTokens: number }): number {
  const p = getPricing(spec);
  return (
    (usage.promptTokens / 1_000_000) * p.promptPer1M +
    (usage.completionTokens / 1_000_000) * p.completionPer1M
  );
}