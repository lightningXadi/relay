import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function userResponse(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatar: user.avatar || '',
    createdAt: user.createdAt,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username?.trim() || !email?.trim() || !password || password.length < 8) {
      res.status(400).json({ error: 'Valid username, email, and password (8+ chars) required' });
      return;
    }
    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const hash = await bcrypt.hash(password, 11);
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
    });
    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: userResponse(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    user.password = undefined;
    const token = signToken(user._id.toString());
    res.json({ token, user: userResponse(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: userResponse(req.user) });
});

export default router;
