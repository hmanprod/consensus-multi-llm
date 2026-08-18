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
  "gemini/gemini-3.5-flash": { promptPer1M: 0.3, completionPer1M: 1.2 },
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
  // OpenRouter (valeur générique par défaut)
  "openrouter/auto": { promptPer1M: 1, completionPer1M: 3 },
};

const DEFAULT_PRICING: Pricing = { promptPer1M: 1, completionPer1M: 3 };

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