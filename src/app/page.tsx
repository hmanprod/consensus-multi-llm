import { AppShell } from "./components/AppShell";
import { listAllConversations } from "./actions";

export default async function Home() {
  const conversations = await listAllConversations();
  return <AppShell initialConversations={conversations} />;
}