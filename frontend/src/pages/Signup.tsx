import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Building, Hash, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';

export default function Signup({ onLogin }: { onLogin: (user: UserType) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [regNumber, setRegNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role,
          ...(role === 'student' ? { regNumber, department } : { department }) 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        navigate('/');
      } else {
        const err = await res.json();
        setError(err.error || 'Registration failed. Please check your inputs.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-vau-maroon/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-vau-gold/10 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-vau-maroon rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <Calendar className="h-12 w-12 text-vau-gold" />
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl font-black text-gray-900 tracking-tight">
          Join UniSync
        </h2>
        <p className="mt-2 text-center text-gray-600 font-medium">
          Create an account to get started
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-10 sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl py-10 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/20">
          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`py-3 px-4 text-sm font-bold rounded-2xl transition-all ${
                  role === 'student' ? 'bg-vau-maroon text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => setRole('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={`py-3 px-4 text-sm font-bold rounded-2xl transition-all ${
                  role === 'lecturer' ? 'bg-vau-maroon text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => setRole('lecturer')}
              >
                Lecturer
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={20} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Institutional Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={20} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@vau.ac.lk"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
                  />
                </div>
              </div>

              {role === 'student' && (
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Registration #</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Hash size={20} />
                    </span>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="2019/V/123"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Department</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Building size={20} />
                  </span>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Applied Science"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={20} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 text-lg font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center p-5 bg-vau-maroon text-white rounded-2xl hover:bg-vau-maroon/90 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
            >
              <span className="text-lg font-black mr-2">
                {loading ? 'Registering...' : 'Sign Up'}
              </span>
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-vau-maroon font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
