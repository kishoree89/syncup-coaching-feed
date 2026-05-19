'use client';

import FeedForm from '@/components/FeedForm';

export default function AdminPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create a coaching post</h1>
        <p className="text-sm text-slate-500">
          Submit below — the post is saved to Postgres, the Redis cache is invalidated,
          and every connected Home page receives it instantly over Socket.IO.
        </p>
      </div>
      <FeedForm />
    </section>
  );
}
