import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '../client.js';

export interface MessageDoc {
  _id: ObjectId;
  sessionId: ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  createdAt: Date;
}

const coll = (): Collection<MessageDoc> => getDb().collection<MessageDoc>('messages');

export async function appendMessage(input: {
  sessionId: string;
  role: MessageDoc['role'];
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}): Promise<MessageDoc> {
  const doc: MessageDoc = {
    _id: new ObjectId(),
    sessionId: new ObjectId(input.sessionId),
    role: input.role,
    content: input.content,
    tokensIn: input.tokensIn,
    tokensOut: input.tokensOut,
    createdAt: new Date(),
  };
  await coll().insertOne(doc);
  return doc;
}

export async function listMessagesBySession(sessionId: string): Promise<MessageDoc[]> {
  if (!ObjectId.isValid(sessionId)) return [];
  return coll()
    .find({ sessionId: new ObjectId(sessionId) })
    .sort({ createdAt: 1 })
    .toArray();
}
