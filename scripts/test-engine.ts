import { effectiveConfig, describeProfile } from "../src/config/profiles";
import { runWorkflow } from "../src/orchestrator";
import { generate } from "../src/gateway";

async function main() {
  const config = effectiveConfig("economical");
  console.log(describeProfile("economical"));
  console.log("---");

  const question = "Quels sont les avantages et risques d'adopter l'IA générative dans une PME ?";
  const result = await runWorkflow(question, config, { generate });

  console.log("ANALYSES:", result.analyses.map((a) => `${a.label} (${a.model.provider}/${a.model.model})`));
  console.log("CONSOLIDATIONS:", result.consolidations.map((a) => a.label));
  console.log("REVISIONS:", result.revisions.map((a) => `${a.label} (${a.model.provider}/${a.model.model})`));
  console.log("CONSENSUS:", result.consensus.label, "|", result.consensus.model.provider, "|", result.consensus.report ? "report ok" : "report absent");
  console.log("COST:", result.estimatedCostCents, "->", result.actualCostCents, "cents");
  console.log("TOKENS:", result.totalTokens, "LATENCY:", result.totalLatencyMs, "ms");
  console.log("TIMELINE:");
  for (const t of result.timeline) console.log(`  ${t.step} ${t.label} (${t.durationMs}ms)`);
  console.log("FINAL (first 400):");
  console.log(result.finalSynthesis.text.slice(0, 400));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});