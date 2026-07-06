export type UserRole = 'student' | 'lecturer' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  regNumber?: string;
  department?: string;
  isActive?: boolean;
}

export interface AvailabilityRule {
  _id: string;
  lecturerId: string;
  type: 'office_hours' | 'blackout' | 'buffer' | 'lectures';
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  bufferMins?: number;
  recurrence?: 'weekly' | 'once';
  date?: string;
}

export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled';
export type AppointmentPriority = 'normal' | 'academic_urgent' | 'emergency';

export interface Appointment {
  _id: string;
  studentId: User | string;
  lecturerId: User | string;
  requestedStart: string;
  requestedEnd: string;
  proposedStart?: string;
  proposedEnd?: string;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  reason: string;
  description?: string;
  documents?: {
    fileUrl: string;
    fileName: string;
    fileSizeMb: number;
    uploadedAt: string;
  }[];
  statusHistory?: {
    status: string;
    reason?: string;
    changedBy: string;
    changedAt?: string;
  }[];
  createdAt?: string;
}

export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled';
export type AppointmentPriority = 'normal' | 'academic_urgent' | 'emergency';

export interface Appointment {
  _id: string;
  studentId: User | string;
  lecturerId: User | string;
  requestedStart: string;
  requestedEnd: string;
  proposedStart?: string;
  proposedEnd?: string;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  reason: string;
  description?: string;
  documents?: {
    fileUrl: string;
    fileName: string;
    fileSizeMb: number;
    uploadedAt: string;
  }[];
  statusHistory?: {
    status: string;
    reason?: string;
    changedBy: string;
    changedAt?: string;
  }[];
  createdAt?: string;
}
