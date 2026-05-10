import { Router } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

async function hydrateConvos(userId, list) {
  const uid = userId.toString();
  const allIds = new Set();
  for (const c of list) {
    for (const p of c.participants) {
      allIds.add(p.toString());
    }
  }
  const oid = [...allIds].map((id) => new mongoose.Types.ObjectId(id));
  const users =
    oid.length > 0
      ? await User.find({ _id: { $in: oid } }).select('username email avatar').lean()
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  return list.map((c) => {
    const participants = c.participants.map((p) => {
      const id = p.toString();
      const u = userMap[id];
      return {
        id,
        username: u?.username || 'User',
        email: u?.email || '',
        avatar: u?.avatar || '',
        isSelf: id === uid,
      };
    });

    const title =
      c.type === 'group'
        ? (c.name && c.name.trim()) || 'Group'
        : participants.find((p) => !p.isSelf)?.username || 'Chat';

    return {
      id: c._id.toString(),
      type: c.type,
      name: c.name || '',
      title,
      participants,
      createdBy: c.createdBy?.toString() || null,
      lastMessagePreview: c.lastMessagePreview || '',
      lastMessageAt: c.lastMessageAt || c.updatedAt,
      updatedAt: c.updatedAt,
    };
  });
}

// GET all conversations
router.get('/', async (req, res) => {
  const list = await Conversation.find({ participants: req.userId })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100);
  const convos = await hydrateConvos(req.userId, list);
  res.json({ conversations: convos });
});

// POST create direct conversation
router.post('/direct', async (req, res) => {
  const { userId: otherId } = req.body || {};
  if (!otherId || otherId === req.userId) {
    res.status(400).json({ error: 'Valid user id required' });
    return;
  }
  const other = await User.findById(otherId).select('_id');
  if (!other) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const a = new mongoose.Types.ObjectId(req.userId);
  const b = new mongoose.Types.ObjectId(otherId);
  let convo = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [a, b], $size: 2 },
  });
  let created = false;
  if (!convo) {
    convo = await Conversation.create({
      type: 'direct',
      participants: [a, b],
      createdBy: a,
      lastMessageAt: new Date(),
    });
    created = true;
  }
  const [hydrated] = await hydrateConvos(req.userId, [convo]);
  res.status(created ? 201 : 200).json({ conversation: hydrated });
});

// POST create group conversation
router.post('/group', async (req, res) => {
  const { name, participantIds } = req.body || {};
  const ids = Array.isArray(participantIds) ? participantIds : [];
  const unique = [...new Set([req.userId, ...ids.map(String)])];
  if (unique.length < 2) {
    res.status(400).json({ error: 'Select at least one other person' });
    return;
  }
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const displayName = trimmedName.length > 0 ? trimmedName.slice(0, 64) : 'New group';

  const objIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  const convo = await Conversation.create({
    type: 'group',
    name: displayName,
    participants: objIds,
    createdBy: new mongoose.Types.ObjectId(req.userId),
    lastMessageAt: new Date(),
  });
  const [hydrated] = await hydrateConvos(req.userId, [convo]);
  res.status(201).json({ conversation: hydrated });
});

// GET single conversation
router.get('/:id', async (req, res) => {
  const convo = await Conversation.findOne({
    _id: req.params.id,
    participants: req.userId,
  });
  if (!convo) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const [hydrated] = await hydrateConvos(req.userId, [convo]);
  res.json({ conversation: hydrated });
});

// PATCH rename group
router.patch('/:id/name', async (req, res) => {
  const convo = await Conversation.findOne({
    _id: req.params.id,
    type: 'group',
    participants: req.userId,
  });
  if (!convo) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 64) : '';
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  convo.name = name;
  await convo.save();
  const [hydrated] = await hydrateConvos(req.userId, [convo]);

  // Notify all participants via socket
  const io = req.app.get('io');
  io?.to(`conversation:${convo._id}`).emit('conversation:updated', { conversation: hydrated });

  res.json({ conversation: hydrated });
});

// POST add member to group
router.post('/:id/members', async (req, res) => {
  const convo = await Conversation.findOne({
    _id: req.params.id,
    type: 'group',
    participants: req.userId,
  });
  if (!convo) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  const user = await User.findById(userId).select('_id');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const alreadyIn = convo.participants.some((p) => p.toString() === userId);
  if (!alreadyIn) {
    convo.participants.push(new mongoose.Types.ObjectId(userId));
    await convo.save();
  }
  const [hydrated] = await hydrateConvos(req.userId, [convo]);

  const io = req.app.get('io');
  io?.to(`conversation:${convo._id}`).emit('conversation:updated', { conversation: hydrated });

  res.json({ conversation: hydrated });
});

// DELETE remove member from group (or leave group)
router.delete('/:id/members/:userId', async (req, res) => {
  const convo = await Conversation.findOne({
    _id: req.params.id,
    type: 'group',
    participants: req.userId,
  });
  if (!convo) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const targetId = req.params.userId;
  const isLeaving = targetId === req.userId;
  const isCreator = convo.createdBy?.toString() === req.userId;

  // Only creator can remove others; anyone can remove themselves (leave)
  if (!isLeaving && !isCreator) {
    res.status(403).json({ error: 'Only the group creator can remove members' });
    return;
  }

  convo.participants = convo.participants.filter((p) => p.toString() !== targetId);

  // If no participants left, delete the conversation
  if (convo.participants.length === 0) {
    await Conversation.deleteOne({ _id: convo._id });
    await Message.deleteMany({ conversation: convo._id });
    res.json({ ok: true, deleted: true });
    return;
  }

  // If creator leaves, assign new creator
  if (isLeaving && isCreator && convo.participants.length > 0) {
    convo.createdBy = convo.participants[0];
  }

  await convo.save();
  const [hydrated] = await hydrateConvos(req.userId, [convo]);

  const io = req.app.get('io');
  io?.to(`conversation:${convo._id}`).emit('conversation:updated', { conversation: hydrated });
  // Notify the removed user specifically
  io?.to(`user:${targetId}`).emit('conversation:removed', { conversationId: convo._id.toString() });

  res.json({ ok: true, conversation: hydrated });
});
export default router;