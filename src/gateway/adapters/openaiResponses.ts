import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import type { ResearchEvidence, ResearchSource } from "@/contracts/research";
import { ProviderError } from "@/gateway/errors";
import { assertText, httpJson, time, toUsage } from "./base";
import { sourceTypeFromUrl, toResearchResult, uid } from "./research-utils";

const RESPONSES_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  xai: "https://api.x.ai/v1",
  meta: "https://api.meta.ai/v1",
  zenmux: "https://zenmux.ai/api/v1",
};

const INCLUDE_BY_PROVIDER: Record<string, string[]> = {
  openai: ["web_search_call.results", "web_search_call.action.sources"],
  meta: ["web_search_call.results"],
  zenmux: ["web_search_call.action.sources"],
};

interface ResponsesAnnotation {
  type?: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

interface ResponsesContentPart {
  type?: string;
  text?: string;
  annotations?: ResponsesAnnotation[];
}

interface ResponsesOutputItem {
  type?: string;
  status?: string;
  action?: {
    query?: string;
    queries?: string[];
    sources?: Array<{ type?: string; url?: string }>;
  };
  results?: Array<{ type?: string; title?: string; url?: string; snippet?: string }>;
  content?: ResponsesContentPart[];
}

interface ResponsesResponse {
  status?: string;
  error?: { message?: string; code?: string };
  output?: ResponsesOutputItem[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

function toResponsesInput(messages: GenerationRequest["messages"]) {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "input_text", text: m.content }],
  }));
}

export class OpenAIResponsesAdapter implements ProviderAdapter {
  readonly provider: string;
  private apiKey: string | null;

  constructor(provider: string, apiKey: string | null) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = this.apiKey;
    if (!apiKey) throw new ProviderError("invalid_key", "missing_api_key");

    const body: Record<string, unknown> = {
      model: req.spec.model,
      input: toResponsesInput(req.messages),
    };
    if (req.search?.enabled) {
      body.tools = [{ type: "web_search" }];
      if (this.provider === "zenmux") body.max_tool_calls = req.search.maxSearches;
      const include = INCLUDE_BY_PROVIDER[this.provider];
      if (include) body.include = include;
    }
    if (req.maxTokens) body.max_output_tokens = req.maxTokens;
    if (req.temperature != null && this.provider === "openai") body.temperature = req.temperature;

    const baseUrl = RESPONSES_BASE_URLS[this.provider];
    const { value, latencyMs } = await time(async () =>
      httpJson<ResponsesResponse>({
        url: `${baseUrl}/responses`,
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );

    if (value.error) {
      throw new ProviderError("http", `provider_response_error: ${value.error.message ?? value.error.code ?? ""}`);
    }
    const failed =
      value.status === "failed" || (value.output ?? []).some((item) => item.status === "failed");
    if (failed) throw new ProviderError("server", "provider_response_failed");

    let text = "";
    const queries: string[] = [];
    const sources: ResearchSource[] = [];
    const sourceIdByUrl = new Map<string, string>();
    const evidence: ResearchEvidence[] = [];

    const ensureSource = (url: string, title: string, snippet: string): string | null => {
      if (!url) return null;
      const existing = sourceIdByUrl.get(url);
      if (existing) return existing;
      const id = uid("src");
      sourceIdByUrl.set(url, id);
      sources.push({
        id,
        url,
        title: title || "",
        excerpt: snippet || "",
        provider: this.provider,
        sourceType: sourceTypeFromUrl(url),
        retrievedAt: new Date().toISOString(),
        accessible: true,
      });
      return id;
    };

    for (const item of value.output ?? []) {
      if (item.type === "web_search_call") {
        if (item.action?.query) queries.push(item.action.query);
        for (const q of item.action?.queries ?? []) queries.push(q);
        for (const r of item.results ?? []) {
          if (r.url) ensureSource(r.url, r.title ?? "", r.snippet ?? "");
        }
        for (const s of item.action?.sources ?? []) {
          if (s.url) ensureSource(s.url, "", "");
        }
      }
      if (item.type === "message") {
        for (const part of item.content ?? []) {
          if (!part.text) continue;
          if (!text) text = part.text;
          for (const a of part.annotations ?? []) {
            if (a.type === "url_citation" && a.url) {
              const sid = ensureSource(a.url, a.title ?? "", "");
              if (sid && a.start_index != null && a.end_index != null && a.end_index > a.start_index) {
                evidence.push({
                  id: uid("ev"),
                  claim: part.text.slice(a.start_index, a.end_index),
                  sourceIds: [sid],
                  confidence: "high",
                });
              }
            }
          }
        }
      }
    }

    const research = req.search?.enabled
      ? toResearchResult("native", { queries, sources, evidence }, req.search)
      : undefined;

    return {
      text: assertText(text),
      usage: toUsage(value.usage?.input_tokens, value.usage?.output_tokens),
      latencyMs,
      raw: value,
      research,
    };
  }
}
