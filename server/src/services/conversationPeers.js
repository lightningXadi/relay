import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';

export async function getPeerIdsForUser(userId) {
  const uid =
    typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const convs = await Conversation.find({ participants: uid }).select('participants').lean();
  const peers = new Set();
  const idStr = uid.toString();
  for (const c of convs) {
    for (const p of c.participants) {
      const id = p.toString();
      if (id !== idStr) peers.add(id);
    }
  }
  return [...peers];
}
