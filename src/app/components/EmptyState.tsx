"use client";

import type { Profile } from "@/contracts/workflow";
import { Composer } from "./Composer";
import { SparklesIcon } from "./ui/icons";

const EXAMPLES = [
  "Comparer deux stratégies marketing et recommander la plus fiable",
  "Challenger une hypothèse métier avant une décision structurante",
  "Analyser une décision complexe avec ses risques et ses points d'accord",
  "Évaluer l'impact d'une nouvelle réglementation sur notre activité",
];

export function EmptyState({
  question,
  setQuestion,
  onSubmit,
  busy,
  onStop,
  profile,
  setProfile,
  analystCount,
}: {
  question: string;
  setQuestion: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onStop?: () => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  analystCount: number;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <SparklesIcon size={20} />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Que voulez-vous examiner aujourd&apos;hui ?
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
            Plusieurs modèles analysent votre question indépendamment, confrontent leurs points de
            vue et produisent une synthèse claire.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuestion(ex)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-strong"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Composer
            question={question}
            setQuestion={setQuestion}
            onSubmit={onSubmit}
            busy={busy}
            onStop={onStop}
            profile={profile}
            setProfile={setProfile}
            analystCount={analystCount}
          />
        </div>
      </div>
    </div>
  );
}