export default function Loader({ label = 'Loading…', hint = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
      <div className="flex items-center">
        <div className="h-5 w-5 mr-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
        <span>{label}</span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-400 max-w-sm text-center">{hint}</p>}
    </div>
  );
}
