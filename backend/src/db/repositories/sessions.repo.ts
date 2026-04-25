import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '../client.js';
import type { ClinicalBrief, IntakePhase } from '../../shared/brief.schema.js';

export interface SessionDoc {
  _id: ObjectId;
  uid: string;
  status: 'active' | 'finalized' | 'abandoned';
  patient: { name?: string | null; dob?: string | null };
  phase: IntakePhase;
  cc: string | null;
  brief: {
    markdown: string;
    json: ClinicalBrief;
    model: string;
    provider: 'anthropic' | 'openai';
    generatedAt: Date;
  } | null;
  llmProvider: 'anthropic' | 'openai';
  llmModel: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
}

const coll = (): Collection<SessionDoc> => getDb().collection<SessionDoc>('sessions');

export async function createSession(input: {
  uid: string;
  llmProvider: 'anthropic' | 'openai';
  llmModel: string;
}): Promise<SessionDoc> {
  const now = new Date();
  const doc: SessionDoc = {
    _id: new ObjectId(),
    uid: input.uid,
    status: 'active',
    patient: {},
    phase: 'greet',
    cc: null,
    brief: null,
    llmProvider: input.llmProvider,
    llmModel: input.llmModel,
    createdAt: now,
    updatedAt: now,
    finalizedAt: null,
  };
  await coll().insertOne(doc);
  return doc;
}

export async function findSessionById(id: string, uid?: string): Promise<SessionDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const q: Record<string, unknown> = { _id: new ObjectId(id) };
  if (uid) q.uid = uid;
  return coll().findOne(q);
}

export async function listSessionsByUid(uid: string, limit = 50): Promise<SessionDoc[]> {
  return coll()
    .find({ uid })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function patchSession(
  id: string,
  patch: Partial<Pick<SessionDoc, 'phase' | 'cc' | 'patient' | 'status' | 'brief' | 'finalizedAt'>>,
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  await coll().updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
  );
}

export async function finalizeSession(
  id: string,
  brief: NonNullable<SessionDoc['brief']>,
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const now = new Date();
  await coll().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        brief,
        status: 'finalized',
        phase: 'done',
        finalizedAt: now,
        updatedAt: now,
      },
    },
  );
}
