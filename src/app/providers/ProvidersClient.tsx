"use client";

import { useState } from "react";
import { listProvidersStatus, saveApiKey, testProviderConnection } from "@/app/actions";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS, PROVIDER_PLATFORMS } from "@/config/models";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { CheckIcon, ChevronDownIcon, LinkIcon } from "@/app/components/ui/icons";

export type ProviderStatus = Awaited<ReturnType<typeof listProvidersStatus>>[number];

function formatDate(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function providerModelLabel(provider: string): string | null {
  return MODELS_BY_PROVIDER[provider]?.[0]?.label ?? null;
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

  const sorted = [...providers]
    .filter((p) => p.provider !== "mock")
    .sort((a, b) => {
      if (a.needed !== b.needed) return a.needed ? -1 : 1;
      return PROVIDER_LABELS[a.provider].localeCompare(PROVIDER_LABELS[b.provider]);
    });

  const configured = sorted.filter((p) => p.enabled);
  const available = sorted.filter((p) => !p.enabled);
  const requiredMissing = available.filter((p) => p.needed);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Providers</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Les clés API sont chiffrées côté serveur et ne sont jamais stockées en clair. Une clé
        enregistrée active le provider correspondant pour vos analyses.
      </p>

      {requiredMissing.length > 0 && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <p className="font-medium text-warning">
            {requiredMissing.length === 1
              ? "1 provider requis n&apos;est pas configuré"
              : `${requiredMissing.length} providers requis ne sont pas configurés`}
          </p>
          <p className="mt-1 leading-relaxed text-ink-secondary">
            Les providers marqués <span className="font-medium text-warning">Requis</span> sont
            utilisés par votre configuration actuelle. Tant que leur clé n&apos;est pas enregistrée,
            les analyses correspondantes sont simulées en mode démo.
          </p>
        </div>
      )}

      {configured.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Providers configurés
          </h2>
          <div className="space-y-3">
            {configured.map((p) => (
              <ConfiguredProvider
                key={p.provider}
                status={p}
                busy={busy === p.provider}
                lastResult={result?.provider === p.provider ? result : null}
                onSave={(key) => saveKey(p.provider, key)}
                onTest={() => test(p.provider)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Providers disponibles
        </h2>
        <div className="space-y-2">
          {available.length === 0 ? (
            <p className="rounded-xl border border-border bg-bg px-4 py-3 text-sm text-ink-secondary">
              Tous les providers sont configurés.
            </p>
          ) : (
            available.map((p) => (
              <AvailableProvider
                key={p.provider}
                status={p}
                busy={busy === p.provider}
                lastResult={result?.provider === p.provider ? result : null}
                onSave={(key) => saveKey(p.provider, key)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ConfiguredProvider({
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
  const [showReplace, setShowReplace] = useState(false);
  const [key, setKey] = useState("");
  const model = providerModelLabel(status.provider);
  const updated = formatDate(status.updatedAt);

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink">{PROVIDER_LABELS[status.provider]}</span>
          <Badge tone="success">
            <CheckIcon size={11} />
            Configuré
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onTest} disabled={busy}>
            {busy ? "…" : "Tester"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReplace((v) => !v)} aria-expanded={showReplace}>
            Remplacer
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
        {model && <span>Modèle : {model}</span>}
        {status.maskedKey && <span className="font-mono">{status.maskedKey}</span>}
        {updated && <span>· Mise à jour le {updated}</span>}
      </div>

      {showReplace && (
        <>
          <PlatformHelp provider={status.provider} />
          <KeyForm
            label={`Remplacer la clé ${PROVIDER_LABELS[status.provider]}`}
            placeholder="sk-…"
            busy={busy}
            lastResult={lastResult}
            onSave={onSave}
            value={key}
            onChange={setKey}
          />
        </>
      )}
    </div>
  );
}

function AvailableProvider({
  status,
  busy,
  lastResult,
  onSave,
}: {
  status: ProviderStatus;
  busy: boolean;
  lastResult: { ok: boolean; detail: string } | null;
  onSave: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const model = providerModelLabel(status.provider);
  const needsAction = status.needed;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        needsAction ? "border-warning/40 bg-warning-soft/40" : "border-border bg-bg"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{PROVIDER_LABELS[status.provider]}</span>
          {needsAction ? (
            <Badge tone="warning">Requis · à configurer</Badge>
          ) : (
            <Badge tone="neutral">Non configuré</Badge>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">
          {model && <span className="hidden sm:inline">{model}</span>}
          <ChevronDownIcon size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <>
          <PlatformHelp provider={status.provider} />
          <KeyForm
            label={`Clé API ${PROVIDER_LABELS[status.provider]}`}
            placeholder="sk-…"
            busy={busy}
            lastResult={lastResult}
            onSave={onSave}
            value={key}
            onChange={setKey}
          />
        </>
      )}
    </div>
  );
}

function PlatformHelp({ provider }: { provider: string }) {
  const platform = PROVIDER_PLATFORMS[provider];
  if (!platform) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">
      <p>{platform.hint}</p>
      <a
        href={platform.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 font-medium text-accent hover:underline"
      >
        <LinkIcon size={13} />
        Accéder à la plateforme {PROVIDER_LABELS[provider]}
      </a>
    </div>
  );
}

function KeyForm({
  label,
  placeholder,
  busy,
  lastResult,
  onSave,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  busy: boolean;
  lastResult: { ok: boolean; detail: string } | null;
  onSave: (key: string) => void;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value);
      }}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={label}
        className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
      />
      <Button type="submit" variant="primary" size="sm" disabled={busy || !value.trim()}>
        {busy ? "…" : "Enregistrer"}
      </Button>
      {lastResult && (
        <p className={`w-full text-sm ${lastResult.ok ? "text-success" : "text-danger"}`}>{lastResult.detail}</p>
      )}
    </form>
  );
}
