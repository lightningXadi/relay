import jwt from 'jsonwebtoken';
import { Message } from './models/Message.js';
import { Conversation } from './models/Conversation.js';
import { User } from './models/User.js';
import { getPeerIdsForUser } from './services/conversationPeers.js';

/** userId -> number of concurrent connections */
const onlineCounts = new Map();

function bumpOnline(uid) {
  const id = uid.toString();
  const prev = onlineCounts.get(id) || 0;
  const next = prev + 1;
  onlineCounts.set(id, next);
  return prev === 0;
}

function dropOnline(uid) {
  const id = uid.toString();
  const prev = onlineCounts.get(id) || 0;
  const next = prev - 1;
  if (next <= 0) {
    onlineCounts.delete(id);
    return true;
  }
  onlineCounts.set(id, next);
  return false;
}

async function notifyPresence(io, userId, online) {
  const peers = await getPeerIdsForUser(userId.toString());
  for (const pid of peers) {
    io.to(`user:${pid}`).emit('presence:update', { userId: userId.toString(), online });
  }
}

async function ensureParticipant(conversationId, userId) {
  return Conversation.findOne({ _id: conversationId, participants: userId });
}

function serializeMessage(doc) {
  const m =
    typeof doc.toObject === 'function'
      ? doc.toObject({ virtuals: false })
      : { ...doc };
  const senderId = (m.sender?._id || m.sender)?.toString?.() ?? m.sender?.toString();
  let sender = null;
  if (m.sender && typeof m.sender === 'object' && m.sender.username) {
    sender = {
      id: m.sender._id.toString(),
      username: m.sender.username,
      avatar: m.sender.avatar || '',
    };
  }
  return {
    id: m._id.toString(),
    conversationId: m.conversation?.toString(),
    senderId,
    sender,
    text: m.text || '',
    attachments: m.attachments || [],
    readBy: (m.readBy || []).map((r) => ({
      userId: r.user.toString(),
      at: r.at,
    })),
    deliveredTo: (m.deliveredTo || []).map((d) => ({
      userId: d.user.toString(),
      at: d.at,
    })),
    reactions: (m.reactions || []).map((r) => ({
      emoji: r.emoji,
      userIds: (r.userIds || []).map((id) => id.toString()),
    })),
    createdAt: m.createdAt,
    clientNonce: m.clientNonce || null,
  };
}

function previewFrom(text, attachments) {
  const t = (text || '').trim();
  if (t) return t.slice(0, 140);
  if (attachments?.length) {
    const a = attachments[0];
    if (a.mimeType?.startsWith('image/')) return 'Photo';
    return a.name ? `File: ${a.name}` : 'File';
  }
  return '';
}

export function setupSocket(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace?.(/^Bearer\s+/i, '') ||
        '';
      if (!token) throw new Error('Unauthorized');
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const uid = socket.userId.toString();
    socket.join(`user:${uid}`);

    if (bumpOnline(uid)) {
      await notifyPresence(io, uid, true);
    }

    const peers = await getPeerIdsForUser(uid);
    const onlinePeers = peers.filter((pid) => onlineCounts.has(pid));
    socket.emit('presence:snapshot', { onlineUserIds: onlinePeers });

    socket.on('conversation:join', async ({ conversationId }, cb = () => {}) => {
      const c = await ensureParticipant(conversationId, socket.userId);
      if (!c) {
        cb({ error: 'Forbidden' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      cb({ ok: true });
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: uid,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: uid,
      });
    });

    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        const c = await ensureParticipant(conversationId, socket.userId);
        if (!c) return;
        const msg = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
          sender: { $ne: socket.userId },
        });
        if (!msg) return;
        const already = (msg.deliveredTo || []).some(
          (d) => d.user.toString() === uid
        );
        if (!already) {
          msg.deliveredTo.push({ user: socket.userId, at: new Date() });
          await msg.save();
        }
        const deliveredTo = (msg.deliveredTo || []).map((d) => ({
          userId: d.user.toString(),
          at: d.at,
        }));
        io.to(`conversation:${conversationId}`).emit('message:delivery', {
          messageId,
          conversationId,
          deliveredTo,
        });
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('reaction:toggle', async ({ messageId, conversationId, emoji }, cb = () => {}) => {
      try {
        const e = typeof emoji === 'string' ? emoji.trim().slice(0, 24) : '';
        if (!messageId || !conversationId || !e) {
          cb?.({ error: 'Bad request' });
          return;
        }
        const c = await ensureParticipant(conversationId, socket.userId);
        if (!c) {
          cb?.({ error: 'Forbidden' });
          return;
        }
        const msg = await Message.findOne({ _id: messageId, conversation: conversationId });
        if (!msg) {
          cb?.({ error: 'Not found' });
          return;
        }
        const reactions = msg.reactions || [];
        const idx = reactions.findIndex((r) => r.emoji === e);
        if (idx === -1) {
          reactions.push({ emoji: e, userIds: [socket.userId] });
        } else {
          const r = reactions[idx];
          const has = r.userIds.some((id) => id.toString() === uid);
          if (has) {
            r.userIds = r.userIds.filter((id) => id.toString() !== uid);
            if (r.userIds.length === 0) reactions.splice(idx, 1);
          } else {
            r.userIds.push(socket.userId);
          }
        }
        msg.reactions = reactions;
        await msg.save();
        const serialized = serializeMessage(
          await msg.populate({ path: 'sender', select: 'username avatar' })
        );
        io.to(`conversation:${conversationId}`).emit('message:reactions', {
          messageId,
          conversationId,
          reactions: serialized.reactions,
        });
        cb?.({ ok: true, reactions: serialized.reactions });
      } catch (e) {
        console.error(e);
        cb?.({ error: 'Failed' });
      }
    });

    socket.on('message:send', async (payload, cb = () => {}) => {
      try {
        const {
          conversationId,
          text = '',
          attachments = [],
          clientNonce,
          tempId,
        } = payload || {};
        const c = await ensureParticipant(conversationId, socket.userId);
        if (!c) {
          cb({ error: 'Forbidden' });
          return;
        }
        const trimmed = String(text || '').slice(0, 8000);
        if (
          (!trimmed || !trimmed.trim()) &&
          !(Array.isArray(attachments) && attachments.length)
        ) {
          cb({ error: 'Empty message' });
          return;
        }
        let msg = null;
        if (clientNonce) {
          msg = await Message.findOne({ conversation: conversationId, clientNonce });
        }
        if (!msg) {
          msg = await Message.create({
            conversation: conversationId,
            sender: socket.userId,
            text: trimmed.trim(),
            attachments: attachments || [],
            clientNonce: clientNonce || undefined,
          });
        }
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: msg.createdAt || new Date(),
          lastMessagePreview: previewFrom(trimmed, attachments),
        });
        const populated = await Message.findById(msg._id).populate({
          path: 'sender',
          select: 'username avatar',
        });
        const serialized = serializeMessage(populated);
        io.to(`conversation:${conversationId}`).emit('message:new', serialized);
        cb({ ok: true, message: serialized, tempId });
      } catch (e) {
        console.error(e);
        cb({ error: 'Send failed' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (dropOnline(uid)) {
          await notifyPresence(io, uid, false);
        }
      } catch (e) {
        console.error(e);
      }
    });
  });
}
