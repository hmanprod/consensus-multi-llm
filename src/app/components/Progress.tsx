"use client";

import { useEffect, useState } from "react";
import { StopIcon } from "./ui/icons";

const PHASES = [
  { key: "a", label: "Compréhension de la question" },
  { key: "b", label: "Analyses indépendantes" },
  { key: "c", label: "Comparaison des points de vue" },
  { key: "d", label: "Révisions des analystes" },
  { key: "e", label: "Synthèse finale" },
];

export function Progress({ active, onStop }: { active: boolean; onStop?: () => void }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setCurrent((c) => {
        if (c >= PHASES.length - 1) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyse en cours"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Analyse en cours</p>
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
      <ul className="mt-3 space-y-1.5">
        {PHASES.map((phase, i) => {
          const done = i < current;
          const doing = active && i === current;
          return (
            <li key={phase.key} className="flex items-center gap-2.5 text-sm">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                  doing ? "animate-pulse bg-accent" : done ? "bg-success" : "bg-border-strong"
                }`}
              />
              <span className={done ? "text-ink-secondary" : doing ? "text-ink" : "text-ink-faint"}>
                {phase.label}
              </span>
              {done && <span className="text-xs text-ink-faint">terminé</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}