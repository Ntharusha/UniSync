import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Message } from '../types';
import socket from '../socket';

interface ChatProps {
  appointmentId: string;
  currentUser: User;
  onClose: () => void;
}

export default function Chat({ appointmentId, currentUser, onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing messages
    fetch(`/api/messages/${appointmentId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(err => {
        console.warn('Backend offline, loading mock messages.', err);
        const allMockMsgs = JSON.parse(localStorage.getItem('mock_messages') || '{}');
        setMessages(allMockMsgs[appointmentId] || []);
      });

    // Listen for new messages
    const handleNewMessage = (msg: Message) => {
      if (msg.appointmentId === appointmentId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [appointmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          appointmentId,
          senderId: currentUser._id,
          body: input
        })
      });
      if (res.ok) {
        setInput('');
      } else {
        throw new Error('Send failed');
      }
    } catch (err) {
      console.warn('Backend offline, saving mock message.', err);
      const newMsg: Message = {
        _id: "mock_msg_" + Date.now(),
        appointmentId,
        senderId: currentUser,
        body: input,
        createdAt: new Date().toISOString()
      };
      
      const allMockMsgs = JSON.parse(localStorage.getItem('mock_messages') || '{}');
      if (!allMockMsgs[appointmentId]) allMockMsgs[appointmentId] = [];
      allMockMsgs[appointmentId].push(newMsg);
      localStorage.setItem('mock_messages', JSON.stringify(allMockMsgs));
      
      setMessages(prev => [...prev, newMsg]);
      setInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50"
    >
      {/* Header */}
      <div className="bg-vau-maroon text-white p-4 flex items-center justify-between shrink-0">
        <h3 className="font-black text-lg">Chat</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p className="text-sm font-medium italic">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId._id) === currentUser._id;
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium ${
                isMine
                  ? 'bg-vau-maroon text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-vau-maroon/20"
        />
        <button
          onClick={handleSend}
          className="h-11 w-11 bg-vau-maroon text-white rounded-xl flex items-center justify-center hover:bg-vau-maroon/90 transition-all hover:scale-105 shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  );
}
