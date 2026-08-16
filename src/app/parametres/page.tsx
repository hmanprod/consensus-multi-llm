import Link from "next/link";
import { isPersistent } from "@/lib/db";
import { MOCK_MODE } from "@/config/profiles";

export default async function SettingsPage() {
  const rows = [
    { label: "Mode démo (provider mock)", value: MOCK_MODE ? "Actif" : "Inactif" },
    { label: "Persistance", value: isPersistent() ? "Neon PostgreSQL (Prisma)" : "Mémoire (démo)" },
    { label: "Round ciblé max (MVP)", value: "1" },
    { label: "Analystes max (MVP)", value: "3" },
    { label: "Providers", value: "7 (OpenAI, Anthropic, Gemini, DeepSeek, Qwen, Kimi, GLM)" },
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
        État de l&apos;application. Ajoutez une clé dans <Link href="/providers" className="text-accent hover:underline">Providers</Link> pour sortir du mode démo.
      </p>

      <dl className="mt-8 divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-ink-secondary">{r.label}</dt>
            <dd className="text-sm font-medium text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}