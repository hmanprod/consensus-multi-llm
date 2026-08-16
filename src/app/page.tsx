import { AppShell } from "./components/AppShell";
import { listAllConversations } from "./actions";
import { authEnabled } from "@/lib/user-context";

export default async function Home() {
  const conversations = await listAllConversations();
  return <AppShell initialConversations={conversations} authEnabled={authEnabled()} />;
}