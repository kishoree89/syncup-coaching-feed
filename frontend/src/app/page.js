'use client';

import { useFeed } from '@/hooks/useFeed';
import FeedList from '@/components/FeedList';
import Loader from '@/components/Loader';
import ErrorBanner from '@/components/ErrorBanner';

export default function HomePage() {
  const { feeds, loading, error, refetch } = useFeed();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coaching Feed</h1>
        <p className="text-sm text-slate-500">Updates appear live — no refresh needed.</p>
      </div>

      {loading && <Loader label="Loading feeds…" />}
      <ErrorBanner message={error} onRetry={refetch} />

      {!loading && !error && <FeedList feeds={feeds} />}
    </section>
  );
}
