import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LectureDashboard';
import { User as UserType } from './types';

import socket from './socket';

export default function App() {
    const [user, setUser] = useState<UserType | null>(null);

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
                alert(data.message);
            });
            return () => {
                socket.off('notification');
            };
        }
    }, [user]);

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login onLogin={setUser} />} />
                <Route path="/" element={
                    user ? <DashboardLayout user={user} onLogout={() => { setUser(null); localStorage.removeItem('user'); localStorage.removeItem('token'); }} /> : <Navigate to="/login" />
                }>
                    {user?.role === 'student' && <Route index element={<StudentDashboard user={user!} />} />}
                    {user?.role === 'lecturer' && <Route index element={<LecturerDashboard user={user!} />} />}
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}
