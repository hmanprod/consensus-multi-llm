"use client";

import { useState } from "react";
import type { OrchestrationConfig } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { listSavedConfigs, saveCustomConfig } from "@/app/actions";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ChevronDownIcon } from "@/app/components/ui/icons";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];

function analystName(index: number): string {
  return `Analyste ${String.fromCharCode(66 + index)}`;
}

function specLabel(spec: RoleSpec): string {
  return `${PROVIDER_LABELS[spec.provider] ?? spec.provider} · ${MODELS_BY_PROVIDER[spec.provider]?.find((m) => m.slug === spec.model)?.label ?? spec.model}`;
}

export function ConfigurationsClient({ initial }: { initial: SavedConfig[] }) {
  const defaultCfg = getProfile("economical");
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState("");
  const [orchestrator, setOrchestrator] = useState<RoleSpec>(defaultCfg.orchestrator);
  const [analysts, setAnalysts] = useState<RoleSpec[]>(defaultCfg.analysts);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  function loadConfig(config: OrchestrationConfig) {
    setOrchestrator(config.orchestrator);
    setAnalysts(config.analysts.map((a) => ({ ...a })));
  }

  function setOrchestratorPatch(patch: Partial<RoleSpec>) {
    const next = { ...orchestrator, ...patch };
    if (patch.provider) next.model = MODELS_BY_PROVIDER[patch.provider][0].slug;
    setOrchestrator(next);
  }

  function setAnalyst(index: number, patch: Partial<RoleSpec>) {
    setAnalysts((list) => {
      const next = { ...list[index], ...patch };
      if (patch.provider) next.model = MODELS_BY_PROVIDER[patch.provider][0].slug;
      return list.map((a, i) => (i === index ? next : a));
    });
  }

  function addAnalyst() {
    setAnalysts((list) => [...list, { provider: "mock", model: "mock" }]);
  }

  function removeAnalyst(index: number) {
    setAnalysts((list) => list.filter((_, i) => i !== index));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setDone(null);
    try {
      const config: OrchestrationConfig = {
        ...defaultCfg,
        orchestrator,
        analysts,
      };
      await saveCustomConfig({ name, config });
      setSaved(await listSavedConfigs());
      setDone("Configuration enregistrée.");
    } catch (err) {
      setDone(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configurations</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Deux profils prêts à l&apos;emploi, et des configurations personnalisées où vous choisissez
        le modèle de chaque rôle.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ProfileFiche
          name="Économique"
          config={getProfile("economical")}
          highlight
          onUse={() => loadConfig(getProfile("economical"))}
        />
        <ProfileFiche name="Personnalisé" config={getProfile("custom")} onUse={() => loadConfig(getProfile("custom"))} />
      </div>

      <form onSubmit={save} className="mt-10">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-ink">Créer une configuration personnalisée</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {orchestrator && `Orchestrateur : ${specLabel(orchestrator)} · ${analysts.length} analystes`}
            </p>
          </div>
          <ChevronDownIcon size={16} className={`text-ink-faint transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor="cfg-name" className="mb-1.5 block text-sm font-medium text-ink">
                Nom de la configuration
              </label>
              <input
                id="cfg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. : Configuration équilibrée"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
              />
            </div>

            <section className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Orchestrateur (Analyse A + consolidation + finale)
              </p>
              <RolePicker label="Orchestrateur" spec={orchestrator} onChange={(patch) => setOrchestratorPatch(patch)} />
            </section>

            <section className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Analystes ({analysts.length})
                </p>
                <button
                  type="button"
                  onClick={addAnalyst}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface"
                >
                  + Ajouter un analyste
                </button>
              </div>
              <div className="space-y-2">
                {analysts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RolePicker label={analystName(i)} spec={a} onChange={(patch) => setAnalyst(i, patch)} compact />
                    {analysts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAnalyst(i)}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface hover:text-danger"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {showAdvanced && (
          <Button type="submit" variant="primary" className="mt-4" disabled={busy || !name.trim()}>
            {busy ? "Enregistrement…" : "Enregistrer la configuration"}
          </Button>
        )}
        {done && <p className="mt-2 text-sm text-ink-secondary">{done}</p>}
      </form>

      {saved.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Configurations enregistrées</h2>
          <ul className="mt-3 space-y-3">
            {saved.map((c) => (
              <SavedFiche key={c.id} config={c} onUse={() => loadConfig(c.config)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileFiche({
  name,
  config,
  highlight,
  onUse,
}: {
  name: string;
  config: OrchestrationConfig;
  highlight?: boolean;
  onUse: () => void;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-accent bg-accent-soft/40" : "border-border bg-surface"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{name}</p>
        <Button size="sm" onClick={onUse}>
          Utiliser
        </Button>
      </div>
      <p className="mt-1 text-xs text-ink-secondary">
        {config.analysts.length} analystes · budget {config.maxBudgetCents} cents
      </p>
      <ul className="mt-3 space-y-1">
        <li className="text-xs text-ink-secondary">
          <span className="font-medium text-ink-faint">Orchestrateur</span> — {specLabel(config.orchestrator)}
        </li>
        {config.analysts.map((a, i) => (
          <li key={i} className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">{analystName(i)}</span> — {specLabel(a)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SavedFiche({ config, onUse }: { config: SavedConfig; onUse: () => void }) {
  return (
    <li className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{config.name}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {config.config.analysts.length} analystes · budget {config.config.maxBudgetCents} cents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{config.profile}</Badge>
          <Button size="sm" onClick={onUse}>
            Utiliser
          </Button>
        </div>
      </div>
      <ul className="mt-3 space-y-1 border-t border-border pt-3">
        <li className="text-xs text-ink-secondary">
          <span className="font-medium text-ink-faint">Orchestrateur</span> — {specLabel(config.config.orchestrator)}
        </li>
        {config.config.analysts.map((a, i) => (
          <li key={i} className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">{analystName(i)}</span> — {specLabel(a)}
          </li>
        ))}
      </ul>
    </li>
  );
}

function RolePicker({
  label,
  spec,
  onChange,
  compact,
}: {
  label: string;
  spec: RoleSpec;
  onChange: (patch: Partial<RoleSpec>) => void;
  compact?: boolean;
}) {
  const providers = Object.keys(MODELS_BY_PROVIDER);
  return (
    <div className={compact ? "flex flex-1 items-center gap-2" : "flex flex-wrap items-center gap-2"}>
      <span className={`w-32 shrink-0 text-sm ${compact ? "text-ink-faint" : "font-medium text-ink"}`}>{label}</span>
      <select
        value={spec.provider}
        onChange={(e) => onChange({ provider: e.target.value })}
        aria-label={`Provider du rôle ${label}`}
        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
      >
        {providers.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABELS[p] ?? p}
          </option>
        ))}
      </select>
      <select
        value={spec.model}
        onChange={(e) => onChange({ model: e.target.value })}
        aria-label={`Modèle du rôle ${label}`}
        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
      >
        {MODELS_BY_PROVIDER[spec.provider].map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}