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
