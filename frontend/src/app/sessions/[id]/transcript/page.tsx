'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSession } from '@/lib/api';
import type { SessionDetail } from '@/lib/types';

export default function TranscriptPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await getSession(sessionId);
        if (!cancelled) setSession(detail);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <p className="text-ink-muted text-sm">Loading transcript…</p>;
  if (error)
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </div>
        <Link href="/sessions" className="text-blue-600 hover:underline text-sm">
          ← Back to intakes
        </Link>
      </div>
    );
  if (!session) return null;

  const headerLine = [
    session.patient.name,
    session.patient.dob ? `DOB ${session.patient.dob}` : null,
    session.cc ? `CC: ${session.cc}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href={
            session.status === 'finalized'
              ? `/sessions/${sessionId}`
              : `/chat/${sessionId}`
          }
          className="text-blue-600 hover:underline"
        >
          ← Back to{' '}
          {session.status === 'finalized' ? 'brief' : 'chat'}
        </Link>
        <span className="ml-auto text-xs text-ink-muted">
          {session.messages.length} messages · {new Date(session.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <header className="mb-5 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-semibold tracking-tight">Conversation transcript</h1>
          {headerLine && <p className="text-sm text-ink-muted mt-1">{headerLine}</p>}
        </header>

        {session.messages.length === 0 ? (
          <p className="text-ink-muted text-sm">No messages in this session.</p>
        ) : (
          <ol className="space-y-4">
            {session.messages
              .filter((m) => m.role !== 'system')
              .map((m) => (
                <li key={m.id} className="flex gap-3">
                  <div
                    className={`shrink-0 w-20 text-xs uppercase tracking-wider font-semibold pt-1 ${
                      m.role === 'assistant' ? 'text-blue-600' : 'text-ink-muted'
                    }`}
                  >
                    {m.role === 'assistant' ? 'Assistant' : 'Patient'}
                  </div>
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    <p className="text-[10px] text-ink-muted mt-1">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </div>
    </div>
  );
}
