import type { GatewayContext, GenerationResult, GenerationRequest, ModelSpec, ProviderAdapter } from "@/contracts/gateway";
import { MockAdapter } from "./adapters/mock";
import { AnthropicAdapter } from "./adapters/anthropic";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenAICompatibleAdapter } from "./adapters/openaiCompatible";
import { OpenRouterAdapter } from "./adapters/openrouter";
import { OPENAI_COMPATIBLE_BASE_URLS } from "@/config/models";

const DEFAULT_API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  qwen: process.env.QWEN_API_KEY,
  kimi: process.env.KIMI_API_KEY,
  glm: process.env.GLM_API_KEY,
  xai: process.env.XAI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

export const KNOWN_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
  "qwen",
  "kimi",
  "glm",
  "xai",
  "openrouter",
  "mock",
] as const;
export type KnownProvider = (typeof KNOWN_PROVIDERS)[number];

let context: GatewayContext = {
  async getApiKey(provider) {
    return DEFAULT_API_KEYS[provider] ?? null;
  },
};

export function setGatewayContext(next: GatewayContext) {
  context = next;
}

export function getApiKey(provider: string): Promise<string | null> {
  return context.getApiKey(provider);
}

export function getAdapter(spec: ModelSpec): ProviderAdapter {
  switch (spec.provider) {
    case "anthropic":
      return new AnthropicAdapter(DEFAULT_API_KEYS.anthropic ?? null);
    case "gemini":
      return new GeminiAdapter(DEFAULT_API_KEYS.gemini ?? null);
    case "openrouter":
      return new OpenRouterAdapter(DEFAULT_API_KEYS.openrouter ?? null);
    case "mock":
      return new MockAdapter();
    default: {
      const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[spec.provider];
      if (baseUrl) {
        return new OpenAICompatibleAdapter(spec.provider, baseUrl, DEFAULT_API_KEYS[spec.provider] ?? null);
      }
      throw new Error(`unknown_provider: ${spec.provider}`);
    }
  }
}

export async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const adapter = getAdapter(req.spec);
  return adapter.generate(req);
}

export function resolveApiKey(spec: ModelSpec): Promise<string | null> {
  return context.getApiKey(spec.provider);
}