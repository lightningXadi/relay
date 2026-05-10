import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

function getBearerToken(header) {
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export async function authenticate(req, res, next) {
  try {
    const token =
      getBearerToken(req.headers.authorization) || req.cookies?.token || null;
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.userId = payload.userId;
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
