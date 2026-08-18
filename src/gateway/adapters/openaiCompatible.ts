import type { GenerationRequest, GenerationResult, ProviderAdapter, Usage } from "@/contracts/gateway";
import type { ResearchEvidence, ResearchSource } from "@/contracts/research";
import { httpJson, time, toUsage } from "./base";
import { sourceTypeFromUrl, toResearchResult, uid } from "./research-utils";

interface ChatCompletionsResponse {
  choices: Array<{ message?: KimiMessage; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  search_results?: Array<{ url?: string; title?: string; content?: string; snippet?: string }>;
}

interface KimiMessage {
  role?: string;
  content?: string | null;
  tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
}

interface KimiArguments {
  query?: string;
  url?: string;
  search_results?: Array<{ url?: string; title?: string; content?: string }>;
}

function collectKimiResearch(
  data: ChatCompletionsResponse,
  provider: string
): { sources: ResearchSource[]; queries: string[] } {
  const sources: ResearchSource[] = [];
  const queries: string[] = [];
  const seen = new Set<string>();

  const push = (url: string, title: string, excerpt: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({
      id: uid("src"),
      url,
      title: title || "",
      excerpt: excerpt || "",
      provider,
      sourceType: sourceTypeFromUrl(url),
      retrievedAt: new Date().toISOString(),
      accessible: true,
    });
  };

  const args: KimiArguments[] = (data.choices?.[0]?.message?.tool_calls ?? []).map((tc) => {
    try {
      return JSON.parse(tc.function?.arguments ?? "{}") as KimiArguments;
    } catch {
      return {};
    }
  });

  for (const a of args) {
    if (a.query) queries.push(a.query);
    if (a.url) push(a.url, "", "");
    for (const r of a.search_results ?? []) push(r.url ?? "", r.title ?? "", r.content ?? "");
  }
  for (const r of data.search_results ?? []) push(r.url ?? "", r.title ?? "", r.content ?? r.snippet ?? "");

  return { sources, queries };
}

function evidenceFromSnippets(sources: ResearchSource[]): ResearchEvidence[] {
  const out: ResearchEvidence[] = [];
  for (const s of sources) {
    if (s.excerpt) {
      out.push({ id: uid("ev"), claim: s.excerpt.slice(0, 200), sourceIds: [s.id], confidence: "medium" });
    }
  }
  return out;
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
    if (this.provider === "kimi" && req.search?.enabled) {
      return this.generateWithKimiSearch(req, apiKey);
    }
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

  private async generateWithKimiSearch(req: GenerationRequest, apiKey: string): Promise<GenerationResult> {
    const started = Date.now();
    const messages: Array<Record<string, unknown>> = req.messages.map((m) => ({ role: m.role, content: m.content }));
    const tool = { type: "builtin_function", function: { name: "$web_search" } };
    const queries: string[] = [];
    const sources: ResearchSource[] = [];
    let text = "";
    let usage: Usage = { promptTokens: 0, completionTokens: 0 };
    const maxRounds = Math.max(1, Math.min(5, req.search?.maxSearches ?? 3));

    for (let round = 0; round < maxRounds; round++) {
      const { value } = await time(async () =>
        httpJson<ChatCompletionsResponse>({
          url: `${this.baseUrl}/chat/completions`,
          headers: { Authorization: `Bearer ${apiKey}` },
          body: {
            model: req.spec.model,
            messages,
            tools: [tool],
            max_completion_tokens: req.maxTokens ?? 2048,
          },
          timeoutMs: req.timeoutMs,
          signal: req.signal,
        })
      );
      const { sources: roundSources, queries: roundQueries } = collectKimiResearch(value, this.provider);
      sources.push(...roundSources);
      queries.push(...roundQueries);
      usage = toUsage(value.usage?.prompt_tokens, value.usage?.completion_tokens);

      const choice = value.choices?.[0];
      const message = choice?.message;
      if (choice?.finish_reason !== "tool_calls" || !message?.tool_calls?.length) {
        text = message?.content ?? "";
        break;
      }

      messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
      let aborted = false;
      for (const tc of message.tool_calls) {
        if (tc.function?.name !== "$web_search") {
          aborted = true;
          break;
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: tc.function?.arguments ?? "{}" });
      }
      if (aborted) {
        text = "";
        break;
      }
    }

    const evidence: ResearchEvidence[] = evidenceFromSnippets(sources);
    const research = toResearchResult("native", { queries, sources, evidence }, req.search);
    return { text, usage, latencyMs: Date.now() - started, research };
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
