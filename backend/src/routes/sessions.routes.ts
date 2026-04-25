import { Router } from 'express';
import { z } from 'zod';
import { BadRequest, NotFound } from '../lib/errors.js';
import { getModelName, getProvider } from '../llm/factory.js';
import {
  createSession,
  findSessionById,
  finalizeSession,
  listSessionsByUid,
  patchSession,
} from '../db/repositories/sessions.repo.js';
import { listMessagesBySession } from '../db/repositories/messages.repo.js';
import { renderBriefMarkdown } from '../intake/clinical/briefRenderer.js';
import { extractBrief } from '../intake/nodes/finalize.node.js';
import { getIntakeGraph } from '../intake/graph.js';
import type { IntakeState } from '../intake/state.js';
import type { SessionDetail, SessionListItem } from '../shared/transport.js';

export const sessionsRouter = Router();

const StartBody = z.object({
  patientName: z.string().trim().min(1).max(120).optional(),
  dob: z.string().trim().min(1).max(40).optional(),
});

sessionsRouter.post('/sessions', async (req, res, next) => {
  try {
    const body = StartBody.parse(req.body ?? {});
    const session = await createSession({
      uid: req.uid,
      llmProvider: getProvider(),
      llmModel: getModelName(),
    });
    if (body.patientName || body.dob) {
      await patchSession(session._id.toString(), {
        patient: { name: body.patientName ?? null, dob: body.dob ?? null },
      });
    }
    res.status(201).json({ sessionId: session._id.toString() });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await listSessionsByUid(req.uid);
    const items: SessionListItem[] = sessions.map((s) => ({
      id: s._id.toString(),
      status: s.status,
      phase: s.phase,
      cc: s.cc,
      patientName: s.patient.name ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      finalizedAt: s.finalizedAt ? s.finalizedAt.toISOString() : null,
    }));
    res.json({ sessions: items });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await findSessionById(req.params.id, req.uid);
    if (!session) throw NotFound('Session not found');
    const messages = await listMessagesBySession(req.params.id);
    const detail: SessionDetail = {
      id: session._id.toString(),
      status: session.status,
      phase: session.phase,
      cc: session.cc,
      patientName: session.patient.name ?? null,
      patient: { name: session.patient.name ?? null, dob: session.patient.dob ?? null },
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      finalizedAt: session.finalizedAt ? session.finalizedAt.toISOString() : null,
      brief: session.brief
        ? { markdown: session.brief.markdown, json: session.brief.json }
        : null,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/sessions/:id/brief', async (req, res, next) => {
  try {
    const session = await findSessionById(req.params.id, req.uid);
    if (!session) throw NotFound('Session not found');
    if (!session.brief) throw NotFound('Brief not yet generated for this session');
    res.json({ markdown: session.brief.markdown, json: session.brief.json });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post('/sessions/:id/finalize', async (req, res, next) => {
  try {
    const session = await findSessionById(req.params.id, req.uid);
    if (!session) throw NotFound('Session not found');
    if (session.brief) {
      res.json({ markdown: session.brief.markdown, json: session.brief.json });
      return;
    }

    const graph = getIntakeGraph();
    const config = { configurable: { thread_id: session._id.toString() } };
    const snapshot = await graph.getState(config);
    const state = snapshot.values as IntakeState;
    if (!state || !state.messages || state.messages.length === 0) {
      throw BadRequest('Session has no transcript yet — cannot finalize');
    }

    const briefJson = await extractBrief(state, session._id.toString());
    const markdown = renderBriefMarkdown(briefJson);

    await finalizeSession(session._id.toString(), {
      markdown,
      json: briefJson,
      model: briefJson.meta.model,
      provider: briefJson.meta.provider,
      generatedAt: new Date(briefJson.meta.generatedAt),
    });

    res.json({ markdown, json: briefJson });
  } catch (err) {
    next(err);
  }
});
