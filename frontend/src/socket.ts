import { io } from 'socket.io-client';

// In production, this would be the backend URL
const socket = io();

export default socket;
