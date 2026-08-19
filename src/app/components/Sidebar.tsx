"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import type { StoredConversation } from "@/lib/store";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  SettingsIcon,
  LayersIcon,
  PanelIcon,
  MoreIcon,
} from "./ui/icons";

type Group = { label: string; items: StoredConversation[] };

function groupConversations(conversations: StoredConversation[]): Group[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfDay - 86_400_000;
  const startOfWeek = startOfDay - 6 * 86_400_000;

  const groups: Group[] = [
    { label: "Aujourd'hui", items: [] },
    { label: "Hier", items: [] },
    { label: "Cette semaine", items: [] },
    { label: "Plus ancien", items: [] },
  ];

  for (const c of conversations) {
    const t = c.updatedAt;
    if (t >= startOfDay) groups[0].items.push(c);
    else if (t >= startOfYesterday) groups[1].items.push(c);
    else if (t >= startOfWeek) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function Sidebar({
  conversations,
  selectedId,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onSelect,
  onNew,
  onRename,
  onDelete,
  authEnabled,
  activeHref,
}: {
  conversations: StoredConversation[];
  selectedId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  authEnabled: boolean;
  activeHref?: string;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = query.trim()
      ? conversations.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
      : conversations;
    return groupConversations(filtered);
  }, [conversations, query]);

  const body = (
    <SidebarContent
      conversations={conversations}
      groups={groups}
      query={query}
      setQuery={setQuery}
      selectedId={selectedId}
      collapsed={collapsed}
      onSelect={onSelect}
      onNew={onNew}
      onRename={onRename}
      onDelete={onDelete}
      authEnabled={authEnabled}
      activeHref={activeHref}
    />
  );

  return (
    <>
      <aside
        className={`hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[60px]" : "w-[280px]"
        }`}
      >
        {body}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
          aria-expanded={!collapsed}
          className="flex items-center justify-center border-t border-border py-2 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col border-r border-border bg-surface pt-[env(safe-area-inset-top)] shadow-lg"
          >
            {body}
            <button
              onClick={onCloseMobile}
              className="absolute right-2 top-[calc(0.5rem+env(safe-area-inset-top))] inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
              aria-label="Fermer le menu"
            >
              <CloseIcon size={16} />
            </button>
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  conversations,
  groups,
  query,
  setQuery,
  selectedId,
  collapsed,
  onSelect,
  onNew,
  onRename,
  onDelete,
  authEnabled,
  activeHref,
}: {
  conversations: StoredConversation[];
  groups: Group[];
  query: string;
  setQuery: (s: string) => void;
  selectedId: string | null;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  authEnabled: boolean;
  activeHref?: string;
}) {
  if (collapsed) {
    return (
      <>
        <div className="flex items-center justify-center py-4">
          <BrandMark compact />
        </div>
        <button
          onClick={onNew}
          aria-label="Nouvelle conversation"
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <PlusIcon size={18} />
        </button>
        <nav className="flex-1 px-2 py-3" aria-label="Navigation">
          <ConversationNavLink href="/configurations" label="Configurations">
            <LayersIcon size={18} />
          </ConversationNavLink>
          <ConversationNavLink href="/providers" label="Providers">
            <PanelIcon size={18} />
          </ConversationNavLink>
          <ConversationNavLink href="/parametres" label="Paramètres">
            <SettingsIcon size={18} />
          </ConversationNavLink>
        </nav>
        <AuthRow enabled={authEnabled} compact />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <BrandMark />
      </div>

      <div className="px-3">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-bg">
            <PlusIcon size={14} />
          </span>
          Nouvelle conversation
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
            <SearchIcon size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une conversation"
            className="h-8 w-full rounded-lg border border-transparent bg-surface-hover pl-8 pr-3 text-base text-ink outline-none placeholder:text-ink-faint transition-colors focus:border-accent focus:bg-bg sm:text-sm"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Conversations">
        {groups.length === 0 && (
          <p className="px-3 py-2 text-xs text-ink-faint">
            {conversations.length === 0 ? "Aucune conversation pour l'instant." : "Aucun résultat."}
          </p>
        )}
        {groups.map((group) => (
          <ConversationGroup
            key={group.label}
            label={group.label}
            items={group.items}
            selectedId={selectedId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </nav>

      <div className="border-t border-border px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <AuthRow enabled={authEnabled} />
      <div className="mt-2 flex flex-col gap-0.5">
        <SidebarLink href="/configurations" active={activeHref === "/configurations"}>
          <LayersIcon size={15} />
          Configurations
        </SidebarLink>
        <SidebarLink href="/providers" active={activeHref === "/providers"}>
          <PanelIcon size={15} />
          Providers
        </SidebarLink>
        <SidebarLink href="/parametres" active={activeHref === "/parametres"}>
          <SettingsIcon size={15} />
          Paramètres
        </SidebarLink>
      </div>
      </div>
    </>
  );
}

function ConversationGroup({
  label,
  items,
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: {
  label: string;
  items: StoredConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <ul className="space-y-0.5">
        {items.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            selected={c.id === selectedId}
            onSelect={() => onSelect(c.id)}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

function ConversationItem({
  conversation,
  selected,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: StoredConversation;
  selected: boolean;
  onSelect: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveRename() {
    const next = title.trim();
    if (next && next !== conversation.title) await onRename(conversation.id, next);
    else setTitle(conversation.title);
    setRenaming(false);
  }

  async function remove() {
    setBusy(true);
    await onDelete(conversation.id);
  }

  return (
    <li className="group relative">
      {renaming ? (
        <div className="flex items-center gap-1 rounded-lg px-2 py-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setTitle(conversation.title);
                setRenaming(false);
              }
            }}
            aria-label="Renommer la conversation"
            className="min-w-0 flex-1 rounded border border-accent bg-bg px-2 py-1 text-base text-ink outline-none sm:text-sm"
          />
          <button
            onClick={saveRename}
            aria-label="Enregistrer le nom"
            className="rounded p-1 text-success hover:bg-surface-hover"
          >
            <CheckIcon size={14} />
          </button>
        </div>
      ) : confirmDelete ? (
        <div className="flex items-center gap-1 rounded-lg bg-danger-soft px-2 py-1">
          <span className="flex-1 truncate text-xs text-danger">Supprimer ?</span>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-md bg-danger px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Oui
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md border border-border bg-bg px-2 py-0.5 text-xs font-medium text-ink-secondary"
          >
            Non
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <button
            onClick={onSelect}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selected
                ? "bg-bg font-medium text-ink shadow-sm"
                : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
            }`}
            title={conversation.title}
          >
            {conversation.title}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Actions de la conversation"
            aria-expanded={menuOpen}
            className={`mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink ${
              menuOpen ? "bg-surface-hover text-ink" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            }`}
          >
            <MoreIcon size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-8 top-1 z-30 w-40 overflow-hidden rounded-lg border border-border bg-bg py-1 shadow-md">
              <MenuItem onClick={() => { setMenuOpen(false); setRenaming(true); }}>
                <PencilIcon size={14} />
                Renommer
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                <TrashIcon size={14} />
                Supprimer
              </MenuItem>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function MenuItem({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
        danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

function SidebarLink({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        active ? "bg-surface font-medium text-ink" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function ConversationNavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-lg px-2 py-2 text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {children}
    </Link>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-bg shadow-sm"
        aria-hidden="true"
      >
        <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none">
          <path
            d="M20.5 7.2A8.4 8.4 0 1 0 20.5 20.8"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M19.4 8.1 21.8 6m-2.4 13.9 2.4 2.1"
            stroke="#69b5f5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="21.6" cy="6" r="1.35" fill="#69b5f5" />
          <circle cx="21.6" cy="22" r="1.35" fill="#69b5f5" />
        </svg>
      </span>
      {!compact && (
        <span className="font-serif text-[15px] font-semibold tracking-[-0.02em] text-ink">
          Consensus
        </span>
      )}
    </div>
  );
}

function AuthRow({ enabled, compact = false }: { enabled: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center py-2">
        {enabled ? <UserButton /> : <span className="text-xs text-ink-faint">Démo</span>}
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="px-3 pb-1">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-xs font-medium text-ink-faint">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
          Mode démo
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center px-3">
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-center text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
        >
          Se connecter
        </Link>
      </Show>
    </div>
  );
}
