import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { getMongoClient } from '../db/client.js';
import { env } from '../config/env.js';

let saver: MongoDBSaver | null = null;

export function getCheckpointer(): MongoDBSaver {
  if (saver) return saver;
  saver = new MongoDBSaver({
    client: getMongoClient(),
    dbName: env.MONGODB_DB,
    checkpointCollectionName: 'langgraph_checkpoints',
    checkpointWritesCollectionName: 'langgraph_checkpoint_writes',
  });
  return saver;
}
