import mongoose from 'mongoose';

const timetableBlockSchema = new mongoose.Schema({
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "11:00"
  courseName: { type: String, required: true },
  room: { type: String },
  semester: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const TimetableBlock = mongoose.model('TimetableBlock', timetableBlockSchema);
