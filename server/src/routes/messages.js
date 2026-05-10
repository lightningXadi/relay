import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function serializeMessage(doc) {
  const m = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const sid = (m.sender?._id || m.sender)?.toString?.();
  let senderDetail = null;
  if (m.sender && typeof m.sender === 'object' && !m.sender._bsontype) {
    if (m.sender.username) {
      senderDetail = {
        id: (m.sender._id || m.sender.id).toString(),
        username: m.sender.username,
        avatar: m.sender.avatar || '',
      };
    }
  }
  return {
    id: m._id.toString(),
    conversationId: (m.conversation || m.conversationId)?.toString?.() ?? m.conversation,
    senderId: sid || (m.sender?.toString?.() ?? ''),
    sender: senderDetail,
    text: m.text || '',
    attachments: m.attachments || [],
    readBy: (m.readBy || []).map((r) => ({ userId: r.user.toString(), at: r.at })),
    deliveredTo: (m.deliveredTo || []).map((d) => ({ userId: d.user.toString(), at: d.at })),
    reactions: (m.reactions || []).map((r) => ({
      emoji: r.emoji,
      userIds: (r.userIds || []).map((id) => id.toString()),
    })),
    createdAt: m.createdAt,
    editedAt: m.editedAt || null,
    deleted: m.deleted || false,
    clientNonce: m.clientNonce || null,
  };
}

// GET messages for a conversation
router.get('/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  const convo = await Conversation.findOne({ _id: conversationId, participants: req.userId });
  if (!convo) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const before = req.query.before;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const query = { conversation: conversationId };
  if (before) {
    const gate = await Message.findById(before).select('createdAt');
    if (gate) query.createdAt = { $lt: gate.createdAt };
  }
  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
  await User.populate(messages, { path: 'sender', select: 'username avatar' });
  const mapped = [...messages].reverse().map((m) => serializeMessage(m));
  res.json({ messages: mapped });
});

// POST mark messages as read
router.post('/:conversationId/read', async (req, res) => {
  const { conversationId } = req.params;
  const { untilMessageId } = req.body || {};
  const convo = await Conversation.findOne({ _id: conversationId, participants: req.userId });
  if (!convo) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  let timeFilter = {};
  if (untilMessageId) {
    const until = await Message.findById(untilMessageId).select('createdAt');
    if (until) timeFilter = { createdAt: { $lte: until.createdAt } };
  }
  const mine = req.user._id;
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: mine }, ...timeFilter, 'readBy.user': { $ne: mine } },
    { $push: { readBy: { user: mine, at: new Date() } } }
  );
  const io = req.app.get('io');
  io?.to(`conversation:${conversationId}`).emit('messages:readReceipt', {
    conversationId,
    readerId: req.user._id.toString(),
    untilMessageId: untilMessageId || null,
  });
  res.json({ ok: true });
});

// PATCH edit a message
router.patch('/:messageId', async (req, res) => {
  const msg = await Message.findById(req.params.messageId);
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  if (msg.sender.toString() !== req.userId) {
    res.status(403).json({ error: 'Cannot edit someone else\'s message' });
    return;
  }
  if (msg.deleted) {
    res.status(400).json({ error: 'Cannot edit a deleted message' });
    return;
  }
  const text = typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 8000) : '';
  if (!text) {
    res.status(400).json({ error: 'Text required' });
    return;
  }
  msg.text = text;
  msg.editedAt = new Date();
  await msg.save();
  await msg.populate({ path: 'sender', select: 'username avatar' });
  const serialized = serializeMessage(msg);

  const io = req.app.get('io');
  io?.to(`conversation:${msg.conversation}`).emit('message:edited', serialized);

  res.json({ message: serialized });
});

// DELETE a message (soft delete)
router.delete('/:messageId', async (req, res) => {
  const msg = await Message.findById(req.params.messageId);
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  if (msg.sender.toString() !== req.userId) {
    res.status(403).json({ error: 'Cannot delete someone else\'s message' });
    return;
  }
  msg.deleted = true;
  msg.text = '';
  msg.attachments = [];
  await msg.save();

  const io = req.app.get('io');
  io?.to(`conversation:${msg.conversation}`).emit('message:deleted', {
    messageId: msg._id.toString(),
    conversationId: msg.conversation.toString(),
  });

  res.json({ ok: true });
});

export default router;
