import type { ModelSpec } from "@/contracts/gateway";

interface Pricing {
  promptPer1M: number;
  completionPer1M: number;
}

const PRICING: Record<string, Pricing> = {
  // OpenAI
  "openai/chatgpt-5.6": { promptPer1M: 4, completionPer1M: 16 },
  // Anthropic
  "anthropic/claude-opus-5": { promptPer1M: 20, completionPer1M: 100 },
  // Gemini
  "gemini/gemini-3.7-flash": { promptPer1M: 0.3, completionPer1M: 1.2 },
  // DeepSeek
  "deepseek/deepseek-v4": { promptPer1M: 0.3, completionPer1M: 1 },
  // Qwen (Alibaba)
  "qwen/qwen-3.8-max": { promptPer1M: 0.8, completionPer1M: 3.2 },
  // Kimi (Moonshot)
  "kimi/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  // GLM (Zhipu)
  "glm/glm-5.3": { promptPer1M: 0.5, completionPer1M: 2 },
  // xAI (Grok)
  "xai/grok-4.6": { promptPer1M: 2, completionPer1M: 6 },
  // Meta
  "meta/muse-spark-1.2": { promptPer1M: 0.8, completionPer1M: 3 },
  // OpenRouter — routage automatique
  "openrouter/auto": { promptPer1M: 1, completionPer1M: 3 },
  // OpenRouter — modèles explicites (prix miroirs des providers directs)
  "openrouter/openai/gpt-5.6-sol": { promptPer1M: 4, completionPer1M: 16 },
  "openrouter/openai/gpt-5.6-luna": { promptPer1M: 4, completionPer1M: 16 },
  "openrouter/google/gemini-3.7-flash": { promptPer1M: 0.3, completionPer1M: 1.2 },
  "openrouter/x-ai/grok-4.5": { promptPer1M: 2, completionPer1M: 6 },
  "openrouter/meta/muse-spark-1.2": { promptPer1M: 1.25, completionPer1M: 4.25 },
  "openrouter/deepseek/deepseek-v4-flash": { promptPer1M: 0.3, completionPer1M: 1 },
  "openrouter/deepseek/deepseek-v4-pro": { promptPer1M: 0.6, completionPer1M: 2 },
  "openrouter/moonshotai/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  "openrouter/qwen/qwen-3.8-max": { promptPer1M: 0.8, completionPer1M: 3.2 },
  "openrouter/anthropic/claude-opus-5": { promptPer1M: 20, completionPer1M: 100 },
  "openrouter/anthropic/claude-sonnet-5": { promptPer1M: 10, completionPer1M: 50 },
  // ZenMux — routage automatique
  "zenmux/auto": { promptPer1M: 1, completionPer1M: 3 },
  // ZenMux — modèles explicites (prix miroirs des providers directs)
  "zenmux/openai/gpt-5.6-sol": { promptPer1M: 4, completionPer1M: 16 },
  "zenmux/openai/gpt-5.6-luna": { promptPer1M: 4, completionPer1M: 16 },
  "zenmux/google/gemini-3.7-flash": { promptPer1M: 0.3, completionPer1M: 1.2 },
  "zenmux/x-ai/grok-4.5": { promptPer1M: 2, completionPer1M: 6 },
  "zenmux/meta/muse-spark-1.2": { promptPer1M: 1.25, completionPer1M: 4.25 },
  "zenmux/deepseek/deepseek-v4-flash": { promptPer1M: 0.3, completionPer1M: 1 },
  "zenmux/deepseek/deepseek-v4-pro": { promptPer1M: 0.6, completionPer1M: 2 },
  "zenmux/moonshotai/kimi-k3": { promptPer1M: 0.6, completionPer1M: 2.4 },
  "zenmux/qwen/qwen-3.8-max": { promptPer1M: 0.8, completionPer1M: 3.2 },
  "zenmux/anthropic/claude-opus-5": { promptPer1M: 20, completionPer1M: 100 },
  "zenmux/anthropic/claude-sonnet-5": { promptPer1M: 10, completionPer1M: 50 },
};

const DEFAULT_PRICING: Pricing = { promptPer1M: 1, completionPer1M: 3 };

const MOCK_PRICING: Pricing = { promptPer1M: 0, completionPer1M: 0 };

export function hasPricing(spec: ModelSpec): boolean {
  if (spec.provider === "mock") return true;
  return `${spec.provider}/${spec.model}` in PRICING;
}

export function getPricing(spec: ModelSpec): Pricing {
  if (spec.provider === "mock") return MOCK_PRICING;
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