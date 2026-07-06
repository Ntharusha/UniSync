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

{/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span>Home</span>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-900 capitalize">{user.role} Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 text-gray-400 hover:text-vau-maroon transition-colors relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user.name}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{user.role}</p>
              </div>
              <div className="h-10 w-10 bg-vau-gold/20 text-vau-maroon rounded-full flex items-center justify-center font-bold">
                {user.name[0]}
              </div>
            </div>
          </div>
        </header>