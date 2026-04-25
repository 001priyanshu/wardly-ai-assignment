'use client';

import { type IntakePhase, PHASE_LABELS, PHASE_ORDER } from '@/lib/types';

const VISIBLE_PHASES: IntakePhase[] = [
  'greet',
  'identify',
  'cc',
  'hpi',
  'ros',
  'redFlags',
  'readBack',
  'done',
];

export function PhaseStepper({ phase }: { phase: IntakePhase }) {
  const currentIndex = PHASE_ORDER.indexOf(phase);
  return (
    <ol className="flex flex-wrap gap-1.5 text-xs">
      {VISIBLE_PHASES.map((p) => {
        const idx = PHASE_ORDER.indexOf(p);
        const reached = idx <= currentIndex || (phase === 'finalize' && p === 'done');
        const active = p === phase || (phase === 'finalize' && p === 'done');
        return (
          <li
            key={p}
            className={[
              'px-2 py-1 rounded border',
              active
                ? 'bg-ink text-white border-ink'
                : reached
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-ink-muted border-slate-200',
            ].join(' ')}
          >
            {PHASE_LABELS[p]}
          </li>
        );
      })}
    </ol>
  );
}
