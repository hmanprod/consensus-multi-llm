import type { WorkflowStep, WorkflowOutputKind } from "@/contracts/workflow";

export type WorkflowGroup = "independent" | "consolidation" | "revision" | "consensus" | "synthesis";

export interface WorkflowStepItem {
  key: WorkflowStep;
  label: string;
  description: string;
  kind: WorkflowOutputKind;
  group: WorkflowGroup;
  revised?: boolean;
}

export const WORKFLOW_GROUP_LABELS: Record<WorkflowGroup, string> = {
  independent: "Analyses indépendantes",
  consolidation: "Consolidation",
  revision: "Révisions",
  consensus: "Consensus",
  synthesis: "Synthèse",
};

const ANALYST_DESCRIPTIONS = [
  "Analyse initiale de l'orchestrateur (A), avec recherche web si disponible.",
  "Deuxième analyse indépendante (B), sans connaître la précédente.",
  "Troisième analyse indépendante (C), un autre point de vue.",
];

const CONSOLIDATION_DESCRIPTIONS = [
  "Première confrontation des analyses précédentes.",
  "Consolidation complète de toutes les analyses.",
];

const REVISION_DESCRIPTIONS = [
  "Révise sa propre analyse en intégrant la consolidation complète.",
  "Révise sa propre analyse en confrontant la consolidation complète.",
];

export function workflowSteps(analystCount: number): WorkflowStepItem[] {
  const items: WorkflowStepItem[] = [];
  for (let i = 0; i < analystCount; i++) {
    const key = String.fromCharCode(65 + i) as WorkflowStep;
    items.push({
      key,
      label: `Analyse ${key}`,
      description: ANALYST_DESCRIPTIONS[i] ?? "Analyse indépendante de la question.",
      kind: "independent-analysis",
      group: "independent",
    });
  }
  for (let i = 1; i < analystCount; i++) {
    let prefix = "";
    for (let j = 0; j <= i; j++) prefix += String.fromCharCode(65 + j);
    const key = prefix as WorkflowStep;
    items.push({
      key,
      label: `Analyse ${key}`,
      description: CONSOLIDATION_DESCRIPTIONS[i - 1] ?? "Confrontation des analyses précédentes.",
      kind: "combined-analysis",
      group: "consolidation",
      revised: i === analystCount - 1,
    });
  }
  const full = items[items.length - 1]?.key ?? "A";
  for (let i = 1; i < analystCount; i++) {
    const letter = String.fromCharCode(65 + i);
    const key = `${letter}+${full}` as WorkflowStep;
    items.push({
      key,
      label: `Révision ${letter} + ${full}`,
      description: REVISION_DESCRIPTIONS[i - 1] ?? "Révise sa propre analyse en intégrant la consolidation complète.",
      kind: "revision",
      group: "revision",
    });
  }
  items.push({
    key: "S",
    label: "Consensus",
    description: "Compare la consolidation et les révisions pour dégager un accord commun.",
    kind: "consensus",
    group: "consensus",
  });
  items.push({
    key: "F",
    label: "Synthèse finale",
    description: "Réponse finale construite à partir du consensus.",
    kind: "final-synthesis",
    group: "synthesis",
  });
  return items;
}

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

/**
 * Construit un item d'étape à partir d'une clé dynamique (ex. "ABD", "B+AB").
 * Le groupe et le libellé sont déduits de la forme de la clé.
 */
export function dynamicStepItem(key: string): WorkflowStepItem {
  const step = key as WorkflowStep;
  if (step === "S" || step === "F") {
    return {
      key: step,
      label: step === "S" ? "Consensus" : "Synthèse finale",
      description: step === "S"
        ? "Compare la consolidation et les révisions pour dégager un accord commun."
        : "Réponse finale construite à partir du consensus.",
      kind: step === "S" ? "consensus" : "final-synthesis",
      group: step === "S" ? "consensus" : "synthesis",
    };
  }
  if (key.length === 1) {
    return {
      key: step,
      label: `Analyse ${key}`,
      description: "Analyse indépendante de la question.",
      kind: "independent-analysis",
      group: "independent",
    };
  }
  if (key.includes("+")) {
    const [letter, ...rest] = key.split("+");
    return {
      key: step,
      label: `Révision ${letter} + ${rest.join("+")}`,
      description: "Révise sa propre analyse en intégrant la consolidation.",
      kind: "revision",
      group: "revision",
    };
  }
  return {
    key: step,
    label: `Analyse ${key}`,
    description: "Confrontation des analyses précédentes.",
    kind: "combined-analysis",
    group: "consolidation",
  };
}