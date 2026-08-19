import type { WorkflowStep } from "@/contracts/workflow";

export const WORKFLOW_STEPS: { key: WorkflowStep; label: string; description: string }[] = [
  {
    key: "A",
    label: "Compréhension de la question",
    description: "Analyse du besoin et identification des critères.",
  },
  {
    key: "B",
    label: "Analyses indépendantes",
    description: "Les analystes produisent leur point de vue.",
  },
  {
    key: "S",
    label: "Mise en commun",
    description: "Les positions sont comparées et consolidées.",
  },
  {
    key: "R",
    label: "Révisions",
    description: "Les analystes réagissent à la consolidation.",
  },
  {
    key: "F",
    label: "Synthèse finale",
    description: "Une recommandation est générée.",
  },
];

export const WORKFLOW_STEP_LABELS = WORKFLOW_STEPS.reduce(
  (acc, s) => {
    acc[s.key] = s.label;
    return acc;
  },
  {} as Record<WorkflowStep, string>
);

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}