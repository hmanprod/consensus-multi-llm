"use client";

const STEPS = [
  { label: "Analyses (A, B, C)", key: "analyses" },
  { label: "Consolidation orchestrateur", key: "consolidation" },
  { label: "Révisions des analystes", key: "revisions" },
  { label: "Analyse finale", key: "finale" },
];

export function Steps({ active }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-secondary">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-6 bg-border" />}
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                active && i === 0 ? "animate-pulse bg-accent" : "bg-ink-faint"
              }`}
            />
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}