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

                {/* Add Rule Form */}
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Plus size={18} className="text-vau-maroon" /> Add New Rule
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Type</label>
                      <select 
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-sm shadow-sm"
                        value={newRule.type}
                        onChange={(e) => setNewRule({...newRule, type: e.target.value as any})}
                      >
                        <option value="office_hours">Office Hours</option>
                        <option value="lectures">Lectures</option>
                        <option value="blackout">Blackout Period</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Day</label>
                      <select 
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-sm shadow-sm"
                        value={newRule.dayOfWeek}
                        onChange={(e) => setNewRule({...newRule, dayOfWeek: parseInt(e.target.value)})}
                      >
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Start Time</label>
                      <input 
                        type="time"
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-sm shadow-sm"
                        value={newRule.startTime}
                        onChange={(e) => setNewRule({...newRule, startTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">End Time</label>
                      <input 
                        type="time"
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-sm shadow-sm"
                        value={newRule.endTime}
                        onChange={(e) => setNewRule({...newRule, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddRule}
                    className="w-full bg-vau-maroon text-white py-3 rounded-xl font-black text-sm shadow-lg hover:bg-gray-800 transition-all mt-2"
                  >
                    Add Availability Rule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timetable Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity:0, scale:0.95 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-vau-maroon text-white">
                <div>
                  <h3 className="text-2xl font-black">Verify Timetable</h3>
                  <p className="opacity-70 font-medium">Please review the parsed blocks before activating.</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">New Teaching Blocks</h4>
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-100">
                        <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Day</th>
                        <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Time</th>
                        <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Course</th>
                        <th className="py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewBlocks.map((b, i) => (
                        <tr key={i}>
                          <td className="py-3 font-bold text-gray-900">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][b.dayOfWeek]}</td>
                          <td className="py-3 text-sm font-medium text-gray-600">{b.startTime} - {b.endTime}</td>
                          <td className="py-3 font-bold text-vau-maroon">{b.courseName}</td>
                          <td className="py-3 text-sm font-medium text-gray-600">{b.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {conflicts.length > 0 && (
                  <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                    <h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertCircle size={18} /> Conflicting Appointments ({conflicts.length})
                    </h4>
                    <div className="space-y-3">
                      {conflicts.map((c, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-red-200">
                          <div>
                            <p className="font-bold text-gray-900">{c.student.name}</p>
                            <p className="text-xs text-gray-500">{format(new Date(c.requestedStart), 'MMM d')} at {format(new Date(c.requestedStart), 'HH:mm')}</p>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                             c.priority === 'emergency' ? 'bg-red-100 text-red-600' :
                             c.priority === 'academic_urgent' ? 'bg-amber-100 text-amber-600' :
                             'bg-blue-100 text-blue-600'
                           }`}>
                            {c.priority}
                           </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                {activationResult ? (
                  <motion.div 
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    className="flex-1 flex items-center justify-center gap-3 text-green-600 font-black"
                  >
                    <Check size={24} className="bg-green-100 rounded-full p-1" />
                    Timetable activated! {activationResult.count} conflicts resolved.
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-amber-600">
                      <AlertCircle size={20} />
                      <p className="text-xs font-bold">Activating will cancel any conflicting appointments.</p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowPreview(false)}
                        className="px-6 py-3 rounded-2xl font-bold text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={handleActivate}
                        disabled={isActivating}
                        className="bg-vau-maroon text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-vau-maroon/20 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                      >
                        {isActivating ? 'Activating...' : 'Confirm & Activate'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, color }: { label: string, value: any, color: string }) {
  const colorMap: Record<string, string> = {
    'vau-maroon': 'bg-vau-maroon text-vau-gold',
    'amber': 'bg-amber-500 text-white',
    'blue': 'bg-blue-500 text-white',
    'green': 'bg-green-500 text-white',
    'indigo': 'bg-indigo-500 text-white'
  };
  const classes = colorMap[color] || 'bg-gray-500 text-white';
  
  return (
    <div className={`${classes} p-6 rounded-3xl shadow-xl space-y-1`}>
      <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

function AppointmentCard({ appt, onApprove, onReject, onReschedule, onChat, activeChatId, accent, compact }: {
  appt: Appointment; onApprove?: () => void; onReject?: () => void;
  onReschedule?: (id: string, proposedStart: string, proposedEnd: string, reason: string) => Promise<void>;
  onChat?: () => void; activeChatId: string | null; accent: string; compact?: boolean;
}) {
  const student = appt.studentId as UserType;
  const accentMap: Record<string, { border: string }> = {
    indigo: { border: 'border-indigo-100' },
    amber: { border: 'border-amber-100' },
    blue: { border: 'border-blue-100' },
    green: { border: 'border-green-100' },
  };
  const colors = accentMap[accent] || accentMap.blue;

  const docs = (appt.documents || []) as any[];

  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const initReschedule = () => {
    const d = new Date(appt.requestedStart);
    const dateStr = d.toISOString().split('T')[0];
    const timeStartStr = d.toTimeString().split(' ')[0].substring(0, 5);
    const endD = new Date(appt.requestedEnd);
    const timeEndStr = endD.toTimeString().split(' ')[0].substring(0, 5);

    setRescheduleDate(dateStr);
    setRescheduleStartTime(timeStartStr);
    setRescheduleEndTime(timeEndStr);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className={`bg-white ${compact ? 'p-4 rounded-2xl' : 'p-5 rounded-3xl shadow-lg shadow-gray-200/50'} border ${colors.border} flex flex-col gap-4`}
    >
      <div className="flex gap-4">
        <div className={`${compact ? 'h-10 w-10 text-sm' : 'h-14 w-14 text-lg'} bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 shrink-0`}>
          {student?.name?.[0] || '?'}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>{student?.name || 'Unknown'}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                  appt.priority === 'emergency' ? 'bg-red-100 text-red-600' :
                  appt.priority === 'academic_urgent' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {appt.priority}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <CalIcon size={10} /> {format(new Date(appt.requestedStart), 'MMM d')}
                </span>
              </div>

              {/* Student Profile Details */}
              <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-100 text-[11px] space-y-0.5 text-gray-600">
                <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">ID:</span> <span className="font-semibold text-gray-900">{student?.regNumber || '—'}</span></div>
                <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">Email:</span> <span className="font-semibold text-gray-900">{student?.email || '—'}</span></div>
                {student?.department && (
                  <div><span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mr-1">Dept:</span> <span className="font-semibold text-gray-900">{student.department}</span></div>
                )}
              </div>

              {docs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {docs.map((d, idx) => (
                    <a
                      key={idx}
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100"
                      title={d.fileName}
                    >
                      <Paperclip size={12} /> {d.fileName}
                    </a>
                  ))}
                </div>
              )}
              {docs.length === 0 && (
                <p className="text-[10px] text-gray-400 font-bold mt-2">No attachments</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1 text-vau-maroon bg-vau-maroon/5 px-2 py-1 rounded-full font-black text-[11px]">
                <Clock size={12} /> {format(new Date(appt.requestedStart), 'HH:mm')}
              </div>
              {appt.status === 'rescheduled' && (
                <div className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  Rescheduled
                </div>
              )}
            </div>
          </div>

          {(() => {
            const parsed = parseAppointmentReason(appt.reason);
            return (
              <div className="space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1">
                {parsed.isAcademic ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-vau-maroon text-white rounded">
                        {parsed.requestType.replace('-', ' ')}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">Academic Request</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 truncate">Title: {parsed.title}</p>
                    <div className="text-[9px] text-gray-500 font-medium">
                      {parsed.faculty} • {parsed.department} • {parsed.degreeProgram}
                    </div>
                    <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap">"{parsed.description}"</p>
                  </>
                ) : (
                  <>
                    <div className="text-[9px] text-gray-400 font-bold uppercase">General Meeting</div>
                    <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap">"{parsed.description}"</p>
                  </>
                )}
              </div>
            );
          })()}

          {/* If the appointment has proposed start/end times in rescheduled status, display them here */}
          {(appt.status === 'rescheduled' || appt.proposedStart) && appt.proposedStart && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 space-y-1 mt-2 text-xs">
              <span className="font-bold text-amber-800 uppercase tracking-widest text-[9px] block">Proposed Time Slot:</span>
              <p className="font-bold text-amber-900">
                {format(new Date(appt.proposedStart), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-amber-800 font-semibold">
                {format(new Date(appt.proposedStart), 'HH:mm')} — {format(new Date(appt.proposedEnd!), 'HH:mm')}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {onApprove && appt.status !== 'rescheduled' && (
              <button onClick={onApprove} className={`${compact ? 'flex-1 h-8 text-xs' : 'flex-1 h-9 text-sm'} bg-vau-maroon text-white rounded-lg font-bold flex items-center justify-center gap-1.5 hover:bg-vau-maroon-light transition-colors`}>
                <Check size={compact ? 14 : 16} /> Approve
              </button>
            )}
            {onReject && appt.status !== 'rescheduled' && (
              <button onClick={onReject} className={`${compact ? 'h-8 px-2.5' : 'h-9 px-3'} border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50 transition-colors`}>
                <X size={compact ? 14 : 16} />
              </button>
            )}
            {onReschedule && appt.status === 'pending' && (
              <button 
                onClick={() => {
                  if (!showRescheduleForm) {
                    initReschedule();
                  }
                  setShowRescheduleForm(!showRescheduleForm);
                }} 
                className={`${compact ? 'h-8 px-2.5' : 'h-9 px-3'} border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors`}
                title="Propose New Time Slot"
              >
                <Clock size={compact ? 14 : 16} />
              </button>
            )}
            {onChat && (
              <button onClick={onChat} className={`${compact ? 'h-8 px-2.5' : 'h-9 px-3'} rounded-lg transition-colors ${activeChatId === appt._id ? 'bg-vau-maroon text-vau-gold' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                <MessageSquare size={compact ? 14 : 16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showRescheduleForm && (
        <div className="mt-1 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 space-y-3">
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Propose New Time Slot</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">Date</label>
              <input 
                type="date" 
                value={rescheduleDate} 
                onChange={(e) => setRescheduleDate(e.target.value)} 
                className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">Start Time</label>
              <input 
                type="time" 
                value={rescheduleStartTime} 
                onChange={(e) => setRescheduleStartTime(e.target.value)} 
                className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">End Time</label>
              <input 
                type="time" 
                value={rescheduleEndTime} 
                onChange={(e) => setRescheduleEndTime(e.target.value)} 
                className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">Reason for Rescheduling</label>
            <input 
              type="text" 
              placeholder="e.g. Clashes with academic lecture, please accept new slot..." 
              value={rescheduleReason} 
              onChange={(e) => setRescheduleReason(e.target.value)} 
              className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={() => setShowRescheduleForm(false)} 
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={async () => {
                if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return;
                const startStr = new Date(`${rescheduleDate}T${rescheduleStartTime}`).toISOString();
                const endStr = new Date(`${rescheduleDate}T${rescheduleEndTime}`).toISOString();
                if (onReschedule) {
                  await onReschedule(appt._id, startStr, endStr, rescheduleReason || 'Lecturer rescheduled time slot');
                  setShowRescheduleForm(false);
                }
              }} 
              className="bg-vau-maroon text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-md hover:bg-vau-maroon-light transition-colors"
            >
              Propose
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

