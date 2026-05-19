export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
