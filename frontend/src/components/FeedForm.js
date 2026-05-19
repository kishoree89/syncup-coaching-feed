'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function FeedForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/feed', { title, content, author });
      setSuccess(`Posted "${data.data.title}". Watch the Home page update live!`);
      setTitle('');
      setContent('');
      setAuthor('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Tip of the day"
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Share a coaching insight…"
          maxLength={2000}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Author <span className="text-slate-400">(optional)</span></label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Coach"
          maxLength={100}
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Posting…' : 'Post to feed'}
      </button>
    </form>
  );
}
