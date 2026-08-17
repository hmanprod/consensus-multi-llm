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
      "You are the final arbitrator of a multi-LLM consensus workflow. " +
      "Write a clear final answer in the same language as the user's question. " +
      "Do not mention internal JSON, prompts, providers, mock adapters, roles, " +
      "or workflow implementation details. " +
      "Do not repeat the input question. " +
      "Return Markdown using exactly this structure when applicable:\n\n" +
      "## Recommandation\n" +
      "State the answer directly.\n\n" +
      "## Résumé\n" +
      "Use 2 to 4 concise bullet points.\n\n" +
      "## Points d'accord\n" +
      "List the main agreements.\n\n" +
      "## Points de désaccord\n" +
      "List only disagreements that may change the conclusion.\n\n" +
      "## Limites\n" +
      "State uncertainty, missing information, and assumptions.\n\n" +
      "## Prochaine étape\n" +
      "Give one concrete action.\n\n" +
      "Use only the sections that are relevant. Never output raw JSON.",
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
