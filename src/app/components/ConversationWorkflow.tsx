"use client";

import { useEffect, useState } from "react";
import type { WorkflowProgress } from "@/contracts/workflow";
import { dynamicStepItem, formatDuration, workflowSteps } from "./workflow-steps";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { SpinnerIcon, StopIcon } from "./ui/icons";

export function ConversationWorkflow({
  progress,
  startedAt,
  analystCount,
  running,
  onStop,
}: {
  progress: WorkflowProgress[];
  startedAt?: number;
  analystCount: number;
  running: boolean;
  onStop?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (!startedAt) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt, running]);

  const baseSteps = workflowSteps(analystCount);
  const knownKeys = new Set(baseSteps.map((s) => s.key));
  const extraKeys = [...new Set(progress.filter((p) => !knownKeys.has(p.step)).map((p) => p.step))];
  const steps = [...baseSteps, ...extraKeys.map((k) => dynamicStepItem(k))];
  const byStep = new Map(progress.map((p) => [p.step, p]));
  const visibleSteps = steps.filter((s) => byStep.has(s.key));

  return (
    <div role="status" aria-live="polite" aria-label="Analyse en cours" className="space-y-3">
      {visibleSteps.map((step) => (
        <WorkflowStepCard key={step.key} step={step} defaultOpen event={byStep.get(step.key)!} />
      ))}

      {running && (
        <div className="flex items-center gap-3 py-1">
          <p className="flex items-center gap-2 text-sm text-ink-secondary">
            <SpinnerIcon size={14} className="animate-spin text-accent motion-reduce:animate-none" />
            <span className="text-sm font-medium text-ink">Analyse en cours</span>
            {startedAt ? (
              <span className="text-xs text-ink-faint">{formatDuration(elapsed)}</span>
            ) : null}
          </p>
          {onStop && (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover"
            >
              <StopIcon size={14} />
              Arrêter
            </button>
          )}
        </div>
      )}
    </div>
  );
}