import type { WorkflowProgress } from "@/contracts/workflow";
import { getStore } from "@/lib/store";

const progressCache = new Map<string, WorkflowProgress[]>();

export async function recordProgress(runId: string, progress: WorkflowProgress) {
  const list = progressCache.get(runId) ?? [];
  const index = list.findIndex((p) => p.step === progress.step);
  if (index >= 0) list[index] = progress;
  else list.push(progress);
  progressCache.set(runId, list);

  try {
    const store = await getStore();
    await store.setRunProgress(runId, list);
  } catch {
    // Persistance best-effort : la progression reste disponible via le cache mémoire.
  }
}

export async function getProgress(runId: string): Promise<WorkflowProgress[]> {
  const cached = progressCache.get(runId);
  if (cached) return cached;
  try {
    return (await getStore()).getRunProgress(runId);
  } catch {
    return [];
  }
}

export async function clearProgress(runId: string) {
  progressCache.delete(runId);
  try {
    await (await getStore()).clearRunProgress(runId);
  } catch {
    // Best-effort : le cache mémoire est déjà nettoyé.
  }
}