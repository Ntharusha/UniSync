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

            <div className="relative group">
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setDocuments(files);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-vau-maroon/50 transition-colors cursor-pointer">
                <Paperclip size={32} className="text-gray-400" />
                <div className="text-center">
                  <div className="font-bold text-gray-700">click to upload proof</div>
                  <div className="text-xs text-gray-500">(.pdf, .jpg)</div>
                </div>
              </div>
            </div>

            {documents.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {documents.slice(0, 5).map((f) => (
                  <span key={f.name} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600">
                    <Paperclip size={14} /> {f.name}
                  </span>
                ))}
                {documents.length > 5 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600">
                    +{documents.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Emergency Warning Alert */}
          {priority === 'emergency' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:col-span-2 flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl"
            >
              <AlertCircle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-bold text-amber-900">
                Emergency requests can override normal bookings if confirmed by the system.
              </div>
            </motion.div>
          )}

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-vau-maroon hover:bg-vau-maroon/90 disabled:bg-gray-400 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
              {!submitting && <Check size={20} />}
            </button>
          </div>

          <AnimatePresence>
            {confirmation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="md:col-span-2 bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">✅</div>
                <div className="font-bold">{confirmation}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Step 2/3: Lecturer + Slots (Appointment booking UI) */}
      {step >= 2 && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900">Book an Appointment</h3>
              <p className="text-sm text-gray-500 mt-1">Select lecturer and time slot to submit your meeting request.</p>
            </div>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Step {step}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1 space-y-2">
              <label className="text-sm font-bold text-gray-700">Select Lecturer</label>
              <select
                value={selectedLecturerId}
                onChange={(e) => setSelectedLecturerId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
              >
                <option value="">Select Lecturer...</option>
                {lecturers.map((l: any) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 space-y-2">
              <label className="text-sm font-bold text-gray-700">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
              />
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                onClick={() => {
                  // Move to step 3 where we fetch slots.
                  if (!selectedLecturerId) return alert('Please select a lecturer first');
                  setStep(3);
                }}
                className="w-full bg-vau-maroon text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-vau-maroon/90 transition-all"
              >
                Continue
              </button>
            </div>
          </div>

          {/* Step 3: Slots */}
          {step === 3 && (
            <div className="mt-6">
              {loadingSlots ? (
                <div className="py-10 text-center text-gray-400">Loading slots...</div>
              ) : slots.length === 0 ? (
                <div className="py-10 text-center text-gray-400">No available slots for this lecturer on this date.</div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {slots.map((slot: any) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        disabled={slot.status === 'teaching'}
                        className={`p-4 rounded-2xl border-2 transition-all text-left ${
                          selectedSlot?.start === slot.start
                            ? 'border-vau-maroon bg-vau-maroon/5'
                            : 'border-gray-100 bg-white hover:border-vau-maroon/30'
                        }`}
                      >
                        <div className="font-black">{format(new Date(slot.start), 'HH:mm')}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                          {Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000) === 60 ? '1 HOUR' : '30 MINS'}
                        </div>
                        {slot.status === 'teaching' && (
                          <div className="mt-2 text-[10px] font-bold text-red-600">LECTURE</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Show submission details ONLY after lecturer + slot selection */}
                  {selectedLecturerId && selectedSlot && (
                    <div className="mt-6 bg-gray-50 border border-gray-100 rounded-3xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="text-sm font-black text-gray-700">Submission Details</div>
                          <div className="text-xs font-bold text-gray-500 mt-1">
                            Choose your details below and submit the appointment request.
                          </div>
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-2xl bg-white border border-gray-200 text-gray-700">
                          {priority}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* lecturer summary */}
                        <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                          <div className="text-xs font-black uppercase tracking-widest text-gray-400">Lecturer</div>
                          <div className="mt-2 font-black text-gray-900">
                            {lecturers.find((l: any) => l._id === selectedLecturerId)?.name || '—'}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Department: {lecturers.find((l: any) => l._id === selectedLecturerId)?.department || '—'}
                          </div>
                        </div>

                        {/* time summary */}
                        <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                          <div className="text-xs font-black uppercase tracking-widest text-gray-400">Time Slot</div>
                          <div className="mt-2 font-black text-gray-900">
                            {format(new Date(selectedSlot.start), 'MMM d')} • {format(new Date(selectedSlot.start), 'HH:mm')}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Duration: {Math.round((new Date(selectedSlot.end).getTime() - new Date(selectedSlot.start).getTime()) / 60000)} minutes
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reason</label>
                          <textarea
                            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 min-h-[110px] font-medium"
                            value={reason}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-5 py-3 rounded-2xl font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          disabled={bookingInProgress}
                          onClick={async () => {
                            if (!selectedSlot) return alert('Please select a time slot first');
                            setBookingInProgress(true);
                            try {
                              const res = await fetch('/api/appointments', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({
                                  studentId: user._id,
                                  lecturerId: selectedLecturerId,
                                  requestedStart: selectedSlot.start,
                                  requestedEnd: selectedSlot.end,
                                  priority,
                                  reason,
                                  documents: []
                                })
                              });

                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                alert(err?.error || 'Submit request failed');
                                return;
                              }

                              alert('Appointment request submitted!');
                            } catch {
                              alert('Failed to connect to backend');
                            } finally {
                              setBookingInProgress(false);
                            }
                          }}
                          className="px-6 py-3 rounded-2xl font-black text-white bg-vau-maroon hover:bg-vau-maroon/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bookingInProgress ? 'Submitting...' : 'Submit Request'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* My Request Status */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-gray-900">My Request Status</h3>
            <p className="text-sm text-gray-500 mt-1">Track Pending, Approved, and Rejected requests.</p>
          </div>
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{user?.role || 'student'}</div>
        </div>

        <div className="mt-5">
          {loadingRequests ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No requests found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests
                .slice()
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                .map((r) => (
                  <motion.div
                    key={r._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-gray-900 truncate">{r.title}</div>
                        <div className="text-sm text-gray-500 font-bold mt-1">
                          {r.faculty} • {r.department || '—'}
                        </div>
                        <div className="text-xs text-gray-400 font-bold mt-2">Degree: {r.degreeProgram}</div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${statusPill(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 font-medium line-clamp-3">{r.description}</div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500 font-bold">
                        Submitted: {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '—'}
                      </div>
                      {r.documents && r.documents.length > 0 && (
                        <div className="flex items-center gap-2">
                          {r.documents.slice(0, 2).map((d) => (
                            <a
                              key={d.fileUrl}
                              href={d.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-black text-gray-600 hover:bg-gray-100"
                            >
                              <Download size={14} />
                              File
                            </a>
                          ))}
                          {r.documents.length > 2 && (
                            <span className="text-xs font-bold text-gray-500">+{r.documents.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

