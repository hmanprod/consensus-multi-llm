import type { GenerationRequest, GenerationResult, ProviderAdapter } from "@/contracts/gateway";
import type { ResearchEvidence, ResearchSource } from "@/contracts/research";
import { httpJson, time, toUsage } from "./base";
import { toResearchResult } from "./research-utils";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GeminiGroundingMetadata;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

interface GeminiGroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  groundingSupports?: Array<{
    segment?: { startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
  }>;
}

function toGeminiMessages(messages: GenerationRequest["messages"]) {
  const text = messages.map((m) => m.content).join("\n");
  return [{ role: "user", parts: [{ text }] }];
}

function parseGrounding(
  gm: GeminiGroundingMetadata | undefined,
  provider: string
): { sources: ResearchSource[]; evidence: ResearchEvidence[] } {
  if (!gm) return { sources: [], evidence: [] };

  const excerptByIndex = new Map<number, string>();
  for (const gs of gm.groundingSupports ?? []) {
    for (const idx of gs.groundingChunkIndices ?? []) {
      if (!excerptByIndex.has(idx)) excerptByIndex.set(idx, gs.segment?.text ?? "");
    }
  }

  const sources: ResearchSource[] = [];
  (gm.groundingChunks ?? []).forEach((ch, i) => {
    const url = ch.web?.uri ?? "";
    if (!url) return;
    sources.push({
      id: `g${i}`,
      url,
      title: ch.web?.title ?? "",
      excerpt: excerptByIndex.get(i) ?? "",
      provider,
      sourceType: "unknown",
      retrievedAt: new Date().toISOString(),
      accessible: true,
    });
  });

  const evidence: ResearchEvidence[] = (gm.groundingSupports ?? [])
    .map((gs, i) => ({
      id: `ge${i}`,
      claim: gs.segment?.text ?? "",
      sourceIds: (gs.groundingChunkIndices ?? []).map((idx) => `g${idx}`),
      confidence: "high" as const,
    }))
    .filter((e) => e.claim.length > 0);

  return { sources, evidence };
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
    const body: Record<string, unknown> = {
      contents: toGeminiMessages(req.messages),
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2048,
      },
    };
    // Google Search grounding is silently disabled when a JSON output is requested.
    if (req.search?.enabled) {
      body.tools = [{ google_search: {} }];
      body.generationConfig = { ...(body.generationConfig as object), responseMimeType: undefined };
    }
    const { value, latencyMs } = await time(async () =>
      httpJson<GeminiResponse>({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        headers: {},
        body,
        timeoutMs: req.timeoutMs,
        signal: req.signal,
      })
    );
    const text = (value.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");

    let research: GenerationResult["research"];
    if (req.search?.enabled) {
      const { sources, evidence } = parseGrounding(value.candidates?.[0]?.groundingMetadata, this.provider);
      research = toResearchResult(
        "native",
        {
          queries: value.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [],
          sources,
          evidence,
        },
        req.search
      );
    }

    return {
      text,
      usage: toUsage(value.usageMetadata?.promptTokenCount, value.usageMetadata?.candidatesTokenCount),
      latencyMs,
      raw: value,
      research,
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
