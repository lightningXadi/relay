import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { api, getToken } from '../lib/api';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatThread from '../components/chat/ChatThread';
import { mergeMessages, previewMessage, updateMessageMap } from '../components/chat/messageUtils';
import { CallPlaceholderModal, CreateGroupModal, GroupInfoModal, NewChatModal } from '../components/chat/Modals';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ChatApp() {
  const navigate = useNavigate();
  const { user, logout, updateLocalUser } = useAuth();
  const { socket } = useSocket();
  const { mode, toggle: toggleTheme } = useTheme();

  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messagesByConvo, setMessagesByConvo] = useState({});
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [online, setOnline] = useState(() => new Set());
  const [typingByConvo, setTypingByConvo] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [callMode, setCallMode] = useState(null);
  const [notifDismissed, setNotifDismissed] = useState(
    () => localStorage.getItem('relay_notif_dismiss') === '1'
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.lastMessagePreview || '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const peerId = useMemo(() => {
    if (!active || active.type !== 'direct') return null;
    return active.participants.find((p) => !p.isSelf)?.id || null;
  }, [active]);

  const peerOnline = peerId ? online.has(peerId) : false;

  const participantsById = useMemo(() => {
    if (!active) return {};
    return Object.fromEntries(active.participants.map((p) => [p.id, p]));
  }, [active]);

  const messages = activeId ? messagesByConvo[activeId] || [] : [];

  const refreshConversations = useCallback(async () => {
    const data = await api('/api/conversations');
    setConversations(data.conversations || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await refreshConversations(); }
      finally { if (!cancelled) setLoadingConvos(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshConversations]);

  useEffect(() => {
    if (!socket) return;

    function onPresenceSnap({ onlineUserIds }) { setOnline(new Set(onlineUserIds || [])); }
    function onPresence({ userId, online: on }) {
      setOnline((prev) => {
        const next = new Set(prev);
        if (on) next.add(userId); else next.delete(userId);
        return next;
      });
    }
    socket.on('presence:snapshot', onPresenceSnap);
    socket.on('presence:update', onPresence);

    const typingTimers = {};
    function clearTyping(cid) { clearTimeout(typingTimers[cid]); delete typingTimers[cid]; }
    function onTypingStart({ conversationId, userId }) {
      if (!conversationId || userId === user.id) return;
      setTypingByConvo((prev) => ({ ...prev, [conversationId]: userId }));
      clearTyping(conversationId);
      typingTimers[conversationId] = setTimeout(() => {
        setTypingByConvo((prev) => {
          const next = { ...prev };
          if (next[conversationId] === userId) delete next[conversationId];
          return next;
        });
      }, 4000);
    }
    function onTypingStop({ conversationId, userId }) {
      if (!conversationId) return;
      setTypingByConvo((prev) => {
        if (prev[conversationId] !== userId) return prev;
        const next = { ...prev }; delete next[conversationId]; return next;
      });
      clearTyping(conversationId);
    }
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    function onNew(m) {
      // If this message was sent by us, the socket callback in handleSend already
      // replaced the optimistic bubble with the real message — skip to avoid duplicate.
      if (m.senderId === user.id) return;

      setMessagesByConvo((prev) => {
        const list = prev[m.conversationId] || [];
        const deduped = list.filter((x) => {
          if (x.id === m.id) return false;
          if (m.clientNonce && x.clientNonce === m.clientNonce) return false;
          return true;
        });
        const next = [...deduped, m];
        next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return { ...prev, [m.conversationId]: next };
      });
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === m.conversationId
            ? { ...c, lastMessagePreview: previewMessage(m), lastMessageAt: m.createdAt }
            : c
        );
        next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        return next;
      });
      if (document.hidden && m.senderId !== user.id && Notification.permission === 'granted') {
        new Notification(m.sender?.username || 'Relay', { body: previewMessage(m) || 'New message' });
      }
      if (m.senderId !== user.id) {
        socket.emit('message:delivered', { messageId: m.id, conversationId: m.conversationId });
      }
      if (m.conversationId === activeId && m.senderId !== user.id && document.visibilityState === 'visible') {
        api(`/api/messages/${m.conversationId}/read`, { method: 'POST', body: JSON.stringify({ untilMessageId: m.id }) }).catch(() => {});
      }
    }

    function onDelivery({ messageId, conversationId, deliveredTo }) {
      setMessagesByConvo((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return { ...prev, [conversationId]: updateMessageMap(list, messageId, (msg) => ({ ...msg, deliveredTo })) };
      });
    }

    function onReactions({ messageId, conversationId, reactions }) {
      setMessagesByConvo((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return { ...prev, [conversationId]: updateMessageMap(list, messageId, (msg) => ({ ...msg, reactions })) };
      });
    }

    function onReadReceipt({ conversationId, readerId }) {
      setMessagesByConvo((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        const now = new Date().toISOString();
        const updated = list.map((msg) => {
          if (msg.senderId !== user.id) return msg;
          if (msg.readBy?.some((r) => r.userId === readerId)) return msg;
          return { ...msg, readBy: [...(msg.readBy || []), { userId: readerId, at: now }] };
        });
        return { ...prev, [conversationId]: updated };
      });
    }

    // Message edited
    function onEdited(m) {
      setMessagesByConvo((prev) => {
        const list = prev[m.conversationId];
        if (!list) return prev;
        return { ...prev, [m.conversationId]: updateMessageMap(list, m.id, () => m) };
      });
    }

    // Message deleted
    function onDeleted({ messageId, conversationId }) {
      setMessagesByConvo((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return { ...prev, [conversationId]: updateMessageMap(list, messageId, (msg) => ({ ...msg, deleted: true, text: '' })) };
      });
    }

    // Conversation updated (group rename / member added-removed)
    function onConvoUpdated({ conversation }) {
      setConversations((prev) => prev.map((c) => c.id === conversation.id ? conversation : c));
    }

    // Removed from a conversation
    function onConvoRemoved({ conversationId }) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeId === conversationId) setActiveId(null);
    }

    socket.on('message:new', onNew);
    socket.on('message:delivery', onDelivery);
    socket.on('message:reactions', onReactions);
    socket.on('messages:readReceipt', onReadReceipt);
    socket.on('message:edited', onEdited);
    socket.on('message:deleted', onDeleted);
    socket.on('conversation:updated', onConvoUpdated);
    socket.on('conversation:removed', onConvoRemoved);

    return () => {
      socket.off('presence:snapshot', onPresenceSnap);
      socket.off('presence:update', onPresence);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:new', onNew);
      socket.off('message:delivery', onDelivery);
      socket.off('message:reactions', onReactions);
      socket.off('messages:readReceipt', onReadReceipt);
      socket.off('message:edited', onEdited);
      socket.off('message:deleted', onDeleted);
      socket.off('conversation:updated', onConvoUpdated);
      socket.off('conversation:removed', onConvoRemoved);
      Object.keys(typingTimers).forEach((k) => clearTimeout(typingTimers[k]));
    };
  }, [socket, user.id, activeId]);

  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit('conversation:join', { conversationId: activeId }, (res) => {
      if (res?.error) console.warn(res.error);
    });
    return () => { socket.emit('conversation:leave', { conversationId: activeId }); };
  }, [socket, activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoadingMessages(true);
    (async () => {
      try {
        const data = await api(`/api/messages/${activeId}?limit=60`);
        if (cancelled) return;
        setMessagesByConvo((prev) => ({ ...prev, [activeId]: data.messages || [] }));
        const list = data.messages || [];
        const lastIncoming = [...list].reverse().find((m) => m.senderId !== user.id);
        if (lastIncoming) {
          await api(`/api/messages/${activeId}/read`, { method: 'POST', body: JSON.stringify({ untilMessageId: lastIncoming.id }) });
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoadingMessages(false); }
    })();
    return () => { cancelled = true; };
  }, [activeId, user.id]);

  const handleSend = useCallback(async ({ text, file }) => {
    if (!socket || !activeId) return;
    let attachments = [];
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        credentials: 'include',
      });
      const upload = await res.json();
      if (!res.ok) { console.error(upload.error || 'Upload failed'); return; }
      attachments = [upload];
    }
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    const nonce = crypto.randomUUID();
    const tempId = `temp-${nonce}`;
    const optimistic = {
      id: tempId, clientNonce: nonce, conversationId: activeId, senderId: user.id,
      text: trimmed, attachments, readBy: [], deliveredTo: [], reactions: [],
      createdAt: new Date().toISOString(),
      sender: { id: user.id, username: user.username, avatar: user.avatar || '' },
    };
    setMessagesByConvo((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), optimistic] }));
    socket.emit('message:send', { conversationId: activeId, text: trimmed, attachments, clientNonce: nonce, tempId },
      (res) => {
        if (res?.error) {
          setMessagesByConvo((prev) => ({ ...prev, [activeId]: (prev[activeId] || []).filter((m) => m.clientNonce !== nonce) }));
          console.error(res.error); return;
        }
        if (res?.message) {
          setMessagesByConvo((prev) => {
            const list = prev[activeId] || [];
            const filtered = list.filter((m) => m.clientNonce !== nonce || m.id === res.message.id);
            return { ...prev, [activeId]: mergeMessages(filtered, res.message) };
          });
        }
        setConversations((prev) => {
          const next = prev.map((c) => c.id === activeId
            ? { ...c, lastMessagePreview: previewMessage(res.message), lastMessageAt: res.message.createdAt }
            : c);
          next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
          return next;
        });
      }
    );
  }, [socket, activeId, user]);

  const handleReact = useCallback((messageId, emoji) => {
    if (!socket || !activeId) return;
    socket.emit('reaction:toggle', { messageId, conversationId: activeId, emoji }, () => {});
  }, [socket, activeId]);

  const handleDelete = useCallback(async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try { await api(`/api/messages/${messageId}`, { method: 'DELETE' }); }
    catch (e) { console.error(e); }
  }, []);

  const handleEdit = useCallback(async (messageId, text) => {
    try { await api(`/api/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ text }) }); }
    catch (e) { console.error(e); }
  }, []);

  async function uploadAvatar(file) {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    await api('/api/users/me', { method: 'PATCH', body: JSON.stringify({ avatar: data.url }) });
    updateLocalUser({ avatar: data.url });
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    if (p === 'granted') { localStorage.removeItem('relay_notif_dismiss'); setNotifDismissed(true); }
  }

  return (
    <div className="flex h-dvh max-h-[100dvh] overflow-hidden bg-surface-root">
      <ChatSidebar
        user={user} conversations={conversations} filtered={filtered} query={query} onQuery={setQuery}
        activeId={activeId} onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        online={online} loading={loadingConvos}
        onLogout={() => { logout(); navigate('/'); }}
        onToggleTheme={toggleTheme} themeMode={mode}
        onNewDm={() => setNewDmOpen(true)} onNewGroup={() => setGroupOpen(true)}
        onAvatarPick={(f) => uploadAvatar(f).catch(console.error)}
        mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!notifDismissed && typeof Notification !== 'undefined' && Notification.permission === 'default' && (
          <div className="flex items-center gap-3 border-b border-border bg-surface-panel px-4 py-2 text-sm">
            <Bell className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <p className="min-w-0 flex-1 text-ink-soft">Enable alerts for new messages while Relay is in the background.</p>
            <button type="button" onClick={enableNotifications}
              className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:brightness-110">
              Enable
            </button>
            <button type="button"
              onClick={() => { localStorage.setItem('relay_notif_dismiss', '1'); setNotifDismissed(true); }}
              className="shrink-0 rounded-lg border border-border p-1 text-ink-soft hover:text-ink" title="Dismiss">
              <BellOff className="h-4 w-4" />
            </button>
          </div>
        )}

        <ChatThread
          conversation={active} messages={messages}
          loading={loadingMessages && messages.length === 0}
          user={user} peerId={peerId} peerOnline={peerOnline} socket={socket}
          typingUserId={activeId ? typingByConvo[activeId] : null}
          participantsById={participantsById}
          onSend={handleSend} onReact={handleReact} onDelete={handleDelete} onEdit={handleEdit}
          onOpenCalls={setCallMode} onOpenMenu={() => setSidebarOpen(true)}
          onOpenGroupInfo={() => setGroupInfoOpen(true)}
        />
      </div>

      <NewChatModal open={newDmOpen} onClose={() => setNewDmOpen(false)}
        onCreated={(c) => {
          setConversations((prev) => { const has = prev.some((x) => x.id === c.id); return has ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev]; });
          setActiveId(c.id);
        }} />

      <CreateGroupModal open={groupOpen} onClose={() => setGroupOpen(false)}
        onCreated={(c) => { setConversations((prev) => [c, ...prev]); setActiveId(c.id); }} />

      <GroupInfoModal
        open={groupInfoOpen && active?.type === 'group'}
        onClose={() => setGroupInfoOpen(false)}
        conversation={active}
        currentUserId={user.id}
        onUpdated={(updated) => setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c))}
        onLeft={() => { setConversations((prev) => prev.filter((c) => c.id !== activeId)); setActiveId(null); }}
      />

      <CallPlaceholderModal open={!!callMode} mode={callMode} onClose={() => setCallMode(null)} />
    </div>
  );
}
