import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import { httpJson, time, toUsage } from "./base";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

function toGeminiMessages(messages: GenerationRequest["messages"]) {
  const text = messages.map((m) => m.content).join("\n");
  return [{ role: "user", parts: [{ text }] }];
}

export class GeminiAdapter implements ProviderAdapter {
  readonly provider = "gemini";
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    if (!this.apiKey) throw new Error("missing_api_key");
    const model = req.spec.model.includes("/") ? req.spec.model.split("/").pop() : req.spec.model;
    const { value, latencyMs } = await time(async () =>
      httpJson<GeminiResponse>({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        headers: {},
        body: {
          contents: toGeminiMessages(req.messages),
          generationConfig: {
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxTokens ?? 2048,
          },
        },
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );
    const text = (value.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    return {
      text,
      usage: toUsage(value.usageMetadata?.promptTokenCount, value.usageMetadata?.candidatesTokenCount),
      latencyMs,
      raw: value,
    };
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}