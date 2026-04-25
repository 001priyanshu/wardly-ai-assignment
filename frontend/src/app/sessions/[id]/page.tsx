'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BriefView } from '@/components/BriefView';
import { finalizeSession, getSession } from '@/lib/api';
import type { ClinicalBrief, SessionDetail } from '@/lib/types';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [brief, setBrief] = useState<{ markdown: string; json: ClinicalBrief } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await getSession(sessionId);
        if (cancelled) return;
        setSession(detail);
        if (detail.brief) setBrief(detail.brief);
        else if (detail.status !== 'finalized' && detail.messages.length > 0) {
          // attempt to finalize on demand
          try {
            const b = await finalizeSession(sessionId);
            if (!cancelled) setBrief(b);
          } catch (err) {
            if (!cancelled) setError(err instanceof Error ? err.message : String(err));
          }
        }
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

  if (loading) return <p className="text-ink-muted text-sm">Loading brief…</p>;
  if (error)
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </div>
        <Link href="/sessions" className="text-blue-600 hover:underline text-sm">
          ← Back to intakes
        </Link>
      </div>
    );

  if (!brief)
    return (
      <div className="space-y-4">
        <p className="text-ink-muted text-sm">
          No brief available yet for this session.
        </p>
        {session && session.status !== 'finalized' && (
          <Link href={`/chat/${sessionId}`} className="text-blue-600 hover:underline text-sm">
            Resume chat →
          </Link>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm no-print">
        <Link href="/sessions" className="text-blue-600 hover:underline">
          ← All intakes
        </Link>
      </div>
      <BriefView sessionId={sessionId} markdown={brief.markdown} json={brief.json} />
    </div>
  );
}
