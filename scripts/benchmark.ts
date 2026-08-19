import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { CORPUS } from "../corpus/questions";
import { effectiveConfig, describeProfile } from "../src/config/profiles";
import type { OrchestrationConfig, RunResult } from "../src/contracts/workflow";
import type { ResearchMode } from "../src/contracts/research";
import { runWorkflow } from "../src/orchestrator";
import { generate } from "../src/gateway";

type VariantId = "single-no-search" | "single-search" | "multi-no-search" | "multi-search";

interface RunMetrics {
  id: string;
  question: string;
  mode: ResearchMode;
  costCents: number;
  latencyMs: number;
  tokens: number;
  sources: number;
  evidence: number;
  queries: number;
  contradictions: boolean;
  uncertainties: number;
  unverifiedInReport: number;
  sourcesInReport: number;
  reportParsed: boolean;
  traceability: number;
  error?: string;
}

interface VariantReport {
  variant: VariantId;
  label: string;
  runs: RunMetrics[];
}

const VARIANTS: { id: VariantId; label: string; build: (base: OrchestrationConfig) => OrchestrationConfig }[] = [
  {
    id: "single-no-search",
    label: "Analyste unique, sans recherche",
    build: (base) => {
      const spec = base.analysts[0];
      return { ...base, orchestrator: spec, analysts: [spec], consensus: spec, synthesis: spec, search: false };
    },
  },
  {
    id: "single-search",
    label: "Analyste unique, recherche native",
    build: (base) => {
      const spec = base.analysts[0];
      return { ...base, orchestrator: spec, analysts: [spec], consensus: spec, synthesis: spec, search: true };
    },
  },
  {
    id: "multi-no-search",
    label: "Multi-analystes (3), sans recherche",
    build: (base) => ({ ...base, search: false }),
  },
  {
    id: "multi-search",
    label: "Multi-analystes + consolidation AB → ABC (recherche native)",
    build: (base) => ({ ...base, search: true }),
  },
];

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=")[1];
}

function uniqueSources(result: RunResult): Set<string> {
  const set = new Set<string>();
  for (const a of result.analyses) {
    for (const s of a.dossier?.sources ?? []) set.add(s.url);
  }
  return set;
}

