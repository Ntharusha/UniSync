import { Outlet, useNavigate } from 'react-router-dom';
import { Calendar, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

export default function DashboardLayout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-vau-maroon rounded-xl flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5 text-vau-gold" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">UniSync</span>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl">
              <div className="h-8 w-8 bg-vau-maroon/10 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-vau-maroon" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-10 w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-105"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
