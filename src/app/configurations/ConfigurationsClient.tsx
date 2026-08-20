"use client";

import { useState } from "react";
import type { ActiveConfig, OrchestrationConfig } from "@/contracts/workflow";
import { getProfile } from "@/config/profiles";
import { CUSTOM_MODEL_VALUE, MODELS_BY_PROVIDER, PROVIDER_LABELS, modelLabel } from "@/config/models";
import {
  deleteCustomConfig,
  duplicateCustomConfig,
  listSavedConfigs,
  saveCustomConfig,
  setActiveConfiguration,
  updateCustomConfig,
} from "@/app/actions";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ChevronDownIcon, CloseIcon, CopyIcon, PencilIcon, PlusIcon, TrashIcon } from "@/app/components/ui/icons";

type RoleSpec = { provider: string; model: string };
type SavedConfig = Awaited<ReturnType<typeof listSavedConfigs>>[number];

const MAX_ANALYSTS = 3;
const BASE_CFG = getProfile("economical");

interface Draft {
  name: string;
  orchestrator: RoleSpec;
  analysts: RoleSpec[];
  consensus: RoleSpec;
  synthesis: RoleSpec;
  maxTokensPerCall: number;
  timeoutMs: number;
  minAgreementScore: number;
  search: boolean;
}

type EditorMode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; id: string };

function analystName(index: number): string {
  return `Analyste ${String.fromCharCode(66 + index)}`;
}

function draftFromConfig(config: OrchestrationConfig, name = ""): Draft {
  return {
    name,
    orchestrator: { ...config.orchestrator },
    analysts: config.analysts.map((a) => ({ ...a })),
    consensus: { ...config.consensus },
    synthesis: { ...config.synthesis },
    maxTokensPerCall: config.maxTokensPerCall,
    timeoutMs: config.timeoutMs,
    minAgreementScore: config.minAgreementScore,
    search: config.search ?? false,
  };
}

function draftToConfig(d: Draft): OrchestrationConfig {
  return {
    profile: "custom",
    orchestrator: d.orchestrator,
    analysts: d.analysts,
    consensus: d.consensus,
    synthesis: d.synthesis,
    maxTokensPerCall: d.maxTokensPerCall,
    timeoutMs: d.timeoutMs,
    minAgreementScore: d.minAgreementScore,
    search: d.search,
  };
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur";
}

