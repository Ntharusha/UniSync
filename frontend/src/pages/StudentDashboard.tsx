import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Calendar as CalIcon, Filter, Layers, Paperclip, MessageSquare, Check, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User, Slot, AppointmentPriority, Appointment } from '../types';
import socket from '../socket';
import Chat from '../components/Chat';
import { useToast } from '../components/Toast';

const FACULTIES = [
  'Faculty of Applied Science',
  'Faculty of Business Studies',
  'Faculty of Technology'
] as const;

type Faculty = (typeof FACULTIES)[number];

const DEPARTMENTS_BY_FACULTY: Record<Faculty, string[]> = {
  'Faculty of Applied Science': ['Department of Physical Science', 'Department of Bio-science'],
  'Faculty of Business Studies': ['Department of Business Administration', 'Department of Accounting and Finance', 'Department of Marketing and Management'],
  'Faculty of Technology': ['Department of Computer Science', 'Department of Engineering', 'Department of Information Technology']
};

const DEGREE_PROGRAMS_BY_FACULTY_AND_DEPARTMENT: Record<string, string[]> = {
  'Faculty of Applied Science|Department of Physical Science': [
    'Bachelor of Science in Applied Mathematics and Computing',
    'Bachelor of Science Honours in Computer Science',
    'Bachelor of Science in Information Technology',
    'Bachelor of Science Honours in Information Technology'
  ],
  'Faculty of Applied Science|Department of Bio-science': [
    'Bachelor of Science Honours in Environmental Science'
  ],
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

const REQUEST_TYPES = [
  { value: 'letter', label: 'Letter Request' },
  { value: 'transcript', label: 'Transcript Request' },
  { value: 'course-issue', label: 'Course Issue' },
  { value: 'other', label: 'Other' }
] as const;

const parseAppointmentReason = (reasonStr: string) => {
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
        requestType: parsed.requestType || ''
      };
    }
  } catch (e) {}
  return {
    isAcademic: false,
    title: 'Appointment Request',
    description: reasonStr || '',
    faculty: '',
    department: '',
    degreeProgram: '',
    requestType: ''
  };
};

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

