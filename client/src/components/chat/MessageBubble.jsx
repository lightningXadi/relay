import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Pencil, Trash2, X } from 'lucide-react';
import { assetUrl } from '../../lib/api';

const QUICK = ['👍', '❤️', '😊', '🎉'];

export default function MessageBubble({
  message,
  isMine,
  showPeerReceipts,
  peerId,
  conversationType,
  onReact,
  onDelete,
  onEdit,
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const time = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';
  const attachment = message.attachments?.[0];
  const isImage = attachment?.mimeType?.startsWith('image/');
  const isTemp = String(message.id).startsWith('temp-');

  function startEdit() {
    setEditText(message.text || '');
    setEditing(true);
  }

  function submitEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) { setEditing(false); return; }
    onEdit?.(message.id, trimmed);
    setEditing(false);
  }

  let receipt = null;
  if (isMine && showPeerReceipts && peerId && !isTemp) {
    const delivered = message.deliveredTo?.some((d) => d.userId === peerId);
    const read = message.readBy?.some((r) => r.userId === peerId);
    if (read) {
      receipt = <CheckCheck className="h-3.5 w-3.5 text-accent opacity-90" aria-label="Read" />;
    } else if (delivered) {
      receipt = <CheckCheck className="h-3.5 w-3.5 text-ink-soft" aria-label="Delivered" />;
    } else {
      receipt = <Check className="h-3.5 w-3.5 text-ink-soft" aria-label="Sent" />;
    }
  } else if (isMine && conversationType === 'group' && !isTemp) {
    const readCount = message.readBy?.length || 0;
    if (readCount > 0) {
      receipt = <span className="text-[10px] text-ink-soft" title="Read">Read · {readCount}</span>;
    }
  }

  if (message.deleted) {
    return (
      <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[min(78%,520px)] rounded-2xl border border-border px-3.5 py-2 text-[13px] italic text-ink-soft ${
          isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
          Message deleted
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} group/msg`}>
      <div className={`max-w-[min(78%,520px)] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isMine && message.sender?.username && conversationType === 'group' && (
          <span className="px-1 text-[11px] font-medium text-ink-soft">{message.sender.username}</span>
        )}

        <div className={`relative rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug shadow-chip ${
          isMine ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md border border-border bg-surface-card text-ink'}`}>

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') setEditing(false); }}
                className="min-w-[180px] resize-none bg-transparent text-sm outline-none"
                rows={Math.max(1, editText.split('\n').length)} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="rounded-lg p-1 text-white/70 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={submitEdit}
                  className="rounded-lg p-1 text-white/70 hover:text-white"><Check className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <>
              {isImage ? (
                <a href={assetUrl(attachment.url)} target="_blank" rel="noreferrer" className="-m-1 block">
                  <img src={assetUrl(attachment.url)} alt={attachment.name || ''}
                    className="max-h-64 w-full max-w-sm rounded-xl object-cover" />
                </a>
              ) : attachment ? (
                <a href={assetUrl(attachment.url)} target="_blank" rel="noreferrer"
                  className={`text-sm underline ${isMine ? 'text-white/90' : 'text-accent'}`}>
                  {attachment.name || 'Download file'}
                </a>
              ) : null}

              {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

              {message.editedAt && (
                <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-ink-soft'}`}> (edited)</span>
              )}

              <div className={`mt-1 flex items-center justify-end gap-1.5 ${isMine ? 'text-white/70' : 'text-ink-soft'}`}>
                <time className="text-[11px]" dateTime={message.createdAt}>{time}</time>
                {isMine ? receipt : null}
              </div>
            </>
          )}

          {(message.reactions?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.reactions.map((r) => (
                <button type="button" key={r.emoji} onClick={() => onReact?.(r.emoji)}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    isMine ? 'border-white/25 bg-black/15' : 'border-border bg-surface-panel'
                  } hover:brightness-110`}
                  title={(r.userIds || []).join(', ')}>
                  {r.emoji} <span className="opacity-80">{r.userIds?.length ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions row — quick reactions + edit/delete */}
        {!isTemp && !editing && (
          <div className={`flex items-center gap-1 px-1 opacity-0 transition group-hover/msg:opacity-100 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {QUICK.map((emoji) => (
              <button type="button" key={emoji} onClick={() => onReact?.(emoji)}
                className="rounded-md bg-surface-panel px-1.5 py-0 text-sm text-ink-soft shadow-chip hover:bg-surface-card hover:text-ink">
                {emoji}
              </button>
            ))}
            {isMine && message.text && !message.deleted && (
              <button type="button" onClick={startEdit}
                className="rounded-md bg-surface-panel p-1.5 text-ink-soft shadow-chip hover:bg-surface-card hover:text-ink"
                title="Edit message">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isMine && !message.deleted && (
              <button type="button" onClick={() => onDelete?.(message.id)}
                className="rounded-md bg-surface-panel p-1.5 text-ink-soft shadow-chip hover:bg-surface-card hover:text-red-500"
                title="Delete message">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
