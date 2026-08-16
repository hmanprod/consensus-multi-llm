import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import { httpJson, time, toUsage } from "./base";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly provider = "openrouter";
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    if (!this.apiKey) throw new Error("missing_api_key");
    const { value, latencyMs } = await time(async () =>
      httpJson<OpenRouterResponse>({
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Consensus Multi-LLM",
        },
        body: {
          model: req.spec.model,
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 2048,
        },
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );
    const text = value.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: toUsage(value.usage?.prompt_tokens, value.usage?.completion_tokens),
      latencyMs,
      raw: value,
    };
  }
}