import { InfoIcon } from "./ui/icons";

export function AuthRequiredNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-xl border border-warning/30 bg-warning-soft/40 p-6 text-center">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <InfoIcon size={20} />
        </span>
        <h1 className="text-lg font-semibold tracking-tight text-ink">Authentification requise</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Cette application nécessite une authentification pour fonctionner. Configurez Clerk dans
          les variables d&apos;environnement (<span className="font-mono text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> et{" "}
          <span className="font-mono text-xs">CLERK_SECRET_KEY</span>) puis redémarrez le serveur.
        </p>
      </div>
    </div>
  );
}