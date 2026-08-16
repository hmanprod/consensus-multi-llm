"use client";

import { useState } from "react";
import type { OrchestrationConfig } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { listSavedConfigs, saveCustomConfig } from "@/app/actions";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];

const ROLES: Array<{ key: "orchestrator" | "consensus" | "synthesis"; label: string }> = [
  { key: "orchestrator", label: "Orchestrateur" },
  { key: "consensus", label: "Consensus B2" },
  { key: "synthesis", label: "Synthèse finale" },
];

export function ConfigurationsClient({ initial }: { initial: SavedConfig[] }) {
  const defaultCfg = getProfile("balanced");
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState("");
  const [specs, setSpecs] = useState<Record<string, RoleSpec>>({
    orchestrator: defaultCfg.orchestrator,
    analyst0: defaultCfg.analysts[0],
    analyst1: defaultCfg.analysts[1],
    analyst2: defaultCfg.analysts[2],
    consensus: defaultCfg.consensus,
    synthesis: defaultCfg.synthesis,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  function setRole(key: string, patch: Partial<RoleSpec>) {
    setSpecs((s) => {
      const next = { ...s[key], ...patch };
      if (patch.provider) next.model = MODELS_BY_PROVIDER[patch.provider][0].slug;
      return { ...s, [key]: next };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setDone(null);
    try {
      const config: OrchestrationConfig = {
        ...defaultCfg,
        orchestrator: specs.orchestrator,
        analysts: [specs.analyst0, specs.analyst1, specs.analyst2],
        consensus: specs.consensus,
        synthesis: specs.synthesis,
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
        Trois profils prêts à l&apos;emploi, plus une configuration personnalisée où vous choisissez
        le modèle de chaque rôle.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <ProfileCard name="Économique" desc="Rapide et peu coûteux." />
        <ProfileCard name="Équilibré" desc="Qualité et coût équilibrés." highlight />
        <ProfileCard name="Personnalisé" desc="Choix manuel par rôle." />
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
          {ROLES.map(({ key, label }) => (
            <RolePicker key={key} label={label} spec={specs[key]} onChange={(patch) => setRole(key, patch)} />
          ))}
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Analystes (3)</p>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <RolePicker
                  key={i}
                  label={`Analyste ${i + 1}`}
                  spec={specs[`analyst${i}`]}
                  onChange={(patch) => setRole(`analyst${i}`, patch)}
                  compact
                />
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
    <div className={compact ? "flex items-center gap-2" : "flex flex-wrap items-center gap-2"}>
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