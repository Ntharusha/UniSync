import { useState } from 'react';
import { User, Mail, Shield, BookOpen, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';

interface ProfilePageProps {
  user: UserType;
  onUpdateUser: (updated: UserType) => void;
}

export default function ProfilePage({ user, onUpdateUser }: ProfilePageProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [regNumber, setRegNumber] = useState(user.regNumber || '');
  const [department, setDepartment] = useState(user.department || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          email,
          ...(user.role === 'student' && { regNumber }),
          department,
          ...(password && { password })
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
      onUpdateUser(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-gray-500 mt-1 font-medium">Manage your account settings, personal details, and security.</p>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-3 font-medium text-sm"
        >
          <CheckCircle size={20} className="text-green-500 shrink-0" />
          <span>{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 font-medium text-sm"
        >
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Summary */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-24 w-24 bg-vau-gold/20 text-vau-maroon rounded-full flex items-center justify-center font-black text-4xl mb-4 border border-vau-gold/30 shadow-inner">
            {user.name[0]}
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{user.name}</h2>
          <span className="mt-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-vau-maroon/10 text-vau-maroon">
            {user.role}
          </span>
          <p className="text-xs text-gray-400 font-bold mt-4 tracking-wider uppercase">Email Address</p>
          <p className="text-sm font-semibold text-gray-700 break-all">{user.email}</p>
        </div>

        {/* Profile Edit Form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Personal Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                    placeholder="john@vau.ac.lk"
                  />
                </div>
              </div>

              {/* Role (Read only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">System Role</label>
                <div className="relative">
                  <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    disabled
                    value={user.role.toUpperCase()}
                    className="w-full h-11 pl-11 pr-4 bg-gray-100 border border-gray-200 rounded-xl font-black text-xs text-gray-400 tracking-widest outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Reg Number (Student ID - for students) */}
              {user.role === 'student' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Registration Number</label>
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                      placeholder="e.g. 2021/ICT/01"
                    />
                  </div>
                </div>
              )}

              {/* Department (For students & lecturers) */}
              {user.role !== 'admin' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Department</label>
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                      placeholder="e.g. Department of Physical Science"
                    />
                  </div>
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 pt-4">Change Password</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-vau-maroon focus:ring-1 focus:ring-vau-maroon transition-all outline-none font-medium text-sm text-gray-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 h-11 bg-vau-maroon hover:bg-vau-maroon/90 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-vau-maroon/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
