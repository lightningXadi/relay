import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, MessageSquarePlus, Phone, Users, Video } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import Avatar from '../ui/Avatar';
import ChatComposer from './ChatComposer';
import MessageBubble from './MessageBubble';
import { MessagesSkeleton } from './ConversationSkeleton';

function dayLabel(date) {
  try { return format(new Date(date), 'EEEE, MMM d'); }
  catch { return ''; }
}

export default function ChatThread({
  conversation,
  messages,
  loading,
  user,
  peerId,
  peerOnline,
  socket,
  typingUserId,
  participantsById,
  onSend,
  onReact,
  onDelete,
  onEdit,
  onOpenCalls,
  onOpenMenu,
  onOpenGroupInfo,
}) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUserId]);

  // Empty state — shown when no conversation selected (desktop only, mobile shows sidebar)
  if (!conversation) {
    return (
      <section className="hidden flex-1 flex-col items-center justify-center bg-surface-root md:flex">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-card shadow-soft">
            <MessageSquarePlus className="h-9 w-9 text-accent opacity-70" />
          </div>
          <h2 className="text-base font-semibold text-ink">Your messages</h2>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            Pick a conversation from the sidebar or start a new one.
          </p>
        </div>
      </section>
    );
  }

  const peer = conversation.type === 'direct'
    ? conversation.participants.find((p) => !p.isSelf)
    : null;

  const typingName = typingUserId && participantsById?.[typingUserId]?.username
    ? participantsById[typingUserId].username
    : null;

  let lastDay = '';

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-root">
      {/* ── Chat header ── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-panel px-2 py-2 md:gap-3 md:px-4 md:py-2.5">
        {/* Back button — mobile only */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Avatar
          size="sm"
          src={peer?.avatar ? assetUrl(peer.avatar) : ''}
          username={peer?.username || conversation.title}
          online={Boolean(peerOnline)}
        />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-ink leading-tight">
            {conversation.title}
          </h1>
          <p className="text-xs text-ink-soft leading-tight">
            {conversation.type === 'group'
              ? `${conversation.participants.length} members`
              : peerOnline ? (
                <span className="text-emerald-500 font-medium">● Online</span>
              ) : 'Offline'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {conversation.type === 'group' && (
            <button
              type="button"
              onClick={onOpenGroupInfo}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90"
              title="Group info"
            >
              <Users className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenCalls?.('voice')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90"
            title="Voice call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenCalls?.('video')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink active:scale-90"
            title="Video call"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
        {loading ? (
          <MessagesSkeleton />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-1">
            {messages.map((m) => {
              const d = m.createdAt ? dayLabel(m.createdAt) : '';
              const showDay = d && d !== lastDay;
              if (showDay) lastDay = d;
              const isMine = m.senderId === user.id;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full border border-border bg-surface-panel px-3 py-1 text-[11px] font-medium text-ink-soft">
                        {d}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    isMine={isMine}
                    showPeerReceipts={conversation.type === 'direct'}
                    peerId={peerId}
                    conversationType={conversation.type}
                    onReact={(emoji) => onReact?.(m.id, emoji)}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                </div>
              );
            })}
            {typingName && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex gap-1 rounded-2xl bg-surface-card px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:300ms]" />
                </div>
                <p className="text-xs text-ink-soft">{typingName} is typing</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <ChatComposer
        conversationId={conversation.id}
        socket={socket}
        disabled={!socket}
        onMessage={onSend}
      />
    </section>
  );
}
