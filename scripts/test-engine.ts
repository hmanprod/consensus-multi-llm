import { effectiveConfig, describeProfile } from "../src/config/profiles";
import { runWorkflow } from "../src/orchestrator";
import { generate } from "../src/gateway";

async function main() {
  const config = effectiveConfig("economical");
  console.log(describeProfile("economical"));
  console.log("---");

  const question = "Quels sont les avantages et risques d'adopter l'IA générative dans une PME ?";
  const result = await runWorkflow(question, config, { generate });

  console.log("ANALYSE A:", result.analysisA.label, "|", result.analysisA.text.slice(0, 80).replace(/\n/g, " "));
  console.log("INITIALES:", result.initialAnalyses.map((a) => `${a.label} (${a.model.provider}/${a.model.model})`));
  console.log("CONSOLIDEE:", result.consolidated.label, "|", result.consolidated.text.slice(0, 80).replace(/\n/g, " "));
  console.log("REVISIONS:", result.revisedAnalyses.map((a) => a.label));
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