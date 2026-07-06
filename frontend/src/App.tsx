import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/StudentDashboard';
import StudentRequests from './pages/StudentRequests';
import LecturerDashboard from './pages/LecturerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotificationsPage from './pages/Notifications';
import ProfilePage from './pages/Profile';
import { User as UserType } from './types';
import { ToastProvider, useToast } from './components/Toast';

import socket from './socket';
function AppInner() {
  const [user, setUser] = useState<UserType | null>(null);
  const { info, error: toastError, success } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      socket.emit('join', user._id);
      socket.on('notification', (data) => {
        // BUG-014 fixed: replaced blocking alert() with toast notification
        const toastFn = data.type === 'error' || data.type === 'displacement'
          ? toastError
          : data.type === 'success'
            ? success
            : info;
        toastFn(data.title || 'Notification', data.message);
      });
      return () => {
        socket.off('notification');
      };
    }
  }, [user, info, toastError, success]);
 return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/signup" element={<Signup onLogin={setUser} />} />
        <Route path="/" element={
          user ? <DashboardLayout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />
        }>
{user?.role === 'student' && <Route index element={<StudentDashboard user={user!} />} />}

          {user?.role === 'lecturer' && <Route index element={<LecturerDashboard user={user!} />} />}
          {user?.role === 'admin' && <Route index element={<AdminDashboard user={user!} />} />}

          {/* Appointments route */}
          <Route
            path="appointments"
            element={
              user?.role === 'student' ? (
                <StudentRequests user={user!} />
              ) : user?.role === 'lecturer' ? (
                <LecturerDashboard user={user!} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
