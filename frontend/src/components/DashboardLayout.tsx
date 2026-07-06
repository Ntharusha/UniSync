// BUG-020 fixed: all imports moved to the top of the file (was misplaced at line 117)
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LogOut, User, Bell, ChevronRight, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';

export default function DashboardLayout({ user, onLogout }: { user: UserType, onLogout: () => void }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications/${user._id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setUnreadCount(data.filter((n: any) => !n.read).length);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnread();
    
    // Refresh every 30 seconds or could use socket
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user._id]);

  