import { useState, useEffect } from 'react';
import { Users, Settings, BarChart, ShieldCheck, UserPlus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User as UserType, AuditLog } from '../types';
import { useToast } from '../components/Toast';

const FACULTIES = [
  'Faculty of Applied Science',
  'Faculty of Business Studies',
  'Faculty of Technology'
] as const;

type Faculty = (typeof FACULTIES)[number];

const DEPARTMENTS_BY_FACULTY: Record<Faculty, string[]> = {
  'Faculty of Applied Science': [
    'Department of Physical Science',
    'Department of Bio-science'
  ],
  'Faculty of Business Studies': [
    'Department of Business Administration',
    'Department of Accounting and Finance',
    'Department of Marketing and Management'
  ],
  'Faculty of Technology': [
    'Department of Computer Science',
    'Department of Engineering',
    'Department of Information Technology'
  ]
};

const DEGREE_PROGRAMS_BY_DEPT: Record<string, string[]> = {
  'Department of Physical Science': [
    'Bachelor of Science in Applied Mathematics and Computing',
    'Bachelor of Science Honours in Computer Science',
    'Bachelor of Science in Information Technology',
    'Bachelor of Science Honours in Information Technology'
  ],
  'Department of Bio-science': [
    'Bachelor of Science Honours in Environmental Science'
  ],
  'Department of Business Administration': [
    'BBA in Business Administration',
    'BBA (Hons) in Business Administration'
  ],
  'Department of Accounting and Finance': [
    'BSc in Accounting and Finance',
    'BSc (Hons) in Accounting and Finance'
  ],
  'Department of Marketing and Management': [
    'BSc in Marketing',
    'BSc in Management'
  ],
  'Department of Computer Science': [
    'BSc (Hons) in Computer Science',
    'BSc in Information Technology (IT)',
    'BSc in Software Engineering'
  ],
  'Department of Engineering': [
    'BEng in Civil Engineering',
    'BEng in Electrical Engineering',
    'BEng in Mechanical Engineering'
  ],
  'Department of Information Technology': [
    'BSc in Information Technology',
    'BSc (Hons) in Information Technology',
    'BSc in Network Engineering'
  ]
};

