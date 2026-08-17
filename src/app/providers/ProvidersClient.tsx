"use client";

import { useState } from "react";
import { listProvidersStatus, saveApiKey, testProviderConnection } from "@/app/actions";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { CheckIcon } from "@/app/components/ui/icons";

export type ProviderStatus = Awaited<ReturnType<typeof listProvidersStatus>>[number];

function formatDate(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

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
        Les clés API sont chiffrées côté serveur et ne sont jamais stockées en clair. Une clé
        enregistrée active le provider correspondant pour vos analyses.
      </p>

      <div className="mt-8 space-y-4">
        {rows.map((p) => (
          <ProviderCard
            key={p.provider}
            status={p}
            busy={busy === p.provider}
            lastResult={result?.provider === p.provider ? result : null}
            onSave={(key) => saveKey(p.provider, key)}
            onTest={() => test(p.provider)}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  status,
  busy,
  lastResult,
  onSave,
  onTest,
}: {
  status: ProviderStatus;
  busy: boolean;
  lastResult: { ok: boolean; detail: string } | null;
  onSave: (key: string) => void;
  onTest: () => void;
}) {
  const [key, setKey] = useState("");
  const enabled = status.enabled;
  const model = MODELS_BY_PROVIDER[status.provider]?.[0];

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{PROVIDER_LABELS[status.provider] ?? status.provider}</span>
          {enabled ? (
            <Badge tone="success">
              <CheckIcon size={11} />
              Configuré
            </Badge>
          ) : (
            <Badge tone="neutral">Non configuré</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-faint">
          {model && <span>Modèle : {model.label}</span>}
          {status.maskedKey && <span className="font-mono">{status.maskedKey}</span>}
        </div>
      </div>

      {enabled && status.updatedAt && (
        <p className="mt-2 text-xs text-ink-faint">Dernière mise à jour : {formatDate(status.updatedAt)}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(key);
        }}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={enabled ? "Remplacer la clé…" : "sk-…"}
          autoComplete="off"
          aria-label={`Clé API ${PROVIDER_LABELS[status.provider] ?? status.provider}`}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={busy || !key.trim()}>
          {busy ? "…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onTest} disabled={busy || !enabled}>
          {busy ? "…" : "Tester"}
        </Button>
      </form>

      {lastResult && (
        <p className={`mt-2 text-sm ${lastResult.ok ? "text-success" : "text-danger"}`}>{lastResult.detail}</p>
      )}
    </div>
  );
}