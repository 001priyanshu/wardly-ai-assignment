import { Router } from 'express';
import { pingMongo } from '../db/client.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const mongoOk = await pingMongo();
  const llmKeyOk =
    env.LLM_PROVIDER === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.OPENAI_API_KEY;
  const ok = mongoOk && llmKeyOk;
  res.status(ok ? 200 : 503).json({
    ok,
    mongo: mongoOk,
    llm: { provider: env.LLM_PROVIDER, keyConfigured: llmKeyOk },
  });
});
