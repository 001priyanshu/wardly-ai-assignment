import { Router } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { env } from '../config/env.js';
import { BadRequest, Conflict, NotFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { openSse } from '../lib/sse.js';
import { ASSISTANT_TURN_TAG } from '../intake/nodes/_helpers.js';
import { getIntakeGraph } from '../intake/graph.js';
import { extractBrief } from '../intake/nodes/finalize.node.js';
import { renderBriefMarkdown } from '../intake/clinical/briefRenderer.js';
import {
  finalizeSession,
  findSessionById,
  patchSession,
} from '../db/repositories/sessions.repo.js';
import { appendMessage } from '../db/repositories/messages.repo.js';
import { SSE_EVENTS } from '../shared/transport.js';
import type { IntakeState } from '../intake/state.js';

export const messagesRouter = Router();

const Body = z.object({
  content: z.string().max(4000).default(''),
});

messagesRouter.post('/sessions/:id/messages', async (req, res, next) => {
  const session = await findSessionById(req.params.id, req.uid);
  if (!session) return next(NotFound('Session not found'));
  if (session.status === 'finalized') {
    return next(Conflict('Session already finalized'));
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(req.body ?? {});
  } catch (err) {
    return next(BadRequest('Invalid body', err));
  }

  const sse = openSse(res);
  const sessionId = session._id.toString();
  const log = logger.child({ sessionId, uid: req.uid });

  // The very first turn (greeting) is the only case where empty body is allowed.
  const isFirstTurn = session.phase === 'greet';
  const userText = body.content.trim();
  if (!isFirstTurn && userText.length === 0) {
    sse.event(SSE_EVENTS.Error, { message: 'Message content required.' });
    sse.close();
    return;
  }

  // Persist the user message before we do anything that can fail.
  if (userText.length > 0) {
    await appendMessage({ sessionId, role: 'user', content: userText });
  }

  const graph = getIntakeGraph();
  const config = {
    configurable: { thread_id: sessionId },
    version: 'v2' as const,
  };

  // Build the input to merge into graph state. messagesStateReducer appends.
  const input = userText.length > 0
    ? { messages: [new HumanMessage({ content: userText })] }
    : { messages: [] };

  let assistantBuf = '';
  let aborted = false;
  req.on('close', () => {
    aborted = true;
    log.info('client disconnected mid-stream');
  });

  try {
    const eventStream = graph.streamEvents(input, config);
    for await (const ev of eventStream) {
      if (aborted) break;
      const tags = (ev.tags ?? []) as string[];
      if (ev.event === 'on_chat_model_stream' && tags.includes(ASSISTANT_TURN_TAG)) {
        const data = ev.data as { chunk?: { content?: unknown } } | undefined;
        const chunk = data?.chunk;
        if (!chunk) continue;
        const text =
          typeof chunk.content === 'string'
            ? chunk.content
            : Array.isArray(chunk.content)
              ? (chunk.content as Array<{ type?: string; text?: string }>)
                  .map((c) => (c.type === 'text' ? c.text ?? '' : ''))
                  .join('')
              : '';
        if (text) {
          assistantBuf += text;
          sse.event(SSE_EVENTS.Token, { text });
        }
      }
    }

    // Read final state from checkpointer
    const snap = await graph.getState(config);
    const finalState = snap.values as IntakeState;

    // Persist the assistant message (full text). If client disconnected mid-stream,
    // we still capture what we accumulated up to that point.
    if (assistantBuf.trim().length > 0) {
      const persisted = await appendMessage({
        sessionId,
        role: 'assistant',
        content: assistantBuf,
      });
      sse.event(SSE_EVENTS.AssistantMessage, {
        content: assistantBuf,
        messageId: persisted._id.toString(),
      });
    }

    // Update denormalised session fields used for list views.
    await patchSession(sessionId, {
      phase: finalState.phase,
      cc: finalState.cc,
      patient: finalState.patient,
    });

    // Emit phase update for the UI's phase stepper
    sse.event(SSE_EVENTS.Phase, {
      phase: finalState.phase,
      turnCount: finalState.turnCount,
    });

    // Hard turn cap safety net — force finalize.
    let mustFinalize = finalState.phase === 'finalize' || finalState.turnCount >= env.TURN_CAP;

    if (mustFinalize) {
      try {
        const briefJson = await extractBrief(finalState, sessionId);
        const markdown = renderBriefMarkdown(briefJson);
        await finalizeSession(sessionId, {
          markdown,
          json: briefJson,
          model: briefJson.meta.model,
          provider: briefJson.meta.provider,
          generatedAt: new Date(briefJson.meta.generatedAt),
        });
        sse.event(SSE_EVENTS.Done, {
          phase: 'done',
          finalized: true,
          brief: { markdown, json: briefJson },
        });
        sse.close();
        return;
      } catch (err) {
        log.error({ err }, 'finalize failed');
        sse.event(SSE_EVENTS.Error, {
          message: 'Brief generation failed. You can retry from the Finalize button.',
        });
      }
    }

    sse.event(SSE_EVENTS.Done, { phase: finalState.phase, finalized: false });
    sse.close();
  } catch (err) {
    log.error({ err }, 'graph step failed');
    sse.event(SSE_EVENTS.Error, {
      message: err instanceof Error ? err.message : 'Unexpected error',
    });
    sse.close();
  }
});
