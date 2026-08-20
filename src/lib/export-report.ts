import type { AnalysisOutput, RunResult } from "@/contracts/workflow";
import type { ResearchSource } from "@/contracts/research";
import { formatBudget } from "@/lib/format";

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

function formatModel(model: AnalysisOutput["model"]): string {
  return `${model.provider}/${model.model}`;
}

function formatAnalysis(a: AnalysisOutput, level: number): string {
  const lines: string[] = [];
  lines.push(heading(level, a.label));
  lines.push(`*Modèle : ${formatModel(a.model)}*`);
  lines.push("");
  const text = a.text.trim();
  lines.push(text || "_(Contenu indisponible)_");
  lines.push("");
  return lines.join("\n");
}

function formatReportSection(title: string, items: string[] | undefined): string[] {
  const values = (items ?? []).filter((i) => i.trim().length > 0);
  if (values.length === 0) return [];
  const lines: string[] = [];
  lines.push(heading(4, title));
  lines.push("");
  for (const v of values) {
    lines.push(`- ${v.trim()}`);
  }
  lines.push("");
  return lines;
}

function formatConsensusReport(report: NonNullable<RunResult["consensus"]["report"]>): string[] {
  const lines: string[] = [];
  if (report.recommendation.trim()) {
    lines.push(heading(4, "Recommandation"));
    lines.push("");
    lines.push(report.recommendation.trim());
    lines.push("");
  }
  lines.push(...formatReportSection("Résumé", report.summary));
  lines.push(...formatReportSection("Points d'accord", report.agreements));
  lines.push(...formatReportSection("Points de désaccord", report.disagreements));
  lines.push(...formatReportSection("Limites", report.limitations));
  lines.push(...formatReportSection("Informations non vérifiées", report.unverified));
  lines.push(...formatReportSection("Prochaine étape", report.nextSteps));
  if (report.sources && report.sources.length > 0) {
    lines.push(heading(4, "Sources citées"));
    lines.push("");
    for (const s of report.sources) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }
  return lines;
}

function collectSources(result: RunResult): ResearchSource[] {
  const seen = new Set<string>();
  const out: ResearchSource[] = [];
  const push = (sources: ResearchSource[] | undefined) => {
    for (const s of sources ?? []) {
      const key = s.url;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  };
  for (const a of result.analyses) push(a.dossier?.sources);
  for (const c of result.consolidations) push(c.dossier?.sources);
  return out;
}

function formatSources(sources: ResearchSource[]): string[] {
  if (sources.length === 0) return [];
  const lines: string[] = [];
  lines.push(heading(2, "Sources"));
  lines.push("");
  for (const s of sources) {
    const title = s.title.trim();
    lines.push(`- ${title ? `[${title}](${s.url})` : s.url}`);
  }
  lines.push("");
  return lines;
}

export function buildRunReportMarkdown(question: string, result: RunResult): string {
  const lines: string[] = [];

  lines.push(heading(1, "Consensus Multi-LLM — Process complet"));
  lines.push("");
  lines.push(`**Question :** ${question}`);
  lines.push(`**Généré le :** ${new Date().toLocaleString("fr-FR")}`);
  lines.push(`**Coût réel :** ${formatBudget(result.actualCostCents)}`);
  lines.push(`**Tokens :** ${result.totalTokens}`);
  lines.push(`**Durée :** ${(result.totalLatencyMs / 1000).toFixed(1)} s`);
  lines.push("");

  const analyses = result.analyses;
  const [orchestratorAnalysis, ...analystAnalyses] = analyses;

  lines.push(heading(2, "Analyse A"));
  lines.push("");
  if (orchestratorAnalysis) {
    lines.push(`*Modèle : ${formatModel(orchestratorAnalysis.model)}*`);
    lines.push("");
    lines.push(orchestratorAnalysis.text.trim() || "_(Contenu indisponible)_");
  }
  lines.push("");

  if (analystAnalyses.length > 0) {
    lines.push(heading(2, "Analyses des analystes"));
    lines.push("");
    for (const a of analystAnalyses) {
      lines.push(formatAnalysis(a, 3));
    }
  }

  if (result.consolidations.length > 0) {
    lines.push(heading(2, "Consolidations"));
    lines.push("");
    for (const c of result.consolidations) {
      lines.push(formatAnalysis(c, 3));
    }
  }

  if (result.revisions.length > 0) {
    lines.push(heading(2, "Révisions"));
    lines.push("");
    for (const r of result.revisions) {
      lines.push(formatAnalysis(r, 3));
    }
  }

  lines.push(heading(2, "Consensus"));
  lines.push("");
  lines.push(`*Modèle : ${formatModel(result.consensus.model)}*`);
  lines.push("");
  lines.push(result.consensus.text.trim() || "_(Contenu indisponible)_");
  lines.push("");
  if (result.consensus.report) {
    lines.push(...formatConsensusReport(result.consensus.report));
  }

  lines.push(heading(2, "Synthèse finale"));
  lines.push("");
  lines.push(`*Modèle : ${formatModel(result.finalSynthesis.model)}*`);
  lines.push("");
  lines.push(result.finalSynthesis.text.trim() || "_(Contenu indisponible)_");
  lines.push("");

  lines.push(...formatSources(collectSources(result)));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}