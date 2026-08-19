"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisOutput, ConsensusReport } from "@/contracts/workflow";
import { getRunData } from "@/app/actions";
import { parseConsensusReport } from "@/lib/consensus-report";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { dynamicStepItem, formatDuration } from "./workflow-steps";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  PanelIcon,
  RefreshIcon,
  ScaleIcon,
  SparklesIcon,
} from "./ui/icons";

const CONFIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Confiance faible",
  medium: "Confiance moyenne",
  high: "Confiance élevée",
};

const CONFIDENCE_TONE: Record<"low" | "medium" | "high", "warning" | "neutral" | "success"> = {
  low: "warning",
  medium: "neutral",
  high: "success",
};

export function WorkflowMessage({
  content,
  runId,
  onCopy,
  onDownload,
  onOpenDetails,
  onRegenerate,
  onDeepen,
}: {
  content: string;
  runId: string;
  onCopy: () => void;
  onDownload: () => void;
  onOpenDetails: () => void;
  onRegenerate: () => void;
  onDeepen: () => void;
}) {
  const [run, setRun] = useState<Awaited<ReturnType<typeof getRunData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRunData(runId)
      .then((data) => {
        if (!cancelled) setRun(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const isError = content.startsWith("Une erreur est survenue");

  const stepItems = useMemo(() => {
    const r = run?.result;
    if (!r || !Array.isArray(r.analyses) || r.analyses.length === 0) return [];
    return [
      ...r.analyses.map((a) => dynamicStepItem(a.label)),
      ...r.consolidations.map((c) => dynamicStepItem(c.label)),
      ...r.revisions.map((rev) => dynamicStepItem(rev.label)),
    ];
  }, [run]);

  const consensusEntry = run?.result?.timeline.find((t) => t.step === "S");
  const finalEntry = run?.result?.timeline.find((t) => t.step === "F");

  async function copy() {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
        <div className="flex items-center gap-2">
          <AlertIcon size={16} className="text-danger" />
          <p className="text-sm font-medium text-danger">L&apos;analyse n&apos;a pas abouti</p>
        </div>
        <p className="mt-2 text-sm text-danger">{content}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3" aria-label="Analyses intermédiaires">
        {loading && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}
        {!loading &&
          stepItems.map((step) => {
            const output =
              run?.result?.analyses.find((a) => a.label === step.key) ??
              run?.result?.consolidations.find((c) => c.label === step.key) ??
              run?.result?.revisions.find((r) => r.label === step.key);
            const entry = run?.result?.timeline.find((t) => t.step === step.key);
            return (
              <WorkflowStepCard
                key={step.key}
                step={step}
                output={output}
                durationMs={entry?.durationMs}
              />
            );
          })}
      </div>

      {!loading && run?.result?.consensus && (
        <ConsensusCard
          consensus={run.result.consensus}
          durationMs={consensusEntry?.durationMs}
        />
      )}

      <article className="rounded-xl border border-border bg-bg p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">Synthèse finale</span>
            <Badge tone="accent" className="shrink-0">Final</Badge>
            {finalEntry?.durationMs !== undefined && (
              <span className="shrink-0 text-xs text-ink-faint">{formatDuration(finalEntry.durationMs)}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={copy} aria-label="Copier la réponse" title="Copier">
              {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
              <span className="hidden sm:inline">{copied ? "Copié" : "Copier"}</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onDownload} aria-label="Télécharger la réponse" title="Télécharger">
              <DownloadIcon size={14} />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onDeepen} aria-label="Approfondir" title="Approfondir">
              <SparklesIcon size={14} />
              <span className="hidden sm:inline">Approfondir</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onRegenerate} aria-label="Relancer l'analyse" title="Relancer">
              <RefreshIcon size={14} />
              <span className="hidden sm:inline">Relancer</span>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <MarkdownRenderer content={content} />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">
            Comparez les positions, vérifiez les sources ou consultez les métriques dans le panneau.
          </p>
          <Button size="sm" variant="secondary" onClick={onOpenDetails} className="w-full justify-center sm:w-auto">
            <PanelIcon size={14} />
            Ouvrir les détails
          </Button>
        </div>
      </article>
    </div>
  );
}

function ConsensusCard({ consensus, durationMs }: { consensus: AnalysisOutput; durationMs?: number }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const report = useMemo<ConsensusReport | null>(() => parseConsensusReport(consensus.text), [consensus.text]);
  const isError = consensus.text.startsWith("[étape non effectuée");
  const contentId = `step-S-consensus`;
  const model = `${consensus.model.provider}/${consensus.model.model}`;

  async function copy() {
    await navigator.clipboard.writeText(consensus.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`rounded-xl border bg-bg shadow-sm ${isError ? "border-danger/40" : "border-accent/35"}`}>
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`${open ? "Fermer" : "Ouvrir"} Consensus`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-3 pl-4 pr-2 text-left transition-colors hover:bg-surface sm:pl-5"
        >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface font-mono text-xs font-medium text-ink-secondary">
          S
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-ink">
            Consensus
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
              <ScaleIcon size={11} />
              Consensus
            </span>
            {isError && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-danger">
                <AlertIcon size={12} />
                Erreur
              </span>
            )}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
            <span className="truncate font-mono">{model}</span>
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
        {!isError && (
          <button
            onClick={copy}
            aria-label="Copier le Consensus"
            title="Copier"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
          </button>
        )}
      </div>

      {!open && !isError && (
        <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-ink-faint sm:px-5">
          {report?.recommendation ?? consensus.text.replace(/\s+/g, " ").slice(0, 180)}
        </p>
      )}

      <div id={contentId} className={`border-t border-border px-4 py-3 sm:px-5 ${open ? "block" : "hidden"}`}>
        {isError ? (
          <p className="text-sm text-danger">{consensus.text}</p>
        ) : report ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Recommandation</p>
                {report.confidence && <Badge tone={CONFIDENCE_TONE[report.confidence]}>{CONFIDENCE_LABEL[report.confidence]}</Badge>}
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">{report.recommendation}</p>
            </div>
            <ReportSection title="Résumé" items={report.summary} />
            <ReportSection title="Points d'accord" items={report.agreements} />
            <ReportSection title="Points de désaccord" items={report.disagreements} />
            <ReportSection title="Limites" items={report.limitations} />
            {report.unverified && report.unverified.length > 0 && (
              <ReportSection title="Informations non vérifiées" items={report.unverified} />
            )}
            {report.sources && report.sources.length > 0 && <ReportSection title="Sources" items={report.sources} />}
            <ReportSection title="Prochaine étape" items={report.nextSteps} />
          </div>
        ) : (
          <div className="max-h-[70dvh] overflow-y-auto">
            <MarkdownRenderer content={consensus.text} />
          </div>
        )}
        {!isError && (
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

function ReportSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-ink">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}