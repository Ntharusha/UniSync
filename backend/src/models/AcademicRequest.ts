import mongoose from 'mongoose';

// Define faculty, department, and degree program options
const FACULTIES = [
  'Faculty of Applied Science',
  'Faculty of Business Studies',
  'Faculty of Technology'
] as const;

const DEPARTMENTS_BY_FACULTY: Record<string, string[]> = {
  'Faculty of Applied Science': [
    'Department of Physical Science',
    'Department of Bio-science'
  ],
  'Faculty of Business Studies': [
    'Department of Business Administration',
    'Department of Accounting and Finance',
    'Department of Marketing and Management'
  ],
  'Faculty of Technology': [
    'Department of Computer Science',
    'Department of Engineering',
    'Department of Information Technology'
  ]
} as const;

const DEGREE_PROGRAMS_BY_DEPT: Record<string, string[]> = {
  'Department of Physical Science': [
    'Bachelor of Science in Applied Mathematics and Computing',
    'Bachelor of Science Honours in Computer Science',
    'Bachelor of Science in Information Technology',
    'Bachelor of Science Honours in Information Technology'
  ],
  'Department of Bio-science': [
    'Bachelor of Science Honours in Environmental Science'
  ],
  'Department of Business Administration': [
    'BBA in Business Administration',
    'BBA (Hons) in Business Administration'
  ],
  'Department of Accounting and Finance': [
    'BSc in Accounting and Finance',
    'BSc (Hons) in Accounting and Finance'
  ],
  'Department of Marketing and Management': [
    'BSc in Marketing',
    'BSc in Management'
  ],
  'Department of Computer Science': [
    'BSc (Hons) in Computer Science',
    'BSc in Information Technology (IT)',
    'BSc in Software Engineering'
  ],
  'Department of Engineering': [
    'BEng in Civil Engineering',
    'BEng in Electrical Engineering',
    'BEng in Mechanical Engineering'
  ],
  'Department of Information Technology': [
    'BSc in Information Technology',
    'BSc (Hons) in Information Technology',
    'BSc in Network Engineering'
  ]
} as const;

export interface IAcademicRequest {
  _id?: string;
  studentId: string;
  faculty: typeof FACULTIES[number];
  department: string;
  degreeProgram: string;
  requestType: 'letter' | 'transcript' | 'course-issue' | 'other';
  priority: 'normal' | 'academic_urgent' | 'emergency';
  title: string;
  description: string;
  documents: {
    fileUrl: string;
    fileName: string;
    fileSizeMb: number;
    uploadedAt: string;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

const academicRequestSchema = new mongoose.Schema<IAcademicRequest>(
  {
    // BUG-019 fixed: use ObjectId ref to User instead of plain String
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    faculty: { 
      type: String, 
      required: true,
      enum: FACULTIES
    },
    department: { 
      type: String,
      // We'll validate this in the controller based on selected faculty
    },
    degreeProgram: { 
      type: String,
      // We'll validate this in the controller based on selected department
    },
    requestType: {
      type: String,
      enum: ['letter', 'transcript', 'course-issue', 'other'],
      required: true
    },
    priority: {
      type: String,
      enum: ['normal', 'academic_urgent', 'emergency'],
      default: 'normal'
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    documents: [
      {
        fileUrl: String,
        fileName: String,
        fileSizeMb: Number,
        uploadedAt: String
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Add custom validation for department based on faculty
academicRequestSchema.pre('validate', function(next) {
  const faculty = this.faculty;
  const department = this.department;
  
  if (faculty && department) {
    const validDepartments = DEPARTMENTS_BY_FACULTY[faculty];
    if (validDepartments && !validDepartments.includes(department)) {
      this.invalidate('department', `"${department}" is not a valid department for ${faculty}`);
    }
  }
  next();
});

// Add custom validation for degreeProgram based on department
academicRequestSchema.pre('validate', function(next) {
  const department = this.department;
  const degreeProgram = this.degreeProgram;
  
  if (department && degreeProgram) {
    const validDegreePrograms = DEGREE_PROGRAMS_BY_DEPT[department];
    if (validDegreePrograms && !validDegreePrograms.includes(degreeProgram)) {
      this.invalidate('degreeProgram', `"${degreeProgram}" is not a valid degree program for ${department}`);
    }
  }
  next();
});

export const AcademicRequest = mongoose.model<IAcademicRequest>(
  'AcademicRequest',
  academicRequestSchema
);
