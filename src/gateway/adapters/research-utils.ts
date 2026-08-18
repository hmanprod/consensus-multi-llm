import type {
  ResearchEvidence,
  ResearchPolicy,
  ResearchResult,
  ResearchSource,
  ResearchSourceType,
} from "@/contracts/research";

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function sourceTypeFromUrl(url: string): ResearchSourceType {
  try {
    const host = new URL(url).hostname;
    if (/\.(gov|gouv|state|mil)\./.test(host)) return "primary";
    if (/\.(edu|ac\.|science|research)\./.test(host)) return "primary";
    if (/(twitter|x|facebook|reddit|linkedin|threads)\.(com|net|org)$/.test(host)) return "social";
  } catch {
    // invalid URL — keep unknown
  }
  return "unknown";
}

export function dedupeSources(sources: ResearchSource[], policy?: ResearchPolicy): ResearchSource[] {
  const seen = new Set<string>();
  const out: ResearchSource[] = [];
  for (const s of sources) {
    const key = s.url.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (policy && out.length >= policy.maxSources) break;
  }
  return out;
}

export function toResearchResult(
  mode: ResearchResult["mode"],
  opts: {
    queries?: string[];
    sources?: ResearchSource[];
    evidence?: ResearchEvidence[];
    errors?: string[];
  },
  policy?: ResearchPolicy
): ResearchResult {
  const sources = dedupeSources(opts.sources ?? [], policy);
  const sourceIds = new Set(sources.map((s) => s.id));
  const evidence = (opts.evidence ?? [])
    .filter((e) => e.sourceIds.length > 0 && e.sourceIds.every((id) => sourceIds.has(id)))
    .slice(0, policy?.maxEvidence ?? 100);
  return {
    mode,
    queries: (opts.queries ?? []).slice(0, policy?.maxSearches ?? 100),
    sources,
    evidence,
    errors: opts.errors ?? [],
  };
}
