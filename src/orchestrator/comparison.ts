import type { ComparisonB1, Contradiction, AnalysisResult } from "@/contracts/workflow";
import { analyze, sentencesOf } from "./analysis";

export function compareAnalyses(analyses: AnalysisResult[]): ComparisonB1 {
  const perAnalyst = analyses.map((a) => ({
    ...analyze(a.text),
    text: a.text,
    index: a.analystIndex,
  }));

  const convergences: string[] = [];
  const contradictions: Contradiction[] = [];
  const uniqueInsights: ComparisonB1["uniqueInsights"] = [];

  const n = analyses.length;
  if (n === 0) return { convergences, contradictions, uniqueInsights };

  const allSentences = perAnalyst.flatMap((a, i) =>
    sentencesOf(a.text).map((s) => ({ s, i }))
  );

  const seenTopics = new Set<string>();
  for (const { s, i } of allSentences) {
    const terms = analyze(s).terms;
    if (terms.size < 2) continue;
    const key = [...terms].sort().join("|");
    if (seenTopics.has(key)) continue;

    const minOverlap = Math.max(1, Math.floor(terms.size * 0.6));
    const mentions = perAnalyst
      .map((a, j) => {
        if (j === i) return true;
        const t = analyze(a.text).terms;
        return [...terms].filter((term) => t.has(term)).length >= minOverlap;
      })
      .map((m, j) => (m ? j : -1))
      .filter((j) => j >= 0);

    if (mentions.length >= Math.max(2, Math.ceil(n * 0.5))) {
      seenTopics.add(key);
      convergences.push(s.slice(0, 200));
    } else if (mentions.length === 1) {
      uniqueInsights.push({ point: s.slice(0, 200), analystIndexes: mentions });
    }
  }

  // Contradictions : mêmes thèmes, positions opposées (négation / nombres / recommandation)
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const A = perAnalyst[a];
      const B = perAnalyst[b];
      const shared = [...A.terms].filter((t) => B.terms.has(t)).slice(0, 5);
      if (shared.length < 2) continue;
      const topic = shared.join(" ");

      const negationConflict = A.hasNegation !== B.hasNegation;
      const recommendationConflict = A.hasRecommendation !== B.hasRecommendation;

      if (negationConflict || recommendationConflict) {
        contradictions.push({
          topic,
          positions: [short(A.text), short(B.text)],
          analystIndexes: [a, b],
        });
      }
    }
  }

  return { convergences, contradictions, uniqueInsights };
}

function short(text: string): string {
  return text.split("\n").find((l) => l.trim().length > 3)?.trim().slice(0, 160) ?? text.slice(0, 160);
}