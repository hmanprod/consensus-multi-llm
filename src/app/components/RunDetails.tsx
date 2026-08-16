"use client";

import { useState } from "react";
import type { StoredRun } from "@/lib/store";
import { getRunData } from "@/app/actions";

const STATUS_LABEL: Record<NonNullable<StoredRun["result"]>["consensus"]["status"] | "running" | "failed", string> = {
  consensus_reached: "Consensus atteint",
  partial: "Consensus partiel",
  major_disagreement: "Désaccord important",
  insufficient_info: "Informations insuffisantes",
  budget_exceeded: "Budget dépassé",
  running: "En cours",
  failed: "Échec",
};

const STATUS_COLOR: Record<string, string> = {
  consensus_reached: "text-emerald-600 bg-emerald-50 border-emerald-200",
  partial: "text-amber-600 bg-amber-50 border-amber-200",
  major_disagreement: "text-red-600 bg-red-50 border-red-200",
  insufficient_info: "text-slate-600 bg-slate-50 border-slate-200",
  budget_exceeded: "text-orange-600 bg-orange-50 border-orange-200",
  running: "text-accent bg-accent-soft border-accent/20",
  failed: "text-red-600 bg-red-50 border-red-200",
};

const DISAGREEMENT_LABEL: Record<string, string> = {
  formulation: "Formulation",
  hypothesis: "Hypothèse",
  factual: "Factuel",
  conclusion_changing: "Change la conclusion",
};

export function RunDetails({ runId, defaultOpen = false }: { runId: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [run, setRun] = useState<StoredRun | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !run) {
      setLoading(true);
      const data = await getRunData(runId);
      setRun(data);
      setLoading(false);
    }
  }

  const badge = (label: string, color: string) => (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  );

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <span className={`inline-block h-2 w-2 rounded-sm ${open ? "rotate-45" : ""} border border-current`} />
        Détails du workflow
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {loading && <p className="text-sm text-ink-faint">Chargement…</p>}
          {run?.status === "failed" && (
            <p className="text-sm text-red-600">Échec : {run.error}</p>
          )}
          {run?.status === "running" && <p className="text-sm text-ink-secondary">En cours de traitement…</p>}
          {run?.result && (
            <>
              <Section title="Synthèse">
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink">
                  {run.result.synthesis}
                </pre>
                {run.result.synthesisLimits.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
                    {run.result.synthesisLimits.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Consensus B2">
                <div className="flex flex-wrap items-center gap-2">
                  {badge(STATUS_LABEL[run.result.consensus.status] ?? run.result.consensus.status, STATUS_COLOR[run.result.consensus.status] ?? "")}
                  <span className="text-sm text-ink-secondary">Score d&apos;accord : {run.result.consensus.score}/100</span>
                  <span className="text-sm text-ink-secondary">Confiance : {run.result.consensus.confidence}/100</span>
                </div>

                {run.result.consensus.agreements.length > 0 && (
                  <SubList title="Points d&apos;accord" items={run.result.consensus.agreements} />
                )}
                {run.result.consensus.disagreements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Points de désaccord</h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {run.result.consensus.disagreements.map((d, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
                          {badge(DISAGREEMENT_LABEL[d.type] ?? d.type, STATUS_COLOR.partial)}
                          <span>{d.description}</span>
                          <span className="text-xs text-ink-faint">analystes {d.analystIndexes.map((x) => x + 1).join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {run.result.consensus.missingInfo.length > 0 && (
                  <SubList title="Informations manquantes" items={run.result.consensus.missingInfo} />
                )}
                <p className="text-sm text-ink-secondary">
                  <span className="font-medium text-ink">Action recommandée :</span> {run.result.consensus.recommendedAction}
                </p>
              </Section>

              <Section title="Timeline">
                <ol className="space-y-1.5">
                  {run.result.timeline.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-7 shrink-0 rounded border border-border bg-surface px-1 py-0.5 text-center font-mono text-[11px] font-medium text-ink-secondary">
                        {t.step}
                      </span>
                      <span className="flex-1 text-ink">{t.label}</span>
                      <span className="text-xs text-ink-faint">
                        {t.status === "skipped" ? "ignoré" : `${t.durationMs} ms`}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section title={`Analyses des analystes (${run.result.analyses.length})`}>
                <div className="space-y-3">
                  {run.result.analyses.map((a) => (
                    <div key={a.analystIndex} className="rounded-lg border border-border p-3">
                      <p className="mb-1 text-xs font-medium text-ink-faint">
                        Analyste {a.analystIndex + 1} — {a.model.provider}/{a.model.model}
                      </p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-secondary">{a.text}</pre>
                    </div>
                  ))}
                </div>
                {run.result.targetedAnalyses.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Round ciblé (B3)</p>
                    {run.result.targetedAnalyses.map((a) => (
                      <div key={a.analystIndex} className="rounded-lg border border-accent/20 bg-accent-soft/40 p-3">
                        <p className="mb-1 text-xs font-medium text-ink-faint">
                          Analyste {a.analystIndex + 1} réexaminé — {a.model.provider}/{a.model.model}
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-secondary">{a.text}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Coûts">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Stat label="Coût estimé" value={`${run.result.estimatedCostCents.toFixed(2)} €`} unit="cents" />
                  <Stat label="Coût réel" value={`${run.result.actualCostCents.toFixed(2)} €`} unit="cents" />
                  <Stat label="Durée" value={`${(run.result.totalLatencyMs / 1000).toFixed(1)} s`} />
                  <Stat label="Tokens" value={String(run.result.totalTokens)} />
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h3>
      {children}
    </div>
  );
}

function SubList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h4>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">
        {value} {unit && <span className="text-xs font-normal text-ink-faint">{unit}</span>}
      </p>
    </div>
  );
}