import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('wardly_intake'),

  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  TURN_CAP: z.coerce.number().int().positive().default(40),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.LLM_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set');
  process.exit(1);
}
if (env.LLM_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('LLM_PROVIDER=openai but OPENAI_API_KEY is not set');
  process.exit(1);
}

export { env };
export type Env = typeof env;
