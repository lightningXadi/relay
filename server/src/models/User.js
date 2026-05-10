import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, maxlength: 32 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.index({ username: 'text', email: 'text' });

export const User = mongoose.model('User', userSchema);
