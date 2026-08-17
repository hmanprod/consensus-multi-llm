"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoredRun } from "@/lib/store";
import type { ConsensusReport, TimelineEntry } from "@/contracts/workflow";
import { parseConsensusReport } from "@/lib/consensus-report";
import { getRunData } from "@/app/actions";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  ColumnsIcon,
  CopyIcon,
  DownloadIcon,
  GaugeIcon,
  LayersIcon,
} from "./ui/icons";

export type OutputPanelTab = "summary" | "comparison" | "workflow" | "metrics";

const TABS: { id: OutputPanelTab; label: string; icon: typeof ColumnsIcon }[] = [
  { id: "summary", label: "Synthèse", icon: ColumnsIcon },
  { id: "comparison", label: "Comparaison", icon: ColumnsIcon },
  { id: "workflow", label: "Workflow", icon: LayersIcon },
  { id: "metrics", label: "Métriques", icon: GaugeIcon },
];

function formatCost(cents: number): string {
  return `${cents.toFixed(2)} €`;
}

function excerpt(text: string, len = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

const MODEL_BY_STEP: Record<TimelineEntry["step"], (r: StoredRun) => string | null> = {
  A: (r) => (r.result ? `${r.result.analysisA.model.provider}/${r.result.analysisA.model.model}` : null),
  B: (r) => (r.result && r.result.initialAnalyses[0] ? `${r.result.initialAnalyses[0].model.provider}/${r.result.initialAnalyses[0].model.model}` : null),
  S: (r) => (r.result ? `${r.result.consolidated.model.provider}/${r.result.consolidated.model.model}` : null),
  R: (r) => (r.result && r.result.revisedAnalyses[0] ? `${r.result.revisedAnalyses[0].model.provider}/${r.result.revisedAnalyses[0].model.model}` : null),
  F: (r) => (r.result ? `${r.result.finalSynthesis.model.provider}/${r.result.finalSynthesis.model.model}` : null),
};

export function OutputPanel({
  runId,
  activeTab,
  onTabChange,
  onClose,
}: {
  runId: string;
  activeTab: OutputPanelTab;
  onTabChange: (tab: OutputPanelTab) => void;
  onClose: () => void;
}) {
  const [run, setRun] = useState<StoredRun | null>(null);
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

  const synthesis = useMemo(() => run?.result?.finalSynthesis.text ?? null, [run]);

  async function copySynthesis() {
    if (!synthesis) return;
    await navigator.clipboard.writeText(synthesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadSynthesis() {
    if (!synthesis) return;
    const blob = new Blob([synthesis], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consensus-${runId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      role="complementary"
      aria-label="Workspace de sortie"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-bg shadow-lg animate-[slide-in-right_0.2s_ease-out] lg:static lg:h-dvh lg:w-[var(--workspace-w)] lg:shrink-0 lg:animate-none lg:shadow-none"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">Consensus</p>
          <p className="truncate text-xs text-ink-faint">{run?.question ?? "Chargement…"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={copySynthesis}
            disabled={!synthesis}
            aria-label="Copier la synthèse"
            title="Copier la synthèse"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
          >
            {copied ? <CheckIcon size={15} className="text-success" /> : <CopyIcon size={15} />}
          </button>
          <button
            onClick={downloadSynthesis}
            disabled={!synthesis}
            aria-label="Télécharger la synthèse (Markdown)"
            title="Télécharger (.md)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
          >
            <DownloadIcon size={15} />
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer le workspace"
            title="Fermer (Échap)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-border px-3 pt-2" aria-label="Vues du workspace">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                selected
                  ? "border-accent font-medium text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!loading && run?.status === "failed" && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-danger">
              <AlertIcon size={15} />
              Échec de l&apos;analyse
            </p>
            <p className="mt-2 text-sm text-danger">{run.error}</p>
          </div>
        )}

        {!loading && run?.result && activeTab === "summary" && (
          <SummaryView run={run} />
        )}

        {!loading && run?.result && activeTab === "comparison" && (
          <ComparisonView run={run} />
        )}

        {!loading && run?.result && activeTab === "workflow" && (
          <WorkflowView run={run} />
        )}

        {!loading && run?.result && activeTab === "metrics" && (
          <MetricsView run={run} />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{children}</h3>;
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">
        {value} {unit && <span className="text-xs font-normal text-ink-faint">{unit}</span>}
      </p>
    </div>
  );
}

function SummaryView({ run }: { run: StoredRun }) {
  const r = run.result!;
  const report = useMemo<ConsensusReport | null>(
    () => r.finalSynthesis.report ?? parseConsensusReport(r.finalSynthesis.text),
    [r]
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Coût réel" value={formatCost(r.actualCostCents)} />
        <StatCard label="Durée" value={`${(r.totalLatencyMs / 1000).toFixed(1)}`} unit="s" />
        <StatCard label="Tokens" value={String(r.totalTokens)} />
      </div>
      {r.stoppedEarly && (
        <Badge tone="warning">Budget atteint — analyse arrêtée en avance</Badge>
      )}

      {report ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Recommandation</p>
              {report.confidence && <ConfidenceBadge confidence={report.confidence} />}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{report.recommendation}</p>
          </div>

          <ReportSection title="Résumé" items={report.summary} />
          <ReportSection title="Points d'accord" items={report.agreements} />
          <ReportSection title="Points de désaccord" items={report.disagreements} />
          <ReportSection title="Limites" items={report.limitations} />
          <ReportSection title="Prochaine étape" items={report.nextSteps} />

          <Accordion title="Synthèse complète (Markdown)">
            <MarkdownRenderer content={r.finalSynthesis.text} />
          </Accordion>
        </div>
      ) : (
        <div>
          <SectionTitle>Synthèse</SectionTitle>
          <MarkdownRenderer content={r.finalSynthesis.text} />
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink">
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

const CONFIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Confiance faible",
  medium: "Confiance moyenne",
  high: "Confiance élevée",
};

function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const tone = confidence === "high" ? "success" : confidence === "low" ? "warning" : "neutral";
  return <Badge tone={tone}>{CONFIDENCE_LABEL[confidence]}</Badge>;
}

function ComparisonView({ run }: { run: StoredRun }) {
  const r = run.result!;
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Positions des analystes</SectionTitle>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-ink-faint">
                <th className="px-3 py-2 font-medium">Analyste</th>
                <th className="px-3 py-2 font-medium">Modèle</th>
                <th className="px-3 py-2 font-medium">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.initialAnalyses.map((a, i) => {
                const revised = r.revisedAnalyses[i];
                return (
                  <tr key={a.label}>
                    <td className="px-3 py-2.5 align-top font-medium text-ink">{a.label}</td>
                    <td className="px-3 py-2.5 align-top text-xs text-ink-secondary">
                      {a.model.provider}/{a.model.model}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs leading-relaxed text-ink-secondary">
                      <p className="mb-1 font-medium text-ink">Initiale</p>
                      {excerpt(a.text)}
                      {revised && (
                        <p className="mt-2 border-t border-border pt-1.5 font-medium text-ink">Révision</p>
                      )}
                      {revised && excerpt(revised.text)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Accordion title={`Analyse A — orchestrateur (${r.analysisA.model.provider}/${r.analysisA.model.model})`}>
        <MarkdownRenderer content={r.analysisA.text} />
      </Accordion>

      <Accordion title={`Analyse consolidée ${r.consolidated.label} — orchestrateur`}>
        <MarkdownRenderer content={r.consolidated.text} />
      </Accordion>
    </div>
  );
}

function Accordion({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
      >
        <span>{title}</span>
        <ChevronDownIcon size={15} className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border px-3 py-3">{children}</div>}
    </div>
  );
}

function WorkflowView({ run }: { run: StoredRun }) {
  const r = run.result!;
  return (
    <div className="space-y-4">
      <SectionTitle>Déroulement A → B → S → R → F</SectionTitle>
      <ol className="space-y-1.5">
        {r.timeline.map((t, i) => {
          const model = MODEL_BY_STEP[t.step](run);
          const detailText = t.detail;
          return (
            <Accordion
              key={i}
              title={
                <span className="flex flex-1 items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface font-mono text-xs font-medium text-ink-secondary">
                    {t.step}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  <Badge tone={t.status === "done" ? "success" : t.status === "error" ? "danger" : "neutral"}>
                    {t.status === "done" ? "fait" : t.status === "error" ? "erreur" : "ignoré"}
                  </Badge>
                </span>
              }
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
                <span className="inline-flex items-center gap-1">
                  <ClockIcon size={13} />
                  {t.status === "skipped" ? "Ignoré" : `${t.durationMs} ms`}
                </span>
                {model && <span className="font-mono">{model}</span>}
                {detailText && <span>{detailText}</span>}
              </div>
            </Accordion>
          );
        })}
      </ol>
    </div>
  );
}

function MetricsView({ run }: { run: StoredRun }) {
  const r = run.result!;
  const models = new Set<string>();
  for (const m of [r.analysisA, ...r.initialAnalyses, r.consolidated, ...r.revisedAnalyses, r.finalSynthesis]) {
    models.add(`${m.model.provider}/${m.model.model}`);
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Coût estimé" value={formatCost(r.estimatedCostCents)} />
        <StatCard label="Coût réel" value={formatCost(r.actualCostCents)} />
        <StatCard label="Durée totale" value={`${(r.totalLatencyMs / 1000).toFixed(1)}`} unit="s" />
        <StatCard label="Tokens" value={String(r.totalTokens)} />
        <StatCard label="Modèles utilisés" value={String(models.size)} />
        <StatCard label="Étapes" value={String(r.timeline.length)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Révisions des analystes</span>
          <span className="font-medium text-ink">{r.revisedAnalyses.length}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Arrêt anticipé (budget)</span>
          <Badge tone={r.stoppedEarly ? "warning" : "success"}>
            {r.stoppedEarly ? "Oui" : "Non"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Statut</span>
          <Badge tone="accent">{run.status}</Badge>
        </div>
      </div>
    </div>
  );
}