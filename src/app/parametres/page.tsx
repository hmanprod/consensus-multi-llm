import Link from "next/link";
import { isPersistent } from "@/lib/db";
import { MOCK_MODE } from "@/config/profiles";
import { Badge } from "@/app/components/ui/Badge";

export const dynamic = "force-dynamic";

type Tone = "success" | "warning" | "neutral" | "accent";

export default async function SettingsPage() {
  const groups: { title: string; items: { label: string; value: string; tone: Tone; action?: { href: string; label: string } }[] }[] = [
    {
      title: "Mode d'exécution",
      items: [
        {
          label: "Mode démo (provider mock)",
          value: MOCK_MODE ? "Actif" : "Inactif",
          tone: MOCK_MODE ? "warning" : "success",
          action: { href: "/providers", label: "Configurer les providers" },
        },
        {
          label: "Persistance",
          value: isPersistent() ? "Neon PostgreSQL (Prisma)" : "Mémoire (démo)",
          tone: isPersistent() ? "success" : "neutral",
        },
      ],
    },
    {
      title: "Workflow",
      items: [
        {
          label: "Processus",
          value: "Analyse A → B/C → consolidation → révisions → analyse finale",
          tone: "neutral",
        },
        {
          label: "Analystes",
          value: "2 par défaut (ajoutables)",
          tone: "neutral",
          action: { href: "/configurations", label: "Personnaliser" },
        },
        {
          label: "Profils",
          value: "Économique, Personnalisé",
          tone: "neutral",
        },
        {
          label: "Budget par défaut",
          value: "60 cents · budget max contrôlé",
          tone: "neutral",
        },
      ],
    },
    {
      title: "Fournisseurs",
      items: [
        {
          label: "Providers",
          value: "8 (OpenAI, Anthropic, Gemini, DeepSeek, Qwen, Kimi, GLM, OpenRouter)",
          tone: "neutral",
          action: { href: "/providers", label: "Gérer les clés" },
        },
        {
          label: "Chiffrement des clés",
          value: "AES-256-GCM côté serveur",
          tone: "success",
        },
        {
          label: "Authentification",
          value: "Clerk (env-gated)",
          tone: "accent",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm">
        <Link href="/" className="text-ink-secondary hover:text-ink">
          ← Retour
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Paramètres</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        État de l&apos;application. Ajoutez une clé dans{" "}
        <Link href="/providers" className="text-accent hover:underline">
          Providers
        </Link>{" "}
        pour sortir du mode démo.
      </p>

      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group.title}</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-bg">
              {group.items.map((item) => (
                <div key={item.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <dt className="text-sm text-ink-secondary">{item.label}</dt>
                  <dd className="flex items-center gap-2">
                    <Badge tone={item.tone}>{item.value}</Badge>
                    {item.action && (
                      <Link href={item.action.href} className="text-xs font-medium text-accent hover:underline">
                        {item.action.label}
                      </Link>
                    )}
                  </dd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}