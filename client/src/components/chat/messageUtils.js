export function previewMessage(m) {
  if (!m) return '';
  if (m.text?.trim()) return m.text.trim().slice(0, 140);
  const a = m.attachments?.[0];
  if (a?.mimeType?.startsWith('image/')) return 'Photo';
  if (a?.name) return `File: ${a.name}`;
  return 'Message';
}

export function mergeMessages(list, incoming) {
  const byNonce = incoming.clientNonce;
  const filtered = byNonce
    ? list.filter((m) => !(m.clientNonce === byNonce && m.id !== incoming.id))
    : list.filter((m) => m.id !== incoming.id);
  const next = [...filtered, incoming];
  next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return next;
}

export function updateMessageMap(list, messageId, updater) {
  return list.map((m) => (m.id === messageId ? updater(m) : m));
}
