import type { ChatMessage, GenerationRequest, GenerationResult, ModelSpec, Usage } from "@/contracts/gateway";
import type { ResearchPolicy, ResearchResult } from "@/contracts/research";
import { getApiKey } from "@/gateway";

export const NATIVE_SEARCH_PROVIDERS = new Set(["openai", "gemini", "anthropic", "kimi", "xai", "meta"]);

export interface ResearchGatewayDeps {
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

export interface ResearchCallResult {
  text: string;
  usage: Usage;
  latencyMs: number;
  research: ResearchResult;
}

export function researchModeFor(
  spec: ModelSpec,
  hasKey: boolean
): ResearchResult["mode"] {
  if (spec.provider === "mock") return "mock";
  if (NATIVE_SEARCH_PROVIDERS.has(spec.provider) && hasKey) return "native";
  return "disabled";
}

const DISABLED: ResearchResult = { mode: "disabled", queries: [], sources: [], evidence: [], errors: [] };

export async function researchCall(
  spec: ModelSpec,
  messages: ChatMessage[],
  policy: ResearchPolicy,
  deps: ResearchGatewayDeps,
  opts?: { temperature?: number; maxTokens?: number; timeoutMs?: number; signal?: AbortSignal }
): Promise<ResearchCallResult> {
  if (!policy.enabled) {
    const res = await deps.generate({ spec, messages, ...opts });
    return { text: res.text, usage: res.usage, latencyMs: res.latencyMs, research: DISABLED };
  }

  const hasKey = (await getApiKey(spec.provider)) != null;
  const mode = researchModeFor(spec, hasKey);

  if (mode === "disabled") {
    const res = await deps.generate({ spec, messages, ...opts });
    return { text: res.text, usage: res.usage, latencyMs: res.latencyMs, research: DISABLED };
  }

  const res = await deps.generate({ spec, messages, search: policy, ...opts });
  return {
    text: res.text,
    usage: res.usage,
    latencyMs: res.latencyMs,
    research:
      res.research ??
      { mode, queries: [], sources: [], evidence: [], errors: ["no_research_data"] },
  };
}
