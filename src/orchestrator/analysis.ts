const STOPWORDS = new Set(
  "le la les de du des un une et ou mais donc car pour par avec sans sur sous dans en au aux ce cet cette ces qui que quoi dont où comment pourquoi quand qu'est est sont a été être avait ont être sera seraient est-ce".split(
    " "
  )
);

const UNCERTAINTY = /\b(peut-?être|probablement|possiblement|pourrait|pourraient|sans doute|vraisemblablement|hypothèse|hypothèse|à confirmer|conditionnel)\b/i;
const NEGATION = /\b(ne |n'|pas|jamais|contraire|faux|incorrect|tort|refuse)\b/i;
const RECOMMENDATION = /\b(il faut|recommande|recommandé|conclusion|donc|par conséquent|en résumé)\b/i;
const NUMBERS = /\b\d[\d\s.,%€$]*\b/;

export interface AnalysisTokens {
  terms: Set<string>;
  sentences: string[];
  hasNumbers: boolean;
  hasUncertainty: boolean;
  hasNegation: boolean;
  hasRecommendation: boolean;
}

export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

export function sentencesOf(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function analyze(text: string): AnalysisTokens {
  return {
    terms: tokenize(text),
    sentences: sentencesOf(text),
    hasNumbers: NUMBERS.test(text),
    hasUncertainty: UNCERTAINTY.test(text),
    hasNegation: NEGATION.test(text),
    hasRecommendation: RECOMMENDATION.test(text),
  };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export function overlapRatio(a: string, b: string): number {
  const ta = analyze(a);
  const tb = analyze(b);
  return jaccard(ta.terms, tb.terms);
}

export { UNCERTAINTY, NEGATION, RECOMMENDATION, NUMBERS };