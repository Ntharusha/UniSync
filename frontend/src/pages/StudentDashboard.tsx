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