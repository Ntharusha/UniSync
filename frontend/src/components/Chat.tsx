import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, User as UserType } from '../types';
import socket from '../socket';

interface ChatProps {
  appointmentId: string;
  currentUser: UserType;
  onClose: () => void;
}

export default function Chat({ appointmentId, currentUser, onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Join room
    socket.emit('join-chat', appointmentId);

    // Fetch history
    fetch(`/api/messages/${appointmentId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        setLoading(false);
      });

    const handleMessage = (msg: Message) => {
      if (msg.appointmentId === appointmentId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('message', handleMessage);
    return () => {
      socket.off('message', handleMessage);
    };
  }, [appointmentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ appointmentId, senderId: currentUser._id, body }),
      });
      setBody('');
    } catch (err) {
      console.error(err);
    }
  };
