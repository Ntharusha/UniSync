export type AcademicRequestStatus = 'pending' | 'approved' | 'rejected';

export type AcademicRequestRequestType =
  | 'letter'
  | 'transcript'
  | 'course-issue'
  | 'other';

export type AcademicRequestPriority = 'normal' | 'academic_urgent' | 'emergency';

export interface AcademicRequestDocument {
  fileUrl: string;
  fileName: string;
  fileSizeMb: number;
  uploadedAt: string;
}

export interface AcademicRequest {
  _id: string;
  studentId: string;
  faculty: string;
  department: string;
  degreeProgram: string;
  requestType: AcademicRequestRequestType;
  priority: AcademicRequestPriority;
  title: string;
  description: string;
  documents: AcademicRequestDocument[];
  status: AcademicRequestStatus;
  createdAt?: string;
}

