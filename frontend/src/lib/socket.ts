import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('gamatch_token');
    socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001', {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
