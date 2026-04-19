import { io } from 'socket.io-client';

/**
 * Socket.io client singleton.
 * Connects to the backend WebSocket server.
 * In development, Vite proxy handles the connection.
 */
const socket = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('🔌 Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔌 Socket connection error:', error.message);
});

export default socket;
