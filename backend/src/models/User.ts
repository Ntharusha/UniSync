import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String },
  role: { type: String, enum: ['student', 'lecturer', 'admin'], required: true },
  name: { type: String, required: true },
  regNumber: { type: String }, // students only
  faculty: { type: String }, // students only
  department: { type: String },
  degreeProgram: { type: String }, // students only
  pushTokens: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  if (this.passwordHash && !this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

export const User = mongoose.model('User', userSchema);
