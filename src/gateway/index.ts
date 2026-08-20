import type { GatewayContext, GenerationResult, GenerationRequest, ModelSpec, ProviderAdapter } from "@/contracts/gateway";
import { AnthropicAdapter } from "./adapters/anthropic";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenAICompatibleAdapter } from "./adapters/openaiCompatible";
import { OpenAIResponsesAdapter } from "./adapters/openaiResponses";
import { OpenRouterAdapter } from "./adapters/openrouter";
import { OPENAI_COMPATIBLE_BASE_URLS } from "@/config/models";

const RESPONSES_PROVIDERS = new Set(["openai", "xai", "zenmux"]);
const RESPONSES_ALWAYS = new Set(["meta"]);

const DEFAULT_API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  qwen: process.env.QWEN_API_KEY,
  kimi: process.env.KIMI_API_KEY,
  glm: process.env.GLM_API_KEY,
  xai: process.env.XAI_API_KEY,
  meta: process.env.MODEL_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  zenmux: process.env.ZENMUX_API_KEY,
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
  "meta",
  "openrouter",
  "zenmux",
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

export async function getAdapter(spec: ModelSpec, opts?: { search?: boolean }): Promise<ProviderAdapter> {
  const apiKey = await context.getApiKey(spec.provider);
  switch (spec.provider) {
    case "anthropic":
      return new AnthropicAdapter(apiKey);
    case "gemini":
      return new GeminiAdapter(apiKey);
    case "openrouter":
      return new OpenRouterAdapter(apiKey);
    default: {
      if (RESPONSES_ALWAYS.has(spec.provider) || (opts?.search && RESPONSES_PROVIDERS.has(spec.provider))) {
        return new OpenAIResponsesAdapter(spec.provider, apiKey);
      }
      const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[spec.provider];
      if (baseUrl) {
        return new OpenAICompatibleAdapter(spec.provider, baseUrl, apiKey);
      }
      throw new Error(`unknown_provider: ${spec.provider}`);
    }
  }
}

export async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const adapter = await getAdapter(req.spec, { search: req.search?.enabled });
  return adapter.generate(req);
}

export function resolveApiKey(spec: ModelSpec): Promise<string | null> {
  return context.getApiKey(spec.provider);
}