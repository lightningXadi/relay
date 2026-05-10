import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  { url: String, name: String, mimeType: String, size: Number },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  { emoji: { type: String, required: true }, userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const deliveredSchema = new mongoose.Schema(
  { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachments: [attachmentSchema],
    readBy: [readReceiptSchema],
    deliveredTo: [deliveredSchema],
    reactions: [reactionSchema],
    clientNonce: { type: String, index: true },
    editedAt: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
