"use client";

import { useEffect, useState } from "react";
import type { WorkflowProgress, WorkflowProgressStatus } from "@/contracts/workflow";
import { WORKFLOW_STEPS, formatDuration } from "./workflow-steps";
import { AlertIcon, CheckIcon, CircleIcon, SpinnerIcon, StopIcon } from "./ui/icons";

const STATUS_META: Record<
  WorkflowProgressStatus,
  { label: string; text: string; icon: typeof CircleIcon }
> = {
  pending: { label: "En attente", text: "text-ink-faint", icon: CircleIcon },
  running: { label: "En cours", text: "text-accent", icon: SpinnerIcon },
  done: { label: "Terminé", text: "text-success", icon: CheckIcon },
  error: { label: "Erreur", text: "text-danger", icon: AlertIcon },
};

export function ConversationWorkflow({
  progress,
  startedAt,
  onStop,
}: {
  progress: WorkflowProgress[];
  startedAt?: number;
  onStop?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyse en cours"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <SpinnerIcon size={14} className="animate-spin text-accent motion-reduce:animate-none" />
          Analyse en cours
          {startedAt ? (
            <span className="text-xs font-normal text-ink-faint">{formatDuration(elapsed)}</span>
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

      <ol className="mt-3 space-y-1.5">
        {WORKFLOW_STEPS.map((step) => {
          const event = progress.find((p) => p.step === step.key);
          const status: WorkflowProgressStatus = event?.status ?? "pending";
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const sub =
            event && event.completed !== undefined && event.total !== undefined
              ? `${event.completed}/${event.total}`
              : null;
          return (
            <li key={step.key} className="rounded-lg px-2 py-1.5 transition-colors hover:bg-bg/60">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="relative flex shrink-0 items-center justify-center">
                  <Icon
                    size={16}
                    className={`${meta.text} ${status === "running" ? "animate-spin motion-reduce:animate-none" : ""}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={`font-medium ${status === "pending" ? "text-ink-faint" : "text-ink"}`}>
                      {step.label}
                    </span>
                    <span className={`text-xs ${meta.text}`}>{meta.label}</span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">
                    {event?.detail || step.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-faint">
                  {sub && <span>{sub}</span>}
                  {event?.durationMs && <span>{formatDuration(event.durationMs)}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}