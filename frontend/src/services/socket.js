import { io } from 'socket.io-client';

// Singleton socket — import this anywhere instead of creating multiple connections
const socket = io('/', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnectionDelay: 3000,
  reconnectionAttempts: Infinity,
});

export default socket;
