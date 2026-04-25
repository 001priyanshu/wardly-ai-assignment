import type { Metadata } from 'next';
import Link from 'next/link';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Wardly · Pre-visit Clinical Intake',
  description: 'Conversational pre-visit intake with structured clinical brief.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="no-print border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-ink">
              Wardly Intake
            </Link>
            <Link href="/sessions" className="text-sm text-ink-muted hover:text-ink">
              Previous intakes
            </Link>
            <span className="ml-auto text-xs text-ink-muted">Pre-visit clinical intake assistant</span>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
