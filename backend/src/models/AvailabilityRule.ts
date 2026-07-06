import mongoose from 'mongoose';

const availabilityRuleSchema = new mongoose.Schema({
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['office_hours', 'blackout', 'buffer', 'lectures'], required: true },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  startTime: { type: String },
  endTime: { type: String },
  bufferMins: { type: Number, default: 10 },
  recurrence: { type: String, enum: ['weekly', 'once'], default: 'weekly' },
  date: { type: Date },
}, { timestamps: true });

export const AvailabilityRule = mongoose.model('AvailabilityRule', availabilityRuleSchema);
