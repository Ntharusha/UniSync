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
          ) :(
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-vau-maroon">30 MINS</span>
                    
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
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reason for Meeting</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 min-h-[120px] font-medium"
                placeholder="Briefly describe what you'd like to discuss..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Priority Level</label>
              <div className="grid grid-cols-1 gap-2">
                <PriorityBtn active={priority === 'normal'} color="green" label="Normal" sub="Routine inquiry" onClick={() => setPriority('normal')} />
                <PriorityBtn active={priority === 'academic_urgent'} color="amber" label="Urgent" sub="Thesis/Exam matter" onClick={() => setPriority('academic_urgent')} />
                <PriorityBtn active={priority === 'emergency'} color="red" label="Emergency" sub="Requires immediate action" onClick={() => setPriority('emergency')} />
              </div>
            </div>
