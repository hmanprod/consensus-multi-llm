"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ActiveConfig } from "@/contracts/workflow";
import type { StoredConfig } from "@/lib/store";
import { configRefKey, parseConfigRefKey } from "@/config/profiles";
import { SendIcon, SettingsIcon, StopIcon } from "./ui/icons";

export function Composer({
  question,
  setQuestion,
  onSubmit,
  busy,
  onStop,
  activeRef,
  savedConfigs,
  onConfigChange,
}: {
  question: string;
  setQuestion: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onStop?: () => void;
  activeRef: ActiveConfig;
  savedConfigs: StoredConfig[];
  onConfigChange: (ref: ActiveConfig) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSubmit = question.trim().length > 0 && !busy;
  const selectValue = savedConfigs.some((c) => configRefKey(activeRef) === `saved:${c.id}`)
    ? configRefKey(activeRef)
    : savedConfigs[0]
      ? `saved:${savedConfigs[0].id}`
      : "saved:";

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
    <div className="group rounded-xl border border-border-strong bg-bg shadow-sm transition-colors focus-within:border-accent">
      <div className="flex items-end gap-2 p-2">
        <textarea
          ref={ref}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Posez votre question…"
          aria-label="Votre question"
          className="max-h-40 min-h-[2rem] flex-1 resize-none bg-transparent px-2 py-1 text-base leading-relaxed text-ink outline-none placeholder:text-ink-secondary/70 sm:text-[15px]"
        />
        {busy && onStop ? (
          <button
            onClick={onStop}
            aria-label="Arrêter l'analyse"
            title="Arrêter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <StopIcon size={14} />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Envoyer"
            title="Envoyer (Entrée)"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 pb-2.5 pt-2">
        <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <SettingsIcon size={13} className="shrink-0 text-ink-faint" />
          <select
            value={selectValue}
            onChange={(e) => onConfigChange(parseConfigRefKey(e.target.value))}
            aria-label="Configuration d'analyse"
            className="max-w-[15rem] cursor-pointer rounded-md border border-border bg-surface px-2 py-0.5 text-sm font-medium text-ink outline-none transition-colors focus:border-accent"
          >
            {savedConfigs.length === 0 && (
              <option value="saved:" disabled>
                Aucune configuration
              </option>
            )}
            {savedConfigs.map((c) => (
              <option key={c.id} value={`saved:${c.id}`}>
                {c.name} · {c.config.analysts.length} analystes
              </option>
            ))}
          </select>
          <Link
            href="/configurations"
            className="shrink-0 font-medium text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Modifier
          </Link>
        </label>
        <span className="hidden text-[11px] text-ink-faint opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 sm:inline">
          Entrée pour envoyer · Maj + Entrée pour nouvelle ligne
        </span>
      </div>
    </div>
  );
}
