import type { ResearchPolicy } from "@/contracts/research";

export const DEFAULT_RESEARCH_POLICY: ResearchPolicy = {
  enabled: true,
  maxSearches: 3,
  maxSources: 8,
  maxEvidence: 12,
  timeoutMs: 30_000,
  maxCostCents: 20,
  preferPrimary: true,
};
