import { listAllConversations } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { authEnabled } from "@/lib/user-context";
import { SettingsContent } from "./SettingsContent";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const conversations = await listAllConversations();
  return (
    <PageShell title="Paramètres" conversations={conversations} authEnabled={authEnabled()}>
      <SettingsContent />
    </PageShell>
  );
}
