"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrchestrationConfig } from "@/contracts/workflow";
import type { listProvidersStatus } from "@/app/actions";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ChevronDownIcon } from "@/app/components/ui/icons";

type ProviderStatus = Awaited<ReturnType<typeof listProvidersStatus>>[number];

const SUB_NAV = [
  { href: "#general", label: "Configuration" },
  { href: "#providers", label: "Providers" },
  { href: "#securite", label: "Sécurité" },
  { href: "#etat-technique", label: "État technique" },
];

export function SettingsContent({
  activeName,
  activeConfig,
  providersStatus,
  persistent,
}: {
  activeName: string;
  activeConfig: OrchestrationConfig;
  providersStatus: ProviderStatus[];
  persistent: boolean;
}) {
  const [techOpen, setTechOpen] = useState(false);
  const providersConfigured = providersStatus.filter((p) => p.enabled).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Paramètres</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Gérez votre espace : la configuration utilisée pour vos analyses, vos providers et la sécurité.
      </p>

      <nav aria-label="Sections des paramètres" className="mt-6 flex flex-wrap gap-1.5">
        {SUB_NAV.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="general" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Configuration active</h2>
        <div className="rounded-xl border border-border bg-bg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">{activeName}</p>
                <Badge tone="accent">Actif</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {activeConfig.analysts.length + 1} analystes (A orchestrateur inclus), puis une comparaison et une synthèse finale.
              </p>
            </div>
            <Link href="/configurations" className="shrink-0">
              <Button size="sm" variant="secondary">
                Modifier
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="providers" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Providers</h2>

        {providersConfigured === 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning-soft/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">Aucun provider configuré</p>
              <Badge tone="warning">À configurer</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Les analyses sont bloquées tant qu&apos;aucune clé API n&apos;est enregistrée. Configurez au
              moins un provider pour lancer des analyses avec vos propres modèles.
            </p>
            <Link href="/providers" className="mt-3 inline-block">
              <Button size="sm" variant="primary">
                Configurer les providers
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-success/30 bg-success-soft/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">Modèles réels actifs</p>
              <Badge tone="success">Actif</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              {providersConfigured} provider{providersConfigured > 1 ? "s" : ""} configuré
              {providersConfigured > 1 ? "s" : ""} — vos analyses utilisent vos clés API.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-bg p-4">
          <div>
            <p className="text-sm font-medium text-ink">Clés API</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {providersConfigured} provider{providersConfigured > 1 ? "s" : ""} configuré
              {providersConfigured > 1 ? "s" : ""} · chiffrées côté serveur
            </p>
          </div>
          <Link href="/providers" className="shrink-0">
            <Button size="sm" variant="secondary">
              Gérer les clés
            </Button>
          </Link>
        </div>
      </section>

      <section id="securite" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Sécurité</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusRow
            label="Clés API"
            value="Chiffrées côté serveur (AES-256-GCM), jamais stockées en clair"
            badge="Sécurisé"
            tone="success"
          />
          <StatusRow
            label="Authentification"
            value="Comptes utilisateurs (Clerk)"
            badge="Actif"
            tone="success"
          />
        </div>
      </section>

      <section id="etat-technique" className="mt-8 scroll-mt-4">
        <button
          type="button"
          onClick={() => setTechOpen((v) => !v)}
          aria-expanded={techOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-ink">État technique</span>
          <span className="text-xs text-ink-faint">Détails avancés</span>
          <ChevronDownIcon size={16} className={`text-ink-faint transition-transform ${techOpen ? "rotate-180" : ""}`} />
        </button>

        {techOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <StatusRow
              label="Persistance"
              value={persistent ? "Neon PostgreSQL (Prisma)" : "Mémoire (non persistante)"}
              badge={persistent ? "Actif" : "Information"}
              tone={persistent ? "success" : "neutral"}
            />
            <StatusRow
              label="Workflow"
              value="Analyse A → B (analystes) → S (consolidation) → R (révisions) → F (synthèse)"
              badge="Information"
              tone="neutral"
            />
            <StatusRow
              label="Analystes par configuration"
              value={`${activeConfig.analysts.length} analyste${activeConfig.analysts.length > 1 ? "s" : ""} indépendant${activeConfig.analysts.length > 1 ? "s" : ""} · configurable librement`}
              badge="Information"
              tone="neutral"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function StatusRow({
  label,
  value,
  badge,
  tone,
}: {
  label: string;
  value: string;
  badge: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{value}</p>
        </div>
        <Badge tone={tone} className="shrink-0">
          {badge}
        </Badge>
      </div>
    </div>
  );
}
