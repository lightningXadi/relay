import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Paperclip, Send, SmilePlus, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ChatComposer({ conversationId, socket, disabled, onMessage }) {
  const { mode } = useTheme();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [file, setFile] = useState(null);
  const areaRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!areaRef.current) return;
    areaRef.current.style.height = 'auto';
    areaRef.current.style.height = `${Math.min(areaRef.current.scrollHeight, 120)}px`;
  }, [text]);

  function bumpTyping() {
    if (!socket || !conversationId) return;
    socket.emit('typing:start', { conversationId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 1000);
  }

  async function submit() {
    if (!conversationId || disabled || !onMessage) return;
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    await onMessage({ text: trimmed, file });
    setText('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    socket?.emit('typing:stop', { conversationId });
    clearTimeout(typingTimer.current);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = !disabled && (text.trim().length > 0 || !!file);

  return (
    <div className="shrink-0 border-t border-border bg-surface-panel px-3 py-3 pb-safe-bottom md:px-4 md:py-4">
      {/* Emoji picker */}
      {emojiOpen && (
        <div className="absolute bottom-[calc(100%+8px)] right-3 z-20 md:right-4">
          <EmojiPicker
            theme={mode === 'light' ? Theme.LIGHT : Theme.DARK}
            width={Math.min(320, (typeof window !== 'undefined' ? window.innerWidth : 400) - 24)}
            height={340}
            onEmojiClick={(e) => {
              setText((t) => t + e.emoji);
              setEmojiOpen(false);
              areaRef.current?.focus();
            }}
          />
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm">
          <span className="flex-1 truncate text-ink-soft">{file.name}</span>
          <button
            type="button"
            onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="shrink-0 rounded-lg p-1 text-ink-soft hover:text-ink active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink disabled:opacity-40 active:scale-90"
            title="Attach"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-surface-card hover:text-ink disabled:opacity-40 active:scale-90"
            title="Emoji"
          >
            <SmilePlus className="h-5 w-5" />
          </button>
        </div>

        {/* Text area */}
        <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-border bg-surface-card px-4 py-2.5 shadow-chip transition focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20">
          <textarea
            ref={areaRef}
            rows={1}
            value={text}
            onChange={(e) => { setText(e.target.value); bumpTyping(); }}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            disabled={disabled}
            className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/60"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-chip transition duration-150',
            canSend
              ? 'bg-accent text-white hover:brightness-110 active:scale-90'
              : 'bg-surface-card text-ink-soft/40 cursor-not-allowed',
          ].join(' ')}
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.zip"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
    </div>
  );
}
