import { getActiveConfiguration, listAllConversations, listProvidersStatus, listSavedConfigs } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { authEnabled } from "@/lib/user-context";
import { ConfigurationsClient } from "./ConfigurationsClient";

export const dynamic = "force-dynamic";

export default async function ConfigurationsPage() {
  const [saved, conversations, active, providers] = await Promise.all([
    listSavedConfigs(),
    listAllConversations(),
    getActiveConfiguration(),
    listProvidersStatus(),
  ]);
  const demo = !providers.some((p) => p.enabled && p.provider !== "mock");
  return (
    <PageShell title="Configurations" conversations={conversations} authEnabled={authEnabled()}>
      <ConfigurationsClient initial={saved} demo={demo} initialActive={active.ref} />
    </PageShell>
  );
}
