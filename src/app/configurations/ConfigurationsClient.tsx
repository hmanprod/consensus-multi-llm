"use client";

import { useState } from "react";
import type { ActiveConfig, OrchestrationConfig, ProfileRef } from "@/contracts/workflow";
import { getProfile, PROFILE_META } from "@/config/profiles";
import { MODELS_BY_PROVIDER, PROVIDER_LABELS } from "@/config/models";
import { listSavedConfigs, saveCustomConfig, setActiveConfiguration } from "@/app/actions";
import { costLevel, estimateRunCostCents, formatBudget, formatEstimatedCost } from "@/lib/format";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ChevronDownIcon, TrashIcon } from "@/app/components/ui/icons";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];

const PROFILE_IDS: ProfileRef[] = ["economical", "best"];

function analystName(index: number): string {
  return `Analyste ${String.fromCharCode(66 + index)}`;
}

function specLabel(spec: RoleSpec): string {
  return `${PROVIDER_LABELS[spec.provider] ?? spec.provider} · ${MODELS_BY_PROVIDER[spec.provider]?.find((m) => m.slug === spec.model)?.label ?? spec.model}`;
}

export function ConfigurationsClient({
  initial,
  demo,
  initialActive,
}: {
  initial: SavedConfig[];
  demo: boolean;
  initialActive: ActiveConfig;
}) {
  const defaultCfg = getProfile("economical");
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState<ActiveConfig>(initialActive);
  const [name, setName] = useState("");
  const [orchestrator, setOrchestrator] = useState<RoleSpec>(defaultCfg.orchestrator);
  const [analysts, setAnalysts] = useState<RoleSpec[]>(defaultCfg.analysts);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; text: string } | null>(null);

  const draftConfig: OrchestrationConfig = { ...defaultCfg, profile: "custom", orchestrator, analysts };

  function loadIntoForm(config: OrchestrationConfig) {
    setOrchestrator(config.orchestrator);
    setAnalysts(config.analysts);
  }

  async function persistActive(ref: ActiveConfig): Promise<boolean> {
    setActive(ref);
    try {
      await setActiveConfiguration({ ref });
      return true;
    } catch (err) {
      setDone({ ok: false, text: err instanceof Error ? err.message : "Erreur" });
      return false;
    }
  }

  async function activateProfile(id: ProfileRef) {
    const cfg = getProfile(id);
    loadIntoForm(cfg);
    setShowAdvanced(false);
    setDone(null);
    if (await persistActive({ type: "profile", profile: id })) {
      setDone({ ok: true, text: `Profil ${PROFILE_META[id].name} activé.` });
    }
  }

  async function activateSaved(id: string) {
    const found = saved.find((c) => c.id === id);
    if (found) loadIntoForm(found.config);
    setDone(null);
    if (await persistActive({ type: "saved", id })) {
      setDone({ ok: true, text: "Configuration activée." });
    }
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
      const ref: ActiveConfig = { type: "saved", id: res.id };
      setActive(ref);
      await setActiveConfiguration({ ref });
      setDone({ ok: true, text: "Configuration enregistrée et activée." });
    } catch (err) {
      setDone({ ok: false, text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configurations</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Choisissez comment Consensus doit analyser vos questions : une réponse rapide ou une analyse
        approfondie. Vous pouvez aussi créer votre propre configuration.
      </p>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Profils recommandés
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROFILE_IDS.map((id) => (
            <ProfileFiche
              key={id}
              id={id}
              config={getProfile(id)}
              active={active.type === "profile" && active.profile === id}
              demo={demo}
              onUse={() => activateProfile(id)}
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
            <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2 text-xs">
              <span className="text-accent-strong">Éditeur personnalisé ouvert</span>
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="font-medium text-accent hover:underline"
              >
                Revenir aux profils
              </button>
            </div>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Informations</p>
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
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Modèles utilisés</p>
                <button
                  type="button"
                  onClick={addAnalyst}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface"
                >
                  + Ajouter un analyste
                </button>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-ink">Orchestrateur (analyse A + synthèse)</p>
                  <RolePicker label="Orchestrateur" spec={orchestrator} onChange={(patch) => setOrchestratorPatch(patch)} />
                </div>
                {analysts.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-ink">{analystName(i)}</p>
                      {analysts.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnalyst(i)}
                          aria-label={`Retirer ${analystName(i)}`}
                          title={`Retirer ${analystName(i)}`}
                          className="rounded p-1 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                    <RolePicker label={analystName(i)} spec={a} onChange={(patch) => setAnalyst(i, patch)} compact />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Budget et limites</p>
              <p className="text-sm text-ink">
                Budget maximal : <span className="font-medium">{formatBudget(draftConfig.maxBudgetCents)}</span>
                <span className="ml-1 text-xs text-ink-secondary">— aucune analyse ne dépassera cette limite.</span>
              </p>
              <p className="mt-2 text-sm text-ink">
                Coût estimé par analyse :{" "}
                <span className="font-medium">{formatEstimatedCost(draftConfig)}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Estimation pour une analyse complète (consolidation, révisions et synthèse comprises). Le coût
                réel dépend de la longueur de la question et des réponses.{" "}
                <span className="font-medium text-ink">Niveau de coût : {costLevel(estimateRunCostCents(draftConfig))}.</span>
              </p>
            </section>

            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-secondary">
                {analysts.length} analystes · {orchestrator ? specLabel(orchestrator) : ""}
              </p>
              <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
                {busy ? "Enregistrement…" : "Enregistrer la configuration"}
              </Button>
            </div>
            {done && (
              <p className={`text-sm ${done.ok ? "text-success" : "text-danger"}`}>{done.text}</p>
            )}
          </div>
        )}
      </form>

      {saved.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Configurations enregistrées</h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Vos configurations personnalisées. Cliquez sur « Utiliser » pour lancer vos analyses avec celle-ci.
          </p>
          <ul className="mt-3 space-y-3">
            {saved.map((c) => (
              <SavedFiche
                key={c.id}
                config={c}
                active={active.type === "saved" && active.id === c.id}
                onUse={() => activateSaved(c.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileFiche({
  id,
  config,
  active,
  demo,
  onUse,
}: {
  id: ProfileRef;
  config: OrchestrationConfig;
  active: boolean;
  demo: boolean;
  onUse: () => void;
}) {
  const [modelsOpen, setModelsOpen] = useState(false);
  const meta = PROFILE_META[id];
  const cost = estimateRunCostCents(config);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        active ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{meta.name}</p>
            <Badge tone="neutral">{meta.speed}</Badge>
            {id === "best" && <Badge tone="success">Recommandé</Badge>}
            {demo && <Badge tone="warning">Démo</Badge>}
            {active && <Badge tone="accent">Actif</Badge>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{meta.tagline}</p>
        </div>
        {!active && (
          <Button size="sm" variant="primary" onClick={onUse}>
            Utiliser
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-secondary">
        {config.analysts.length} analystes · budget max {formatBudget(config.maxBudgetCents)} · ≈{" "}
        {formatEstimatedCost(config)} par analyse
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setModelsOpen((v) => !v)} aria-expanded={modelsOpen}>
          {modelsOpen ? "Masquer les modèles" : "Voir les modèles"}
          <ChevronDownIcon size={12} className={`transition-transform ${modelsOpen ? "rotate-180" : ""}`} />
        </Button>
        <span className="text-[11px] text-ink-faint">Coût estimé : {costLevel(cost)}</span>
      </div>

      {modelsOpen && (
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
      )}
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
  const [modelsOpen, setModelsOpen] = useState(false);

  return (
    <li
      className={`rounded-xl border p-4 transition-colors ${
        active ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-border bg-bg"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{config.name}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {config.config.analysts.length} analystes · budget max{" "}
            {formatBudget(config.config.maxBudgetCents)} · ≈ {formatEstimatedCost(config.config)} par analyse
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
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setModelsOpen((v) => !v)}
          aria-expanded={modelsOpen}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          {modelsOpen ? "Masquer les modèles" : "Voir les modèles"}
          <ChevronDownIcon size={12} className={`transition-transform ${modelsOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {modelsOpen && (
        <ul className="mt-2 space-y-1 border-t border-border pt-3">
          <li className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">Orchestrateur</span> — {specLabel(config.config.orchestrator)}
          </li>
          {config.config.analysts.map((a, i) => (
            <li key={i} className="text-xs text-ink-secondary">
              <span className="font-medium text-ink-faint">{analystName(i)}</span> — {specLabel(a)}
            </li>
          ))}
        </ul>
      )}
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
