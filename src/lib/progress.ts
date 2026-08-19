import type { WorkflowProgress } from "@/contracts/workflow";

const registry = new Map<string, WorkflowProgress[]>();

export function recordProgress(runId: string, progress: WorkflowProgress) {
  const list = registry.get(runId) ?? [];
  const index = list.findIndex((p) => p.step === progress.step);
  if (index >= 0) list[index] = progress;
  else list.push(progress);
  registry.set(runId, list);
}

export function getProgress(runId: string): WorkflowProgress[] {
  return registry.get(runId) ?? [];
}

export function clearProgress(runId: string) {
  registry.delete(runId);
}