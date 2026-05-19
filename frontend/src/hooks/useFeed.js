'use client';

// useFeed owns feed state: initial fetch, live socket updates, dedupe, reconnect refresh.
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useSocket } from './useSocket';

export function useFeed() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  const fetchFeeds = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get('/feed');
      setFeeds(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  useEffect(() => {
    if (!socket) return;

    // Dedupe by id — if the same feed arrives twice (network blip, double-mount, etc.)
    // we silently drop the duplicate.
    const onNewFeed = (feed) => {
      setFeeds((prev) => (prev.some((f) => f.id === feed.id) ? prev : [feed, ...prev]));
    };

    // After a reconnect we may have missed events while offline, so re-fetch the list.
    const onReconnect = () => {
      fetchFeeds();
    };

    socket.on('feed:new', onNewFeed);
    socket.io.on('reconnect', onReconnect);

    // Cleanup is critical — otherwise StrictMode's second mount would stack
    // a second handler on top of the first, causing duplicate UI updates.
    return () => {
      socket.off('feed:new', onNewFeed);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, fetchFeeds]);

  return { feeds, loading, error, refetch: fetchFeeds };
}
