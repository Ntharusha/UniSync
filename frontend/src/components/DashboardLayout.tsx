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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-vau-maroon text-white flex flex-col shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-vau-gold p-2 rounded-lg">
            <Calendar className="text-vau-maroon h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">UniSync</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/" />
          {/* Appointments are shown on the role dashboards themselves; keep sidebar clean */}

          <NavItem icon={<Bell size={20} />} label="Notifications" to="/notifications" />
          <NavItem icon={<User size={20} />} label="Profile" to="/profile" />
        </nav>

        <div className="p-4 border-t border-vau-maroon-light">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-100 hover:bg-vau-maroon-dark rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