export default function AdminDashboard({ user }: { user: UserType }) {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student', faculty: '', department: '', degreeProgram: '', regNumber: '' });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; name: string; role: string; password: string; regNumber?: string; faculty?: string; department?: string; degreeProgram?: string } | null>(null);

  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchAnalytics();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchUsers();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempPassword = Math.random().toString(36).substring(2, 10) + 'A1!';
    const submissionData = { ...newUser, password: tempPassword };
    if (newUser.role === 'student' && !newUser.email) {
      submissionData.email = newUser.regNumber.replace(/[\s/]+/g, '').toLowerCase() + '@vau.ac.lk';
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submissionData)
      });
      if (res.ok) {
        setCreatedCredentials({
          email: submissionData.email,
          name: newUser.name,
          role: newUser.role,
          password: tempPassword,
          regNumber: newUser.regNumber,
          faculty: newUser.faculty,
          department: newUser.department,
          degreeProgram: newUser.degreeProgram
        });
        setShowCreateModal(false);
        setNewUser({ name: '', email: '', role: 'student', faculty: '', department: '', degreeProgram: '', regNumber: '' });
        fetchUsers();
        fetchLogs();
        success('User Created', 'New user has been successfully registered.');
      } else {
        const err = await res.json();
        toastError('Creation Failed', err.error || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/users/bulk-import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        setImportStatus(`Success: ${result.message}`);
        fetchUsers();
        fetchLogs();
      } else {
        setImportStatus(`Error: ${result.error}`);
      }
    } catch (err) {
      setImportStatus('Failed to connect to server');
    } finally {
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">System Control</h2>
          <p className="text-gray-500 font-medium">Manage users, view analytics and audit logs.</p>
        </div>
        <div className="flex items-center gap-4">
          {importStatus && (
            <motion.div 
              initial={{ opacity:0, x:20 }}
              animate={{ opacity:1, x:0 }}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm ${
                importStatus.includes('Success') ? 'bg-green-100 text-green-700' : 
                importStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {importStatus}
            </motion.div>
          )}
          <label className="bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all shadow-sm cursor-pointer">
            <BarChart size={20} />
            Bulk Import
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleBulkImport}
            />
          </label>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-vau-maroon text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-vau-maroon-light transition-all shadow-lg hover:shadow-vau-maroon/20 hover:-translate-y-0.5"
          >
            <UserPlus size={20} />
            Create New User
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MiniStats cardColor="bg-blue-500" icon={<Users className="text-white" />} label="Total Users" value={analytics?.totalUsers ?? users.length} />
        <MiniStats cardColor="bg-amber-500" icon={<BarChart className="text-white" />} label="Total Requests" value={analytics?.totalAppointments ?? 0} />
        {/* BUG-016 fixed: no longer shows hardcoded mock uptime/avgResponse */}
        <MiniStats cardColor="bg-green-500" icon={<ShieldCheck className="text-white" />} label="Approved" value={analytics?.activeAppointments ?? 0} />
        <MiniStats cardColor="bg-vau-maroon" icon={<Settings className="text-white" />} label="Pending" value={analytics?.pendingRequests ?? 0} />
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Registered Users</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Department</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u._id} className="group hover:bg-vau-maroon/5 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 group-hover:bg-white transition-colors">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-none">{u.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 capitalize font-medium text-gray-600">{u.role}</td>
                  <td className="px-8 py-5 font-medium text-gray-600">{u.department || '—'}</td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                        u.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}></div> 
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                       {/* BUG-015 fixed: Edit button removed — no backend route or handler exists */}
                       <button 
                        onClick={() => handleDeleteUser(u._id)}
                        className="text-sm font-bold text-red-400 hover:text-red-600"
                       >
                         Delete
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-vau-maroon border-t-transparent"></div>
              <p className="font-medium">Loading user database...</p>
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 ml-2">Recent System Actions</h3>
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No logs found.</div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="p-6 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {log.actorId?.name || 'System'} 
                        <span className="text-vau-maroon mx-2">→</span> 
                        <span className="text-xs uppercase tracking-widest text-gray-500 font-black">{log.action.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Targeting {log.entityType} • {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  {log.metadata && (
                    <div className="text-[10px] font-mono bg-gray-50 p-2 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity:0, scale:0.95 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.95 }}
              className="bg-white rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleCreateUser} className="p-10 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black text-gray-900">Add New User</h3>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-150 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <input 
                      required
                      placeholder="Full Name" 
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-medium"
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                    {newUser.role === 'student' ? (
                      <input 
                        required
                        placeholder="Registration Number (e.g. 2021 / ASP / 99)" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-medium"
                        value={newUser.regNumber}
                        onChange={e => {
                          const val = e.target.value;
                          const derivedEmail = val.replace(/[\s/]+/g, '').toLowerCase() + '@vau.ac.lk';
                          setNewUser({...newUser, regNumber: val, email: derivedEmail});
                        }}
                      />
                    ) : (
                      <input 
                        required
                        type="email"
                        placeholder="Email Address" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-medium"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value, regNumber: ''})}
                      />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</label>
                        <select 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-bold text-gray-600"
                          value={newUser.role}
                          onChange={e => {
                            const val = e.target.value;
                            setNewUser({
                              name: newUser.name,
                              email: '',
                              role: val,
                              faculty: '',
                              department: '',
                              degreeProgram: '',
                              regNumber: ''
                            });
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {(newUser.role === 'student' || newUser.role === 'lecturer') && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty</label>
                          <select
                            required
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-bold text-gray-600"
                            value={newUser.faculty}
                            onChange={e => {
                              setNewUser({ ...newUser, faculty: e.target.value, department: '', degreeProgram: '' });
                            }}
                          >
                            <option value="">Select Faculty</option>
                            {FACULTIES.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {(newUser.role === 'student' || newUser.role === 'lecturer') && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</label>
                          <select
                            required
                            disabled={!newUser.faculty}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-bold text-gray-600 disabled:opacity-50"
                            value={newUser.department}
                            onChange={e => {
                              setNewUser({ ...newUser, department: e.target.value, degreeProgram: '' });
                            }}
                          >
                            <option value="">Select Department</option>
                            {newUser.faculty && (DEPARTMENTS_BY_FACULTY[newUser.faculty as Faculty] || []).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newUser.role === 'student' && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Degree Program</label>
                          <select
                            required
                            disabled={!newUser.department}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-vau-maroon/20 font-bold text-gray-600 disabled:opacity-50"
                            value={newUser.degreeProgram}
                            onChange={e => {
                              setNewUser({ ...newUser, degreeProgram: e.target.value });
                            }}
                          >
                            <option value="">Select Degree Program</option>
                            {newUser.department && (DEGREE_PROGRAMS_BY_DEPT[newUser.department] || []).map(dp => (
                              <option key={dp} value={dp}>{dp}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-vau-maroon text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-vau-maroon/20 hover:bg-vau-maroon-light hover:-translate-y-1 transition-all"
                >
                  Confirm Registration
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {createdCredentials && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity:0, scale:0.95 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.95 }}
              className="bg-white rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl p-10 space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-black text-gray-900">User Credentials</h3>
                <button type="button" onClick={() => setCreatedCredentials(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="bg-green-50 text-green-800 p-4 rounded-2xl border border-green-150 text-sm font-semibold leading-relaxed">
                Account created successfully! Please copy these credentials and share them with the user.
              </div>

               <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 font-mono text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-400 font-bold">NAME:</span>
                  <span className="text-gray-800 font-black">{createdCredentials.name}</span>
                </div>
                {createdCredentials.role === 'student' ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-400 font-bold">REG NUMBER:</span>
                      <span className="text-gray-800 font-black">{createdCredentials.regNumber}</span>
                    </div>
                    {createdCredentials.faculty && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-400 font-bold">FACULTY:</span>
                        <span className="text-gray-800 font-black">{createdCredentials.faculty}</span>
                      </div>
                    )}
                    {createdCredentials.department && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-400 font-bold">DEPARTMENT:</span>
                        <span className="text-gray-800 font-black">{createdCredentials.department}</span>
                      </div>
                    )}
                    {createdCredentials.degreeProgram && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-400 font-bold">DEGREE:</span>
                        <span className="text-gray-800 font-black">{createdCredentials.degreeProgram}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-400 font-bold">EMAIL:</span>
                      <span className="text-gray-800 font-black">{createdCredentials.email}</span>
                    </div>
                    {createdCredentials.department && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-400 font-bold">DEPARTMENT:</span>
                        <span className="text-gray-800 font-black">{createdCredentials.department}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-400 font-bold">ROLE:</span>
                  <span className="text-gray-800 font-black capitalize">{createdCredentials.role}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 font-bold">PASSWORD:</span>
                  <span className="text-vau-maroon font-black select-all bg-vau-maroon/5 px-2.5 py-1 rounded-lg">{createdCredentials.password}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const identifierLabel = createdCredentials.role === 'student' ? `Registration Number: ${createdCredentials.regNumber}` : `Email: ${createdCredentials.email}`;
                    let text = `Uni Sync Credentials\n\nName: ${createdCredentials.name}\n${identifierLabel}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}`;
                    if (createdCredentials.role === 'student') {
                      text += `\nFaculty: ${createdCredentials.faculty || ''}\nDepartment: ${createdCredentials.department || ''}\nDegree Program: ${createdCredentials.degreeProgram || ''}`;
                    } else if (createdCredentials.department) {
                      text += `\nDepartment: ${createdCredentials.department}`;
                    }
                    navigator.clipboard.writeText(text);
                    success('Copied!', 'Credentials copied to clipboard.');
                  }}
                  className="flex-1 bg-gray-100 text-gray-900 py-4 rounded-2xl font-black text-center hover:bg-gray-200 transition-all"
                >
                  Copy to Clipboard
                </button>
                <button 
                  onClick={() => setCreatedCredentials(null)}
                  className="flex-1 bg-vau-maroon text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-vau-maroon/10 hover:bg-vau-maroon-light transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStats({ icon, label, value, cardColor }: { icon: any, label: string, value: any, cardColor: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-50 flex items-center gap-5 group hover:border-vau-maroon transition-all">
      <div className={`h-14 w-14 ${cardColor} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}
