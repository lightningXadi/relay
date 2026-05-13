import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Image as ImageIcon, Paperclip, Send, SmilePlus, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ChatComposer({
  conversationId,
  socket,
  disabled,
  onMessage,
}) {
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
    areaRef.current.style.height = `${Math.min(areaRef.current.scrollHeight, 140)}px`;
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

  return (
    <div
      className="border-t border-border bg-surface-panel/95 backdrop-blur-sm"
      /* Prevent page scroll when tapping inside composer on iOS */
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="relative mx-auto max-w-4xl px-3 py-2 md:px-4 md:py-3">
        {emojiOpen ? (
          <div className="absolute bottom-[calc(100%-4px)] right-3 z-20 md:right-4">
            <EmojiPicker
              theme={mode === 'light' ? Theme.LIGHT : Theme.DARK}
              /* Narrower on mobile */
              width={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 24 : 320)}
              height={360}
              onEmojiClick={(e) => {
                setText((t) => t + e.emoji);
                setEmojiOpen(false);
                areaRef.current?.focus();
              }}
            />
          </div>
        ) : null}

        {file ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-surface-card px-3 py-2 text-sm">
            <span className="truncate text-ink-soft">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="ml-2 shrink-0 rounded-lg p-1 text-ink-soft hover:bg-surface-panel hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface-card px-1.5 py-1.5 shadow-chip">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg p-2.5 text-ink-soft transition hover:bg-surface-panel hover:text-ink active:scale-90"
            title="Attach file"
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.zip"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f || null);
            }}
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="rounded-lg p-2.5 text-ink-soft transition hover:bg-surface-panel hover:text-ink active:scale-90"
            title="Emoji"
            disabled={disabled}
          >
            <SmilePlus className="h-5 w-5" />
          </button>
          <textarea
            ref={areaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              bumpTyping();
            }}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            disabled={disabled}
            className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-soft/70"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled || (!text.trim() && !file)}
            className="mb-0.5 rounded-xl bg-accent p-2.5 text-white shadow-chip transition hover:brightness-110 disabled:opacity-40 active:scale-90"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Hide hint on mobile to save space */}
        <p className="mt-1 hidden items-center gap-1 text-[11px] text-ink-soft md:flex">
          <ImageIcon className="h-3 w-3" aria-hidden />
          Up to 12 MB per file. Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}
