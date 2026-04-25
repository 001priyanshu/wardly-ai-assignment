import { MongoClient, type Db } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env.MONGODB_URI, { ignoreUndefined: true });
  await client.connect();
  db = client.db(env.MONGODB_DB);
  logger.info({ db: env.MONGODB_DB }, 'mongo connected');

  // Indexes (idempotent)
  await Promise.all([
    db.collection('sessions').createIndex({ uid: 1, createdAt: -1 }),
    db.collection('sessions').createIndex({ status: 1 }),
    db.collection('messages').createIndex({ sessionId: 1, createdAt: 1 }),
  ]);

  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Mongo not connected');
  return db;
}

export function getMongoClient(): MongoClient {
  if (!client) throw new Error('Mongo not connected');
  return client;
}

export async function pingMongo(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
