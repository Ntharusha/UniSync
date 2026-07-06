import { useState, useEffect } from 'react';
import { Check, X, Clock, User, Calendar as CalIcon, MessageSquare, AlertCircle, Paperclip, Download, Trash, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User as UserType, Appointment, AvailabilityRule } from '../types';
import socket from '../socket';
import Chat from '../components/Chat';

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

export default function LecturerDashboard({ user }: { user: UserType }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [previewBlocks, setPreviewBlocks] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AvailabilityRule>>({ 
    type: 'office_hours', 
    dayOfWeek: 1, 
    startTime: '08:00', 
    endTime: '17:00' 
  });
  const [activeChat, setActiveChat] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
    fetchRules();

    const handleUpdate = (data: any) => {
      if (user._id === data.lecturerId) {
        fetchAppointments();
        fetchRules();
      }
    };

    socket.on('slot:updated', handleUpdate);
    return () => { socket.off('slot:updated', handleUpdate); };
  }, [user._id]);

  useEffect(() => {
    if (showPreview && previewBlocks.length > 0) {
      fetchConflicts();
    }
  }, [showPreview, previewBlocks]);

  const fetchRules = async () => {
    try {
      const res = await fetch(`/api/availability/rules/${user._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRule = async () => {
    try {
      const res = await fetch('/api/availability/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...newRule, lecturerId: user._id })
      });
      if (res.ok) {
        fetchRules();
        setShowRulesModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/availability/rules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const apptRes = await fetch(`/api/appointments?lecturerId=${user._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await apptRes.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await fetch('/api/timetable/conflicts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          lecturerId: user._id,
          blocks: previewBlocks
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConflicts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async (id: string, proposedStart: string, proposedEnd: string, reason: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'rescheduled', proposedStart, proposedEnd, reason })
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimetableUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/timetable/parse', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewBlocks(data);
        setShowPreview(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [activationResult, setActivationResult] = useState<{ count: number } | null>(null);

  const handleActivate = async () => {
    setIsActivating(true);
    setActivationResult(null);
    try {
      const res = await fetch('/api/timetable/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          lecturerId: user._id,
          blocks: previewBlocks
        })
      });
      if (res.ok) {
        const result = await res.json();
        setActivationResult({ count: result.conflictsFound });
        setTimeout(() => {
          setShowPreview(false);
          setActivationResult(null);
          fetchAppointments();
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActivating(false);
    }
  };

  const filtered = filterPriority === 'all' 
    ? appointments 
    : appointments.filter(a => a.priority === filterPriority);

  const pending = filtered.filter((a: Appointment) => a.status === 'pending');
  const upcoming = filtered.filter((a: Appointment) => a.status === 'approved');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const newRequests = filtered.filter((a: Appointment) => 
    a.status === 'pending' && a.createdAt && (new Date(a.createdAt).getTime() >= startOfDay)
  );
  const pendingRequests = filtered.filter((a: Appointment) => 
    a.status === 'pending' && (!a.createdAt || new Date(a.createdAt).getTime() < startOfDay)
  );
  const approvedRequests = filtered.filter((a: Appointment) => a.status === 'approved' && new Date(a.requestedEnd).getTime() > now.getTime());
  const completedRequests = filtered.filter((a: Appointment) => a.status === 'approved' && new Date(a.requestedEnd).getTime() <= now.getTime());

  return (
    <div className="space-y-10">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <StatsCard label="New Requests" value={newRequests.length} color="indigo" />
        <StatsCard label="Pending Requests" value={pendingRequests.length} color="amber" />
        <StatsCard label="Approved Requests" value={approvedRequests.length} color="blue" />
        <StatsCard label="Completed Requests" value={completedRequests.length} color="green" />
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Filter</span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setFilterPriority('all')}
            className={`p-4 rounded-2xl text-left border-2 transition-all ${
              filterPriority === 'all'
                ? 'border-transparent shadow-lg scale-[1.02] bg-vau-maroon text-white'
                : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="font-black">All</div>
            <div className={`text-xs opacity-80 ${filterPriority === 'all' ? 'text-white/90' : 'text-gray-500'}`}>Everything</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterPriority('normal')}
            className={`p-4 rounded-2xl text-left border-2 transition-all ${
              filterPriority === 'normal'
                ? 'border-transparent shadow-lg scale-[1.02] bg-green-500 text-white'
                : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="font-black">Normal</div>
            <div className={`text-xs opacity-80 ${filterPriority === 'normal' ? 'text-white/90' : 'text-gray-500'}`}>Routine</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterPriority('academic_urgent')}
            className={`p-4 rounded-2xl text-left border-2 transition-all ${
              filterPriority === 'academic_urgent'
                ? 'border-transparent shadow-lg scale-[1.02] bg-amber-500 text-white'
                : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="font-black">Urgent</div>
            <div className={`text-xs opacity-80 ${filterPriority === 'academic_urgent' ? 'text-white/90' : 'text-gray-500'}`}>Academic</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterPriority('emergency')}
            className={`p-4 rounded-2xl text-left border-2 transition-all ${
              filterPriority === 'emergency'
                ? 'border-transparent shadow-lg scale-[1.02] bg-red-500 text-white'
                : 'border-gray-50 hover:border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="font-black">Emergency</div>
            <div className={`text-xs opacity-80 ${filterPriority === 'emergency' ? 'text-white/90' : 'text-gray-500'}`}>Immediate</div>
          </button>
        </div>
      </div>

      {/* ═══ NEW REQUESTS (Today's pending) ═══ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse"></div>
          <h2 className="text-xl font-black text-gray-900">New Requests</h2>
          <span className="text-xs font-black bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full">{newRequests.length}</span>
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {newRequests.length === 0 ? (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-400">
                <Check size={32} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">No new requests today.</p>
              </motion.div>
            ) : newRequests.map((appt) => (
              <AppointmentCard key={appt._id} appt={appt} onApprove={() => handleStatus(appt._id, 'approved')} onReject={() => handleStatus(appt._id, 'rejected')} onReschedule={handleReschedule} onChat={() => setActiveChat(appt._id)} activeChatId={activeChat} accent="indigo" />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ═══ 3-Column Grid: Pending / Approved / Completed ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* PENDING REQUESTS (older) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <h2 className="text-lg font-black text-gray-900">Pending</h2>
            <span className="text-xs font-black bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full">{pendingRequests.length}</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {pendingRequests.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-400">
                  <Clock size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-sm">No older pending requests.</p>
                </motion.div>
              ) : pendingRequests.map((appt) => (
                <AppointmentCard key={appt._id} appt={appt} onApprove={() => handleStatus(appt._id, 'approved')} onReject={() => handleStatus(appt._id, 'rejected')} onReschedule={handleReschedule} onChat={() => setActiveChat(appt._id)} activeChatId={activeChat} accent="amber" compact />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* APPROVED REQUESTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <h2 className="text-lg font-black text-gray-900">Approved</h2>
            <span className="text-xs font-black bg-blue-100 text-blue-600 px-2.5 py-0.5 rounded-full">{approvedRequests.length}</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {approvedRequests.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-400">
                  <CalIcon size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-sm">No upcoming approved.</p>
                </motion.div>
              ) : approvedRequests.map((appt) => (
                <AppointmentCard key={appt._id} appt={appt} onChat={() => setActiveChat(appt._id)} activeChatId={activeChat} accent="blue" compact />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* COMPLETED REQUESTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <h2 className="text-lg font-black text-gray-900">Completed</h2>
            <span className="text-xs font-black bg-green-100 text-green-600 px-2.5 py-0.5 rounded-full">{completedRequests.length}</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {completedRequests.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-400">
                  <Check size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-sm">No completed appointments.</p>
                </motion.div>
              ) : completedRequests.map((appt) => (
                <AppointmentCard key={appt._id} appt={appt} onChat={() => setActiveChat(appt._id)} activeChatId={activeChat} accent="green" compact />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* ═══ Chat Panel ═══ */}
      <AnimatePresence>
        {activeChat && (
          <Chat appointmentId={activeChat} currentUser={user} onClose={() => setActiveChat(null)} />
        )}
      </AnimatePresence>

      {/* ═══ TODAY'S SCHEDULE + SETTINGS ═══ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Today's Schedule</h2>
          <div className="flex gap-4 items-center">
            <button onClick={() => setShowRulesModal(true)} className="text-sm font-bold text-gray-500 hover:text-vau-maroon transition-colors">Settings</button>
            <label className="text-sm font-bold text-vau-maroon hover:underline cursor-pointer">
              Upload Timetable
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleTimetableUpload(e.target.files[0])} />
            </label>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</div>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-50 overflow-hidden">
          <div className="p-8 space-y-6">
            {upcoming.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <CalIcon size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-medium italic">No appointments for today.</p>
              </div>
            ) : upcoming.map((appt, i) => (
              <div key={appt._id} className="relative flex gap-6 pb-6 last:pb-0 group">
                {i !== upcoming.length - 1 && <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-100"></div>}
                <div className="h-6 w-6 rounded-full bg-blue-500 border-4 border-white shadow-sm z-10 mt-1 shrink-0"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-black text-gray-900">{format(new Date(appt.requestedStart), 'HH:mm')} — {format(new Date(appt.requestedEnd), 'HH:mm')}</div>
                    <span className="text-xs font-bold text-gray-400">
                      {Math.round((new Date(appt.requestedEnd).getTime() - new Date(appt.requestedStart).getTime()) / 60000)} MINS
                    </span>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-blue-900">{(appt.studentId as UserType)?.name}</p>
                      <p className="text-xs text-blue-600 font-bold">{(appt.studentId as UserType)?.regNumber}</p>
                    </div>
                    <AlertCircle size={20} className="text-blue-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 p-6 flex items-center justify-between border-t border-gray-100">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Office Hours</span>
            <span className="text-sm font-bold text-gray-700 underline cursor-pointer">
              {rules.filter(r => r.type === 'office_hours' && r.dayOfWeek === new Date().getDay()).map(r => `${r.startTime} - ${r.endTime}`).join(', ') || 'Not Set'}
            </span>
          </div>
        </div>
      </section>

      {/* Availability Rules Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity:0, scale:0.95 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
                <div>
                  <h3 className="text-2xl font-black">Availability Settings</h3>
                  <p className="opacity-70 font-medium">Configure your office hours and blackout periods.</p>
                </div>
                <button onClick={() => setShowRulesModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                {/* Current Rules */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Rules</h4>
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule._id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100 hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${
                            rule.type === 'office_hours' ? 'bg-green-100 text-green-600' : 
                            rule.type === 'blackout' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 capitalize">{rule.type.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500 font-medium">
                              {rule.dayOfWeek !== undefined ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][rule.dayOfWeek] : rule.date ? format(new Date(rule.date), 'MMM d, yyyy') : 'All'} • {rule.startTime} - {rule.endTime}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteRule(rule._id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    ))}
                    {rules.length === 0 && <p className="text-center py-8 text-gray-400 font-medium italic">No rules configured.</p>}
                  </div>
                </div>