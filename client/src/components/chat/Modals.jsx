import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, UserPlus, UserMinus, LogOut, Pencil, Check } from 'lucide-react';
import { api } from '../../lib/api';

// ─── New Direct Message Modal ───────────────────────────────────────────────
export function NewChatModal({ open, onClose, onCreated }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function runSearch(v) {
    setQ(v);
    if (v.trim().length < 2) { setUsers([]); return; }
    setLoading(true);
    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(v.trim())}`);
      setUsers(data.users || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }

  async function choose(u) {
    setBusy(true);
    try {
      const data = await api('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ userId: u.id }),
      });
      onCreated(data.conversation);
      onClose();
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[1px] sm:items-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface-panel shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-ink">New direct message</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-card hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input autoFocus value={q} onChange={(e) => runSearch(e.target.value)}
              placeholder="Search people by name or email"
              className="w-full rounded-xl border border-border bg-surface-card py-2 pl-9 pr-3 text-sm text-ink outline-none ring-accent/20 focus:border-accent/40 focus:ring-2" />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <li className="px-3 py-8 text-center text-sm text-ink-soft">Searching…</li>
          ) : users.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-ink-soft">
              {q.trim().length < 2 ? 'Type at least two characters.' : 'No people found.'}
            </li>
          ) : users.map((u) => (
            <li key={u.id}>
              <button type="button" disabled={busy} onClick={() => choose(u)}
                className="flex w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-card disabled:opacity-50">
                <div>
                  <p className="text-sm font-medium text-ink">{u.username}</p>
                  <p className="text-xs text-ink-soft">{u.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

// ─── Create Group Modal ──────────────────────────────────────────────────────
export function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function runSearch(v) {
    setQ(v);
    if (v.trim().length < 2) { setUsers([]); return; }
    setLoading(true);
    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(v.trim())}`);
      setUsers(data.users || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }

  function toggle(u) {
    setSelected((prev) => {
      const has = prev.some((x) => x.id === u.id);
      return has ? prev.filter((x) => x.id !== u.id) : [...prev, u];
    });
  }

  async function create() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const data = await api('/api/conversations/group', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || undefined, participantIds: selected.map((s) => s.id) }),
      });
      onCreated(data.conversation);
      setName(''); setSelected([]); setQ('');
      onClose();
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[1px] sm:items-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface-panel shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-ink">New group</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-card hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs font-medium text-ink-soft">Group name (optional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64}
              className="mt-1 w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-ink outline-none ring-accent/20 focus:border-accent/40 focus:ring-2"
              placeholder="e.g. Launch crew" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Add people</label>
            <input value={q} onChange={(e) => runSearch(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-ink outline-none ring-accent/20 focus:border-accent/40 focus:ring-2"
              placeholder="Search" />
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button type="button" key={s.id} onClick={() => toggle(s)}
                  className="rounded-full border border-border bg-surface-card px-2.5 py-0.5 text-xs text-ink transition hover:border-accent/40">
                  {s.username} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className="min-h-0 max-h-48 flex-1 overflow-y-auto px-2">
          {loading ? (
            <li className="px-3 py-6 text-center text-sm text-ink-soft">Searching…</li>
          ) : users.map((u) => {
            const on = selected.some((s) => s.id === u.id);
            return (
              <li key={u.id}>
                <button type="button" onClick={() => toggle(u)}
                  className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-card ${on ? 'ring-1 ring-accent/40' : ''}`}>
                  <span className="font-medium text-ink">{u.username}</span>
                  <span className="ml-2 text-xs text-ink-soft">{u.email}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border p-4">
          <button type="button" disabled={busy || selected.length === 0} onClick={create}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white shadow-chip transition hover:brightness-110 disabled:opacity-50">
            {busy ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Group Info Modal (manage members, rename, leave) ───────────────────────
export function GroupInfoModal({ open, onClose, conversation, currentUserId, onUpdated, onLeft }) {
  const [tab, setTab] = useState('members'); // 'members' | 'add'
  const [q, setQ] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  if (!open || !conversation) return null;

  const isCreator = conversation.createdBy === currentUserId;

  async function searchPeople(v) {
    setQ(v);
    if (v.trim().length < 2) { setSearchUsers([]); return; }
    setSearching(true);
    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(v.trim())}`);
      // Filter out existing members
      const existing = new Set(conversation.participants.map((p) => p.id));
      setSearchUsers((data.users || []).filter((u) => !existing.has(u.id)));
    } catch { setSearchUsers([]); }
    finally { setSearching(false); }
  }

  async function addMember(userId) {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/conversations/${conversation.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      onUpdated(data.conversation);
      setQ('');
      setSearchUsers([]);
      setTab('members');
    } catch (e) {
      setError(e.message || 'Failed to add member');
    } finally { setBusy(false); }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this person from the group?')) return;
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/conversations/${conversation.id}/members/${userId}`, { method: 'DELETE' });
      if (data.deleted) { onLeft(); onClose(); return; }
      onUpdated(data.conversation);
    } catch (e) {
      setError(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function leaveGroup() {
    if (!window.confirm('Leave this group?')) return;
    setBusy(true);
    try {
      await api(`/api/conversations/${conversation.id}/members/${currentUserId}`, { method: 'DELETE' });
      onLeft();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to leave');
    } finally { setBusy(false); }
  }

  async function saveName() {
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/conversations/${conversation.id}/name`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName.trim() }),
      });
      onUpdated(data.conversation);
      setEditingName(false);
    } catch (e) {
      setError(e.message || 'Failed to rename');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[1px] sm:items-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface-panel shadow-soft">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {editingName ? (
            <div className="flex flex-1 items-center gap-2 mr-2">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface-card px-2 py-1 text-sm text-ink outline-none focus:border-accent/40"
                maxLength={64} onKeyDown={(e) => e.key === 'Enter' && saveName()} />
              <button type="button" onClick={saveName} disabled={busy} className="rounded-lg p-1.5 text-accent hover:bg-surface-card">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-card">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-2">
              <h2 className="text-sm font-medium text-ink truncate">{conversation.title}</h2>
              {isCreator && (
                <button type="button" onClick={() => { setNewName(conversation.name || conversation.title); setEditingName(true); }}
                  className="rounded-lg p-1 text-ink-soft hover:bg-surface-card hover:text-ink">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-card hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {['members', 'add'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-ink-soft hover:text-ink'}`}>
              {t === 'members' ? `Members (${conversation.participants.length})` : 'Add people'}
            </button>
          ))}
        </div>

        {error && <p className="px-4 py-2 text-xs text-red-500">{error}</p>}

        {/* Members tab */}
        {tab === 'members' && (
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {conversation.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-surface-card">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {p.username}
                    {p.id === currentUserId && <span className="ml-1.5 text-xs text-ink-soft">(you)</span>}
                    {p.id === conversation.createdBy && <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">admin</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{p.email}</p>
                </div>
                {(isCreator && p.id !== currentUserId) && (
                  <button type="button" disabled={busy} onClick={() => removeMember(p.id)}
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-panel hover:text-red-500 disabled:opacity-40"
                    title="Remove from group">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Add people tab */}
        {tab === 'add' && (
          <>
            <div className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input autoFocus value={q} onChange={(e) => searchPeople(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-xl border border-border bg-surface-card py-2 pl-9 pr-3 text-sm text-ink outline-none ring-accent/20 focus:border-accent/40 focus:ring-2" />
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {searching ? (
                <li className="px-3 py-6 text-center text-sm text-ink-soft">Searching…</li>
              ) : searchUsers.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ink-soft">
                  {q.trim().length < 2 ? 'Type at least two characters.' : 'No people found.'}
                </li>
              ) : searchUsers.map((u) => (
                <li key={u.id}>
                  <button type="button" disabled={busy} onClick={() => addMember(u.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-surface-card disabled:opacity-50">
                    <div>
                      <p className="text-sm font-medium text-ink">{u.username}</p>
                      <p className="text-xs text-ink-soft">{u.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-accent" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Footer: leave group */}
        <div className="border-t border-border p-3">
          <button type="button" disabled={busy} onClick={leaveGroup}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50">
            <LogOut className="h-4 w-4" />
            Leave group
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Call Placeholder Modal ──────────────────────────────────────────────────
export function CallPlaceholderModal({ open, mode, onClose }) {
  if (!open || !mode) return null;
  const label = mode === 'video' ? 'Video calls stay calm here too.' : 'Voice walks with you.';
  const sub = mode === 'video'
    ? "We're reserving a thoughtful video experience — camera preview, ringing state, and device checks will land in a polish pass."
    : 'Voice routing, mute, and status surfaces are sketched below the fold for the next sprint. Thanks for peeking early.';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md rounded-2xl border border-border bg-surface-panel p-6 text-center shadow-soft">
        <p className="text-sm font-medium text-accent">{mode === 'video' ? 'Video' : 'Voice'} · Planned</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">{label}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sub}</p>
        <button type="button" onClick={onClose}
          className="mt-6 w-full rounded-xl border border-border bg-surface-card py-2.5 text-sm font-medium text-ink transition hover:bg-surface-panel">
          Back to chat
        </button>
      </motion.div>
    </div>
  );
}
