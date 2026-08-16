import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import { httpJson, time, toUsage } from "./base";

interface ChatCompletionsResponse {
  choices: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly provider: string;
  private apiKey: string | null;
  private baseUrl: string;

  constructor(provider: string, baseUrl: string, apiKey: string | null) {
    this.provider = provider;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = this.apiKey;
    if (!apiKey) throw new Error("missing_api_key");
    const { value, latencyMs } = await time(async () =>
      httpJson<ChatCompletionsResponse>({
        url: `${this.baseUrl}/chat/completions`,
        headers: { Authorization: `Bearer ${apiKey}` },
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

  async validateCredentials(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}