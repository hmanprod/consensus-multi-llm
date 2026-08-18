import Link from "next/link";
import { isPersistent } from "@/lib/db";
import { MOCK_MODE } from "@/config/profiles";

type Tone = "success" | "warning" | "neutral" | "accent";

const DOT_TONES: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  neutral: "bg-ink-faint",
  accent: "bg-accent",
};

interface StatusItem {
  label: string;
  value: string;
  tone: Tone;
  action?: { href: string; label: string };
}

interface StatusGroup {
  title: string;
  items: StatusItem[];
}

const GROUPS: StatusGroup[] = [
  {
    title: "Mode d'exécution",
    items: [
      {
        label: "Mode démo (provider mock)",
        value: MOCK_MODE ? "Actif — analyses simulées, aucun coût" : "Inactif — vrais providers utilisés",
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
        value: "Économique, Best Models, Personnalisé",
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

export function SettingsContent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Paramètres</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        État de l&apos;application. Ajoutez une clé dans{" "}
        <Link href="/providers" className="text-accent hover:underline">
          Providers
        </Link>{" "}
        pour sortir du mode démo.
      </p>

      <div className="mt-8 space-y-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <StatusCard key={item.label} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ item }: { item: StatusItem }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{item.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{item.value}</p>
        </div>
        <span
          aria-hidden="true"
          className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${DOT_TONES[item.tone]}`}
        />
      </div>
      {item.action && (
        <Link
          href={item.action.href}
          className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
        >
          {item.action.label}
        </Link>
      )}
    </div>
  );
}
