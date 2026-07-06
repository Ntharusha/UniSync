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

