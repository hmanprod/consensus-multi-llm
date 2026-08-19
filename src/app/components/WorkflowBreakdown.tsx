"use client";

import { useState } from "react";
import type { StoredRun } from "@/lib/store";
import type { TimelineEntry, WorkflowStep } from "@/contracts/workflow";
import { getRunData } from "@/app/actions";
import { WORKFLOW_STEPS, formatDuration } from "./workflow-steps";
import { ChevronDownIcon, ClockIcon } from "./ui/icons";

function modelFor(step: WorkflowStep, run: StoredRun): string | null {
  const r = run.result;
  if (!r) return null;
  switch (step) {
    case "A":
      return `${r.analysisA.model.provider}/${r.analysisA.model.model}`;
    case "B":
      return r.initialAnalyses[0]
        ? `${r.initialAnalyses[0].model.provider}/${r.initialAnalyses[0].model.model}`
        : null;
    case "S":
      return `${r.consolidated.model.provider}/${r.consolidated.model.model}`;
    case "R":
      return r.revisedAnalyses[0]
        ? `${r.revisedAnalyses[0].model.provider}/${r.revisedAnalyses[0].model.model}`
        : null;
    case "F":
      return `${r.finalSynthesis.model.provider}/${r.finalSynthesis.model.model}`;
  }
}

function lastEntryFor(timeline: TimelineEntry[], step: WorkflowStep): TimelineEntry | undefined {
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i].step === step) return timeline[i];
  }
  return undefined;
}

export function WorkflowBreakdown({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<Awaited<ReturnType<typeof getRunData>> | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!open && !run && !loading) {
      setLoading(true);
      try {
        setRun(await getRunData(runId));
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  }

  const detailsId = `workflow-breakdown-${runId}`;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls={detailsId}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
      >
        <span>Voir comment cette réponse a été construite</span>
        <ChevronDownIcon
          size={15}
          className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id={detailsId} className="border-t border-border px-3.5 py-3">
          {loading && (
            <p className="text-xs text-ink-faint" aria-live="polite">
              Chargement du déroulement…
            </p>
          )}
          {!loading && (
            <ol className="space-y-3">
              {WORKFLOW_STEPS.map((step) => {
                const entry = run?.result ? lastEntryFor(run.result.timeline, step.key) : undefined;
                const model = run ? modelFor(step.key, run) : null;
                return (
                  <li key={step.key} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-bg font-mono text-[11px] font-medium text-ink-secondary">
                      {step.key}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-medium text-ink">
                        {step.label}
                        {entry && (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-faint">
                            <ClockIcon size={12} />
                            {entry.status === "skipped" ? "Ignoré" : formatDuration(entry.durationMs)}
                          </span>
                        )}
                        {model && <span className="font-mono text-[11px] font-normal text-ink-faint">{model}</span>}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{step.description}</p>
                      {entry?.detail && (
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{entry.detail}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}