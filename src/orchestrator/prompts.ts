import type { OrchestrationConfig } from "@/contracts/workflow";

export interface Contribution {
  label: string;
  text: string;
}

export interface SourceRef {
  url: string;
  title: string;
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

export function analystResearchPrompt(question: string, label: string): { system: string; user: string } {
  return {
    system:
      `You are an INDEPENDENT ANALYST (ANALYSE ${label}) with access to a web search tool. ` +
      "Use the web search tool to find and verify current sources before answering. " +
      "Structure your answer in Markdown with these sections:\n" +
      "## Faits vérifiés\nList factual claims; back each one with at least one source URL cited inline.\n" +
      "## Interprétations\nYour reading of those facts.\n" +
      "## Hypothèses\nPlausible claims that are not yet verified.\n" +
      "## Prédictions\nWhat you expect to happen next, if any.\n" +
      "## Incertitudes\nWhat remains unverified or missing.\n" +
      "## Conclusion\nYour final stance.\n" +
      "Cite sources with inline markdown links. " +
      "Do not mention workflow internals, tools, or that you are an AI.",
    user: question,
  };
}

export function consolidationPrompt(
  question: string,
  fromLabel: string,
  toLabel: string,
  currentText: string,
  newText: string,
  currentSources: SourceRef[] = [],
  newSources: SourceRef[] = []
): { system: string; user: string } {
  return {
    system:
      "You are the ORCHESTRATOR. You are merging a new independent analysis into your current consolidated analysis. " +
      `Build the consolidated analysis ${toLabel} from ${fromLabel} + new analysis. ` +
      "Compare the FACTS and their SOURCES, not only the wording. " +
      "Keep what holds, resolve contradictions between sources, and produce one coherent merged analysis. " +
      "Track the provenance of each important fact by citing its source URL inline. " +
      "End with a section '## Contradictions' listing factual disagreements between the two analyses, or 'none' if there are none. Format: Markdown.",
    user: JSON.stringify({ question, currentAnalysis: currentText, newAnalysis: newText, currentSources, newSources }),
  };
}

export function revisionPrompt(
  question: string,
  analystLabel: string,
  myAnalysis: string,
  consolidatedLabel: string,
  consolidatedText: string,
  contradictions?: string
): { system: string; user: string } {
  return {
    system:
      "You are an INDEPENDENT ANALYST. You receive the orchestrator's consolidated analysis. " +
      `Revise your OWN initial analysis (ANALYSE ${analystLabel}) by integrating the consolidated analysis (ANALYSE ${consolidatedLabel}). ` +
      "Keep what holds in your analysis, incorporate what strengthens it, " +
      "and clearly mark where you revise your stance or hold it. " +
      "If contradictions were detected, address them explicitly. " +
      "Keep the markdown sections: Faits vérifiés, Interprétations, Hypothèses, Prédictions, Incertitudes, Conclusion. " +
      "Format: Markdown.",
    user: JSON.stringify({
      question,
      myInitialAnalysis: myAnalysis,
      consolidatedAnalysis: consolidatedText,
      contradictions: contradictions ?? "none",
    }),
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
      "## Informations non vérifiées\n" +
      "List important claims that could not be confirmed by a source.\n\n" +
      "## Sources\n" +
      "List the most important source URLs as markdown links.\n\n" +
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
