import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Paperclip, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

import type { AcademicRequest, AcademicRequestPriority, AcademicRequestRequestType, AcademicRequestStatus } from '../types/requests';

const FACULTIES = [
  'Faculty of Applied Science',
  'Faculty of Business Studies',
  'Faculty of Technology'
] as const;

type Faculty = (typeof FACULTIES)[number];

const DEPARTMENTS_BY_FACULTY: Record<Faculty, string[]> = {
  'Faculty of Applied Science': ['Department of Physical Science', 'Department of Biological Science'],
  'Faculty of Business Studies': ['Department of Business Administration', 'Department of Accounting and Finance', 'Department of Marketing and Management'],
  'Faculty of Technology': ['Department of Computer Science', 'Department of Engineering', 'Department of Information Technology']
};

type Department = string;

const DEGREE_PROGRAMS_BY_FACULTY_AND_DEPARTMENT: Record<string, string[]> = {
  // Faculty of Applied Science
  'Faculty of Applied Science|Department of Physical Science': [
    'BSc in Applied Mathematics and Computing',
    'BSc (Hons) in Computer Science',
    'BSc in Information Technology (IT)'
  ],
  'Faculty of Applied Science|Department of Biological Science': [
    'BSc (Hons) in Environmental Science'
  ],
  
  // Faculty of Business Studies
  'Faculty of Business Studies|Department of Business Administration': [
    'BBA in Business Administration',
    'BBA (Hons) in Business Administration'
  ],
  'Faculty of Business Studies|Department of Accounting and Finance': [
    'BSc in Accounting and Finance',
    'BSc (Hons) in Accounting and Finance'
  ],
  'Faculty of Business Studies|Department of Marketing and Management': [
    'BSc in Marketing',
    'BSc in Management'
  ],
  
  // Faculty of Technology
  'Faculty of Technology|Department of Computer Science': [
    'BSc (Hons) in Computer Science',
    'BSc in Information Technology (IT)',
    'BSc in Software Engineering'
  ],
  'Faculty of Technology|Department of Engineering': [
    'BEng in Civil Engineering',
    'BEng in Electrical Engineering',
    'BEng in Mechanical Engineering'
  ],
  'Faculty of Technology|Department of Information Technology': [
    'BSc in Information Technology',
    'BSc (Hons) in Information Technology',
    'BSc in Network Engineering'
  ]
};

const REQUEST_TYPES: { value: AcademicRequestRequestType; label: string }[] = [
  { value: 'letter', label: 'Letter Request' },
  { value: 'transcript', label: 'Transcript Request' },
  { value: 'course-issue', label: 'Course Issue' },
  { value: 'other', label: 'Other' }
];

