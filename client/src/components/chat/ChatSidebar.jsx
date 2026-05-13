import { formatDistanceToNowStrict } from 'date-fns';
import { LogOut, MessageSquarePlus, Moon, PanelLeftClose, Search, Sun, Users } from 'lucide-react';
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
  // On mobile: if there's an active convo, sidebar slides over it (overlay mode)
  // If there's no active convo, sidebar IS the primary view (full screen, always visible)
  const overlayMode = hasActiveConvo;

  return (
    <>
      {/* Backdrop only shown when sidebar overlays an active conversation */}
      {mobileOpen && overlayMode ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] md:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={`
          flex flex-col border-r border-border bg-surface-panel
          md:static md:w-[300px] md:translate-x-0 md:shadow-none lg:w-[320px]
          fixed inset-y-0 left-0 z-40 w-full max-w-[340px] shadow-soft transition-[transform,opacity] duration-200
          ${overlayMode
            ? (mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
            : 'translate-x-0'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate text-sm font-semibold text-ink">Relay</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title="Dark / light mode"
              onClick={onToggleTheme}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink"
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="Log out"
              onClick={onLogout}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
            {/* Close button only shown when sidebar is overlaying an active chat */}
            {overlayMode && (
              <button
                type="button"
                title="Close sidebar"
                onClick={onMobileClose}
                className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink md:hidden"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* New chat buttons */}
        <div className="border-b border-border px-3 py-2 md:px-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onNewDm}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-medium text-ink shadow-chip transition hover:border-accent/30 active:scale-95"
            >
              <MessageSquarePlus className="h-4 w-4 text-accent" />
              New chat
            </button>
            <button
              type="button"
              onClick={onNewGroup}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-medium text-ink shadow-chip transition hover:border-accent/30 active:scale-95"
            >
              <Users className="h-4 w-4 text-accent" />
              Group
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 md:px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl border border-border bg-surface-card py-2.5 pl-9 pr-3 text-sm text-ink outline-none ring-accent/20 transition focus:border-accent/40 focus:ring-2"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <ConversationSkeleton />
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-ink-soft">
                {conversations.length === 0
                  ? 'No conversations yet.'
                  : 'No matches for your search.'}
              </p>
              {conversations.length === 0 && (
                <button
                  type="button"
                  onClick={onNewDm}
                  className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:brightness-110 active:scale-95"
                >
                  Start a chat
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-0.5 px-2 pb-4 pt-1">
              {filtered.map((c) => {
                const peer = c.type === 'direct' ? c.participants.find((p) => !p.isSelf) : null;
                const isOnline =
                  c.type === 'direct' && peer ? online.has(peer.id) : false;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.98] hover:bg-surface-card ${
                        activeId === c.id ? 'bg-surface-card ring-1 ring-accent/35' : ''
                      }`}
                    >
                      <Avatar
                        size="sm"
                        src={
                          c.type === 'direct' && peer?.avatar ? assetUrl(peer.avatar) : ''
                        }
                        username={peer?.username || c.title}
                        online={isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">
                            {c.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-ink-soft">
                            {timeAgo(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className="truncate text-[13px] text-ink-soft">
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

        {/* User footer */}
        <footer className="border-t border-border px-4 py-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="avatar-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatarPick?.(f);
              e.target.value = '';
            }}
          />
          <label
            htmlFor="avatar-input"
            className="flex cursor-pointer items-center gap-3 rounded-xl p-1.5 transition hover:bg-surface-card active:scale-[0.98]"
            title="Change profile photo"
          >
            <div className="relative shrink-0">
              <Avatar
                src={user.avatar ? assetUrl(user.avatar) : ''}
                username={user.username}
                size="sm"
              />
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
