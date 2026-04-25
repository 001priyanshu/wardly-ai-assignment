'use client';

import { useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  return (
    <div ref={ref} className="flex-1 overflow-y-auto space-y-4 px-1 py-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={[
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
              m.role === 'user'
                ? 'bg-ink text-white rounded-br-sm'
                : 'bg-white border border-slate-200 text-ink rounded-bl-sm',
            ].join(' ')}
          >
            {m.content}
            {m.pending && <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />}
          </div>
        </div>
      ))}
      {messages.length === 0 && (
        <p className="text-center text-ink-muted text-sm py-8">
          Loading your intake assistant…
        </p>
      )}
    </div>
  );
}
