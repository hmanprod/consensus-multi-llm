import { effectiveConfig, describeProfile } from "../src/config/profiles";
import { runWorkflow } from "../src/orchestrator";
import { generate } from "../src/gateway";

async function main() {
  const config = effectiveConfig("balanced");
  console.log(describeProfile("balanced"));
  console.log("---");

  const question = "Quels sont les avantages et risques d'adopter l'IA générative dans une PME ?";
  const result = await runWorkflow(question, config, { generate });

  console.log("PLAN:", JSON.stringify(result.plan));
  console.log("ANALYSES:", result.analyses.length);
  console.log("CONSENSUS:", result.consensus.status, "score", result.consensus.score, "conf", result.consensus.confidence);
  console.log("DISAGREEMENTS:", result.consensus.disagreements.map((d) => `${d.type}:${d.topic}`));
  console.log("TARGETED:", result.consensus.targetedRoundTriggered, result.consensus.targetedAnalystIndexes);
  console.log("COST:", result.estimatedCostCents, "->", result.actualCostCents, "cents");
  console.log("TOKENS:", result.totalTokens, "LATENCY:", result.totalLatencyMs, "ms");
  console.log("TIMELINE:");
  for (const t of result.timeline) console.log(`  ${t.step} ${t.label} (${t.durationMs}ms)`);
  console.log("SYNTHESIS (first 400):");
  console.log(result.synthesis.slice(0, 400));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});