"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StoredConversation, StoredMessage } from "@/lib/store";
import type { Profile } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import {
  askQuestion,
  deleteConversation,
  getConversationData,
  listAllConversations,
  listProvidersStatus,
  renameConversation,
} from "@/app/actions";
import { Sidebar } from "./Sidebar";
import { EmptyState } from "./EmptyState";
import { Composer } from "./Composer";
import { Progress } from "./Progress";
import { ConsensusSummaryCard } from "./ConsensusSummaryCard";
import { OutputPanel, type OutputPanelTab } from "./OutputPanel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { IconButton } from "./ui/IconButton";
import { Toast, type ToastTone } from "./ui/Toast";
import { CloseIcon, InfoIcon, MenuIcon, PlusIcon } from "./ui/icons";

type ProviderStatus = Awaited<ReturnType<typeof listProvidersStatus>>[number];
type OutputState = { runId: string; activeTab: OutputPanelTab };

export function AppShell({
  initialConversations,
  authEnabled,
  providersStatus,
}: {
  initialConversations: StoredConversation[];
  authEnabled: boolean;
  providersStatus: ProviderStatus[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [profile, setProfile] = useState<Profile>("economical");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [runKey, setRunKey] = useState(0);
  const abortRef = useRef(false);

  const missing = useMissingProviders(profile, providersStatus);
  const showBanner = !bannerDismissed && missing.length > 0;
  const hasConversation = selectedId !== null && messages.length > 0;
  const isEmpty = messages.length === 0;
  const analystCount = getProfile(profile).analysts.length;

  function showToast(message: string, tone: ToastTone = "info") {
    setToast({ message, tone });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!output) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOutput(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [output]);

  async function refreshConversation(id: string) {
    const data = await getConversationData(id);
    if (data) setMessages(data.messages);
  }

  async function selectConversation(id: string) {
    setSelectedId(id);
    setQuestion("");
    setError(null);
    setOutput(null);
    setMobileNavOpen(false);
    await refreshConversation(id);
  }

  function newConversation() {
    setSelectedId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
    setOutput(null);
    setMobileNavOpen(false);
  }

  async function submit(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    abortRef.current = false;
    setRunKey((k) => k + 1);
    try {
      const res = await askQuestion({ question, profile, conversationId: selectedId ?? undefined });
      if (abortRef.current) return;
      setSelectedId(res.conversationId);
      await refreshConversation(res.conversationId);
      setConversations(await listAllConversations());
      setQuestion("");
    } catch (err) {
      if (abortRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      if (!abortRef.current) setBusy(false);
    }
  }

  function stopAnalysis() {
    abortRef.current = true;
    setBusy(false);
    setQuestion("");
    showToast("Arrêt demandé — le traitement peut continuer côté serveur.", "info");
  }

  async function handleRename(id: string, title: string) {
    await renameConversation({ conversationId: id, title });
    setConversations(await listAllConversations());
  }

  async function handleDelete(id: string) {
    await deleteConversation({ conversationId: id });
    if (selectedId === id) {
      setSelectedId(null);
      setMessages([]);
    }
    setConversations(await listAllConversations());
    showToast("Conversation supprimée.", "success");
  }

  async function copyMessage(content: string) {
    await navigator.clipboard.writeText(content);
    showToast("Réponse copiée.", "success");
  }

  function lastUserQuestion(): string {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return lastUser?.content ?? "";
  }

  function regenerate() {
    const q = lastUserQuestion();
    if (q) submit(q);
  }

  function deepen() {
    const base = lastUserQuestion();
    if (!base) return;
    submit(
      `Approfondissez l'analyse précédente.\n\nQuestion d'origine : ${base}\n\nCreusez les points encore incertains, évaluez les hypothèses et précisez les recommandations.`
    );
  }

  function openOutput(runId: string, activeTab: OutputPanelTab = "summary") {
    setOutput({ runId, activeTab });
  }

  function closeOutput() {
    setOutput(null);
  }

  const selectedTitle = conversations.find((c) => c.id === selectedId)?.title ?? "";

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={conversations}
        selectedId={selectedId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onSelect={selectConversation}
        onNew={newConversation}
        onRename={handleRename}
        onDelete={handleDelete}
        authEnabled={authEnabled}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <IconButton
            label="Ouvrir le menu"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon size={16} />
          </IconButton>
          <h1 className="min-w-0 truncate text-sm font-medium text-ink">
            {hasConversation ? selectedTitle : "Nouvelle conversation"}
          </h1>
          <button
            onClick={newConversation}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface"
          >
            <PlusIcon size={13} />
            Nouvelle
          </button>
        </header>

        {showBanner && (
          <div className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
            <InfoIcon size={15} className="shrink-0" />
            <span className="flex-1">
              {missing.length === getProfile(profile).analysts.length + 1
                ? "Mode démo actif · Les analyses sont simulées"
                : `Clé API manquante : ${missing.join(", ")} — modèle simulé`}
            </span>
            <Link href="/providers" className="shrink-0 font-medium underline hover:opacity-80">
              Configurer les providers
            </Link>
            <IconButton label="Fermer la notification" onClick={() => setBannerDismissed(true)}>
              <CloseIcon size={14} />
            </IconButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyState
              question={question}
              setQuestion={setQuestion}
              onSubmit={() => submit(question)}
              busy={busy}
              onStop={stopAnalysis}
              profile={profile}
              setProfile={setProfile}
              analystCount={analystCount}
            />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">
                      {m.content}
                    </div>
                  </div>
                ) : m.runId ? (
                  <ConsensusSummaryCard
                    key={m.id}
                    content={m.content}
                    onCopy={() => copyMessage(m.content)}
                    onOpenOutput={() => openOutput(m.runId!)}
                    onRegenerate={regenerate}
                    onDeepen={deepen}
                  />
                ) : (
                  <article key={m.id} className="rounded-xl border border-border bg-bg p-5 shadow-sm">
                    <MarkdownRenderer content={m.content} />
                  </article>
                )
              )}
              {busy && <Progress key={runKey} active onStop={stopAnalysis} />}
            </div>
          )}
        </div>

        {hasConversation && (
          <div className="border-t border-border p-3 sm:p-4">
            <div className="mx-auto max-w-3xl">
              <Composer
                question={question}
                setQuestion={setQuestion}
                onSubmit={() => submit(question)}
                busy={busy}
                onStop={stopAnalysis}
                profile={profile}
                setProfile={setProfile}
                analystCount={analystCount}
              />
              {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            </div>
          </div>
        )}
      </main>

      {output && (
        <OutputPanel
          key={output.runId}
          runId={output.runId}
          activeTab={output.activeTab}
          onTabChange={(tab) => setOutput((o) => (o ? { ...o, activeTab: tab } : o))}
          onClose={closeOutput}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

function useMissingProviders(profile: Profile, providersStatus: ProviderStatus[]): string[] {
  const configured = new Set<string>(providersStatus.filter((p) => p.enabled).map((p) => p.provider));
  const cfg = getProfile(profile);
  const used = [cfg.orchestrator, ...cfg.analysts]
    .filter((s) => s.provider !== "mock")
    .map((s) => s.provider);
  return [...new Set(used.filter((p) => !configured.has(p)))];
}