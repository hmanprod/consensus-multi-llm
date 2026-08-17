"use client";

import { useState } from "react";
import type { OrchestrationConfig } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { listSavedConfigs, saveCustomConfig } from "@/app/actions";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];

function analystName(index: number): string {
  return `Analyste ${String.fromCharCode(66 + index)}`;
}

export function ConfigurationsClient({ initial }: { initial: SavedConfig[] }) {
  const defaultCfg = getProfile("economical");
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState("");
  const [orchestrator, setOrchestrator] = useState<RoleSpec>(defaultCfg.orchestrator);
  const [analysts, setAnalysts] = useState<RoleSpec[]>(defaultCfg.analysts);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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
        Deux profils : le profil « Économique » prêt à l&apos;emploi, et une configuration
        personnalisée où vous choisissez le modèle de chaque rôle.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ProfileCard name="Économique" desc="ChatGPT orchestre, Gemini (B) et Kimi (C) analysent en collaboration." highlight />
        <ProfileCard name="Personnalisé" desc="Choix manuel par rôle, analystes ajoutables (B, C, D…)." />
      </div>

      <form onSubmit={save} className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Créer une configuration personnalisée</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la configuration"
          className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />

        <div className="mt-6 space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Orchestrateur (Analyse A + consolidation + finale)</p>
            <RolePicker
              label="Orchestrateur"
              spec={orchestrator}
              onChange={(patch) => setOrchestratorPatch(patch)}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Analystes ({analysts.length})</p>
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
                  <RolePicker
                    label={analystName(i)}
                    spec={a}
                    onChange={(patch) => setAnalyst(i, patch)}
                    compact
                  />
                  {analysts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeAnalyst(i)}
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface hover:text-red-600"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Enregistrement…" : "Enregistrer la configuration"}
        </button>
        {done && <p className="mt-2 text-sm text-ink-secondary">{done}</p>}
      </form>

      {saved.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Configurations enregistrées</h2>
          <ul className="mt-3 space-y-2">
            {saved.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3 text-sm text-ink">
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-ink-faint">
                  {c.config.analysts.length} analystes · budget {c.config.maxBudgetCents} cents
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ name, desc, highlight }: { name: string; desc: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-accent bg-accent-soft/40" : "border-border bg-surface"
      }`}
    >
      <p className="text-sm font-semibold text-ink">{name}</p>
      <p className="mt-1 text-xs text-ink-secondary">{desc}</p>
    </div>
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
      <span className={`w-32 shrink-0 text-sm ${compact ? "text-ink-faint" : "font-medium text-ink"}`}>
        {label}
      </span>
      <select
        value={spec.provider}
        onChange={(e) => onChange({ provider: e.target.value })}
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