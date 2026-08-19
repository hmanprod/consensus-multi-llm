import { getActiveConfiguration, listAllConversations, listProvidersStatus, listSavedConfigs } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { authEnabled } from "@/lib/user-context";
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
  const activeRef = active.ref;
  const activeName =
    activeRef.type === "saved"
      ? (saved.find((c) => c.id === activeRef.id)?.name ?? "Configuration")
      : "Configuration";  return (
    <PageShell title="Paramètres" conversations={conversations} authEnabled={authEnabled()}>
      <SettingsContent
        activeName={activeName}
        activeConfig={active.config}
        demo={!providers.some((p) => p.enabled && p.provider !== "mock")}
        providersStatus={providers}
        persistent={isPersistent()}
        authEnabled={authEnabled()}
      />
    </PageShell>
  );
}
