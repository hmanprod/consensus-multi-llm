import { getActiveConfiguration, listAllConversations, listProvidersStatus, listSavedConfigs } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { authEnabled } from "@/lib/user-context";
import { MOCK_MODE, activeRefLabel } from "@/config/profiles";
import { isPersistent } from "@/lib/db";
import { SettingsContent } from "./SettingsContent";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [conversations, active, saved, providers] = await Promise.all([
    listAllConversations(),
    getActiveConfiguration(),
    listSavedConfigs(),
    listProvidersStatus(),
  ]);
  return (
    <PageShell title="Paramètres" conversations={conversations} authEnabled={authEnabled()}>
      <SettingsContent
        activeName={activeRefLabel(active.ref, saved)}
        activeConfig={active.config}
        demo={MOCK_MODE}
        providersStatus={providers}
        persistent={isPersistent()}
        authEnabled={authEnabled()}
      />
    </PageShell>
  );
}
