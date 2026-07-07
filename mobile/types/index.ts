// Shared TypeScript types — mirrors frontend/src/types.ts

export type UserRole = 'student' | 'lecturer' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  regNumber?: string;
  department?: string;
  isActive?: boolean;
  pushToken?: string;
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

export type AppointmentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'rescheduled';

export type AppointmentPriority = 'normal' | 'academic_urgent' | 'emergency';

export interface AppointmentDocument {
  fileUrl: string;
  fileName: string;
  fileSizeMb: number;
  uploadedAt: string;
}

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
  documents?: AppointmentDocument[];
  statusHistory?: {
    status: string;
    reason?: string;
    changedBy: string;
    changedAt?: string;
  }[];
  createdAt?: string;
}

export interface Slot {
  start: string;
  end: string;
  status: 'free' | 'teaching' | 'normal_booked' | 'priority_booked' | 'blocked';
  appointmentId?: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'displacement';
  read: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: User | string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface Message {
  _id: string;
  appointmentId: string;
  senderId: User | string;
  body: string;
  createdAt: string;
}

export interface ParsedReason {
  isAcademic: boolean;
  title: string;
  description: string;
  faculty: string;
  department: string;
  degreeProgram: string;
  requestType: string;
}

export function parseReason(reasonStr: string): ParsedReason {
  try {
    if (reasonStr && reasonStr.startsWith('{')) {
      const parsed = JSON.parse(reasonStr);
      return {
        isAcademic: true,
        title: parsed.title || 'Academic Request',
        description: parsed.description || '',
        faculty: parsed.faculty || '',
        department: parsed.department || '',
        degreeProgram: parsed.degreeProgram || '',
        requestType: parsed.requestType || '',
      };
    }
  } catch (_) {}
  return {
    isAcademic: false,
    title: 'Appointment Request',
    description: reasonStr || '',
    faculty: '',
    department: '',
    degreeProgram: '',
    requestType: '',
  };
}

export interface AdminAnalytics {
  totalUsers: number;
  totalLecturers: number;
  totalStudents: number;
  totalAppointments: number;
  activeAppointments: number;
  pendingRequests: number;
  cancelledAppointments: number;
  uptime: string;
  avgResponse: string;
}
