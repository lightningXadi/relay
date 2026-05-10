import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }
  const mine = req.userId;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find({
    _id: { $ne: mine },
    $or: [{ username: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }],
  })
    .limit(20)
    .select('username email avatar');
  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      avatar: u.avatar || '',
    })),
  });
});

router.patch('/me', async (req, res) => {
  const { username, avatar } = req.body || {};
  if (username !== undefined) {
    const t = String(username).trim();
    if (t.length < 2 || t.length > 32) {
      res.status(400).json({ error: 'Username must be 2–32 characters' });
      return;
    }
    req.user.username = t;
  }
  if (avatar !== undefined) {
    if (typeof avatar !== 'string') {
      res.status(400).json({ error: 'Invalid avatar' });
      return;
    }
    req.user.avatar = avatar;
  }
  await req.user.save();
  res.json({
    user: {
      id: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar || '',
    },
  });
});

export default router;
