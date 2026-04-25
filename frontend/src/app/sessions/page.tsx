'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSessions } from '@/lib/api';
import { PHASE_LABELS, type SessionListItem } from '@/lib/types';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Previous intakes</h1>
        <p className="text-ink-muted text-sm">Anonymous, scoped to this browser.</p>
      </header>

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="bg-white border rounded-lg p-6 text-center">
          <p className="text-ink-muted">No intakes yet.</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            Start your first intake
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Patient</th>
                <th className="text-left px-4 py-2 font-medium">Chief complaint</th>
                <th className="text-left px-4 py-2 font-medium">Phase</th>
                <th className="text-left px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === 'finalized'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {s.patientName ? (
                      <span className="font-medium">{s.patientName}</span>
                    ) : (
                      <em className="text-ink-muted">—</em>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">
                    {s.cc ?? <em className="text-ink-muted">—</em>}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{PHASE_LABELS[s.phase]}</td>
                  <td className="px-4 py-2 text-ink-muted">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={s.status === 'finalized' ? `/sessions/${s.id}` : `/chat/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.status === 'finalized' ? 'View brief' : 'Resume'}
                    </Link>
                    {s.status === 'finalized' && (
                      <Link
                        href={`/sessions/${s.id}/transcript`}
                        className="ml-3 text-ink-muted hover:text-ink"
                      >
                        Transcript
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