export default function StudentDashboard({ user }: { user: User }) {
  const { success, error: toastError, warning } = useToast();
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<AppointmentPriority>('normal');

  const [faculty, setFaculty] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [degreeProgram, setDegreeProgram] = useState<string>('');
  const [requestType, setRequestType] = useState<string>('letter');
  const [title, setTitle] = useState<string>('');
  const [confirmation, setConfirmation] = useState<string | null>(null);

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
    setDepartment('');
    setDegreeProgram('');
  }, [faculty]);

  useEffect(() => {
    setDegreeProgram('');
  }, [department]);

  const PriorityModeButtons = () => {
    const isNormal = priority === 'normal';
    const isUrgent = priority === 'academic_urgent';
    const isEmergency = priority === 'emergency';

    return (
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => setPriority('normal')}
          className={`p-4 rounded-2xl text-left border-2 transition-all ${
            isNormal
              ? 'border-transparent shadow-lg scale-[1.02] bg-green-500 text-white'
              : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
          }`}
        >
          <div className="font-black text-lg">Normal</div>
          <div className={`text-xs opacity-80 ${isNormal ? 'text-white/90' : 'text-gray-500'}`}>Routine inquiry</div>
        </button>

        <button
          type="button"
          onClick={() => setPriority('academic_urgent')}
          className={`p-4 rounded-2xl text-left border-2 transition-all ${
            isUrgent
              ? 'border-transparent shadow-lg scale-[1.02] bg-amber-500 text-white'
              : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
          }`}
        >
          <div className="font-black text-lg">Urgent</div>
          <div className={`text-xs opacity-80 ${isUrgent ? 'text-white/90' : 'text-gray-500'}`}>Thesis/Exam matter</div>
        </button>

        <button
          type="button"
          onClick={() => setPriority('emergency')}
          className={`p-4 rounded-2xl text-left border-2 transition-all ${
            isEmergency
              ? 'border-transparent shadow-lg scale-[1.02] bg-red-500 text-white'
              : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
          }`}
        >
          <div className="font-black text-lg">Emergency</div>
          <div className={`text-xs opacity-80 ${isEmergency ? 'text-white/90' : 'text-gray-500'}`}>Requires immediate action</div>
        </button>
      </div>
    );
  };

  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLecturers(data.filter((u: any) => u.role === 'lecturer'));
        }
      })
      .catch(console.error);
    
    fetchMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedLecturer) {
      fetchSlots();
    }
    
    const handleUpdate = (data: any) => {
      if (selectedLecturer?._id === data.lecturerId && selectedDate === data.date) {
        fetchSlots();
      }
      fetchMyAppointments();
    };

    socket.on('slot:updated', handleUpdate);
    return () => { socket.off('slot:updated', handleUpdate); };
  }, [selectedLecturer, selectedDate]);

  const fetchSlots = async () => {
    if (!selectedLecturer) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/availability/${selectedLecturer._id}?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const res = await fetch(`/api/appointments?studentId=${user._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyAppointments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      warning('No Slot Selected', 'Please select a time slot first.');
      return;
    }
    if (!faculty) {
      warning('Missing Faculty', 'Please select a Faculty.');
      return;
    }
    if (departmentOptions.length > 0 && !department) {
      warning('Missing Department', 'Please select a Department.');
      return;
    }
    if (!degreeProgram) {
      warning('Missing Degree Program', 'Please select a Degree Program.');
      return;
    }
    if (!title.trim()) {
      warning('Missing Title', 'Please enter a Request Title.');
      return;
    }
    if (!reason.trim()) {
      warning('Missing Description', 'Please enter a Request Description.');
      return;
    }

    setBookingInProgress(true);
    setConfirmation(null);
    try {
      let uploadedDoc = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        if (uploadRes.ok) {
          uploadedDoc = await uploadRes.json();
        }
      }

      if (priority === 'emergency' && !uploadedDoc) {
        toastError('Document Required', 'Emergency requests require a supporting document (medical certificate or proof).');
        setBookingInProgress(false);
        return;
      }

      // 1. Submit Academic Request
      const academicRes = await fetch('/api/academic-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studentId: user._id,
          faculty,
          department,
          degreeProgram,
          requestType,
          priority,
          title,
          description: reason,
          documents: uploadedDoc ? [{
            fileUrl: uploadedDoc.fileUrl,
            fileName: uploadedDoc.fileName,
            fileSizeMb: Number(uploadedDoc.fileSizeMb || 1),
            uploadedAt: new Date().toISOString()
          }] : []
        })
      });

      if (!academicRes.ok) {
        const err = await academicRes.json().catch(() => ({}));
        throw new Error(err.error || 'Academic request submission failed');
      }

      // 2. Book the Lecturer Appointment
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studentId: user._id,
          lecturerId: (selectedLecturer as any)._id,
          requestedStart: selectedSlot!.start,
          requestedEnd: selectedSlot!.end,
          priority,
          reason: JSON.stringify({
            title,
            description: reason,
            faculty,
            department,
            degreeProgram,
            requestType
          }),
          documents: uploadedDoc ? [uploadedDoc] : []
        })
      });

      if (res.ok) {
        setConfirmation('Request and appointment submitted successfully!');
        success('Submitted!', 'Your request and appointment have been submitted.');
        
        // Reset form fields
        setFaculty('');
        setDepartment('');
        setDegreeProgram('');
        setTitle('');
        setReason('');
        setSelectedFile(null);
        setPriority('normal');
        setSelectedSlot(null);

        fetchSlots();
        fetchMyAppointments();
      } else if (res.status === 409) {
        const err = await res.json().catch(() => ({ error: 'Conflict' }));
        let msg = err.error || 'Conflict';
        if (err.alternatives && err.alternatives.length > 0) {
          msg += '\n\nSuggested alternatives:\n' + err.alternatives.map((a: any) => 
            `- ${format(new Date(a.start), 'HH:mm')} to ${format(new Date(a.end), 'HH:mm')}`
          ).join('\n');
        }
        toastError('Time Slot Conflict', msg);
      } else {
        const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        toastError('Booking Failed', err.error || 'Booking failed');
      }
    } catch (err: any) {
      console.error('Booking Error:', err);
      toastError('Connection Error', err.message || 'Failed to connect to the server!');
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment request?')) return;
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'cancelled', reason: 'Cancelled by student' })
      });
      if (res.ok) {
        fetchMyAppointments();
        fetchSlots();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleAcceptReschedule = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        fetchMyAppointments();
        fetchSlots();
      }
    } catch (err) {
      console.error('Accept reschedule error:', err);
    }
  };

  const handleDeclineReschedule = async (appointmentId: string, reason: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'cancelled', reason: reason || 'Declined by student' })
      });
      if (res.ok) {
        fetchMyAppointments();
        fetchSlots();
        setDecliningId(null);
        setDeclineReason('');
      }
    } catch (err) {
      console.error('Decline reschedule error:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search & Lecturer Select */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Find a Lecturer</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
              onChange={(e) => {
                const lecturer = lecturers.find(l => l._id === e.target.value);
                setSelectedLecturer(lecturer || null);
              }}
              value={selectedLecturer?._id || ''}
            >
              <option value="" disabled>Select a lecturer...</option>
              {lecturers.map(l => (
                <option key={l._id} value={l._id}>{l.name} ({l.department})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Select Date</label>
          <input 
            type="date" 
            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Slot Picker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">Available Slots</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-white border border-gray-300 rounded-full"></div> Free
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div> Teaching
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div> Booked
              </span>
            </div>
          </div>

          {!selectedLecturer ? (
            <div className="aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <Layers size={48} className="mb-4 opacity-20" />
              <p className="text-xl font-medium text-gray-500">Select a lecturer to see available time slots</p>
            </div>
          ) : loadingSlots ? (
            <div className="aspect-video bg-white rounded-3xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-vau-maroon border-t-transparent"></div>
            </div>
          ) : slots.length === 0 ? (
            <div className="aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <CalIcon size={48} className="mb-4 opacity-20 text-vau-maroon" />
              <p className="text-xl font-bold text-gray-700">No available slots on this day</p>
              <p className="text-sm text-gray-500 mt-1">This lecturer might not have office hours scheduled or may be fully booked. Try selecting another date on the calendar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {slots.map((slot, i) => (
                  <motion.button
                    key={slot.start}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    disabled={slot.status === 'teaching' || (slot.status === 'priority_booked' && priority !== 'emergency')}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all relative overflow-hidden group ${
                      slot.status === 'free' ? (selectedSlot?.start === slot.start ? 'bg-vau-maroon/5 border-vau-maroon ring-4 ring-vau-maroon/20 scale-105 shadow-md' : 'bg-white border-gray-100 hover:border-vau-maroon hover:shadow-lg scale-100 hover:scale-105') :
                      slot.status === 'teaching' ? 'bg-red-50 border-red-100 cursor-not-allowed grayscale' :
                      slot.status === 'normal_booked' ? 'bg-green-50 border-green-100 hover:border-vau-gold' :
                      'bg-orange-50 border-orange-100 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Clock size={20} className={slot.status === 'teaching' ? 'text-red-400' : 'text-gray-400'} />
                    <span className="font-black text-gray-900">{format(new Date(slot.start), 'HH:mm')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-vau-maroon">
                      {Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000) === 60 ? '1 HOUR' : '30 MINS'}
                    </span>
                    
                    {slot.status === 'teaching' && (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center rotate-12 -translate-y-4">
                        <span className="text-[8px] font-black tracking-widest text-red-600 bg-white px-2 py-0.5 rounded shadow-sm">LECTURE</span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Booking Sidebar */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900">Request Details</h2>
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            
            {/* Student Information Section */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Student Information</span>
              <div className="grid grid-cols-1 gap-1 text-xs font-bold text-gray-700">
                <div>Student Name: <span className="font-medium text-gray-500">{user.name}</span></div>
                <div>Student ID: <span className="font-medium text-gray-500">{user.regNumber || user._id}</span></div>
                <div>Email Address: <span className="font-medium text-gray-500">{user.email}</span></div>
              </div>
            </div>

            {/* Faculty Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Faculty Selection</label>
              <select
                value={faculty}
                onChange={e => setFaculty(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-vau-maroon/20 text-sm font-medium shadow-sm"
              >
                <option value="">Select Faculty...</option>
                {FACULTIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Department Selection */}
            {faculty && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department Selection</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-vau-maroon/20 text-sm font-medium shadow-sm"
                >
                  <option value="">Select Department...</option>
                  {departmentOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Degree Program Selection */}
            {faculty && department && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Degree Program Selection</label>
                <select
                  value={degreeProgram}
                  onChange={e => setDegreeProgram(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-vau-maroon/20 text-sm font-medium shadow-sm"
                >
                  <option value="">Select Degree Program...</option>
                  {degreeProgramOptions.map(dp => (
                    <option key={dp} value={dp}>{dp}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Request Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Request Type</label>
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-vau-maroon/20 text-sm font-medium shadow-sm"
              >
                {REQUEST_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            {/* Request Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Request Title</label>
              <input
                type="text"
                placeholder="Request title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-vau-maroon/20 text-sm font-medium shadow-sm"
              />
            </div>

            {/* Request Description */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Request Description</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 min-h-[120px] font-medium"
                placeholder="Briefly describe your request details..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Priority Level</label>
              <PriorityModeButtons />
            </div>

            {/* Supporting Document Upload (Optional) */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Supporting Document {priority === 'emergency' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative group">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <div className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                  selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-200 group-hover:border-vau-maroon'
                }`}>
                  <Paperclip className={selectedFile ? 'text-green-500' : 'text-gray-400'} size={24} />
                  <span className="text-xs font-bold text-gray-500 text-center">
                    {selectedFile ? selectedFile.name : 'Click to upload proof (.pdf, .jpg)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-vau-gold/10 rounded-2xl">
                <Filter className="text-vau-maroon" size={20} />
                <p className="text-[10px] font-bold text-vau-maroon leading-tight">Emergency requests can override normal bookings if confirmed by the system.</p>
              </div>
              
              <AnimatePresence>
                {confirmation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">✅</div>
                    <div>{confirmation}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={handleBook}
                disabled={!selectedSlot || bookingInProgress}
                className="w-full flex items-center justify-center p-5 bg-vau-maroon text-white rounded-2xl hover:bg-vau-maroon/90 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed shadow-lg shadow-vau-maroon/20"
              >
                <span className="text-lg font-black mr-2">
                  {bookingInProgress ? 'Submitting...' : 'Submit Request'}
                </span>
                {!bookingInProgress && <Check size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* My Appointments Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">My Appointments & Requests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {myAppointments.length === 0 ? (
              <div key="empty" className="col-span-full py-12 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                <CalIcon size={40} className="mb-2 opacity-20" />
                <p className="font-medium italic">You haven't made any requests or appointments yet.</p>
              </div>
            ) : (
              myAppointments.map((appt) => {
                const parsed = parseAppointmentReason(appt.reason);
                return (
                  <motion.div 
                    key={appt._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col gap-4"
                  >
                    {/* Status, Priority & Type Badges */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 bg-vau-gold/20 text-vau-maroon rounded-full flex items-center justify-center font-bold shrink-0">
                          {(appt.lecturerId as User)?.name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{(appt.lecturerId as User)?.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Lecturer</p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {(appt.lecturerId as User)?.email} {((appt.lecturerId as User)?.department && <span>• {(appt.lecturerId as User)?.department}</span>)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                          appt.status === 'approved' ? 'bg-green-100 text-green-600' :
                          appt.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          appt.status === 'rescheduled' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {appt.status}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                          appt.priority === 'emergency' ? 'bg-red-100 text-red-600' :
                          appt.priority === 'academic_urgent' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {appt.priority}
                        </span>
                      </div>
                    </div>

                    {/* Academic Request Specific Info */}
                    <div className="space-y-2">
                      {parsed.isAcademic ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-vau-maroon/10 text-vau-maroon rounded">
                              {parsed.requestType.replace('-', ' ')}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">• Academic Request</span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm truncate">{parsed.title}</h4>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider space-y-0.5">
                            <div>Faculty: <span className="font-medium text-gray-600">{parsed.faculty}</span></div>
                            <div>Dept: <span className="font-medium text-gray-600">{parsed.department}</span></div>
                            <div>Program: <span className="font-medium text-gray-600">{parsed.degreeProgram}</span></div>
                          </div>
                          <p className="text-xs text-gray-600 font-medium line-clamp-3 bg-gray-50 p-3 rounded-2xl border border-gray-50">
                            {parsed.description}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">General Meeting</div>
                          <p className="text-xs text-gray-600 font-medium line-clamp-3 bg-gray-50 p-3 rounded-2xl border border-gray-50">
                            {parsed.description}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Student Profile Info Banner */}
                    <div className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] space-y-0.5 text-gray-600">
                      <div className="font-black text-gray-400 uppercase tracking-widest text-[9px] mb-1">Student Details</div>
                      <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">Name:</span> <span className="font-semibold text-gray-900">{user.name}</span></div>
                      <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">ID:</span> <span className="font-semibold text-gray-900">{user.regNumber || user._id}</span></div>
                      <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">Email:</span> <span className="font-semibold text-gray-900">{user.email}</span></div>
                    </div>

                    {/* Date and Time slots */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-gray-50 rounded-2xl flex flex-col items-center justify-center">
                         <CalIcon size={14} className="text-gray-400 mb-1" />
                         <span className="text-xs font-black text-gray-900">{format(new Date(appt.requestedStart), 'MMM d')}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-2xl flex flex-col items-center justify-center">
                         <Clock size={14} className="text-gray-400 mb-1" />
                         <span className="text-xs font-black text-gray-900">{format(new Date(appt.requestedStart), 'HH:mm')}</span>
                      </div>
                    </div>

                    {/* Proposed Rescheduled Slot Display */}
                    {appt.status === 'rescheduled' && appt.proposedStart && (
                      <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100/50 space-y-2 text-xs">
                        <span className="font-black text-indigo-800 uppercase tracking-widest text-[9px] block">Proposed Time Slot:</span>
                        <p className="font-bold text-indigo-900">
                          {format(new Date(appt.proposedStart), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-indigo-800 font-bold">
                          {format(new Date(appt.proposedStart), 'HH:mm')} — {format(new Date(appt.proposedEnd!), 'HH:mm')}
                        </p>
                        {(() => {
                          const latestReschedule = appt.statusHistory 
                            ? [...appt.statusHistory].reverse().find((h: any) => h.status === 'rescheduled') 
                            : null;
                          return latestReschedule?.reason ? (
                            <div className="text-indigo-700 font-semibold bg-white/60 p-2 rounded-xl border border-indigo-100/30">
                              <span className="font-black text-[8px] uppercase tracking-wider block text-indigo-500 mb-0.5">Lecturer's Reason:</span>
                              "{latestReschedule.reason}"
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Documents Link */}
                    {appt.documents && appt.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {appt.documents.map((doc: any, dIdx: number) => (
                          <a 
                            key={dIdx}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
                          >
                            <Paperclip size={12} /> View Document
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Chat & Actions */}
                    <div className="flex flex-col gap-2">
                      {appt.status === 'rescheduled' ? (
                        decliningId === appt._id ? (
                          <div className="w-full space-y-2 mt-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Decline Reason (Required)</label>
                            <textarea 
                              value={declineReason} 
                              onChange={(e) => setDeclineReason(e.target.value)} 
                              placeholder="Please explain why you cannot make this slot..." 
                              className="w-full border border-gray-200 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 bg-white" 
                              rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setDecliningId(null);
                                  setDeclineReason('');
                                }} 
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 font-bold text-xs hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                disabled={!declineReason.trim()}
                                onClick={() => handleDeclineReschedule(appt._id, declineReason)} 
                                className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-600 disabled:opacity-50 transition-colors"
                              >
                                Decline & Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => handleAcceptReschedule(appt._id)}
                              className="flex-1 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-600 transition-colors h-10 shadow-sm"
                            >
                              Accept Slot
                            </button>
                            <button 
                              onClick={() => setDecliningId(appt._id)}
                              className="flex-1 border border-red-200 text-red-500 bg-red-50/50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 hover:border-red-300 transition-colors h-10"
                            >
                              Decline & Cancel
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveChat(appt._id)}
                            className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                              activeChat === appt._id ? 'bg-vau-maroon text-vau-gold' : 'bg-gray-100 text-gray-600 hover:bg-vau-maroon hover:text-white'
                            }`}
                          >
                            <MessageSquare size={16} /> Chat
                          </button>
                          {appt.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(appt._id)}
                              className="h-10 px-4 rounded-xl font-bold text-xs text-red-500 bg-red-50 hover:bg-red-100 transition-all">
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                      
                      {appt.status === 'rescheduled' && (
                        <button 
                          onClick={() => setActiveChat(appt._id)}
                          className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            activeChat === appt._id ? 'bg-vau-maroon text-vau-gold' : 'bg-gray-100 text-gray-600 hover:bg-vau-maroon hover:text-white'
                          }`}
                        >
                          <MessageSquare size={16} /> Chat
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {activeChat && (
          <Chat 
            appointmentId={activeChat} 
            currentUser={user} 
            onClose={() => setActiveChat(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityBtn({ active, color, label, sub, onClick }: { active: boolean, color: string, label: string, sub: string, onClick: () => void }) {
  const colorMap: any = {
    green: active ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700',
    amber: active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
    red: active ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700',
  };
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl text-left border-2 transition-all ${
        active ? 'border-transparent shadow-lg scale-[1.02]' : 'border-gray-50 hover:border-gray-200'
      } ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}
    >
      <div className="font-black text-lg">{label}</div>
      <div className={`text-xs opacity-80 ${active ? 'text-white' : 'text-gray-500'}`}>{sub}</div>
    </button>
  );
}
