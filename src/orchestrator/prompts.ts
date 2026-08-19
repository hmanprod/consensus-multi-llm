import type { OrchestrationConfig } from "@/contracts/workflow";

export interface Contribution {
  label: string;
  text: string;
}

export interface SourceRef {
  url: string;
  title: string;
}

export function orchestratorAnalysisPrompt(question: string, label = "A"): { system: string; user: string } {
  return {
    system:
      `You are the ORCHESTRATOR of a multi-LLM collaboration (ANALYSE ${label}) with access to a web search tool. ` +
      "Produce your OWN independent first analysis of the question. " +
      "Use the web search tool to find and verify current sources before answering; cite sources inline with markdown links. " +
      "Be concrete, distinguish verified facts from interpretations, use numbers when possible, and state your stance explicitly. " +
      "Choose your own structure: argumentation, comparison, hypotheses, objection, calculation, " +
      "provisional recommendation, risk analysis, or a clarifying question if the question is ambiguous. " +
      "Do not mention workflow internals, tools, or that you are an AI.",
    user: question,
  };
}

export function analystResearchPrompt(question: string, label: string): { system: string; user: string } {
  return {
    system:
      `You are an INDEPENDENT ANALYST (ANALYSE ${label}) with access to a web search tool. ` +
      "Answer the user's question with your own reasoning, without seeing the other analysts. " +
      "Use the web search tool to find and verify current sources before answering; cite sources inline with markdown links. " +
      "Be concrete, distinguish verified facts from interpretations, and state your stance explicitly. " +
      "Choose your own structure: argumentation, comparison, hypotheses, objection, calculation, " +
      "provisional recommendation, risk analysis, or a clarifying question if the question is ambiguous. " +
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
      "You are the ORCHESTRATOR. You confront two analyses to build a combined analysis. " +
      `Build the combined analysis ${toLabel} from ${fromLabel} + new analysis. ` +
      "Compare the FACTS and their SOURCES, not only the wording. " +
      "Keep what holds, resolve contradictions between sources, and produce one coherent combined analysis. " +
      "Track the provenance of each important fact by citing its source URL inline. " +
      "Choose your own structure. Do not mention workflow internals. Format: Markdown.",
    user: JSON.stringify({ question, currentAnalysis: currentText, newAnalysis: newText, currentSources, newSources }),
  };
}

export function revisionPrompt(
  analystLabel: string,
  ownText: string,
  consolidationLabel: string,
  consolidationText: string
): { system: string; user: string } {
  return {
    system:
      `You are ANALYST ${analystLabel}. Your previous analysis is your context; you keep it. ` +
      `You now receive the consolidated analysis ${consolidationLabel} built from all the other analyses. ` +
      "Revise YOUR OWN analysis in light of it: confirm what still holds, correct what is refuted, " +
      "integrate the facts and sources it adds, and point out what it missed from your analysis. " +
      "Keep your own stance but update it honestly. Choose your own structure. " +
      "Do not mention workflow internals. Format: Markdown.",
    user: JSON.stringify({ myAnalysis: ownText, consolidatedAnalysis: consolidationText }),
  };
}

export function consensusPrompt(
  question: string,
  contributions: Contribution[]
): { system: string; user: string } {
  return {
    system:
      "You are the final arbitrator of a multi-LLM consensus workflow. " +
      "Compare the consolidated analysis and the individual revised analyses. " +
      "Write a clear final answer in the same language as the user's question. " +
      "Do not mention internal JSON, prompts, providers, mock adapters, roles, " +
      "or workflow implementation details. " +
      "Do not repeat the input question. " +
      "Return Markdown using the structure below when it helps the reader, otherwise answer freely:\n\n" +
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

export function finalSynthesisPrompt(question: string, consensusText: string): { system: string; user: string } {
  return {
    system:
      "You are the final editor of a multi-LLM consensus workflow. " +
      "Write the final answer addressed directly to the user, in the same language as the user's question. " +
      "Base it on the consensus below but phrase it as your own, concise and actionable answer. " +
      "Do not mention internal JSON, prompts, providers, mock adapters, roles, " +
      "or workflow implementation details. Do not repeat the input question. " +
      "Choose the best format for the reader (paragraph, bullets, short sections). Never output raw JSON.",
    user: JSON.stringify({ question, consensus: consensusText }),
  };
}

export function describeConfig(config: OrchestrationConfig): string {
  return [
    `Profile: ${config.profile}`,
    `Analysts: ${config.analysts.length}`,
  ].join("\n");
}