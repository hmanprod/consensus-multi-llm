import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import { httpJson, time, toUsage } from "./base";

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function toAnthropicMessages(messages: GenerationRequest["messages"]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly provider = "anthropic";
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = this.apiKey;
    if (!apiKey) throw new Error("missing_api_key");
    const system = req.messages.find((m) => m.role === "system")?.content;
    const { value, latencyMs } = await time(async () =>
      httpJson<AnthropicResponse>({
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: {
          model: req.spec.model,
          messages: toAnthropicMessages(req.messages),
          max_tokens: req.maxTokens ?? 2048,
          ...(system ? { system } : {}),
          timeoutMs: req.timeoutMs,
          signal: req.signal,
        },
      })
    );
    const text = (value.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    return {
      text,
      usage: toUsage(value.usage?.input_tokens, value.usage?.output_tokens),
      latencyMs,
      raw: value,
    };
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: "claude-haiku-4", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
        signal: AbortSignal.timeout(15_000),
      });
      return true;
    } catch {
      return false;
    }
  }
}