function runMetrics(result: RunResult, corpusId: string, question: string): RunMetrics {
  const modes = result.analyses.map((a) => a.dossier?.mode).filter(Boolean) as ResearchMode[];
  const mode: ResearchMode = modes.includes("native") ? "native" : modes.includes("mock") ? "mock" : "disabled";
  const sources = uniqueSources(result);
  let evidenceCount = 0;
  let resolvableCount = 0;
  for (const a of result.analyses) {
    const byId = new Set((a.dossier?.sources ?? []).map((s) => s.id));
    for (const ev of a.dossier?.evidence ?? []) {
      evidenceCount += 1;
      if (ev.sourceIds.some((id) => byId.has(id))) resolvableCount += 1;
    }
  }
  const consensusText = result.consensus.text;
  const contradictionLine = consensusText
    .split("\n")
    .find((l) => /^#{1,4}\s+Contradictions/i.test(l));
  const contradictionText = contradictionLine
    ? consensusText.slice(consensusText.indexOf(contradictionLine))
    : "";
  const contradictions =
    contradictionText.length > 0 && !/^\s*none\s*$/i.test(contradictionText.trim().replace(/^#{1,4}\s+Contradictions/i, "").trim());
  const report = result.finalSynthesis.report;
  return {
    id: corpusId,
    question,
    mode,
    costCents: result.actualCostCents,
    latencyMs: result.totalLatencyMs,
    tokens: result.totalTokens,
    sources: sources.size,
    evidence: evidenceCount,
    queries: result.analyses.reduce((acc, a) => acc + (a.dossier?.queries.length ?? 0), 0),
    contradictions,
    uncertainties: result.analyses.reduce((acc, a) => acc + (a.dossier?.uncertainties.length ?? 0), 0),
    unverifiedInReport: report?.unverified?.length ?? 0,
    sourcesInReport: report?.sources?.length ?? 0,
    reportParsed: Boolean(report),
    traceability: evidenceCount > 0 ? resolvableCount / evidenceCount : 0,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function main() {
  const limit = Number(argValue("limit") ?? "0");
  const only = argValue("variants")?.split(",") as VariantId[] | undefined;
  const corpus = limit > 0 ? CORPUS.slice(0, limit) : CORPUS;

  console.log(`Benchmark consensus — ${corpus.length} questions`);
  console.log(describeProfile("economical"));
  console.log("---");

  const reports: VariantReport[] = [];
  for (const v of VARIANTS) {
    if (only && !only.includes(v.id)) continue;
    const base = effectiveConfig("economical");
    const config = v.build(base);
    const runs: RunMetrics[] = [];
    for (const c of corpus) {
      try {
        const result = await runWorkflow(c.question, config, { generate });
        runs.push(runMetrics(result, c.id, c.question));
        console.log(`  [${v.id}] ${c.id} ok · ${runs[runs.length - 1].mode} · ${runs[runs.length - 1].latencyMs} ms`);
      } catch (err) {
        runs.push({
          id: c.id,
          question: c.question,
          mode: "disabled",
          costCents: 0,
          latencyMs: 0,
          tokens: 0,
          sources: 0,
          evidence: 0,
          queries: 0,
          contradictions: false,
          uncertainties: 0,
          unverifiedInReport: 0,
          sourcesInReport: 0,
          reportParsed: false,
          traceability: 0,
          error: err instanceof Error ? err.message : String(err),
        });
        console.log(`  [${v.id}] ${c.id} ERREUR ${err instanceof Error ? err.message : err}`);
      }
    }
    reports.push({ variant: v.id, label: v.label, runs });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(process.cwd(), "benchmark-results");
  mkdirSync(dir, { recursive: true });

  const json = JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2);
  writeFileSync(resolve(dir, `report-${ts}.json`), json);
  writeFileSync(resolve(dir, "latest.json"), json);

  const md = renderMarkdown(reports, corpus);
  writeFileSync(resolve(dir, `report-${ts}.md`), md);
  writeFileSync(resolve(dir, "latest.md"), md);

  console.log("");
  console.log(`Rapports écrits dans benchmark-results/ (${ts})`);
}

function aggregate(runs: RunMetrics[], field: keyof Pick<RunMetrics, "sources" | "evidence" | "queries" | "uncertainties" | "unverifiedInReport" | "sourcesInReport">): number {
  return runs.reduce((acc, r) => acc + (r[field] as number), 0);
}

function renderMarkdown(reports: VariantReport[], corpus: typeof CORPUS): string {
  const lines: string[] = [];
  lines.push("# Rapport de benchmark — consensus multi-LLM");
  lines.push("");
  lines.push(`Date : ${new Date().toISOString()}`);
  lines.push(`Questions benchmarkées : ${corpus.length} / ${CORPUS.length}`);
  lines.push("");
  lines.push("## Comparaison des variantes");
  lines.push("");
  lines.push("| Variante | Mode | Coût moy. (cents) | Latence moy. (s) | Tokens moy. | Sources | Preuves | Requêtes | Traceabilité | Contradictions | Non vérifiées |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of reports) {
    const rs = r.runs;
    const ok = rs.filter((x) => !x.error);
    const cost = mean(ok.map((x) => x.costCents));
    const lat = mean(ok.map((x) => x.latencyMs)) / 1000;
    const tok = Math.round(mean(ok.map((x) => x.tokens)));
    const trace = mean(ok.map((x) => x.traceability)) * 100;
    const contradictions = ok.filter((x) => x.contradictions).length;
    const unverified = aggregate(ok, "unverifiedInReport");
    const mode = new Set(ok.map((x) => x.mode)).values().next().value ?? "disabled";
    lines.push(
      `| ${r.label} | ${mode} | ${cost.toFixed(2)} | ${lat.toFixed(1)} | ${tok} | ${aggregate(ok, "sources")} | ${aggregate(ok, "evidence")} | ${aggregate(ok, "queries")} | ${trace.toFixed(0)}% | ${contradictions}/${ok.length} | ${unverified} |`
    );
  }
  lines.push("");
  lines.push("## Notes méthodologiques");
  lines.push("");
  lines.push("- « Traceabilité » = part des preuves (evidence) dont la source est résolue dans le dossier correspondant.");
  lines.push("- « Contradictions » = nombre de runs où l'orchestrateur a listé des désaccords factuels à la consolidation.");
  lines.push("- « Non vérifiées » = affirmations signalées comme non confirmées dans la synthèse finale.");
  lines.push("- Les scores qualitatifs (exactitude, couverture, qualité des sources) nécessitent un jugement externe ou un LLM-juge ; colonnes prévues dans la grille manuelle ci-dessous.");
  lines.push("");
  lines.push("## Grille d'évaluation qualitative (manuelle ou LLM-juge)");
  lines.push("");
  lines.push("| Question | Variante | Exactitude (1-5) | Couverture (1-5) | Qualité des sources (1-5) | Traçabilité (1-5) | Contradictions gérées (1-5) | Coût | Latence |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of reports) {
    for (const run of r.runs) {
      lines.push(
        `| ${run.id} | ${r.variant} |  |  |  |  |  | ${run.costCents.toFixed(2)} c | ${(run.latencyMs / 1000).toFixed(1)} s |`
      );
    }
  }
  lines.push("");
  lines.push("## Corpus");
  lines.push("");
  lines.push(`| ID | Catégorie | Question | Factuel attendu |`);
  lines.push("|---|---|---|---|");
  for (const q of corpus) {
    lines.push(`| ${q.id} | ${q.category} | ${q.question} | ${q.expectFactual ? "oui" : "non"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
