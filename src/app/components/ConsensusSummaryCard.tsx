"use client";

import { useMemo, useState } from "react";
import type { ConsensusReport } from "@/contracts/workflow";
import { parseConsensusReport } from "@/lib/consensus-report";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { WorkflowBreakdown } from "./WorkflowBreakdown";
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  PanelIcon,
  RefreshIcon,
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

export function ConsensusSummaryCard({
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
  const [copied, setCopied] = useState(false);
  const isError = content.startsWith("Une erreur est survenue");

  const report = useMemo<ConsensusReport | null>(() => parseConsensusReport(content), [content]);

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
    <article className="rounded-xl border border-border bg-bg p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">Réponse Consensus</span>
          <Badge tone="accent" className="shrink-0">Consensus</Badge>
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

      {report ? (
        <div className="mt-4 space-y-4">
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
        <div className="mt-4">
          <MarkdownRenderer content={content} />
        </div>
      )}

      <div className="mt-4">
        <WorkflowBreakdown runId={runId} />
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">
          Comparez les positions, vérifiez les sources ou consultez les métriques dans le panneau.
        </p>
        <Button size="sm" variant="secondary" onClick={onOpenDetails} className="w-full justify-center sm:w-auto">
          <PanelIcon size={14} />
          Ouvrir les détails
        </Button>
      </div>
    </article>
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