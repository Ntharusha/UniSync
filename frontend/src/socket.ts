import { io } from 'socket.io-client';

// In production, this would be the backend URL
const socket = io(import.meta.env.VITE_API_URL || window.location.origin);

export default socket;
