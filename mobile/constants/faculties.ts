// Mirrors the faculty/department/degree data from StudentDashboard.tsx

export const FACULTIES = [
  'Faculty of Applied Science',
  'Faculty of Business Studies',
  'Faculty of Technology',
] as const;

export type Faculty = (typeof FACULTIES)[number];

export const DEPARTMENTS_BY_FACULTY: Record<Faculty, string[]> = {
  'Faculty of Applied Science': [
    'Department of Physical Science',
    'Department of Bio-science',
  ],
  'Faculty of Business Studies': [
    'Department of Business Administration',
    'Department of Accounting and Finance',
    'Department of Marketing and Management',
  ],
  'Faculty of Technology': [
    'Department of Computer Science',
    'Department of Engineering',
    'Department of Information Technology',
  ],
};

export const DEGREE_PROGRAMS: Record<string, string[]> = {
  'Faculty of Applied Science|Department of Physical Science': [
    'Bachelor of Science in Applied Mathematics and Computing',
    'Bachelor of Science Honours in Computer Science',
    'Bachelor of Science in Information Technology',
    'Bachelor of Science Honours in Information Technology',
  ],
  'Faculty of Applied Science|Department of Bio-science': [
    'Bachelor of Science Honours in Environmental Science',
  ],
  'Faculty of Business Studies|Department of Business Administration': [
    'BBA in Business Administration',
    'BBA (Hons) in Business Administration',
  ],
  'Faculty of Business Studies|Department of Accounting and Finance': [
    'BSc in Accounting and Finance',
    'BSc (Hons) in Accounting and Finance',
  ],
  'Faculty of Business Studies|Department of Marketing and Management': [
    'BSc in Marketing',
    'BSc in Management',
  ],
  'Faculty of Technology|Department of Computer Science': [
    'BSc (Hons) in Computer Science',
    'BSc in Information Technology (IT)',
    'BSc in Software Engineering',
  ],
  'Faculty of Technology|Department of Engineering': [
    'BEng in Civil Engineering',
    'BEng in Electrical Engineering',
    'BEng in Mechanical Engineering',
  ],
  'Faculty of Technology|Department of Information Technology': [
    'BSc in Information Technology',
    'BSc (Hons) in Information Technology',
    'BSc in Network Engineering',
  ],
};

export const REQUEST_TYPES = [
  { value: 'letter', label: 'Letter Request' },
  { value: 'transcript', label: 'Transcript Request' },
  { value: 'course-issue', label: 'Course Issue' },
  { value: 'other', label: 'Other' },
] as const;

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