export function ConfigurationsClient({
  initial,
  initialActive,
}: {
  initial: SavedConfig[];
  initialActive: ActiveConfig;
}) {
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState<ActiveConfig>(initialActive);
  const [editor, setEditor] = useState<EditorMode>({ kind: "closed" });
  const [done, setDone] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeId = active.type === "saved" ? active.id : null;

  async function refresh() {
    setSaved(await listSavedConfigs());
  }

  async function persistActive(id: string): Promise<boolean> {
    const ref: ActiveConfig = { type: "saved", id };
    setActive(ref);
    try {
      await setActiveConfiguration({ ref });
      return true;
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
      return false;
    }
  }

  async function activate(id: string) {
    setBusy(true);
    setDone(null);
    try {
      if (await persistActive(id)) setDone({ ok: true, text: "Configuration activée." });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(draft: Draft): Promise<boolean> {
    setBusy(true);
    setDone(null);
    try {
      const res = await saveCustomConfig({ name: draft.name, config: draftToConfig(draft) });
      await refresh();
      await persistActive(res.id);
      setEditor({ kind: "closed" });
      setDone({ ok: true, text: "Configuration créée et activée." });
      return true;
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id: string, draft: Draft): Promise<boolean> {
    setBusy(true);
    setDone(null);
    try {
      await updateCustomConfig({ id, name: draft.name, config: draftToConfig(draft) });
      await refresh();
      setEditor({ kind: "closed" });
      setDone({ ok: true, text: "Configuration modifiée." });
      return true;
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(id: string) {
    setBusy(true);
    setDone(null);
    try {
      await duplicateCustomConfig({ id });
      await refresh();
      setDone({ ok: true, text: "Configuration dupliquée." });
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, name: string) {
    setBusy(true);
    setDone(null);
    try {
      await updateCustomConfig({ id, name });
      await refresh();
      setDone({ ok: true, text: "Configuration renommée." });
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setDone(null);
    try {
      await deleteCustomConfig({ id });
      await refresh();
      setDone({ ok: true, text: "Configuration supprimée." });
    } catch (err) {
      setDone({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditor({ kind: "create" });
    setDone(null);
  }

  function openEdit(config: SavedConfig) {
    setEditor({ kind: "edit", id: config.id });
    setDone(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Configurations</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Créez vos propres configurations, comparez des variantes et activez celle à utiliser pour vos
            analyses.
          </p>
        </div>
        {editor.kind === "closed" && (
          <Button variant="primary" onClick={openCreate} className="shrink-0">
            <PlusIcon size={14} />
            Nouvelle configuration
          </Button>
        )}
      </div>

      {done && (
        <p className={`mt-4 text-sm ${done.ok ? "text-success" : "text-danger"}`}>{done.text}</p>
      )}

      {editor.kind !== "closed" && (
        <div className="mt-6">
          {editor.kind === "edit" ? (
            <ConfigEditor
              key={editor.id}
              title="Modifier la configuration"
              initialDraft={draftFromConfigFromSaved(saved, editor.id)}
              busy={busy}
              submitLabel="Enregistrer les modifications"
              onCancel={() => setEditor({ kind: "closed" })}
              onSubmit={(draft) => handleUpdate(editor.id, draft)}
            />
          ) : (
            <ConfigEditor
              title="Nouvelle configuration"
              initialDraft={draftFromConfig(BASE_CFG)}
              busy={busy}
              submitLabel="Créer la configuration"
              onCancel={() => setEditor({ kind: "closed" })}
              onSubmit={handleCreate}
            />
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Vos configurations</h2>
        <p className="mt-1 text-xs text-ink-secondary">
          {saved.length === 0
            ? "Aucune configuration pour le moment."
            : "La configuration active est utilisée pour vos analyses."}
        </p>
        {saved.length > 0 && (
          <ul className="mt-3 space-y-3">
            {saved.map((c) => (
              <ConfigCard
                key={c.id}
                config={c}
                active={activeId === c.id}
                busy={busy}
                onActivate={() => activate(c.id)}
                onEdit={() => openEdit(c)}
                onDuplicate={() => handleDuplicate(c.id)}
                onRename={(name) => handleRename(c.id, name)}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function draftFromConfigFromSaved(saved: SavedConfig[], id: string): Draft {
  const found = saved.find((c) => c.id === id);
  if (found) return draftFromConfig(found.config, found.name);
  return draftFromConfig(BASE_CFG);
}

function ConfigEditor({
  title,
  initialDraft,
  busy,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  title: string;
  initialDraft: Draft;
  busy: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: Draft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const config = draftToConfig(draft);
  const specsValid = [config.orchestrator, config.consensus, config.synthesis, ...config.analysts].every(
    (s) => s.model.trim().length > 0
  );
  const canSubmit = draft.name.trim().length > 0 && specsValid;

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function setOrchestrator(spec: RoleSpec) {
    patch({ orchestrator: spec });
  }

  function setAnalyst(index: number, spec: RoleSpec) {
    setDraft((d) => ({ ...d, analysts: d.analysts.map((a, i) => (i === index ? spec : a)) }));
  }

  function addAnalyst() {
    setDraft((d) =>
      d.analysts.length < MAX_ANALYSTS
        ? { ...d, analysts: [...d.analysts, { provider: "gemini", model: "gemini-3.7-flash" }] }
        : d
    );
  }

  function removeAnalyst(index: number) {
    setDraft((d) => ({ ...d, analysts: d.analysts.filter((_, i) => i !== index) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) void onSubmit(draft);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-5 sm:p-6"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer l'éditeur"
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <section className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Informations</p>
        <label htmlFor="cfg-name" className="mb-1.5 block text-sm font-medium text-ink">
          Nom de la configuration
        </label>
        <input
          id="cfg-name"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Ex. : Recherche approfondie"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Modèles utilisés</p>
          <button
            type="button"
            onClick={addAnalyst}
            disabled={draft.analysts.length >= MAX_ANALYSTS}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Ajouter un analyste
          </button>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-bg p-3">
            <p className="mb-2 text-xs font-medium text-ink">Orchestrateur (Analyse A + consolidations)</p>
            <RolePicker label="Orchestrateur" spec={draft.orchestrator} onChange={setOrchestrator} />
          </div>
          {draft.analysts.map((a, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-ink">{analystName(i)}</p>
                {draft.analysts.length > 1 && (
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
              <RolePicker label={analystName(i)} spec={a} onChange={(spec) => setAnalyst(i, spec)} compact />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Consolidation, synthèse et paramètres avancés
          </span>
          <ChevronDownIcon size={14} className={`text-ink-faint transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-bg p-3">
              <p className="mb-2 text-xs font-medium text-ink">Consolidation des analyses</p>
              <RolePicker
                label="Consensus"
                spec={draft.consensus}
                onChange={(spec) => patch({ consensus: spec })}
                compact
              />
            </div>
            <div className="rounded-lg border border-border bg-bg p-3">
              <p className="mb-2 text-xs font-medium text-ink">Synthèse finale</p>
              <RolePicker
                label="Synthèse"
                spec={draft.synthesis}
                onChange={(spec) => patch({ synthesis: spec })}
                compact
              />
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-bg p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Paramètres</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberField
            label="Tokens par appel"
            value={draft.maxTokensPerCall}
            onChange={(v) => patch({ maxTokensPerCall: Math.round(v) })}
            min={256}
            step={256}
          />
          <NumberField
            label="Délai d'expiration (s)"
            value={draft.timeoutMs / 1000}
            onChange={(v) => patch({ timeoutMs: Math.round(v * 1000) })}
            min={5}
            step={5}
          />
          <NumberField
            label="Seuil d'accord (%)"
            value={draft.minAgreementScore}
            onChange={(v) => patch({ minAgreementScore: Math.round(v) })}
            min={0}
            max={100}
            step={5}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.search}
              onChange={(e) => patch({ search: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Recherche web des analystes
          </label>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={busy || !canSubmit}>
          {busy ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max?: number;
  step: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function ConfigCard({
  config,
  active,
  busy,
  onActivate,
  onEdit,
  onDuplicate,
  onRename,
  onDelete,
}: {
  config: SavedConfig;
  active: boolean;
  busy: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(config.name);

  async function submitRename() {
    const name = nameDraft.trim();
    if (!name || name === config.name) {
      setRenaming(false);
      return;
    }
    onRename(name);
    setRenaming(false);
  }

  function startDelete() {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <li
      className={`rounded-xl border p-4 transition-colors ${
        active ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-border bg-bg"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {renaming ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                setNameDraft(config.name);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitRename();
                }
                if (e.key === "Escape") {
                  setNameDraft(config.name);
                  setRenaming(false);
                }
              }}
              autoFocus
              aria-label="Renommer la configuration"
              className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm font-semibold text-ink outline-none focus:border-accent"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">{config.name}</p>
              {active && <Badge tone="accent">Actif</Badge>}
            </div>
          )}
          <p className="mt-1 text-xs text-ink-secondary">
            {config.config.analysts.length + 1} analystes (A orchestrateur inclus)
          </p>
        </div>
        {!active && (
          <Button size="sm" variant="primary" onClick={onActivate} disabled={busy}>
            Utiliser
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setModelsOpen((v) => !v)} aria-expanded={modelsOpen}>
          {modelsOpen ? "Masquer les modèles" : "Voir les modèles"}
          <ChevronDownIcon size={12} className={`transition-transform ${modelsOpen ? "rotate-180" : ""}`} />
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={busy}>
          <PencilIcon size={12} />
          Modifier
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate} disabled={busy}>
          <CopyIcon size={12} />
          Dupliquer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRenaming(true)} disabled={busy}>
          Renommer
        </Button>
        <Button size="sm" variant="ghost" onClick={startDelete} disabled={busy} className={confirmDelete ? "text-danger" : ""}>
          <TrashIcon size={12} />
          {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
        </Button>
      </div>

      {modelsOpen && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          <li className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">Orchestrateur</span> — {modelLabel(config.config.orchestrator)}
          </li>
          {config.config.analysts.map((a, i) => (
            <li key={i} className="text-xs text-ink-secondary">
              <span className="font-medium text-ink-faint">{analystName(i)}</span> — {modelLabel(a)}
            </li>
          ))}
          <li className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">Consensus</span> — {modelLabel(config.config.consensus)}
          </li>
          <li className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">Synthèse</span> — {modelLabel(config.config.synthesis)}
          </li>
          <li className="text-xs text-ink-secondary">
            <span className="font-medium text-ink-faint">Paramètres</span> — {config.config.maxTokensPerCall} tokens/appel ·{" "}
            {config.config.timeoutMs / 1000} s · accord ≥ {config.config.minAgreementScore}%
            {config.config.search ? " · recherche active" : ""}
          </li>
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
  onChange: (spec: RoleSpec) => void;
  compact?: boolean;
}) {
  const providers = Object.keys(MODELS_BY_PROVIDER);
  const models = MODELS_BY_PROVIDER[spec.provider] ?? [];
  const isCustom = !models.some((m) => m.slug === spec.model);

  return (
    <div className={compact ? "flex flex-1 flex-col gap-2 sm:flex-row sm:items-center" : "flex flex-wrap items-center gap-2"}>
      <span className={`w-32 shrink-0 text-sm ${compact ? "text-ink-faint" : "font-medium text-ink"}`}>{label}</span>
      <select
        value={spec.provider}
        onChange={(e) => {
          const provider = e.target.value;
          const first = MODELS_BY_PROVIDER[provider]?.[0]?.slug ?? "";
          onChange({ provider, model: first });
        }}
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
        value={isCustom ? CUSTOM_MODEL_VALUE : spec.model}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CUSTOM_MODEL_VALUE && !isCustom) {
            onChange({ ...spec, model: spec.model });
          } else if (v !== CUSTOM_MODEL_VALUE) {
            onChange({ ...spec, model: v });
          }
        }}
        aria-label={`Modèle du rôle ${label}`}
        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
      >
        {models.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.label}
          </option>
        ))}
        <option value={CUSTOM_MODEL_VALUE}>Identifiant personnalisé…</option>
      </select>
      {isCustom && (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            value={spec.model}
            onChange={(e) => onChange({ ...spec, model: e.target.value })}
            placeholder={spec.provider === "openrouter" || spec.provider === "zenmux" ? "openai/gpt-5.6" : "identifiant"}
            aria-label={`Identifiant du modèle ${label}`}
            className="w-full min-w-[10rem] rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
          {(spec.provider === "openrouter" || spec.provider === "zenmux") && (
            <span className="text-[11px] text-ink-faint">
              Identifiant {PROVIDER_LABELS[spec.provider]}, ex. : openai/gpt-5.6
            </span>
          )}
        </div>
      )}
    </div>
  );
}
