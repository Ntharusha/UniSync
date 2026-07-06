import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User as UserType, Notification } from '../types';

export default function NotificationsPage({ user }: { user: UserType }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user._id]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications/${user._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'displacement':
      case 'error': return <AlertTriangle className="text-red-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Notification Center</h2>
          <p className="text-gray-500 font-medium">Stay updated with your appointment status and system alerts.</p>
        </div>
        <button className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
          <Trash2 size={18} /> Clear All
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-vau-maroon border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <Bell size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-medium italic">No notifications yet.</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((n) => (
                <motion.div 
                  key={n._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-6 flex gap-4 transition-colors ${n.read ? 'bg-white' : 'bg-vau-maroon/5'}`}
                  onClick={() => !n.read && markAsRead(n._id)}
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    n.type === 'success' ? 'bg-green-100' :
                    n.type === 'displacement' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-bold ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className={`text-sm ${n.read ? 'text-gray-400' : 'text-gray-600'}`}>{n.message}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-vau-maroon rounded-full mt-2"></div>}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
