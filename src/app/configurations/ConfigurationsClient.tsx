"use client";

import { useState } from "react";
import type { OrchestrationConfig } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { listSavedConfigs, saveCustomConfig } from "@/app/actions";
import { estimateCost } from "@/gateway/cost";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ChevronDownIcon } from "@/app/components/ui/icons";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];
type ActiveRef = "economical" | "best" | `saved:${string}`;

const DEFAULT_PROFILES: { id: "economical" | "best"; name: string; tagline: string; speed: string }[] = [
  { id: "economical", name: "Économique", tagline: "Modèles rapides, budget maîtrisé", speed: "Rapide" },
  { id: "best", name: "Best Models", tagline: "Meilleurs modèles, analyse approfondie", speed: "Approfondi" },
];

function analystName(index: number): string {
  return `Analyste ${String.fromCharCode(66 + index)}`;
}

function specLabel(spec: RoleSpec): string {
  return `${PROVIDER_LABELS[spec.provider] ?? spec.provider} · ${MODELS_BY_PROVIDER[spec.provider]?.find((m) => m.slug === spec.model)?.label ?? spec.model}`;
}

function estimateRunCost(config: OrchestrationConfig): string {
  const promptLen = 400;
  let total = estimateCost(config.orchestrator, promptLen, 400);
  for (const a of config.analysts) {
    total += estimateCost(a, promptLen, 500);
    total += estimateCost(config.orchestrator, promptLen * 3, 400);
    total += estimateCost(a, promptLen * 4, 400);
  }
  total += estimateCost(config.orchestrator, promptLen * 6, 700);
  return `${(total / 100).toFixed(2)} €`;
}

export function ConfigurationsClient({
  initial,
  demo,
}: {
  initial: SavedConfig[];
  demo: boolean;
}) {
  const defaultCfg = getProfile("economical");
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState<ActiveRef>("economical");
  const [name, setName] = useState("");
  const [orchestrator, setOrchestrator] = useState<RoleSpec>(defaultCfg.orchestrator);
  const [analysts, setAnalysts] = useState<RoleSpec[]>(defaultCfg.analysts);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const customMode = showAdvanced || active.startsWith("saved:");
  const draftConfig: OrchestrationConfig = { ...defaultCfg, orchestrator, analysts };

  function activateProfile(id: "economical" | "best") {
    setActive(id);
    setShowAdvanced(false);
    setDone(null);
  }

  function activateSaved(id: string) {
    setActive(`saved:${id}`);
    setDone(null);
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
      const res = await saveCustomConfig({ name, config: draftConfig });
      setSaved(await listSavedConfigs());
      setActive(`saved:${res.id}`);
      setDone("Configuration enregistrée et active.");
    } catch (err) {
      setDone(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configurations</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Deux profils prêts à l&apos;emploi. Vous pouvez ensuite créer vos propres configurations
        personnalisées.
      </p>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Profils prêts à l&apos;emploi
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEFAULT_PROFILES.map((p) => (
            <ProfileFiche
              key={p.id}
              profile={p}
              config={getProfile(p.id)}
              active={active === p.id}
              dimmed={customMode}
              demo={demo}
              onUse={() => activateProfile(p.id)}
            />
          ))}
        </div>
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
                  <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <RolePicker label={analystName(i)} spec={a} onChange={(patch) => setAnalyst(i, patch)} compact />
                    {analysts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAnalyst(i)}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface hover:text-danger sm:self-center"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-secondary">
                Coût estimé par analyse :{" "}
                <span className="font-medium text-ink">{estimateRunCost(draftConfig)}</span>
              </p>
              <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
                {busy ? "Enregistrement…" : "Enregistrer la configuration"}
              </Button>
            </div>
            {done && <p className="text-sm text-ink-secondary">{done}</p>}
          </div>
        )}
      </form>

      {saved.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Configurations enregistrées</h2>
          <ul className="mt-3 space-y-3">
            {saved.map((c) => (
              <SavedFiche
                key={c.id}
                config={c}
                active={active === `saved:${c.id}`}
                onUse={() => activateSaved(c.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-2 py-1.5">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function ProfileFiche({
  profile,
  config,
  active,
  dimmed,
  demo,
  onUse,
}: {
  profile: { id: "economical" | "best"; name: string; tagline: string; speed: string };
  config: OrchestrationConfig;
  active: boolean;
  dimmed: boolean;
  demo: boolean;
  onUse: () => void;
}) {
  const cardClass = dimmed
    ? "border-border bg-surface opacity-50"
    : active
      ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
      : "border-border bg-surface";
  return (
    <div className={`rounded-xl border p-4 transition-colors ${cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{profile.name}</p>
            <Badge tone="neutral">{profile.speed}</Badge>
            {demo && <Badge tone="warning">Démo</Badge>}
            {active && !dimmed && <Badge tone="accent">Actif</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-ink-secondary">{profile.tagline}</p>
        </div>
        {!active || dimmed ? (
          <Button size="sm" variant={dimmed ? "secondary" : "primary"} onClick={onUse}>
            Utiliser
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Analystes" value={String(config.analysts.length)} />
        <Stat label="Budget max" value={`${(config.maxBudgetCents / 100).toFixed(2)} €`} />
        <Stat label="Coût / analyse" value={estimateRunCost(config)} />
      </div>

      <ul className="mt-3 space-y-1 border-t border-border pt-3">
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

function SavedFiche({
  config,
  active,
  onUse,
}: {
  config: SavedConfig;
  active: boolean;
  onUse: () => void;
}) {
  return (
    <li
      className={`rounded-xl border p-4 transition-colors ${
        active ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-border bg-bg"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{config.name}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {config.config.analysts.length} analystes · budget {config.config.maxBudgetCents} cents ·
            ≈ {estimateRunCost(config.config)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="neutral">Personnalisé</Badge>
          {active ? (
            <Badge tone="accent">Actif</Badge>
          ) : (
            <Button size="sm" variant="primary" onClick={onUse}>
              Utiliser
            </Button>
          )}
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
    <div className={compact ? "flex flex-1 flex-col gap-2 sm:flex-row sm:items-center" : "flex flex-wrap items-center gap-2"}>
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
