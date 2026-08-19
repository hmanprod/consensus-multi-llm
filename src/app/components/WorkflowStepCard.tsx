"use client";

import { useState } from "react";
import type { AnalysisOutput } from "@/contracts/workflow";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { formatDuration, type WorkflowStepItem } from "./workflow-steps";
import { AlertIcon, CheckIcon, ChevronDownIcon, ClockIcon, CopyIcon, PencilIcon, ScaleIcon } from "./ui/icons";

function preview(text: string, len = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

export function WorkflowStepCard({
  step,
  output,
  durationMs,
  defaultOpen = false,
}: {
  step: WorkflowStepItem;
  output?: AnalysisOutput;
  durationMs?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const contentId = `step-${step.key}-${step.label.replace(/\s+/g, "-")}`;
  const isError = Boolean(output && output.text.startsWith("[étape non effectuée"));
  const model = output ? `${output.model.provider}/${output.model.model}` : null;
  const isRevision = step.kind === "revision";
  const isRevised = isRevision || step.revised;
  const isConsensus = step.kind === "consensus";
  const noWebSearch = step.group === "independent" && output?.dossier?.mode === "disabled";

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={`rounded-xl border bg-bg shadow-sm ${
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
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-3 pl-4 pr-2 text-left transition-colors hover:bg-surface sm:pl-5"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface font-mono text-xs font-medium text-ink-secondary">
            {step.key}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-ink">
              {step.label}
              {isRevised && (
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
            </span>
            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
              {model && <span className="truncate font-mono">{model}</span>}
              {durationMs !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon size={12} />
                  {formatDuration(durationMs)}
                </span>
              )}
            </span>
          </span>
          <ChevronDownIcon
            size={15}
            className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {output && !isError && (
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

      {!open && output && !isError && (
        <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-ink-faint sm:px-5">
          {preview(output.text)}
        </p>
      )}

      <div id={contentId} className={`border-t border-border px-4 py-3 sm:px-5 ${open ? "block" : "hidden"}`}>
        {output ? (
          isError ? (
            <p className="text-sm text-danger">{output.text}</p>
          ) : (
            <div className="max-h-[70dvh] overflow-y-auto">
              <MarkdownRenderer content={output.text} />
            </div>
          )
        ) : (
          <p className="text-sm text-ink-secondary">{step.description}</p>
        )}
        {output && !isError && (
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