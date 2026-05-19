// Axios instance pointed at the Express API.
// Centralized so every page/component uses the same baseURL.
//
// Render's free tier sleeps after ~15 min of inactivity. The first request
// after sleep can take 30-60 seconds while the container spins back up,
// so we use a generous 60s timeout and a retry helper.
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 60_000, // 60s — covers Render cold starts
});

// Classify an axios error so the UI can show a helpful message.
// Returns one of: 'timeout' | 'network' | 'server' | 'client'
export function classifyError(err) {
  if (err?.code === 'ECONNABORTED') return 'timeout';
  if (!err?.response) return 'network';
  if (err.response.status >= 500) return 'server';
  return 'client';
}

// Human-readable message for a given axios error, including a hint when
// the most likely cause is a Render cold start.
export function describeError(err) {
  const kind = classifyError(err);
  if (kind === 'timeout') {
    return 'The server took too long to respond. If this is the first request after a while, the free-tier server may be waking up — try again in 30 seconds.';
  }
  if (kind === 'network') {
    return 'Could not reach the server. Check your internet connection or try again in a moment.';
  }
  if (kind === 'server') {
    return err.response?.data?.error || `Server error (${err.response.status}). Please try again.`;
  }
  // client (4xx)
  return err.response?.data?.error || `Request failed (${err.response.status}).`;
}

// Retry a request a few times with exponential backoff.
// Only retries network/timeout/5xx — never retries 4xx (those are our fault).
//
// Usage:
//   const data = await fetchWithRetry(() => api.get('/feed'));
export async function fetchWithRetry(requestFn, { retries = 2, baseDelay = 1500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (err) {
      lastErr = err;
      const kind = classifyError(err);
      // Don't retry user errors (400/401/403/404) — they won't get better.
      if (kind === 'client') throw err;
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt); // 1.5s, 3s, 6s …
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export default api;
