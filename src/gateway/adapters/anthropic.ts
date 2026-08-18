import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import type { ResearchEvidence, ResearchSource } from "@/contracts/research";
import { httpJson, time, toUsage } from "./base";
import { sourceTypeFromUrl, toResearchResult, uid } from "./research-utils";

interface AnthropicCitation {
  type?: string;
  url?: string;
  title?: string;
  cited_text?: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  citations?: AnthropicCitation[];
  content?: Array<{ type?: string; url?: string; title?: string }>;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

function toAnthropicMessages(messages: GenerationRequest["messages"]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

function parseSearchContent(
  value: AnthropicResponse,
  provider: string
): { sources: ResearchSource[]; evidence: ResearchEvidence[] } {
  const sources: ResearchSource[] = [];
  const sourceIdByUrl = new Map<string, string>();
  const evidence: ResearchEvidence[] = [];

  const ensureSource = (url: string, title: string, cited: string): string | null => {
    if (!url) return null;
    const existing = sourceIdByUrl.get(url);
    if (existing) return existing;
    const id = uid("src");
    sourceIdByUrl.set(url, id);
    sources.push({
      id,
      url,
      title: title || "",
      excerpt: cited || "",
      provider,
      sourceType: sourceTypeFromUrl(url),
      retrievedAt: new Date().toISOString(),
      accessible: true,
    });
    return id;
  };

  for (const block of value.content ?? []) {
    if (block.type === "web_search_tool_result") {
      for (const part of block.content ?? []) {
        if (part.url) ensureSource(part.url, part.title ?? "", "");
      }
    }
  }
  for (const block of value.content ?? []) {
    if (block.type !== "text" || !block.citations) continue;
    for (const c of block.citations ?? []) {
      if (!c.url) continue;
      const sid = ensureSource(c.url, c.title ?? "", c.cited_text ?? "");
      if (sid && c.cited_text) {
        evidence.push({ id: uid("ev"), claim: c.cited_text, sourceIds: [sid], confidence: "high" });
      }
    }
  }

  return { sources, evidence };
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

    const body: Record<string, unknown> = {
      model: req.spec.model,
      messages: toAnthropicMessages(req.messages),
      max_tokens: req.maxTokens ?? 2048,
    };
    if (system) body.system = system;
    if (req.search?.enabled) {
      body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: req.search.maxSearches }];
    }

    const { value, latencyMs } = await time(async () =>
      httpJson<AnthropicResponse>({
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body,
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );

    const text = (value.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    const research = req.search?.enabled
      ? toResearchResult("native", parseSearchContent(value, this.provider), req.search)
      : undefined;

    return {
      text,
      usage: toUsage(value.usage?.input_tokens, value.usage?.output_tokens),
      latencyMs,
      raw: value,
      research,
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
