import { listAllConversations, listProvidersStatus } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { AuthRequiredNotice } from "@/app/components/AuthRequiredNotice";
import { authEnabled } from "@/lib/user-context";
import { ProvidersClient } from "./ProvidersClient";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  if (!authEnabled()) return <AuthRequiredNotice />;
  const [providers, conversations] = await Promise.all([listProvidersStatus(), listAllConversations()]);
  return (
    <PageShell title="Providers" conversations={conversations}>
      <ProvidersClient initial={providers} />
    </PageShell>
  );
}
