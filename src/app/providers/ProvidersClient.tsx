"use client";

import { useState } from "react";
import { listProvidersStatus, saveApiKey, testProviderConnection } from "@/app/actions";
import { PROVIDER_LABELS } from "@/config/models";

export type ProviderStatus = Awaited<ReturnType<typeof listProvidersStatus>>[number];

export function ProvidersClient({ initial }: { initial: ProviderStatus[] }) {
  const [providers, setProviders] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ provider: string; ok: boolean; detail: string } | null>(null);

  async function saveKey(provider: string, key: string) {
    if (!key.trim()) return;
    setBusy(provider);
    setResult(null);
    try {
      await saveApiKey({ provider, apiKey: key });
      setProviders(await listProvidersStatus());
      setResult({ provider, ok: true, detail: "Clé enregistrée (chiffrée côté serveur)." });
    } catch (err) {
      setResult({ provider, ok: false, detail: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setBusy(null);
    }
  }

  async function test(provider: string) {
    setBusy(provider);
    setResult(null);
    try {
      const res = await testProviderConnection({ provider });
      setResult({ provider, ok: res.ok, detail: res.detail });
    } catch (err) {
      setResult({ provider, ok: false, detail: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setBusy(null);
    }
  }

  const rows = providers.filter((p) => p.provider !== "mock");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Providers</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Ajoutez les clés API des fournisseurs à utiliser. Elles sont chiffrées côté serveur et ne
        sont jamais stockées en clair.
      </p>

      <div className="mt-8 space-y-4">
        {rows.map((p) => (
          <ProviderRow
            key={p.provider}
            provider={p.provider}
            status={p}
            busy={busy === p.provider}
            onSave={(key) => saveKey(p.provider, key)}
            onTest={() => test(p.provider)}
          />
        ))}
      </div>

      {result && (
        <p className={`mt-4 text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
          {result.detail}
        </p>
      )}
    </div>
  );
}

function ProviderRow({
  provider,
  status,
  busy,
  onSave,
  onTest,
}: {
  provider: string;
  status: ProviderStatus;
  busy: boolean;
  onSave: (key: string) => void;
  onTest: () => void;
}) {
  const [key, setKey] = useState("");
  const enabled = status.enabled;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{PROVIDER_LABELS[provider] ?? provider}</span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
              enabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : "border-border bg-surface text-ink-faint"
            }`}
          >
            {enabled ? "Configuré" : "Non configuré"}
          </span>
        </div>
        {status.maskedKey && <span className="font-mono text-xs text-ink-faint">{status.maskedKey}</span>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(key);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !key.trim()}
          className="shrink-0 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={busy || !enabled}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface disabled:opacity-40"
        >
          {busy ? "…" : "Tester"}
        </button>
      </form>
    </div>
  );
}