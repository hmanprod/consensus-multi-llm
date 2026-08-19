"use client";

import { useEffect, useState } from "react";
import type { WorkflowProgress, WorkflowProgressStatus } from "@/contracts/workflow";
import { dynamicStepItem, formatDuration, workflowSteps, type WorkflowStepItem } from "./workflow-steps";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  AlertIcon,
  CheckIcon,
  CircleIcon,
  PencilIcon,
  SearchIcon,
  SpinnerIcon,
  StopIcon,
} from "./ui/icons";

const STATUS_META: Record<
  WorkflowProgressStatus,
  { label: string; text: string; icon: typeof CircleIcon }
> = {
  pending: { label: "En attente", text: "text-ink-faint", icon: CircleIcon },
  searching: { label: "Recherche…", text: "text-accent", icon: SearchIcon },
  writing: { label: "Rédaction…", text: "text-accent", icon: PencilIcon },
  running: { label: "En cours", text: "text-accent", icon: SpinnerIcon },
  done: { label: "Terminé", text: "text-success", icon: CheckIcon },
  error: { label: "Erreur", text: "text-danger", icon: AlertIcon },
  skipped: { label: "Ignoré", text: "text-ink-faint", icon: CircleIcon },
};

function isActive(status: WorkflowProgressStatus): boolean {
  return status === "searching" || status === "writing" || status === "running";
}

function LiveStepCard({
  step,
  event,
}: {
  step: WorkflowStepItem;
  event: WorkflowProgress;
}) {
  const status: WorkflowProgressStatus = event.status;
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const content = status === "done" && event.content ? event.content : null;
  const errorText = status === "error" ? event.detail || "Étape en erreur." : null;
  const skippedText = status === "skipped" ? event.detail || "Étape ignorée." : null;

  return (
    <div
      className={`rounded-xl border bg-surface shadow-sm ${
        status === "error"
          ? "border-danger/40"
          : status === "done"
            ? "border-border"
            : status === "skipped"
              ? "border-border"
              : "border-accent/40"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-3 py-2.5 sm:px-4 ${isActive(status) ? "bg-accent/5" : ""}`}>
        <span className="relative flex shrink-0 items-center justify-center">
          <Icon
            size={16}
            className={`${meta.text} ${
              status === "running"
                ? "animate-spin motion-reduce:animate-none"
                : isActive(status)
                  ? "animate-pulse motion-reduce:animate-none"
                  : ""
            }`}
          />
        </span>
        <span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-ink-secondary">
          {step.key}
        </span>
        <span className={`truncate text-sm font-medium ${status === "pending" ? "text-ink-faint" : "text-ink"}`}>
          {step.label}
        </span>
        <span className={`shrink-0 text-xs ${meta.text}`}>{meta.label}</span>
        {event.durationMs && (
          <span className="ml-auto shrink-0 text-xs text-ink-faint">{formatDuration(event.durationMs)}</span>
        )}
      </div>

      {(content || errorText || skippedText) && (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          {content && (
            <div className="max-h-[70dvh] overflow-y-auto">
              <MarkdownRenderer content={content} />
            </div>
          )}
          {errorText && <p className="text-sm text-danger">{errorText}</p>}
          {skippedText && <p className="text-sm text-ink-faint">{skippedText}</p>}
        </div>
      )}
    </div>
  );
}

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
        <LiveStepCard key={step.key} step={step} event={byStep.get(step.key)!} />
      ))}

      {running && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
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
      )}
    </div>
  );
}