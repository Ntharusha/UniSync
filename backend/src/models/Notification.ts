import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'displacement'], 
    default: 'info' 
  },
  read: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // Link to Appointment, etc.
  createdAt: { type: Date, default: Date.now }
});

export const Notification = mongoose.model('Notification', notificationSchema);
