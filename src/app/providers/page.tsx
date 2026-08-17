import Link from "next/link";
import { listProvidersStatus } from "@/app/actions";
import { ProvidersClient } from "./ProvidersClient";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await listProvidersStatus();
  return (
    <>
      <p className="mx-auto mt-6 max-w-2xl px-6">
        <Link href="/" className="text-sm text-ink-secondary hover:text-ink">
          ← Retour
        </Link>
      </p>
      <ProvidersClient initial={providers} />
    </>
  );
}