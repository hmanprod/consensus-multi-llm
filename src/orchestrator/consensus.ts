import type { AnalysisResult, ComparisonB1, ConsensusB2, DisagreementPoint, DisagreementType } from "@/contracts/workflow";
import type { OrchestrationConfig } from "@/contracts/workflow";
import { analyze, jaccard } from "./analysis";

const PENALTY: Record<DisagreementType, number> = {
  formulation: 5,
  hypothesis: 10,
  factual: 20,
  conclusion_changing: 25,
};

export function classifyDisagreement(a: string, b: string): DisagreementType {
  const A = analyze(a);
  const B = analyze(b);
  if (A.hasNumbers && B.hasNumbers) return "factual";
  if (A.hasUncertainty || B.hasUncertainty) return "hypothesis";
  if (A.hasRecommendation !== B.hasRecommendation) return "conclusion_changing";
  return "formulation";
}

export function buildConsensus(
  analyses: AnalysisResult[],
  comparison: ComparisonB1,
  config: OrchestrationConfig
): ConsensusB2 {
  const n = analyses.length;

  const pairs = [] as { a: string; b: string }[];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ a: analyses[i].text, b: analyses[j].text });
    }
  }
  const avgJaccard =
    pairs.length === 0
      ? 1
      : pairs.reduce((acc, p) => acc + jaccard(analyze(p.a).terms, analyze(p.b).terms), 0) / pairs.length;

  const disagreements: DisagreementPoint[] = comparison.contradictions.map((c) => ({
    topic: c.topic,
    type: classifyDisagreement(c.positions[0] ?? "", c.positions[1] ?? ""),
    analystIndexes: c.analystIndexes,
    description: c.topic,
  }));

  const penalty = disagreements.reduce((acc, d) => acc + PENALTY[d.type], 0);
  const score = Math.max(0, Math.min(100, Math.round(avgJaccard * 100) - penalty));

  const avgSentences =
    analyses.reduce((acc, a) => acc + analyze(a.text).sentences.length, 0) / Math.max(1, n);
  const infoCoverage = Math.min(30, Math.round(avgSentences * 6));
  const confidence = Math.max(0, Math.min(95, 45 + infoCoverage + (analyses.every((a) => analyze(a.text).hasNumbers) ? 15 : 0)));

  const missingInfo: string[] = [];
  if (analyses.some((a) => analyze(a.text).hasUncertainty)) {
    missingInfo.push("Points traités comme hypothèses : à confirmer avec des sources ou des données.");
  }
  if (avgSentences < 3) {
    missingInfo.push("Analyses courtes : informations complémentaires recommandées.");
  }

  const hasHardDisagreement = disagreements.some((d) => d.type === "factual" || d.type === "conclusion_changing");
  const status: ConsensusB2["status"] = hasHardDisagreement
    ? "major_disagreement"
    : score < config.minAgreementScore
      ? "partial"
      : confidence < 40
        ? "insufficient_info"
        : "consensus_reached";

  const targetedAnalystIndexes = hasHardDisagreement
    ? [...new Set(disagreements.filter((d) => d.type === "factual" || d.type === "conclusion_changing").flatMap((d) => d.analystIndexes))]
    : [];

  return {
    status,
    score,
    confidence,
    agreements: comparison.convergences.slice(0, 8),
    disagreements,
    missingInfo,
    recommendedAction: defaultAction(status, score, targetedAnalystIndexes),
    targetedRoundTriggered: hasHardDisagreement,
    targetedAnalystIndexes,
  };
}

function defaultAction(status: ConsensusB2["status"], score: number, targeted: number[]): string {
  switch (status) {
    case "consensus_reached":
      return `Consensus solide (score ${score}/100) : produire la synthèse finale.`;
    case "partial":
      return "Consensus partiel : nuancer la synthèse et signaler les divergences restantes.";
    case "major_disagreement":
      return `Désaccord important détecté chez les analystes ${targeted.map((i) => `#${i + 1}`).join(", ")} : déclencher un round ciblé.`;
    case "insufficient_info":
      return "Informations insuffisantes : demander des précisions ou limiter la portée de la synthèse.";
    case "budget_exceeded":
      return "Budget dépassé : clore avec la synthèse partielle et expliciter les limites.";
  }
}