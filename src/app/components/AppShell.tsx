"use client";

import { useState } from "react";
import Link from "next/link";
import type { StoredConversation, StoredMessage } from "@/lib/store";
import type { Profile } from "@/contracts/workflow";
import { askQuestion, getConversationData, listAllConversations } from "@/app/actions";
import { RunDetails } from "./RunDetails";
import { Steps } from "./Steps";

const PROFILE_DESCRIPTIONS: Record<Profile, { title: string; subtitle: string }> = {
  economical: {
    title: "Économique",
    subtitle: "Rapide et peu coûteux, pour les questions simples.",
  },
  balanced: {
    title: "Équilibré",
    subtitle: "Recommandé pour un bon équilibre entre qualité et coût.",
  },
  custom: {
    title: "Personnalisé",
    subtitle: "Vous choisissez les modèles pour chaque rôle.",
  },
};

export function AppShell({ initialConversations }: { initialConversations: StoredConversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [profile, setProfile] = useState<Profile>("balanced");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshConversation(id: string) {
    const data = await getConversationData(id);
    if (data) setMessages(data.messages);
  }

  async function selectConversation(id: string) {
    setSelectedId(id);
    await refreshConversation(id);
  }

  function newConversation() {
    setSelectedId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
  }

  async function submit(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await askQuestion({ question, profile, conversationId: selectedId ?? undefined });
      setSelectedId(res.conversationId);
      await refreshConversation(res.conversationId);
      setConversations(await listAllConversations());
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  const hasConversation = selectedId !== null && messages.length > 0;
  const isEmpty = !hasConversation && messages.length === 0;

  return (
    <div className="flex h-dvh">
      <Sidebar
        conversations={conversations}
        selectedId={selectedId}
        onSelect={selectConversation}
        onNew={newConversation}
        profile={profile}
        setProfile={setProfile}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyState
              onSubmit={submit}
              busy={busy}
              question={question}
              setQuestion={setQuestion}
              profile={profile}
            />
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
              {busy && !hasConversation && (
                <div className="mb-2">
                  <Steps active />
                </div>
              )}
              {messages.map((m) => (
                <article key={m.id}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {m.role === "user" ? "Vous" : "Réponse finale"}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink">
                    {m.content}
                  </pre>
                  {m.role === "assistant" && m.runId && <RunDetails runId={m.runId} />}
                </article>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  Plusieurs modèles analysent votre question…
                </div>
              )}
            </div>
          )}
        </div>

        {hasConversation && (
          <Composer
            question={question}
            setQuestion={setQuestion}
            onSubmit={submit}
            busy={busy}
            error={error}
          />
        )}
        {!isEmpty && error && (
          <p className="px-6 pb-2 text-center text-xs text-red-600">{error}</p>
        )}
      </main>
    </div>
  );
}

function Sidebar({
  conversations,
  selectedId,
  onSelect,
  onNew,
  profile,
  setProfile,
}: {
  conversations: StoredConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
}) {
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const details = PROFILE_DESCRIPTIONS[profile];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <button onClick={onNew} className="flex items-center gap-2 px-4 pb-3 pt-4 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-semibold text-bg">
          +
        </span>
        <span className="text-sm font-medium text-ink">Nouvelle conversation</span>
      </button>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Conversations récentes
        </p>
        {conversations.length === 0 && (
          <p className="px-3 py-2 text-xs text-ink-faint">Aucune conversation pour l&apos;instant.</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              c.id === selectedId
                ? "bg-bg font-medium text-ink shadow-sm"
                : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {c.title}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Configuration</p>
        <label className="mb-1 block text-sm font-medium text-ink">Profil</label>
        <select
          value={profile}
          onChange={(e) => {
            setProfile(e.target.value as Profile);
            setShowProfileDetails(false);
          }}
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="economical">Économique</option>
          <option value="balanced">Équilibré</option>
          <option value="custom">Personnalisé</option>
        </select>
        <p className="mt-2 text-xs leading-snug text-ink-secondary">{details.subtitle}</p>
        {showProfileDetails && (
          <div className="mt-2 rounded-lg border border-border bg-bg p-2 text-xs text-ink-secondary">
            <p className="mb-1 font-medium text-ink">{details.title}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Économique : modèles rapides, sans round ciblé.</li>
              <li>Équilibré : diversité de modèles, consensus systématique.</li>
              <li>Personnalisé : choix manuel par rôle (à venir).</li>
            </ul>
          </div>
        )}
        <button
          onClick={() => setShowProfileDetails((v) => !v)}
          className="mt-2 text-xs font-medium text-accent hover:underline"
        >
          {showProfileDetails ? "Masquer les détails" : "Voir les détails"}
        </button>

        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          <Link href="/configurations" className="rounded-md px-2 py-1.5 text-left text-sm text-ink-secondary hover:bg-surface-hover">
            Configurations
          </Link>
          <Link href="/providers" className="rounded-md px-2 py-1.5 text-left text-sm text-ink-secondary hover:bg-surface-hover">
            Providers
          </Link>
          <Link href="/parametres" className="rounded-md px-2 py-1.5 text-left text-sm text-ink-secondary hover:bg-surface-hover">
            Paramètres
          </Link>
        </div>
      </div>
    </aside>
  );
}

function EmptyState({
  onSubmit,
  busy,
  question,
  setQuestion,
  profile,
}: {
  onSubmit: (q: string) => void;
  busy: boolean;
  question: string;
  setQuestion: (s: string) => void;
  profile: Profile;
}) {
  const details = PROFILE_DESCRIPTIONS[profile];
  const canSubmit = question.trim().length > 0 && !busy;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Posez votre question</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Plusieurs modèles analysent votre question, comparent leurs réponses et produisent une
          synthèse fiable.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(question);
          }}
          className="mt-6"
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="Que souhaitez-vous analyser ?"
            className="w-full resize-none rounded-xl border border-border bg-bg p-4 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            autoFocus
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-secondary">
              Mode <span className="font-medium text-ink">{details.title}</span>
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                canSubmit
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "cursor-not-allowed bg-surface text-ink-faint"
              }`}
            >
              {busy ? "Analyse en cours…" : "Analyser la question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Composer({
  question,
  setQuestion,
  onSubmit,
  busy,
  error,
}: {
  question: string;
  setQuestion: (s: string) => void;
  onSubmit: (q: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const canSubmit = question.trim().length > 0 && !busy;
  return (
    <div className="border-t border-border p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(question);
        }}
        className="mx-auto flex max-w-2xl items-end gap-2"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={1}
          placeholder="Posez votre question…"
          className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-bg px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            canSubmit
              ? "bg-accent text-white hover:bg-accent/90"
              : "cursor-not-allowed bg-surface text-ink-faint"
          }`}
        >
          {busy ? "…" : "Envoyer"}
        </button>
      </form>
      {error && <p className="mx-auto mt-2 max-w-2xl text-xs text-red-600">{error}</p>}
    </div>
  );
}