import { AppShell } from "./components/AppShell";
import { listAllConversations, listProvidersStatus } from "./actions";
import { authEnabled } from "@/lib/user-context";
import { MOCK_MODE } from "@/config/profiles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [conversations, providers] = await Promise.all([listAllConversations(), listProvidersStatus()]);
  return (
    <AppShell
      initialConversations={conversations}
      authEnabled={authEnabled()}
      providersStatus={providers}
      demo={MOCK_MODE}
    />
  );
}