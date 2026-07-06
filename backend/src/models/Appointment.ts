import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedStart: { type: Date, required: true },
  requestedEnd: { type: Date, required: true },
  proposedStart: { type: Date },
  proposedEnd: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'rescheduled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['normal', 'academic_urgent', 'emergency'],
    default: 'normal',
  },
  priorityWeight: { type: Number, enum: [1, 2, 3], default: 1 },
  reason: { type: String, required: true },
  description: { type: String },
  documents: [{
    fileUrl: String,
    fileName: String,
    fileSizeMb: Number,
    uploadedAt: { type: Date, default: Date.now },
  }],
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    at: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  optimisticConcurrency: true,
});

appointmentSchema.index(
  { lecturerId: 1, requestedStart: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: { $in: ['approved', 'pending'] } } 
  }
);

appointmentSchema.index({ studentId: 1, status: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
