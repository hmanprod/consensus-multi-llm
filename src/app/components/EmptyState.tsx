"use client";

import type { Profile } from "@/contracts/workflow";
import { Composer } from "./Composer";
import { SparklesIcon } from "./ui/icons";

const EXAMPLES = [
  { title: "Comparer des stratégies", description: "Deux options, une recommandation." },
  { title: "Challenger une hypothèse", description: "Votre conviction mise à l'épreuve." },
  { title: "Analyser une décision", description: "Accords, risques et limites." },
  { title: "Évaluer une réglementation", description: "Impact sur votre activité." },
];

export function EmptyState({
  question,
  setQuestion,
  onSubmit,
  busy,
  onStop,
  profile,
  setProfile,
}: {
  question: string;
  setQuestion: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onStop?: () => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <SparklesIcon size={20} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Prenez une décision avec plusieurs points de vue.
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
            Consensus compare plusieurs analyses indépendantes et fait ressortir les accords,
            désaccords et risques.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              onClick={() => setQuestion(ex.title)}
              className="group rounded-xl border border-border bg-bg p-3.5 text-left transition-colors hover:border-accent hover:bg-accent-soft/40"
            >
              <p className="text-sm font-medium text-ink transition-colors group-hover:text-accent-strong">
                {ex.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{ex.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <Composer
            question={question}
            setQuestion={setQuestion}
            onSubmit={onSubmit}
            busy={busy}
            onStop={onStop}
            profile={profile}
            setProfile={setProfile}
          />
        </div>
      </div>
    </div>
  );
}
