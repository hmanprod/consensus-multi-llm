import assert from "node:assert/strict";
import type { OrchestrationConfig } from "../src/contracts/workflow";
import { getProfile } from "../src/config/profiles";
import { generate } from "../src/gateway";
import { runWorkflow } from "../src/orchestrator";
import { consensusPrompt } from "../src/orchestrator/prompts";
import { parseConsensusReport } from "../src/lib/consensus-report";
import { sanitizeFinalResponse } from "../src/lib/sanitize";

const REQUIRED_SECTIONS = [
  "## Recommandation",
  "## Résumé",
  "## Points d'accord",
  "## Points de désaccord",
  "## Limites",
  "## Prochaine étape",
];

function assertClean(text: string, label: string) {
  assert.ok(!/R[ée]ponse de r[oô]le/i.test(text), `${label}: préfixe « Réponse de rôle » détecté`);
  assert.ok(!/Contexte re[çc]u/i.test(text), `${label}: préfixe « Contexte reçu » détecté`);
  assert.ok(!text.includes('"question"'), `${label}: JSON interne (question) détecté`);
  assert.ok(!text.includes('"contributions"'), `${label}: JSON interne (contributions) détecté`);
}

async function main() {
  const question = "Comparer deux stratégies marketing pour une PME";
  const config: OrchestrationConfig = getProfile("economical");

  // 1. Prompt de consensus : structure Markdown attendue
  const prompt = consensusPrompt(question, [
    { label: "ABC", text: "- point 1\n- point 2" },
    { label: "B+ABC", text: "- point 3" },
  ]);
  assert.ok(prompt.system.length > 0 && prompt.user.length > 0, "consensusPrompt : prompt non vide");
  assert.ok(prompt.user.includes(question), "consensusPrompt : la question doit apparaître");

  // 2. sanitizeFinalResponse : nettoie les préfixes techniques
  const dirty = "[openai:chatgpt-5.6] Réponse de rôle arbitre final pour « x ».\n\nContexte reçu.\n\n## Recommandation\nOui.";
  const clean = sanitizeFinalResponse(dirty);
  assert.ok(!/R[ée]ponse de r[oô]le/i.test(clean), "sanitize : « Réponse de rôle » non retiré");
  assert.ok(!/Contexte re[çc]u/i.test(clean), "sanitize : « Contexte reçu » non retiré");
  assert.ok(clean.startsWith("## Recommandation"), "sanitize : contenu utile conservé");

  // 3. Workflow complet (providers réels, clés requises) → snapshot du consensus structuré
  const result = await runWorkflow(question, config, { generate });
  const consensusText = result.consensus.text;
  assertClean(consensusText, "Workflow consensus");
  assert.ok(consensusText.startsWith("## Recommandation"), "Workflow : le consensus doit commencer par « ## Recommandation »");
  for (const s of REQUIRED_SECTIONS) {
    assert.ok(consensusText.includes(s), `Workflow : section manquante « ${s} »`);
  }
  assert.ok(result.consensus.report, "Workflow : report consensus non peuplé");
  assert.equal(
    result.consensus.report!.recommendation.length > 0,
    true,
    "Workflow : recommandation vide dans le report consensus"
  );
  const report = parseConsensusReport(consensusText);
  assert.ok(report, "parseConsensusReport : rapport non détecté");
  assert.ok(report.recommendation.length > 0, "parseConsensusReport : recommandation vide");
  assert.ok(report.summary.length > 0, "parseConsensusReport : résumé vide");
  assert.ok(report.agreements.length > 0, "parseConsensusReport : accords vides");
  assert.ok(report.disagreements.length > 0, "parseConsensusReport : désaccords vides");
  assert.ok(report.limitations.length > 0, "parseConsensusReport : limites vides");
  assert.ok(report.nextSteps.length > 0, "parseConsensusReport : prochaine étape vide");
  assert.ok(result.revisions.length > 0, "Workflow : aucune révision produite");
  const finalText = result.finalSynthesis.text;
  assertClean(finalText, "Workflow final");

  console.log("PASS — format de sortie final valide");
  console.log("--- Snapshot (extrait consensus) ---");
  console.log(consensusText.slice(0, 500));
  console.log("--- Snapshot (réponse finale) ---");
  console.log(finalText.slice(0, 300));
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});