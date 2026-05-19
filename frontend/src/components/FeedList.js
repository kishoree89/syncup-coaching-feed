import FeedItem from './FeedItem';

export default function FeedList({ feeds }) {
  if (!feeds || feeds.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        No coaching posts yet. Head to the Admin page to create the first one.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {feeds.map((f) => (
        <FeedItem key={f.id} feed={f} />
      ))}
    </div>
  );
}
