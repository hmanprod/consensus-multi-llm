import { AppShell } from "./components/AppShell";
import { getActiveConfiguration, listAllConversations, listProvidersStatus, listSavedConfigs } from "./actions";
import { authEnabled } from "@/lib/user-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [conversations, providers, active, saved] = await Promise.all([
    listAllConversations(),
    listProvidersStatus(),
    getActiveConfiguration(),
    listSavedConfigs(),
  ]);
  return (
    <AppShell
      initialConversations={conversations}
      authEnabled={authEnabled()}
      providersStatus={providers}
      initialActive={active.ref}
      savedConfigs={saved}
    />
  );
}