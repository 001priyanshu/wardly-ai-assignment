'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ClinicalBrief } from '@/lib/types';

const ACUITY_STYLES: Record<string, string> = {
  emergent: 'bg-rose-100 text-rose-800 ring-rose-200',
  urgent: 'bg-orange-100 text-orange-800 ring-orange-200',
  soon: 'bg-amber-100 text-amber-800 ring-amber-200',
  routine: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

export function BriefView({
  sessionId,
  markdown,
  json,
}: {
  sessionId: string;
  markdown: string;
  json: ClinicalBrief;
}) {
  const [tab, setTab] = useState<'clinician' | 'json'>('clinician');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = tab === 'clinician' ? markdown : JSON.stringify(json, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 brief-print">
      {/* Sticky action toolbar — kept light to preserve a clinical document feel */}
      <div className="no-print flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-2 -mx-4 px-4 border-b border-slate-200">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${
            ACUITY_STYLES[json.triageImpression.acuityHint] ?? ''
          }`}
          title={`Acuity hint: ${json.triageImpression.acuityHint}`}
        >
          {json.triageImpression.acuityHint.toUpperCase()}
        </span>

        <div className="rounded-md border border-slate-300 overflow-hidden text-xs">
          <button
            onClick={() => setTab('clinician')}
            className={`px-3 py-1.5 ${
              tab === 'clinician' ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:bg-slate-50'
            }`}
          >
            Clinician view
          </button>
          <button
            onClick={() => setTab('json')}
            className={`px-3 py-1.5 ${
              tab === 'json' ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:bg-slate-50'
            }`}
          >
            JSON
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/sessions/${sessionId}/transcript`}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-white text-ink-muted hover:text-ink"
          >
            Transcript
          </Link>
          <button
            onClick={copy}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-white"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-white"
          >
            Print
          </button>
        </div>
      </div>

      {json.meta.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 no-print">
          <strong>Warnings:</strong> {json.meta.warnings.join(' · ')}
        </div>
      )}

      {tab === 'clinician' ? (
        <article className="markdown bg-white border border-slate-200 rounded-xl shadow-sm p-8 sm:p-10 max-w-3xl mx-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      ) : (
        <pre className="bg-slate-900 text-slate-100 rounded-xl p-5 text-xs overflow-x-auto max-w-3xl mx-auto">
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </div>
  );
}
