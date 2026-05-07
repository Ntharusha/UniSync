import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';

export default function Login({ onLogin }: { onLogin: (user: UserType) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
