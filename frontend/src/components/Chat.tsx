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
   return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 bg-vau-maroon text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Appointment Discussion</h3>
            <p className="text-[10px] opacity-80 font-medium">Real-time messaging active</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {loading ? (
          <div className="h-full flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-vau-maroon border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 text-center p-8">
             <MessageSquare size={40} className="mb-2" />
             <p className="text-sm font-medium">No messages yet. Send a message to start the discussion.</p>
          </div>
        ) :(
messages.map((msg) => {
            const isMe = typeof msg.senderId === 'string' ? msg.senderId === currentUser._id : msg.senderId._id === currentUser._id;
            const senderName = typeof msg.senderId === 'string' ? 'User' : msg.senderId.name;
            
            return (
              <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                  isMe ? 'bg-vau-maroon text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {msg.body}
                </div>
                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider px-1">
                  {isMe ? 'You' : senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

