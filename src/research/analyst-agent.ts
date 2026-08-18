import type { GenerationRequest, GenerationResult, ModelSpec, Usage } from "@/contracts/gateway";
import type {
  AnalystDossier,
  ResearchClaim,
  ResearchEvidence,
  ResearchPolicy,
} from "@/contracts/research";
import { analystResearchPrompt } from "@/orchestrator/prompts";
import { researchCall } from "./gateway";

export interface AnalystAgentDeps {
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

export interface AnalystAgentInput {
  question: string;
  label: string;
  spec: ModelSpec;
  policy: ResearchPolicy;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AnalystAgentResult {
  dossier: AnalystDossier;
  usage: Usage;
  latencyMs: number;
}

function extractConclusion(text: string): string {
  let inSection = false;
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      const title = heading[1].toLowerCase();
      if (title.startsWith("conclusion") || title.startsWith("résumé") || title.startsWith("resume")) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) out.push(line);
  }
  return out.length ? out.join(" ").trim() : text.trim();
}

function extractUncertainties(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length < 6) continue;
    if (/incertitude|limite|ne permet pas|à confirmer|non vérifié|à vérifier|manque de donn/i.test(line)) {
      out.push(line.replace(/^[-*+]\s*/, ""));
    }
  }
  return out.slice(0, 8);
}

function claimsFromEvidence(evidence: ResearchEvidence[]): ResearchClaim[] {
  return evidence.map((e) => ({
    text: e.claim,
    type: "fact" as const,
    evidenceIds: [e.id],
    confidence: e.confidence,
  }));
}

export async function runAnalystAgent(
  input: AnalystAgentInput,
  deps: AnalystAgentDeps
): Promise<AnalystAgentResult> {
  const { question, label, spec, policy, maxTokens, timeoutMs, signal } = input;
  const messages = [
    { role: "system" as const, content: analystResearchPrompt(question, label).system },
    { role: "user" as const, content: analystResearchPrompt(question, label).user },
  ];

  const res = await researchCall(
    spec,
    messages,
    policy,
    deps,
    { maxTokens, timeoutMs, signal }
  );

  const analysis = res.text.trim();
  const dossier: AnalystDossier = {
    analysis,
    conclusion: extractConclusion(analysis),
    queries: res.research.queries,
    sources: res.research.sources,
    evidence: res.research.evidence,
    claims: claimsFromEvidence(res.research.evidence),
    uncertainties: [...extractUncertainties(analysis), ...res.research.errors],
    mode: res.research.mode,
  };

  return {
    dossier,
    usage: res.usage,
    latencyMs: res.latencyMs,
  };
}
