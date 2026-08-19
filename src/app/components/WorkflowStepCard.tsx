"use client";

import { useState } from "react";
import type { AnalysisOutput, WorkflowProgress, WorkflowProgressStatus } from "@/contracts/workflow";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ModelLogo } from "./ModelLogo";
import { formatDuration, type WorkflowStepItem } from "./workflow-steps";
import { AlertIcon, CheckIcon, ChevronDownIcon, CircleIcon, ClockIcon, CopyIcon, PencilIcon, ScaleIcon, SpinnerIcon, SearchIcon } from "./ui/icons";

export const STATUS_META: Record<
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

function preview(text: string, len = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

export function WorkflowStepCard({
  step,
  output,
  durationMs,
  defaultOpen = false,
  event,
}: {
  step: WorkflowStepItem;
  output?: AnalysisOutput;
  durationMs?: number;
  defaultOpen?: boolean;
  event?: WorkflowProgress;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const contentId = `step-${step.key}-${step.label.replace(/\s+/g, "-")}`;

  const isLive = Boolean(event);
  const status: WorkflowProgressStatus = isLive
    ? event!.status
    : output && output.text.startsWith("[étape non effectuée")
      ? "error"
      : "done";
  const isError = status === "error";
  const isSkipped = status === "skipped";
  const statusMeta = STATUS_META[status];

  const model = isLive ? event!.model : output?.model;
  const isRevision = step.kind === "revision";
  const isRevised = isRevision || step.revised;
  const isConsensus = step.kind === "consensus";
  const noWebSearch = !isLive && step.group === "independent" && output?.dossier?.mode === "disabled";

  const content =
    status === "done" ? (isLive ? event!.content : output?.text) : undefined;
  const errorText = isError ? ((isLive ? event!.detail : output?.text) ?? "Étape en erreur.") : null;
  const skippedText = isSkipped ? (event!.detail ?? "Étape ignorée.") : null;
  const active = isActive(status);

  async function copy() {
    const text = content;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const iconClass = active
    ? status === "running"
      ? "animate-spin motion-reduce:animate-none"
      : "animate-pulse motion-reduce:animate-none"
    : "";

  return (
    <div
      className={`rounded-xl border bg-surface shadow-sm ${
        isError
          ? "border-danger/40"
          : isRevised || isConsensus
            ? "border-accent/35"
            : "border-border"
      }`}
    >
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`${open ? "Fermer" : "Ouvrir"} ${step.label}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-3 pl-4 pr-2 text-left transition-colors hover:bg-surface sm:pl-5"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg font-mono text-xs font-medium text-ink-secondary">
            {step.key}
          </span>
          <ModelLogo spec={model} size={16} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-ink">
              {step.label}
              {isRevision && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
                  <PencilIcon size={11} />
                  Révisé
                </span>
              )}
              {isConsensus && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
                  <ScaleIcon size={11} />
                  Consensus
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-danger">
                  <AlertIcon size={12} />
                  Erreur
                </span>
              )}
              {noWebSearch && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-warning">
                  <AlertIcon size={12} />
                  Sans recherche web
                </span>
              )}
              {isLive && (
                <span className={`inline-flex items-center gap-1 text-xs font-normal ${statusMeta.text}`}>
                  <statusMeta.icon size={12} className={iconClass} />
                  {statusMeta.label}
                </span>
              )}
            </span>
            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
              {model && <span className="truncate font-mono">{model.provider}/{model.model}</span>}
              {(event?.durationMs ?? durationMs) !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon size={12} />
                  {formatDuration(event?.durationMs ?? durationMs!)}
                </span>
              )}
            </span>
          </span>
          <ChevronDownIcon
            size={15}
            className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {content && !isError && !isSkipped && (
          <button
            onClick={copy}
            aria-label={`Copier ${step.label}`}
            title="Copier"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
          </button>
        )}
      </div>

      {!open && content && !isError && !isSkipped && (
        <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-ink-faint sm:px-5">
          {preview(content)}
        </p>
      )}

      <div id={contentId} className={`border-t border-border px-4 py-3 sm:px-5 ${open ? "block" : "hidden"}`}>
        {content ? (
          <div className="max-h-[70dvh] overflow-y-auto">
            <MarkdownRenderer content={content} />
          </div>
        ) : isError ? (
          <p className="text-sm text-danger">{errorText}</p>
        ) : isSkipped ? (
          <p className="text-sm text-ink-faint">{skippedText}</p>
        ) : active ? (
          <p className={`flex items-center gap-2 text-sm ${statusMeta.text}`}>
            <statusMeta.icon size={14} className={iconClass} />
            {statusMeta.label}
          </p>
        ) : (
          <p className="text-sm text-ink-secondary">{step.description}</p>
        )}
        {content && !isError && !isSkipped && (
          <div className="mt-3 flex justify-end border-t border-border pt-2.5">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {copied ? <CheckIcon size={13} className="text-success" /> : <CopyIcon size={13} />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}