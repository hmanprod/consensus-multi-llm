import { AppShell } from "./components/AppShell";
import { AuthRequiredNotice } from "./components/AuthRequiredNotice";
import { getActiveConfiguration, listAllConversations, listProvidersStatus, listSavedConfigs } from "./actions";
import { authEnabled } from "@/lib/user-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!authEnabled()) return <AuthRequiredNotice />;
  const [conversations, providers, active, saved] = await Promise.all([
    listAllConversations(),
    listProvidersStatus(),
    getActiveConfiguration(),
    listSavedConfigs(),
  ]);
  return (
    <AppShell
      initialConversations={conversations}
      providersStatus={providers}
      initialActive={active.ref}
      savedConfigs={saved}
    />
  );
}