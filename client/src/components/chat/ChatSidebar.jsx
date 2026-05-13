import { formatDistanceToNowStrict } from 'date-fns';
import { LogOut, MessageSquarePlus, Moon, PanelLeftClose, Search, Sun, Users, X } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import Avatar from '../ui/Avatar';
import { ConversationSkeleton } from './ConversationSkeleton';

function timeAgo(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export default function ChatSidebar({
  user,
  conversations,
  filtered,
  query,
  onQuery,
  activeId,
  onSelect,
  online,
  loading,
  onLogout,
  onToggleTheme,
  themeMode,
  onNewDm,
  onNewGroup,
  onAvatarPick,
  mobileOpen,
  onMobileClose,
  hasActiveConvo,
}) {
  const overlayMode = hasActiveConvo;

  return (
    <>
      {/* Backdrop when overlaying an active convo */}
      {mobileOpen && overlayMode && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={[
          // Base — always flex column, full height
          'flex flex-col bg-surface-panel',
          // Desktop: static sidebar
          'md:static md:w-[300px] md:translate-x-0 md:shadow-none md:border-r md:border-border lg:w-[320px]',
          // Mobile: fixed full-width panel
          'fixed inset-y-0 left-0 z-40 w-full shadow-soft transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          overlayMode
            ? (mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
            : 'translate-x-0',
        ].join(' ')}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 pt-safe-top pb-3 pt-4 md:px-4 md:py-3 md:border-b md:border-border">
          <div className="flex items-center gap-2.5">
            {/* Logo dot */}
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent shadow-chip">
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white" aria-hidden>
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/>
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-ink">Relay</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90"
              title="Toggle theme"
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            {overlayMode && (
              <button
                type="button"
                onClick={onMobileClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90 md:hidden"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── User profile card (mobile hero) ── */}
        <div className="mx-4 mb-4 md:hidden">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="avatar-input-mobile"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatarPick?.(f);
              e.target.value = '';
            }}
          />
          <label
            htmlFor="avatar-input-mobile"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface-card px-4 py-3 transition active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <Avatar src={user.avatar ? assetUrl(user.avatar) : ''} username={user.username} size="md" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-white shadow">✎</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.username}</p>
              <p className="text-xs text-ink-soft">Tap to change photo</p>
            </div>
          </label>
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-2xl border border-border bg-surface-card py-3 pl-10 pr-4 text-sm text-ink outline-none ring-accent/20 transition placeholder:text-ink-soft/60 focus:border-accent/50 focus:ring-2"
            />
          </div>
        </div>

        {/* ── Section label ── */}
        <div className="px-5 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft/60">
            Messages
          </span>
        </div>

        {/* ── Conversation list ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <ConversationSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-card">
                <MessageSquarePlus className="h-7 w-7 text-accent opacity-70" />
              </div>
              <p className="text-sm font-medium text-ink">
                {conversations.length === 0 ? 'No conversations yet' : 'No results found'}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {conversations.length === 0
                  ? 'Start chatting with someone new'
                  : 'Try a different search term'}
              </p>
              {conversations.length === 0 && (
                <button
                  type="button"
                  onClick={onNewDm}
                  className="mt-5 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-95"
                >
                  New chat
                </button>
              )}
            </div>
          ) : (
            <ul className="px-3 pb-4">
              {filtered.map((c) => {
                const peer = c.type === 'direct' ? c.participants.find((p) => !p.isSelf) : null;
                const isOnline = c.type === 'direct' && peer ? online.has(peer.id) : false;
                const isActive = activeId === c.id;

                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={[
                        'flex w-full items-center gap-3.5 rounded-2xl px-3 py-3.5 text-left transition-all duration-150 active:scale-[0.98]',
                        isActive
                          ? 'bg-accent/10 ring-1 ring-accent/25'
                          : 'hover:bg-surface-card',
                      ].join(' ')}
                    >
                      <Avatar
                        size="md"
                        src={c.type === 'direct' && peer?.avatar ? assetUrl(peer.avatar) : ''}
                        username={peer?.username || c.title}
                        online={isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-[15px] font-semibold ${isActive ? 'text-accent' : 'text-ink'}`}>
                            {c.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-ink-soft">
                            {timeAgo(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-ink-soft">
                          {c.lastMessagePreview || (c.type === 'group' ? 'Group chat' : 'Say hello 👋')}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Bottom action bar ── */}
        <div className="border-t border-border bg-surface-panel px-4 py-3 pb-safe-bottom">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onNewDm}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-95"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </button>
            <button
              type="button"
              onClick={onNewGroup}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface-card py-3.5 text-sm font-semibold text-ink shadow-chip transition hover:border-accent/40 hover:text-accent active:scale-95"
            >
              <Users className="h-4 w-4" />
              Group
            </button>
          </div>
        </div>

        {/* ── Desktop footer (hidden on mobile) ── */}
        <footer className="hidden border-t border-border px-4 py-3 md:block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="avatar-input-desktop"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatarPick?.(f);
              e.target.value = '';
            }}
          />
          <label
            htmlFor="avatar-input-desktop"
            className="flex cursor-pointer items-center gap-3 rounded-xl p-1.5 transition hover:bg-surface-card active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <Avatar src={user.avatar ? assetUrl(user.avatar) : ''} username={user.username} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white shadow">✎</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.username}</p>
              <p className="text-[11px] text-ink-soft">Change photo</p>
            </div>
          </label>
        </footer>
      </aside>
    </>
  );
}
