"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "@/contracts/workflow";
import { SendIcon, StopIcon } from "./ui/icons";

export function Composer({
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSubmit = question.trim().length > 0 && !busy;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [question]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg shadow-sm transition-colors focus-within:border-accent">
      <div className="flex items-end gap-2 p-2.5">
        <textarea
          ref={ref}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Posez votre question…"
          aria-label="Votre question"
          className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
        {busy && onStop ? (
          <button
            onClick={onStop}
            aria-label="Arrêter l'analyse"
            title="Arrêter"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <StopIcon size={16} />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Envoyer"
            title="Envoyer (Entrée)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon size={16} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <label className="flex items-center gap-1.5 text-xs text-ink-faint">
          Profil
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as Profile)}
            aria-label="Profil d'analyse"
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink outline-none transition-colors focus:border-accent"
          >
            <option value="economical">Économique · {analystCount} analystes</option>
            <option value="custom">Personnalisé</option>
          </select>
        </label>
        <span className="hidden text-xs text-ink-faint sm:inline">Entrée pour envoyer · Maj + Entrée pour nouvelle ligne</span>
      </div>
    </div>
  );
}