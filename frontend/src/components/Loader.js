export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-10 text-slate-500">
      <div className="h-5 w-5 mr-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
