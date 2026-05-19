// Singleton Socket.IO client. Returning the same instance everywhere prevents
// React StrictMode double-mount and Next.js HMR from opening multiple sockets,
// which is what causes duplicate events on the client.
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      // Default transports: ['polling','websocket'] with auto-upgrade.
      // Polling is the safer fallback on corporate networks / proxies that
      // block raw WebSocket frames; Socket.IO upgrades to ws once it works.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,     // start at 1s
      reconnectionDelayMax: 5000,  // cap backoff at 5s
      autoConnect: true,
      withCredentials: true,
    });

    if (typeof window !== 'undefined') {
      socket.on('connect', () => console.log('[socket] connected', socket.id));
      socket.on('disconnect', (r) => console.log('[socket] disconnected', r));
      socket.on('reconnect', (n) => console.log('[socket] reconnected after', n, 'tries'));
    }
  }
  return socket;
}
