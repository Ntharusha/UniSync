import { useState, useEffect } from 'react';
import { Check, X, Clock, User, Calendar as CalIcon, MessageSquare, AlertCircle, Paperclip, Download, Trash, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User as UserType, Appointment, AvailabilityRule } from '../types';
import socket from '../socket';
import Chat from '../components/Chat';

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