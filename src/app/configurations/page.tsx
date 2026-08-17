import Link from "next/link";
import { listSavedConfigs } from "@/app/actions";
import { ConfigurationsClient } from "./ConfigurationsClient";

export const dynamic = "force-dynamic";

export default async function ConfigurationsPage() {
  const saved = await listSavedConfigs();
  return (
    <>
      <p className="mx-auto mt-6 max-w-2xl px-6">
        <Link href="/" className="text-sm text-ink-secondary hover:text-ink">
          ← Retour
        </Link>
      </p>
      <ConfigurationsClient initial={saved} />
    </>
  );
}