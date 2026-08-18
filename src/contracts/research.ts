export type ResearchMode = "native" | "mock" | "disabled";

export type Confidence = "low" | "medium" | "high";

export type ResearchSourceType = "primary" | "secondary" | "analysis" | "social" | "unknown";

export type ResearchClaimType = "fact" | "interpretation" | "hypothesis" | "prediction";

export interface ResearchPolicy {
  enabled: boolean;
  maxSearches: number;
  maxSources: number;
  maxEvidence: number;
  timeoutMs: number;
  maxCostCents: number;
  preferPrimary: boolean;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  provider: string;
  sourceType: ResearchSourceType;
  publishedAt?: string;
  retrievedAt: string;
  accessible: boolean;
}

export interface ResearchEvidence {
  id: string;
  claim: string;
  sourceIds: string[];
  confidence: Confidence;
}

export interface ResearchClaim {
  text: string;
  type: ResearchClaimType;
  evidenceIds: string[];
  confidence: Confidence;
}

export interface ResearchResult {
  mode: ResearchMode;
  queries: string[];
  sources: ResearchSource[];
  evidence: ResearchEvidence[];
  errors: string[];
}

export interface AnalystDossier {
  analysis: string;
  conclusion: string;
  queries: string[];
  sources: ResearchSource[];
  evidence: ResearchEvidence[];
  claims: ResearchClaim[];
  uncertainties: string[];
  mode: ResearchMode;
}
