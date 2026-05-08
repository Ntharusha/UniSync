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