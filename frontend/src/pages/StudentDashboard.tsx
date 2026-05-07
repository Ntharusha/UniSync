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
 