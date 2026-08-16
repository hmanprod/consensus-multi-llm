import type { OrchestrationConfig } from "@/contracts/workflow";

export function orchestratorPrompt(question: string): { system: string; user: string } {
  return {
    system:
      "You are the ORCHESTRATOR of a multi-LLM consensus system. " +
      "Classify the user question and output ONLY a JSON object with fields: " +
      '{"complexity":"simple|moderate|complex","summary":"one sentence","focusPoints":["...","..."]}.',
    user: question,
  };
}

export function analystPrompt(question: string, focusPoints: string[]): { system: string; user: string } {
  return {
    system:
      "You are an INDEPENDENT ANALYST. Answer the question yourself, without seeing other analysts. " +
      "Be concrete, distinguish facts from interpretations, use numbers when possible, " +
      "and state your final stance explicitly. Format: bullet list.",
    user: [question, "Focus areas: " + focusPoints.join("; ")].join("\n\n"),
  };
}

export function targetedAnalystPrompt(question: string, disagreement: string): { system: string; user: string } {
  return {
    system:
      "You are an ANALYST in a TARGETED ROUND. Another pass found a disagreement involving your previous answer. " +
      "Re-examine that specific point, keep what holds, and clearly state whether you revise your stance or hold it. Format: bullet list.",
    user: [question, "Disagreement to re-examine: " + disagreement].join("\n\n"),
  };
}

export function consensusPrompt(question: string, analyses: string[], score: number): { system: string; user: string } {
  return {
    system:
      "You are the CONSENSUS B2 moderator. Based on the independent analyses, output ONLY a JSON object: " +
      '{"recommendedAction":"next action","missingInfo":["..."],"risks":["..."]}.',
    user: JSON.stringify({ question, agreementScore: score, analyses }),
  };
}

export function synthesisPrompt(
  question: string,
  analyses: string[],
  consensusSummary: string,
  limits: string[]
): { system: string; user: string } {
  return {
    system:
      "You are the FINAL ARBITER. Write a clear, nuanced final synthesis in the same language as the question. " +
      "State the consensus, the remaining disagreements, and the limitations. " +
      "Use short paragraphs, then a final 'Limites' section.",
    user: JSON.stringify({ question, analyses, consensus: consensusSummary, limits }),
  };
}

export function describeConfig(config: OrchestrationConfig): string {
  return [
    `Profile: ${config.profile}`,
    `Analysts: ${config.analysts.length}`,
    `Max budget: ${config.maxBudgetCents} cents`,
    `Min agreement: ${config.minAgreementScore}/100`,
  ].join("\n");
}