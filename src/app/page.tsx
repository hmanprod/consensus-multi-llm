import { AppShell } from "./components/AppShell";
import { listAllConversations, listProvidersStatus } from "./actions";
import { authEnabled } from "@/lib/user-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [conversations, providers] = await Promise.all([listAllConversations(), listProvidersStatus()]);
  return <AppShell initialConversations={conversations} authEnabled={authEnabled()} providersStatus={providers} />;
}