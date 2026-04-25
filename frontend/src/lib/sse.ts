import { apiBase } from './api';
import { getUid } from './uid';
import { SSE_EVENTS, type IntakePhase, type ClinicalBrief } from './types';

export interface SseHandlers {
  onToken?: (text: string) => void;
  onPhase?: (phase: IntakePhase, turnCount: number) => void;
  onAssistantMessage?: (content: string, messageId: string) => void;
  onDone?: (info: { phase: IntakePhase; finalized: boolean; brief?: { markdown: string; json: ClinicalBrief } }) => void;
  onError?: (msg: string) => void;
}

/**
 * POST a chat message and consume the SSE response. Uses fetch + ReadableStream
 * (not EventSource) because EventSource cannot send POST bodies or custom headers.
 */
export async function sendMessage(
  sessionId: string,
  content: string,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiBase}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-uid': getUid(),
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok || !res.body) {
    handlers.onError?.(`Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  const dispatch = (eventName: string, dataStr: string) => {
    let data: unknown;
    try {
      data = JSON.parse(dataStr);
    } catch {
      data = dataStr;
    }
    switch (eventName) {
      case SSE_EVENTS.Token:
        handlers.onToken?.((data as { text: string }).text);
        break;
      case SSE_EVENTS.Phase: {
        const d = data as { phase: IntakePhase; turnCount: number };
        handlers.onPhase?.(d.phase, d.turnCount);
        break;
      }
      case SSE_EVENTS.AssistantMessage: {
        const d = data as { content: string; messageId: string };
        handlers.onAssistantMessage?.(d.content, d.messageId);
        break;
      }
      case SSE_EVENTS.Done: {
        const d = data as {
          phase: IntakePhase;
          finalized: boolean;
          brief?: { markdown: string; json: ClinicalBrief };
        };
        handlers.onDone?.(d);
        break;
      }
      case SSE_EVENTS.Error:
        handlers.onError?.((data as { message: string }).message);
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    let idx = buf.indexOf('\n\n');
    while (idx !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      idx = buf.indexOf('\n\n');

      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) continue;
      dispatch(eventName, dataLines.join('\n'));
    }
  }
}
