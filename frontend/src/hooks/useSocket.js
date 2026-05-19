'use client';

// Thin React wrapper around the singleton socket.
// Returning a stable reference + always cleaning up on unmount is what keeps
// React StrictMode from registering duplicate handlers.
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef(null);

  if (!socketRef.current) {
    socketRef.current = getSocket();
  }

  useEffect(() => {
    // No-op effect — the singleton owns the connection lifecycle.
    // We intentionally do NOT disconnect on unmount, because the socket is shared
    // across pages and disconnecting would tear it down for everyone.
    return () => {};
  }, []);

  return socketRef.current;
}
