"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoredRun } from "@/lib/store";
import type { AnalystDossier } from "@/contracts/research";
import { getRunData } from "@/app/actions";
import { formatBudget } from "@/lib/format";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  GaugeIcon,
  LinkIcon,
  WalletIcon,
} from "./ui/icons";

export type OutputPanelTab = "sources" | "metrics" | "budget";

const TABS: { id: OutputPanelTab; label: string; icon: typeof LinkIcon }[] = [
  { id: "sources", label: "Sources", icon: LinkIcon },
  { id: "metrics", label: "Métriques", icon: GaugeIcon },
  { id: "budget", label: "Budget", icon: WalletIcon },
];

function excerpt(text: string, len = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

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
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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

      <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2" aria-label="Vues du workspace">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                selected
                  ? "border-accent font-medium text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

        {!loading && run?.result && activeTab === "sources" && (
          <SourcesView run={run} />
        )}

        {!loading && run?.result && activeTab === "metrics" && (
          <MetricsView run={run} />
        )}

        {!loading && run?.result && activeTab === "budget" && (
          <BudgetView run={run} />
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

function ModeBadge({ mode }: { mode: AnalystDossier["mode"] }) {
  const map: Record<AnalystDossier["mode"], { label: string; tone: "success" | "neutral" | "warning" }> = {
    native: { label: "Recherche native", tone: "success" },
    disabled: { label: "Recherche désactivée", tone: "neutral" },
  };
  const m = map[mode] ?? map.disabled;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceLink({ item }: { item: string }) {
  const url = item.startsWith("http") ? item : null;
  if (!url) {
    return <li className="text-sm leading-relaxed text-ink-secondary">{item}</li>;
  }
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-baseline gap-1.5 text-sm text-ink underline underline-offset-2 hover:text-accent"
      >
        <LinkIcon size={13} className="shrink-0 translate-y-0.5" />
        <span className="min-w-0">{url}</span>
      </a>
    </li>
  );
}

function SourcesView({ run }: { run: StoredRun }) {
  const r = run.result!;
  const analyses = r.analyses;
  const withDossier = analyses.filter((a) => a.dossier);
  const sourceIds = (dossier: AnalystDossier) => new Map(dossier.sources.map((s) => [s.id, s]));
  const total = analyses.reduce((acc, a) => acc + (a.dossier?.sources.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Sources" value={String(total)} />
        <StatCard label="Analystes avec recherche" value={String(withDossier.length)} />
        <StatCard
          label="Preuves"
          value={String(analyses.reduce((acc, a) => acc + (a.dossier?.evidence.length ?? 0), 0))}
        />
      </div>

      {analyses.map((a) => {
        const dossier = a.dossier;
        if (!dossier) return null;
        const byId = sourceIds(dossier);
        return (
          <div key={a.label} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-ink">{a.label}</span>
              <span className="text-xs text-ink-faint">{a.model.provider}/{a.model.model}</span>
              <ModeBadge mode={dossier.mode} />
            </div>

            {dossier.queries.length > 0 && (
              <div>
                <SectionTitle>Requêtes de recherche</SectionTitle>
                <ul className="space-y-1 text-xs text-ink-secondary">
                  {dossier.queries.map((q, i) => (
                    <li key={i} className="truncate">“{q}”</li>
                  ))}
                </ul>
              </div>
            )}

            {dossier.sources.length > 0 && (
              <div>
                <SectionTitle>Sources ({dossier.sources.length})</SectionTitle>
                <ul className="space-y-1.5">
                  {dossier.sources.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex w-full items-baseline gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-surface-hover"
                      >
                        <LinkIcon size={13} className="shrink-0 translate-y-0.5 text-ink-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{s.title || s.url}</span>
                          <span className="block text-[11px] text-ink-faint">{hostname(s.url)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dossier.evidence.length > 0 && (
              <div>
                <SectionTitle>Preuves ({dossier.evidence.length})</SectionTitle>
                <ul className="space-y-1.5">
                  {dossier.evidence.map((ev) => (
                    <li key={ev.id} className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs">
                      <p className="leading-relaxed text-ink-secondary">{excerpt(ev.claim, 180)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone={ev.confidence === "high" ? "success" : ev.confidence === "low" ? "warning" : "neutral"}>
                          {ev.confidence}
                        </Badge>
                        {ev.sourceIds.map((id) => {
                          const src = byId.get(id);
                          if (!src) return null;
                          return (
                            <a
                              key={id}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-ink underline underline-offset-2 hover:text-accent"
                            >
                              <LinkIcon size={11} />
                              {hostname(src.url)}
                            </a>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dossier.uncertainties.length > 0 && (
              <div>
                <SectionTitle>Incertitudes ({dossier.uncertainties.length})</SectionTitle>
                <ul className="space-y-1 text-xs text-ink-secondary">
                  {dossier.uncertainties.map((u, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {r.consolidations.map((c) =>
        c.dossier && c.dossier.sources.length > 0 ? (
          <div key={c.label}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-ink">{c.label}</span>
              <span className="text-xs text-ink-faint">Sources consolidées (provenance préservée)</span>
              <ModeBadge mode={c.dossier.mode} />
            </div>
            <ul className="mt-2 space-y-1.5">
              {c.dossier.sources.map((s) => (
                <li key={s.id}>
                  <SourceLink item={s.url} />
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}

function MetricsView({ run }: { run: StoredRun }) {
  const r = run.result!;
  const models = new Set<string>();
  for (const m of [...r.analyses, ...r.consolidations, ...(r.revisions ?? []), ...(r.consensus ? [r.consensus] : []), r.finalSynthesis]) {
    models.add(`${m.model.provider}/${m.model.model}`);
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Durée totale" value={`${(r.totalLatencyMs / 1000).toFixed(1)}`} unit="s" />
        <StatCard label="Tokens" value={String(r.totalTokens)} />
        <StatCard label="Modèles utilisés" value={String(models.size)} />
        <StatCard label="Étapes" value={String(r.timeline.length)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Consolidations</span>
          <span className="font-medium text-ink">{r.consolidations.length}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Révisions</span>
          <span className="font-medium text-ink">{r.revisions?.length ?? 0}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <span className="text-ink-secondary">Statut</span>
          <Badge tone="accent">{run.status}</Badge>
        </div>
      </div>
    </div>
  );
}

function BudgetView({ run }: { run: StoredRun }) {
  const r = run.result!;
  const budget = r.budget;

  if (!budget) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-3.5 text-sm text-ink-secondary">
          Budget non disponible pour cette analyse (exécutée avant l&apos;ajout de la ventilation des coûts).
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Estimation" value={formatBudget(r.estimatedCostCents)} />
          <StatCard label="Coût réel" value={formatBudget(r.actualCostCents)} />
        </div>
      </div>
    );
  }

  const steps = budget.steps;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Estimation" value={formatBudget(budget.estimatedCostCents)} />
        <StatCard label="Coût réel" value={formatBudget(budget.actualCostCents)} />
        <StatCard label="Écart" value={formatBudget(budget.estimatedCostCents - budget.actualCostCents)} />
      </div>

      {budget.actualCostCents === 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
          Coûts à 0,00 € : modèles sans tarification connue.
        </div>
      )}

      <div>
        <SectionTitle>Par étape ({steps.length})</SectionTitle>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-ink-faint">
                <th className="px-3 py-2 font-medium">Étape</th>
                <th className="px-3 py-2 font-medium">Modèle</th>
                <th className="px-3 py-2 text-right font-medium">Tokens</th>
                <th className="px-3 py-2 text-right font-medium">Durée</th>
                <th className="px-3 py-2 text-right font-medium">Estimé</th>
                <th className="px-3 py-2 text-right font-medium">Réel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {steps.map((s) => (
                <tr key={s.step}>
                  <td className="px-3 py-2.5 align-top">
                    <span className="font-medium text-ink">{s.label}</span>
                    {s.status !== "done" && (
                      <Badge tone={s.status === "error" ? "danger" : "neutral"} className="ml-2">
                        {s.status === "error" ? "Erreur" : "Ignoré"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-ink-secondary">
                    {s.model.provider}/{s.model.model}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right text-xs text-ink-secondary">
                    {s.promptTokens + s.completionTokens}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right text-xs text-ink-secondary">
                    {(s.latencyMs / 1000).toFixed(1)} s
                  </td>
                  <td className="px-3 py-2.5 align-top text-right text-xs text-ink-secondary">
                    {formatBudget(s.estimatedCostCents)}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right text-xs font-medium text-ink">
                    {formatBudget(s.actualCostCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-surface">
              <tr className="text-xs">
                <td className="px-3 py-2 font-medium text-ink">Total</td>
                <td />
                <td className="px-3 py-2 text-right text-ink-secondary">{r.totalTokens}</td>
                <td className="px-3 py-2 text-right text-ink-secondary">{(r.totalLatencyMs / 1000).toFixed(1)} s</td>
                <td className="px-3 py-2 text-right text-ink-secondary">{formatBudget(budget.estimatedCostCents)}</td>
                <td className="px-3 py-2 text-right font-medium text-ink">{formatBudget(budget.actualCostCents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}