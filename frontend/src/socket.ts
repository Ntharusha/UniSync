import { io } from 'socket.io-client';

// In production, this would be the backend URL
const BACKEND_URL = import.meta.env.VITE_API_URL || window.location.origin;
const socket = io(BACKEND_URL);

export default socket;
