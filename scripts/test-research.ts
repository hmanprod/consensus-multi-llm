import {
  type AnalystDossier,
  type ResearchClaim,
  type ResearchEvidence,
  type ResearchPolicy,
  type ResearchResult,
  type ResearchSource,
} from "../src/contracts/research";
import { getProfile } from "../src/config/profiles";
import { MODELS_BY_PROVIDER, OPENAI_COMPATIBLE_BASE_URLS, PROVIDER_LABELS } from "../src/config/models";
import { runAnalystAgent } from "../src/research/analyst-agent";
import { researchModeFor } from "../src/research/gateway";
import { generate } from "../src/gateway";

const DEFAULTS: ResearchPolicy = {
  enabled: true,
  maxSearches: 3,
  maxSources: 8,
  maxEvidence: 12,
  timeoutMs: 30_000,
  maxCostCents: 20,
  preferPrimary: true,
};

let failures = 0;
function check(cond: boolean, label: string) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`FAIL  ${label}`);
  }
}

async function main() {
  console.log("— Contrats recherche —");

  const source: ResearchSource = {
    id: "s1",
    url: "https://example.com/a",
    title: "Exemple",
    excerpt: "Extrait",
    provider: "gemini",
    sourceType: "primary",
    retrievedAt: new Date().toISOString(),
    accessible: true,
  };
  check(source.id === "s1" && source.sourceType === "primary", "ResearchSource structurée");

  const evidence: ResearchEvidence = {
    id: "e1",
    claim: "Affirmation étayée",
    sourceIds: ["s1"],
    confidence: "high",
  };
  check(evidence.sourceIds.length === 1, "ResearchEvidence reliée à sa source");

  const claim: ResearchClaim = {
    text: "Un fait",
    type: "fact",
    evidenceIds: ["e1"],
    confidence: "medium",
  };
  check(["fact", "interpretation", "hypothesis", "prediction"].includes(claim.type), "ResearchClaim typée");

  const result: ResearchResult = {
    mode: "native",
    queries: ["q1"],
    sources: [source],
    evidence: [evidence],
    errors: [],
  };
  check(result.mode === "native", "ResearchResult trace le mode");

  const dossier: AnalystDossier = {
    analysis: "Analyse",
    conclusion: "Conclusion",
    queries: result.queries,
    sources: result.sources,
    evidence: result.evidence,
    claims: [claim],
    uncertainties: ["Incertitude"],
    mode: result.mode,
  };
  check(dossier.sources.length === 1 && dossier.claims.length === 1, "AnalystDossier complet");
  check(DEFAULTS.enabled && DEFAULTS.maxSearches > 0, "ResearchPolicy par défaut valide");

  console.log("— Configuration serveur —");

  for (const p of ["economical", "best"] as const) {
    const cfg = getProfile(p);
    const labels = cfg.analysts.map((_, i) => String.fromCharCode(66 + i));
    check(cfg.analysts.length > 0, `profil ${p} : ${cfg.analysts.length} analystes`);
    check(new Set(labels).size === labels.length, `profil ${p} : labels A-${labels[labels.length - 1]} uniques`);
    for (const spec of cfg.analysts) {
      check(
        Boolean(MODELS_BY_PROVIDER[spec.provider]?.some((m) => m.slug === spec.model)),
        `profil ${p} : ${spec.provider}/${spec.model} connu`
      );
    }
  }

  for (const p of ["openai", "gemini", "kimi", "xai", "meta", "openrouter", "zenmux"] as const) {
    check(Boolean(PROVIDER_LABELS[p]), `provider ${p} : label présent`);
  }
  for (const p of ["openai", "kimi", "xai", "meta", "zenmux"] as const) {
    check(Boolean(OPENAI_COMPATIBLE_BASE_URLS[p]), `provider ${p} : base URL définie`);
  }

  console.log("— Research Gateway / Analyst Agent —");

  check(researchModeFor({ provider: "gemini", model: "gemini-3.7-flash" }, true) === "native", "mode native si clé présente");
  check(researchModeFor({ provider: "gemini", model: "gemini-3.7-flash" }, false) === "disabled", "mode disabled sans clé");
  check(researchModeFor({ provider: "deepseek", model: "deepseek-v4" }, true) === "disabled", "mode disabled sans outil natif");
  check(researchModeFor({ provider: "meta", model: "muse-spark-1.2" }, true) === "native", "mode native pour meta si clé présente");
  check(researchModeFor({ provider: "openrouter", model: "auto" }, true) === "native", "mode native pour openrouter si clé présente");
  check(researchModeFor({ provider: "zenmux", model: "auto" }, true) === "native", "mode native pour zenmux si clé présente");

  const policy: ResearchPolicy = {
    enabled: true,
    maxSearches: 2,
    maxSources: 4,
    maxEvidence: 6,
    timeoutMs: 30_000,
    maxCostCents: 20,
    preferPrimary: true,
  };

  const agentRes = await runAnalystAgent(
    {
      question: "Quels sont les avantages de l'IA générative pour une PME ?",
      label: "B",
      spec: { provider: "gemini", model: "gemini-3.7-flash" },
      policy,
    },
    { generate }
  );
  check(agentRes.dossier.mode === "native", `analyste : mode ${agentRes.dossier.mode} (clé requise)`);

  console.log("");
  if (failures > 0) {
    console.error(`${failures} échec(s)`);
    process.exit(1);
  }
  console.log("Tous les contrats et la configuration sont valides.");
}

main();
