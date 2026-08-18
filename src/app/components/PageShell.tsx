"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { StoredConversation } from "@/lib/store";
import { deleteConversation, listAllConversations, renameConversation } from "@/app/actions";
import { Sidebar } from "./Sidebar";
import { IconButton } from "./ui/IconButton";
import { MenuIcon } from "./ui/icons";

export function PageShell({
  title,
  conversations: initialConversations,
  authEnabled,
  children,
  actions,
  demo,
}: {
  title: string;
  conversations: StoredConversation[];
  authEnabled: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  demo?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState(initialConversations);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function goHome() {
    setMobileNavOpen(false);
    router.push("/");
  }

  async function handleRename(id: string, title: string) {
    await renameConversation({ conversationId: id, title });
    setConversations(await listAllConversations());
  }

  async function handleDelete(id: string) {
    await deleteConversation({ conversationId: id });
    setConversations(await listAllConversations());
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={conversations}
        selectedId={null}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onSelect={goHome}
        onNew={goHome}
        onRename={handleRename}
        onDelete={handleDelete}
        authEnabled={authEnabled}
        activeHref={pathname}
        demo={demo}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)]">
          <IconButton
            label="Ouvrir le menu"
            className="lg:hidden"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon size={16} />
          </IconButton>
          <h1 className="min-w-0 truncate text-sm font-medium text-ink">{title}</h1>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </main>
    </div>
  );
}
