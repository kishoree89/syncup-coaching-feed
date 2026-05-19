'use client';

// useFeed owns feed state: initial fetch (with retry), live socket updates,
// dedupe, and reconnect refresh.
import { useEffect, useState, useCallback, useRef } from 'react';
import api, { fetchWithRetry, describeError } from '@/lib/api';
import { useSocket } from './useSocket';

// If a fetch takes longer than this, we show a "waking up" hint in the loader.
// Useful on Render free tier where cold starts can take 30-60s.
const SLOW_THRESHOLD_MS = 3000;

export function useFeed() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [error, setError] = useState(null);
  const slowTimerRef = useRef(null);
  const socket = useSocket();

  const fetchFeeds = useCallback(async () => {
    setError(null);
    setLoading(true);
    setSlowLoading(false);

    // After SLOW_THRESHOLD_MS, flip slowLoading=true so the loader can
    // show "the server is waking up". Cleared in the finally block.
    slowTimerRef.current = setTimeout(() => setSlowLoading(true), SLOW_THRESHOLD_MS);

    try {
      const { data } = await fetchWithRetry(() => api.get('/feed'));
      setFeeds(data.data || []);
    } catch (err) {
      setError(describeError(err));
    } finally {
      clearTimeout(slowTimerRef.current);
      setLoading(false);
      setSlowLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
    return () => clearTimeout(slowTimerRef.current);
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

  return { feeds, loading, slowLoading, error, refetch: fetchFeeds };
}
