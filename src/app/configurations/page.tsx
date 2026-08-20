import { getActiveConfiguration, listAllConversations, listSavedConfigs } from "@/app/actions";
import { PageShell } from "@/app/components/PageShell";
import { AuthRequiredNotice } from "@/app/components/AuthRequiredNotice";
import { authEnabled } from "@/lib/user-context";
import { ConfigurationsClient } from "./ConfigurationsClient";

export const dynamic = "force-dynamic";

export default async function ConfigurationsPage() {
  if (!authEnabled()) return <AuthRequiredNotice />;
  const [saved, conversations, active] = await Promise.all([
    listSavedConfigs(),
    listAllConversations(),
    getActiveConfiguration(),
  ]);
  return (
    <PageShell title="Configurations" conversations={conversations}>
      <ConfigurationsClient initial={saved} initialActive={active.ref} />
    </PageShell>
  );
}
