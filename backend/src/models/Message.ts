import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ appointmentId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
