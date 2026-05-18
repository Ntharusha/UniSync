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
    type: 'office_hours' | 'blackout' | 'buffer';
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
    createdAt?: string;
}

export interface Slot {
    start: string;
    end: string;
    status: 'free' | 'teaching' | 'normal_booked' | 'priority_booked';
    appointmentId?: string;
}

export interface Notification {
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
    actorId: User;
    action: string;
    entityType: string;
    metadata?: any;
    timestamp: string;
}

export interface Message {
    _id: string;
    appointmentId: string;
    senderId: User | string;
    body: string;
    createdAt: string;
}
