'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listSessions, startSession } from '@/lib/api';
import type { SessionListItem } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const onStart = async () => {
    setStarting(true);
    try {
      const { sessionId } = await startSession();
      router.push(`/chat/${sessionId}`);
    } catch (err) {
      setStarting(false);
      alert(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const recent = sessions[0];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Pre-visit clinical intake</h1>
        <p className="text-ink-soft max-w-2xl">
          A conversational intake that gathers your chief complaint, history of present illness,
          and a focused review of systems. Your clinician will see a structured brief before your
          visit. This is not a substitute for medical advice.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onStart}
          disabled={starting}
          className="px-5 py-2.5 rounded-md bg-ink text-white font-medium hover:bg-ink-soft disabled:opacity-50"
        >
          {starting ? 'Starting…' : 'Start a new intake'}
        </button>
        {recent && recent.status !== 'finalized' && (
          <Link
            href={`/chat/${recent.id}`}
            className="px-5 py-2.5 rounded-md border border-slate-300 text-ink hover:bg-white"
          >
            Resume your last intake
          </Link>
        )}
        <Link href="/sessions" className="text-sm text-ink-muted hover:text-ink underline">
          View previous intakes
        </Link>
      </div>

      {!loading && sessions.length > 0 && (
        <section className="bg-white rounded-lg border p-4">
          <h2 className="font-medium mb-3">Recent intakes</h2>
          <ul className="divide-y">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    s.status === 'finalized'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.patientName ?? <em className="font-normal text-ink-muted">Unknown patient</em>}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {s.cc ?? 'No chief complaint yet'}
                  </p>
                </div>
                <Link
                  href={
                    s.status === 'finalized' ? `/sessions/${s.id}` : `/chat/${s.id}`
                  }
                  className="text-sm text-blue-600 hover:underline shrink-0"
                >
                  {s.status === 'finalized' ? 'View brief' : 'Resume'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
