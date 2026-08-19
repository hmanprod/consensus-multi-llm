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
  name?: string;
  input?: { query?: string };
  content?: Array<{ type?: string; url?: string; title?: string; error_code?: string }>;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

type AnthropicWireMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

function toAnthropicMessages(messages: GenerationRequest["messages"]): AnthropicWireMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

function parseSearchContent(
  value: AnthropicResponse,
  provider: string
): {
  queries: string[];
  sources: ResearchSource[];
  evidence: ResearchEvidence[];
  errors: string[];
} {
  const queries: string[] = [];
  const sources: ResearchSource[] = [];
  const sourceIdByUrl = new Map<string, string>();
  const evidence: ResearchEvidence[] = [];
  const errors: string[] = [];

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
    if (block.type === "server_tool_use" && block.name === "web_search" && block.input?.query) {
      queries.push(block.input.query);
    }
  }
  for (const block of value.content ?? []) {
    if (block.type === "web_search_tool_result") {
      for (const part of block.content ?? []) {
        if (part.type === "web_search_tool_result_error" && part.error_code) {
          errors.push(`web_search_error:${part.error_code}`);
          continue;
        }
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

  return { queries, sources, evidence, errors };
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

    const messages: AnthropicWireMessage[] = toAnthropicMessages(req.messages);
    const started = Date.now();
    const tool = req.search?.enabled
      ? { type: "web_search_20250305", name: "web_search", max_uses: req.search.maxSearches }
      : undefined;

    const values: AnthropicResponse[] = [];
    const maxIterations = 4;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const timeoutMs = Math.max(1, (req.timeoutMs ?? 60_000) - (Date.now() - started));
      const body: Record<string, unknown> = {
        model: req.spec.model,
        messages,
        max_tokens: req.maxTokens ?? 2048,
      };
      if (system) body.system = system;
      if (tool) body.tools = [tool];

      const { value } = await time(async () =>
        httpJson<AnthropicResponse>({
          url: "https://api.anthropic.com/v1/messages",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body,
          timeoutMs,
          signal: req.signal,
        })
      );
      values.push(value);
      if (value.stop_reason !== "pause_turn" || !value.content?.length) break;
      messages.push({ role: "assistant", content: value.content });
    }

    const text = values
      .flatMap((v) => v.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    let research: GenerationResult["research"];
    if (req.search?.enabled) {
      const queries: string[] = [];
      const sources: ResearchSource[] = [];
      const evidence: ResearchEvidence[] = [];
      const errors: string[] = [];
      const seenUrls = new Set<string>();
      for (const v of values) {
        const parsed = parseSearchContent(v, this.provider);
        for (const q of parsed.queries) queries.push(q);
        for (const s of parsed.sources) {
          if (seenUrls.has(s.url)) continue;
          seenUrls.add(s.url);
          sources.push(s);
        }
        evidence.push(...parsed.evidence);
        errors.push(...parsed.errors);
      }
      research = toResearchResult("native", { queries, sources, evidence, errors }, req.search);
    }

    const last = values[values.length - 1];
    return {
      text,
      usage: toUsage(last?.usage?.input_tokens, last?.usage?.output_tokens),
      latencyMs: Date.now() - started,
      raw: values.length === 1 ? values[0] : values,
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
