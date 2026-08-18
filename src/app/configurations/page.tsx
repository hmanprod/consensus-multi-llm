import { getActiveConfiguration, listAllConversations, listSavedConfigs } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { MOCK_MODE } from "@/config/profiles";
import { authEnabled } from "@/lib/user-context";
import { ConfigurationsClient } from "./ConfigurationsClient";

export const dynamic = "force-dynamic";

export default async function ConfigurationsPage() {
  const [saved, conversations, active] = await Promise.all([
    listSavedConfigs(),
    listAllConversations(),
    getActiveConfiguration(),
  ]);
  return (
    <PageShell title="Configurations" conversations={conversations} authEnabled={authEnabled()}>
      <ConfigurationsClient initial={saved} demo={MOCK_MODE} initialActive={active.ref} />
    </PageShell>
  );
}
