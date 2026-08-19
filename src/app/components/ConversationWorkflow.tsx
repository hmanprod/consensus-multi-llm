"use client";

import { Fragment, useEffect, useState } from "react";
import type { WorkflowProgress, WorkflowProgressStatus, WorkflowStep } from "@/contracts/workflow";
import { WORKFLOW_GROUP_LABELS, formatDuration, workflowSteps, type WorkflowGroup } from "./workflow-steps";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
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
};

function isActive(status: WorkflowProgressStatus): boolean {
  return status === "searching" || status === "writing" || status === "running";
}

export function ConversationWorkflow({
  progress,
  startedAt,
  analystCount,
  onStop,
}: {
  progress: WorkflowProgress[];
  startedAt?: number;
  analystCount: number;
  onStop?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const steps = workflowSteps(analystCount);
  const groups: WorkflowGroup[] = ["independent", "consolidation", "revision", "consensus", "synthesis"];
  const byStep = new Map(progress.map((p) => [p.step, p]));

  const finished = (key: WorkflowStep) => {
    const status = byStep.get(key)?.status ?? "pending";
    return status === "done" || status === "error";
  };
  const independentSteps = steps.filter((s) => s.group === "independent");
  const independentDone = independentSteps.filter((s) => finished(s.key)).length;
  const revisionSteps = steps.filter((s) => s.group === "revision");
  const revisionsDone = revisionSteps.filter((s) => finished(s.key)).length;

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

      <div className="mt-3">
        {groups.map((group, gi) => {
          const groupSteps = steps.filter((s) => s.group === group);
          if (groupSteps.length === 0) return null;
          const hasPreviousGroup = groups.slice(0, gi).some((g) => steps.some((s) => s.group === g));
          const counter =
            group === "independent"
              ? `${independentDone}/${independentSteps.length} terminées`
              : group === "revision"
                ? `${revisionsDone}/${revisionSteps.length} révisées`
                : null;
          return (
            <Fragment key={group}>
              {hasPreviousGroup && (
                <div className="flex justify-center py-1" aria-hidden="true">
                  <ChevronDownIcon size={14} className="text-ink-faint/70" />
                </div>
              )}
              <section>
                <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <span>{WORKFLOW_GROUP_LABELS[group]}</span>
                  {counter && <span className="font-normal normal-case tracking-normal">{counter}</span>}
                </p>
                <ol className="mt-1.5 space-y-1.5">
                  {groupSteps.map((step) => {
                    const event = byStep.get(step.key);
                    const status: WorkflowProgressStatus = event?.status ?? "pending";
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    return (
                      <li
                        key={step.key}
                        className={`rounded-lg px-2 py-1.5 transition-colors hover:bg-bg/60 ${
                          isActive(status) ? "bg-accent/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-sm">
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
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-ink-secondary">
                                {step.key}
                              </span>
                              <span className={`font-medium ${status === "pending" ? "text-ink-faint" : "text-ink"}`}>
                                {step.label}
                              </span>
                              <span className={`text-xs ${meta.text}`}>{meta.label}</span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">
                              {event?.detail || step.description}
                            </span>
                          </span>
                          {event?.durationMs && (
                            <span className="shrink-0 text-xs text-ink-faint">{formatDuration(event.durationMs)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}