import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'SYNCUP — Coaching Feed',
  description: 'Realtime coaching feed (Express + Socket.IO + Redis + Postgres)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-slate-900">
              SYNCUP
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-slate-700 hover:text-slate-900">Home</Link>
              <Link href="/admin" className="text-slate-700 hover:text-slate-900">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
