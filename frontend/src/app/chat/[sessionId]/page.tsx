'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatComposer } from '@/components/ChatComposer';
import { MessageList, type ChatMessage } from '@/components/MessageList';
import { PhaseStepper } from '@/components/PhaseStepper';
import { finalizeSession, getSession } from '@/lib/api';
import { sendMessage } from '@/lib/sse';
import type { IntakePhase } from '@/lib/types';

const FINALIZE_AVAILABLE_AT = 12; // turns

export default function ChatPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<IntakePhase>('greet');
  const [turnCount, setTurnCount] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const streamingIdRef = useRef<string | null>(null);
  const initStartedRef = useRef(false);

  const newId = () => `m_${Math.random().toString(36).slice(2)}`;

  const handleStream = useCallback(
    async (content: string) => {
      if (streaming) return;
      setError(null);
      setStreaming(true);

      if (content) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'user', content },
        ]);
      }
      const placeholderId = newId();
      streamingIdRef.current = placeholderId;
      setMessages((prev) => [
        ...prev,
        { id: placeholderId, role: 'assistant', content: '', pending: true },
      ]);

      try {
        await sendMessage(sessionId, content, {
          onToken: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? { ...m, content: m.content + text }
                  : m,
              ),
            );
          },
          onPhase: (p, t) => {
            setPhase(p);
            setTurnCount(t);
          },
          onAssistantMessage: (full, mid) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? { id: mid, role: 'assistant', content: full, pending: false }
                  : m,
              ),
            );
          },
          onError: (msg) => setError(msg),
          onDone: (info) => {
            setPhase(info.phase);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current && m.pending
                  ? { ...m, pending: false }
                  : m,
              ),
            );
            if (info.finalized) {
              router.push(`/sessions/${sessionId}`);
            }
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stream failed');
      } finally {
        setStreaming(false);
        streamingIdRef.current = null;
      }
    },
    [router, sessionId, streaming],
  );

  // Bootstrap: fetch existing session, replay messages, kick off greet if empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await getSession(sessionId);
        if (cancelled) return;
        setPhase(detail.phase);
        setMessages(
          detail.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
        );
        if (detail.status === 'finalized') {
          router.replace(`/sessions/${sessionId}`);
          return;
        }
        if (detail.messages.length === 0 && !initStartedRef.current) {
          initStartedRef.current = true;
          // Trigger the greeting (empty body is allowed only at greet phase)
          void handleStream('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const onFinalize = async () => {
    setFinalizing(true);
    try {
      await finalizeSession(sessionId);
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finalize failed');
      setFinalizing(false);
    }
  };

  const canFinalize =
    !streaming &&
    !finalizing &&
    (phase === 'finalize' || phase === 'done' || turnCount >= FINALIZE_AVAILABLE_AT);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <PhaseStepper phase={phase} />
        <div className="ml-auto flex items-center gap-2">
          <Link href="/sessions" className="text-xs text-ink-muted hover:text-ink underline">
            All intakes
          </Link>
          <button
            onClick={onFinalize}
            disabled={!canFinalize}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 disabled:opacity-50 hover:bg-white"
            title={
              canFinalize
                ? 'Generate the clinical brief now'
                : 'Available once enough has been gathered'
            }
          >
            {finalizing ? 'Finalising…' : 'Finalise & generate brief'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col bg-slate-100 rounded-lg border min-h-0">
        <MessageList messages={messages} />
        <ChatComposer
          onSend={handleStream}
          disabled={streaming || finalizing || phase === 'done'}
          placeholder={
            phase === 'done'
              ? 'Intake complete — review your brief.'
              : streaming
                ? 'Assistant is replying…'
                : 'Type your reply…'
          }
        />
      </div>
    </div>
  );
}
