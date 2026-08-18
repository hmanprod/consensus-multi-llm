import type { OrchestrationConfig } from "@/contracts/workflow";
import { estimateCost } from "@/gateway/cost";

export function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatBudget(cents: number): string {
  return `${formatEur(cents / 100)} €`;
}

const PROMPT_LEN = 400;

export function estimateRunCostCents(config: OrchestrationConfig): number {
  let total = estimateCost(config.orchestrator, PROMPT_LEN, 400);
  for (const a of config.analysts) {
    total += estimateCost(a, PROMPT_LEN, 500);
    total += estimateCost(config.orchestrator, PROMPT_LEN * 3, 400);
    total += estimateCost(a, PROMPT_LEN * 4, 400);
  }
  total += estimateCost(config.orchestrator, PROMPT_LEN * 6, 700);
  return Math.round(total * 100) / 100;
}

export function formatEstimatedCost(config: OrchestrationConfig): string {
  return formatBudget(estimateRunCostCents(config));
}

export function costLevel(cents: number): "faible" | "moyen" | "élevé" {
  if (cents < 5) return "faible";
  if (cents < 20) return "moyen";
  return "élevé";
}
