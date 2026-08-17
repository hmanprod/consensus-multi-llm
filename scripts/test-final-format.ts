import assert from "node:assert/strict";
import type { ChatMessage, ModelSpec } from "../src/contracts/gateway";
import type { OrchestrationConfig } from "../src/contracts/workflow";
import { getProfile } from "../src/config/profiles";
import { MockAdapter } from "../src/gateway/adapters/mock";
import { generate } from "../src/gateway";
import { runWorkflow } from "../src/orchestrator";
import { finalSynthesisPrompt } from "../src/orchestrator/prompts";
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
  assert.ok(!/\[mock:/i.test(text), `${label}: préfixe [mock:...] détecté`);
  assert.ok(!/R[ée]ponse de r[oô]le/i.test(text), `${label}: préfixe « Réponse de rôle » détecté`);
  assert.ok(!/Contexte re[çc]u/i.test(text), `${label}: préfixe « Contexte reçu » détecté`);
  assert.ok(!text.includes('"question"'), `${label}: JSON interne (question) détecté`);
  assert.ok(!text.includes('"contributions"'), `${label}: JSON interne (contributions) détecté`);
}

function mockConfig(): OrchestrationConfig {
  const base = getProfile("economical");
  const toMock = (spec: ModelSpec): ModelSpec => ({ ...spec, provider: "mock" });
  return {
    ...base,
    orchestrator: toMock(base.orchestrator),
    analysts: base.analysts.map(toMock),
    consensus: toMock(base.consensus),
    synthesis: toMock(base.synthesis),
  };
}

function toMessages(p: { system: string; user: string }): ChatMessage[] {
  return [
    { role: "system", content: p.system },
    { role: "user", content: p.user },
  ];
}

async function main() {
  const question = "Comparer deux stratégies marketing pour une PME";

  // 1. MockAdapter + prompt de synthèse → Markdown structuré, sans JSON
  const mock = new MockAdapter();
  const prompt = finalSynthesisPrompt(question, [
    { label: "ABC", text: "- point 1\n- point 2" },
    { label: "ABCBC", text: "- point 3" },
  ]);
  const gen = await mock.generate({
    spec: { provider: "mock", model: "chatgpt-5.6" },
    messages: toMessages(prompt),
  });
  const mockText = gen.text;
  assertClean(mockText, "MockAdapter synthèse");
  assert.ok(mockText.startsWith("## Recommandation"), "MockAdapter : la synthèse doit commencer par « ## Recommandation »");
  for (const s of REQUIRED_SECTIONS) {
    assert.ok(mockText.includes(s), `MockAdapter : section manquante « ${s} »`);
  }
  assert.ok(mockText.includes(question), "MockAdapter : la question doit apparaître dans la synthèse");

  // 2. sanitizeFinalResponse : nettoie les préfixes techniques
  const dirty = "[mock:chatgpt-5.6] Réponse de rôle arbitre final pour « x ».\n\nContexte reçu.\n\n## Recommandation\nOui.";
  const clean = sanitizeFinalResponse(dirty);
  assert.ok(!/\[mock:/i.test(clean), "sanitize : [mock:...] non retiré");
  assert.ok(!/R[ée]ponse de r[oô]le/i.test(clean), "sanitize : « Réponse de rôle » non retiré");
  assert.ok(!/Contexte re[çc]u/i.test(clean), "sanitize : « Contexte reçu » non retiré");
  assert.ok(clean.startsWith("## Recommandation"), "sanitize : contenu utile conservé");

  // 3. parseConsensusReport : structure extraite
  const report = parseConsensusReport(mockText);
  assert.ok(report, "parseConsensusReport : rapport non détecté");
  assert.ok(report.recommendation.length > 0, "parseConsensusReport : recommandation vide");
  assert.ok(report.summary.length > 0, "parseConsensusReport : résumé vide");
  assert.ok(report.agreements.length > 0, "parseConsensusReport : accords vides");
  assert.ok(report.disagreements.length > 0, "parseConsensusReport : désaccords vides");
  assert.ok(report.limitations.length > 0, "parseConsensusReport : limites vides");
  assert.ok(report.nextSteps.length > 0, "parseConsensusReport : prochaine étape vide");

  // 4. Workflow complet (mode mock) → snapshot du format final
  const result = await runWorkflow(question, mockConfig(), { generate });
  const finalText = result.finalSynthesis.text;
  assertClean(finalText, "Workflow final");
  assert.ok(finalText.startsWith("## Recommandation"), "Workflow : la synthèse doit commencer par « ## Recommandation »");
  for (const s of REQUIRED_SECTIONS) {
    assert.ok(finalText.includes(s), `Workflow : section manquante « ${s} »`);
  }
  assert.ok(result.finalSynthesis.report, "Workflow : report non peuplé");
  assert.equal(
    result.finalSynthesis.report!.recommendation.length > 0,
    true,
    "Workflow : recommandation vide dans le report"
  );

  console.log("PASS — format de sortie final valide");
  console.log("--- Snapshot (extrait) ---");
  console.log(finalText.slice(0, 500));
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});