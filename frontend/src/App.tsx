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