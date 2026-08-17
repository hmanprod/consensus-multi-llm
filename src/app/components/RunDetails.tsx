"use client";

import { useState } from "react";
import type { StoredRun } from "@/lib/store";
import { getRunData } from "@/app/actions";

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

  const result = run?.result;
  const hasNew = Boolean(result?.finalSynthesis);

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
          {hasNew && result && (
            <>
              <Section title="Analyse finale">
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink">
                  {result.finalSynthesis.text}
                </pre>
              </Section>

              <Section title="Déroulement">
                <div className="space-y-3">
                  <AnalysisBlock
                    label="Analyse A — orchestrateur"
                    model={result.analysisA.model}
                    text={result.analysisA.text}
                  />
                  <div className="space-y-2">
                    {result.initialAnalyses.map((a) => (
                      <AnalysisBlock key={a.label} label={`Analyse ${a.label} — analyste`} model={a.model} text={a.text} />
                    ))}
                  </div>
                  <AnalysisBlock
                    label={`Analyse consolidée ${result.consolidated.label} — orchestrateur`}
                    model={result.consolidated.model}
                    text={result.consolidated.text}
                  />
                  <div className="space-y-2">
                    {result.revisedAnalyses.map((a) => (
                      <AnalysisBlock key={a.label} label={`Analyse ${a.label} — analyste (révision)`} model={a.model} text={a.text} />
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Timeline">
                <ol className="space-y-1.5">
                  {result.timeline.map((t, i) => (
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

              <Section title="Coûts">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Stat label="Coût estimé" value={`${result.estimatedCostCents.toFixed(2)} €`} unit="cents" />
                  <Stat label="Coût réel" value={`${result.actualCostCents.toFixed(2)} €`} unit="cents" />
                  <Stat label="Durée" value={`${(result.totalLatencyMs / 1000).toFixed(1)} s`} />
                  <Stat label="Tokens" value={String(result.totalTokens)} />
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisBlock({ label, model, text }: { label: string; model: { provider: string; model: string }; text: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-1 text-xs font-medium text-ink-faint">
        {label} — {model.provider}/{model.model}
      </p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-secondary">{text}</pre>
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