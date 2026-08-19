import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import type { ResearchEvidence, ResearchSource } from "@/contracts/research";
import { ProviderError } from "@/gateway/errors";
import { assertText, httpJson, time, toUsage } from "./base";
import { sourceTypeFromUrl, toResearchResult, uid } from "./research-utils";

interface OpenRouterAnnotation {
  type?: string;
  url?: string;
  title?: string;
  content?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      annotations?: OpenRouterAnnotation[];
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly provider = "openrouter";
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    if (!this.apiKey) throw new ProviderError("invalid_key", "missing_api_key");
    const body: Record<string, unknown> = {
      model: req.spec.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2048,
    };
    if (req.search?.enabled) {
      body.tools = [
        {
          type: "openrouter:web_search",
          parameters: {
            engine: "auto",
            max_results: 5,
            max_total_results: req.search.maxSearches,
          },
        },
      ];
    }
    const { value, latencyMs } = await time(async () =>
      httpJson<OpenRouterResponse>({
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Consensus Multi-LLM",
        },
        body,
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );
    const text = assertText(value.choices?.[0]?.message?.content);

    let research: GenerationResult["research"];
    if (req.search?.enabled) {
      const sources: ResearchSource[] = [];
      const seen = new Set<string>();
      for (const a of value.choices?.[0]?.message?.annotations ?? []) {
        if (a.type !== "url_citation" || !a.url || seen.has(a.url)) continue;
        seen.add(a.url);
        sources.push({
          id: uid("src"),
          url: a.url,
          title: a.title ?? "",
          excerpt: a.content ?? "",
          provider: this.provider,
          sourceType: sourceTypeFromUrl(a.url),
          retrievedAt: new Date().toISOString(),
          accessible: true,
        });
      }
      const evidence: ResearchEvidence[] = sources
        .filter((s) => s.excerpt)
        .map((s) => ({ id: uid("ev"), claim: s.excerpt.slice(0, 200), sourceIds: [s.id], confidence: "medium" }));
      research = toResearchResult("native", { queries: [], sources, evidence }, req.search);
    }

    return {
      text,
      usage: toUsage(value.usage?.prompt_tokens, value.usage?.completion_tokens),
      latencyMs,
      raw: value,
      research,
    };
  }
}