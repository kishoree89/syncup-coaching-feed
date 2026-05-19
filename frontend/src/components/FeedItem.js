function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function FeedItem({ feed }) {
  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-lg text-slate-900">{feed.title}</h3>
        <time className="text-xs text-slate-500">{formatTime(feed.createdAt)}</time>
      </header>
      <p className="mt-2 text-slate-700 whitespace-pre-wrap">{feed.content}</p>
      <footer className="mt-3 text-xs text-slate-500">— {feed.author}</footer>
    </article>
  );
}
