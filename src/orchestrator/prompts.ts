import type { OrchestrationConfig } from "@/contracts/workflow";

export interface Contribution {
  label: string;
  text: string;
}

export function orchestratorAnalysisPrompt(question: string): { system: string; user: string } {
  return {
    system:
      "You are the ORCHESTRATOR of a multi-LLM collaboration. " +
      "Produce your OWN independent first analysis of the question (ANALYSE A). " +
      "Be concrete, distinguish facts from interpretations, use numbers when possible, and state your stance explicitly. Format: bullet list.",
    user: question,
  };
}

export function analystAnalysisPrompt(question: string, label: string): { system: string; user: string } {
  return {
    system:
      `You are an INDEPENDENT ANALYST (ANALYSE ${label}). ` +
      "Answer the question yourself, without seeing other analysts. " +
      "Be concrete, distinguish facts from interpretations, use numbers when possible, and state your final stance explicitly. Format: bullet list.",
    user: question,
  };
}

export function consolidationPrompt(
  question: string,
  fromLabel: string,
  toLabel: string,
  currentText: string,
  newText: string
): { system: string; user: string } {
  return {
    system:
      "You are the ORCHESTRATOR. You are merging a new independent analysis into your current consolidated analysis. " +
      `Build the consolidated analysis ${toLabel} from ${fromLabel} + new analysis. ` +
      "Keep what holds, resolve contradictions, and produce one coherent merged analysis. Format: bullet list.",
    user: JSON.stringify({ question, currentAnalysis: currentText, newAnalysis: newText }),
  };
}

export function revisionPrompt(
  question: string,
  analystLabel: string,
  myAnalysis: string,
  consolidatedLabel: string,
  consolidatedText: string
): { system: string; user: string } {
  return {
    system:
      "You are an INDEPENDENT ANALYST. You receive the orchestrator's consolidated analysis. " +
      `Revise your OWN initial analysis (ANALYSE ${analystLabel}) by integrating the consolidated analysis (ANALYSE ${consolidatedLabel}). ` +
      "Keep what holds in your analysis, incorporate what strengthens it, " +
      "and clearly mark where you revise your stance or hold it. Format: bullet list.",
    user: JSON.stringify({ question, myInitialAnalysis: myAnalysis, consolidatedAnalysis: consolidatedText }),
  };
}

export function finalSynthesisPrompt(
  question: string,
  contributions: Contribution[]
): { system: string; user: string } {
  return {
    system:
      "You are the ORCHESTRATOR (FINAL SYNTHESIS). Based on the consolidated analysis and the revised analyst analyses, " +
      "write the FINAL ANALYSIS: a clear, nuanced answer in the same language as the question. " +
      "Highlight the agreements, the remaining disagreements, and the limitations. " +
      "Use short paragraphs, then a final 'Limites' section.",
    user: JSON.stringify({ question, contributions }),
  };
}

export function describeConfig(config: OrchestrationConfig): string {
  return [
    `Profile: ${config.profile}`,
    `Analysts: ${config.analysts.length}`,
    `Max budget: ${config.maxBudgetCents} cents`,
  ].join("\n");
}
