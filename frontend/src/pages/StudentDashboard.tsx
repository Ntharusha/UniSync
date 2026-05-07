import { useState, useEffect } from 'react';
import { Search, Clock, Calendar as CalIcon, Filter, Layers, Paperclip, MessageSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User, Slot, AppointmentPriority, Appointment } from '../types';
import socket from '../socket';
import Chat from '../components/Chat';

export default function StudentDashboard({ user }: { user: User }) {
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<AppointmentPriority>('normal');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

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
      alert('Please select a time slot first');
      return;
    }
    if (!reason) {
      alert('Please provide a reason for the appointment');
      return;
    }
    setBookingInProgress(true); 
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
        alert('Emergency requests require a supporting document (medical certificate or proof).');
        setBookingInProgress(false);
        return;
      }

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
          reason,
          documents: uploadedDoc ? [uploadedDoc] : []
        })
      });

      if (res.ok) {
        alert('Appointment request submitted!');
        fetchSlots();
      } else if (res.status === 409) {
        const err = await res.json().catch(() => ({ error: 'Conflict' }));
        let msg = err.error || 'Conflict';
        if (err.alternatives && err.alternatives.length > 0) {
          msg += '\n\nSuggested alternatives:\n' + err.alternatives.map((a: any) => 
            `- ${format(new Date(a.start), 'HH:mm')} to ${format(new Date(a.end), 'HH:mm')}`
          ).join('\n');
        }
        alert(msg);
      } else {
        const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        alert(err.error || 'Booking failed');
      }
      } catch (err: any) {
      console.error('Booking Error:', err);
      alert('Failed to connect to the server! Your backend API might be offline or restarting. (Network Error)');
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
      if (res.ok) fetchMyAppointments();
    } catch (err) {
      console.error('Cancel error:', err);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"></div>
