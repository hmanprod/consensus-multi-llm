import { listAllConversations, listProvidersStatus } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { authEnabled } from "@/lib/user-context";
import { MOCK_MODE } from "@/config/profiles";
import { ProvidersClient } from "./ProvidersClient";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const [providers, conversations] = await Promise.all([listProvidersStatus(), listAllConversations()]);
  return (
    <PageShell title="Providers" conversations={conversations} authEnabled={authEnabled()} demo={MOCK_MODE}>
      <ProvidersClient initial={providers} />
    </PageShell>
  );
}