export default function StudentRequests({ user }: { user: any }) {
  // =====================
  // Step 1: Academic Request
  // =====================
  const [faculty, setFaculty] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [degreeProgram, setDegreeProgram] = useState<string>('');

  const [priority, setPriority] = useState<AcademicRequestPriority>('normal');

  const [requestType, setRequestType] = useState<AcademicRequestRequestType>('letter');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // =====================
  // Step 2/3: Lecturer + Slots
  // =====================
  const getDefaultDate = (): string => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) { // Sunday
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return format(tomorrow, 'yyyy-MM-dd');
    } else if (day === 6) { // Saturday
      const monday = new Date(today);
      monday.setDate(today.getDate() + 2);
      return format(monday, 'yyyy-MM-dd');
    }
    return format(today, 'yyyy-MM-dd');
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate());
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  // Reuse academic request description as meeting reason
  const reason = description;

  // Used as `priority` in appointment booking payload
  // (kept for readability; same state as `priority` above)

  // =====================

  // Step 4: Submit Appointment
  // =====================
  const [bookingInProgress, setBookingInProgress] = useState(false);


  const departmentOptions = useMemo(() => {
    if (!faculty) return [];
    return DEPARTMENTS_BY_FACULTY[faculty as Faculty] || [];
  }, [faculty]);

  const degreeProgramOptions = useMemo(() => {
    if (!faculty || !department) return [];
    const key = `${faculty}|${department}`;
    return DEGREE_PROGRAMS_BY_FACULTY_AND_DEPARTMENT[key] || [];
  }, [faculty, department]);

  useEffect(() => {
    // Reset downstream selections when parent changes
    setDepartment('');
    setDegreeProgram('');
  }, [faculty]);

  useEffect(() => {
    // Reset degree when department changes
    setDegreeProgram('');
  }, [department]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`/api/academic-requests?studentId=${user._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }

    return uploadRes.json();
  };

  useEffect(() => {
    if (step !== 2) return;

    // Load lecturers for slot selection
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLecturers(data.filter((u: any) => u.role === 'lecturer'));
        }
      })
      .catch(console.error);
  }, [step]);

  useEffect(() => {
    // Fetch slots when we have a lecturer + date.
    if (step !== 3) return;
    if (!selectedLecturerId || !selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await fetch(`/api/availability/${selectedLecturerId}?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setSlots(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [step, selectedLecturerId, selectedDate]);

  const handleSubmit = async () => {
    if (!faculty) return alert('Please select a Faculty');

    if (departmentOptions.length > 0 && !department) return alert('Please select a Department');
    if (!degreeProgram) return alert('Please select a Degree Program');
    if (!title.trim()) return alert('Please enter Request Title');
    if (!description.trim()) return alert('Please enter Request Description');

    setSubmitting(true);
    setConfirmation(null);

    try {
      const uploadedDocs = [] as any[];
      for (const f of documents) {
        const doc = await uploadDocument(f);
        uploadedDocs.push(doc);
      }

      const res = await fetch('/api/academic-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
          body: JSON.stringify({
            studentId: user._id,
          faculty,
          department,
          degreeProgram,
          requestType,
          priority,
          title,
          description,
          documents: uploadedDocs.map((d) => ({
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileSizeMb: Number(d.fileSizeMb),
            uploadedAt: new Date().toISOString()
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request submission failed');
      }

      setConfirmation('Request submitted successfully.');

      // Keep the description (reason) until appointment is booked.
      // Reset only academic selectors.
      setFaculty('');
      setDepartment('');
      setDegreeProgram('');
      setRequestType('letter');
      setPriority('normal');
      setTitle('');

      await fetchRequests();

      // Proceed to lecturer + slots selection
      setStep(2);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusPill = (s: AcademicRequestStatus) => {
    const map: Record<AcademicRequestStatus, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return map[s];
  };

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Academic Request Submission</h2>
            <p className="text-sm text-gray-500 mt-1">Submit your request with faculty/department and supporting documents.</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Student</div>
            <div className="font-bold text-gray-900">{user?.name || '—'}</div>
            <div className="text-sm text-gray-500">{user?.regNumber || user?.email || ''}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Faculty */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Faculty</label>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
            >
              <option value="">Select Faculty</option>
              {FACULTIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Department</label>
            {departmentOptions.length === 0 ? (
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="(Not specified for this faculty)"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
              />
            ) : (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
              >
                <option value="">Select Department</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Degree Program */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Degree Program</label>
            <select
              value={degreeProgram}
              onChange={(e) => setDegreeProgram(e.target.value)}
              disabled={!degreeProgramOptions.length}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium disabled:opacity-50"
            >
              <option value="">{degreeProgramOptions.length ? 'Select Degree Program' : 'Select Faculty/Department first'}</option>
              {degreeProgramOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Request details (add required fields under request details) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Student Name</label>
            <input
              value={user?.name || ''}
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-lg font-medium text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Student ID</label>
            <input
              value={user?._id || ''}
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-lg font-medium text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Email Address</label>
            <input
              value={user?.email || ''}
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-lg font-medium text-gray-900"
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Priority Level</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Normal Priority Card */}
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  priority === 'normal'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="font-black text-gray-900">Normal</div>
                <div className="text-xs text-gray-500">Routine inquiry</div>
              </button>

              {/* Urgent Priority Card */}
              <button
                type="button"
                onClick={() => setPriority('academic_urgent')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  priority === 'academic_urgent'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 bg-white hover:border-amber-300'
                }`}
              >
                <div className="font-black text-gray-900">Urgent</div>
                <div className="text-xs text-gray-500">Thesis/Exam matter</div>
              </button>

              {/* Emergency Priority Card */}
              <button
                type="button"
                onClick={() => setPriority('emergency')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  priority === 'emergency'
                    ? 'bg-red-500 border-red-600 text-white'
                    : 'border-gray-200 bg-white hover:border-red-300'
                }`}
              >
                <div className={`font-black ${priority === 'emergency' ? 'text-white' : 'text-gray-900'}`}>Emergency</div>
                <div className={`text-xs ${priority === 'emergency' ? 'text-red-100' : 'text-gray-500'}`}>Requires immediate action</div>
              </button>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Request Type</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as AcademicRequestRequestType)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Request Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Request Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your request"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium min-h-[130px]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Supporting Document <span className="text-red-500">•</span></label>
