import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, MessageSquare, Phone, Users, Video } from 'lucide-react';
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

  if (!conversation) {
    return (
      <section className="flex flex-1 flex-col bg-surface-root">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface-panel px-3 py-2.5 md:hidden">
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink"
            aria-label="Open conversations"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-ink">Relay</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-card shadow-chip">
            <MessageSquare className="h-8 w-8 text-accent opacity-60" />
          </div>
          <p className="max-w-sm text-sm text-ink-soft">
            Select a conversation or start a new one.
          </p>
          <button
            type="button"
            onClick={onOpenMenu}
            className="mt-4 rounded-xl border border-border bg-surface-card px-4 py-2 text-sm font-medium text-ink shadow-chip transition hover:border-accent/30 md:hidden"
          >
            Open conversations
          </button>
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
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface-panel px-3 py-2.5 md:px-4">
        <button type="button" onClick={onOpenMenu}
          className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink md:hidden"
          aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar size="sm" src={peer?.avatar ? assetUrl(peer.avatar) : ''}
          username={peer?.username || conversation.title} online={Boolean(peerOnline)} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-medium text-ink">{conversation.title}</h1>
          <p className="truncate text-xs text-ink-soft">
            {conversation.type === 'group'
              ? `${conversation.participants.length} people`
              : peer ? 'Direct message' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {conversation.type === 'group' && (
            <button type="button" title="Group members" onClick={onOpenGroupInfo}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink">
              <Users className="h-4 w-4" />
            </button>
          )}
          <button type="button" title="Voice call (coming soon)" onClick={() => onOpenCalls?.('voice')}
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink">
            <Phone className="h-4 w-4" />
          </button>
          <button type="button" title="Video call (coming soon)" onClick={() => onOpenCalls?.('video')}
            className="rounded-lg p-2 text-ink-soft transition hover:bg-surface-card hover:text-ink">
            <Video className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
        {loading ? (
          <MessagesSkeleton />
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {messages.map((m) => {
              const d = m.createdAt ? dayLabel(m.createdAt) : '';
              const showDay = d && d !== lastDay;
              if (showDay) lastDay = d;
              const isMine = m.senderId === user.id;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border border-border bg-surface-panel px-3 py-1 text-[11px] text-ink-soft shadow-chip">
                        {d}
                      </span>
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
              <p className="text-xs italic text-ink-soft">{typingName} is typing…</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatComposer conversationId={conversation.id} socket={socket} disabled={!socket} onMessage={onSend} />
    </section>
  );
}
