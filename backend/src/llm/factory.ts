import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { ZodTypeAny } from 'zod';
import { env } from '../config/env.js';

export type Provider = 'anthropic' | 'openai';

export interface ChatModelOptions {
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
}

export function getProvider(): Provider {
  return env.LLM_PROVIDER;
}

export function getModelName(): string {
  return env.LLM_PROVIDER === 'anthropic' ? env.ANTHROPIC_MODEL : env.OPENAI_MODEL;
}

export function getChatModel(opts: ChatModelOptions = {}): BaseChatModel {
  const { temperature = 0.3, streaming = true, maxTokens = 1024 } = opts;
  if (env.LLM_PROVIDER === 'anthropic') {
    return new ChatAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
      temperature,
      streaming,
      maxTokens,
    });
  }
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    temperature,
    streaming,
    maxTokens,
  });
}

/**
 * Returns a model bound to a structured-output schema.
 * Wraps Anthropic tool_use and OpenAI strict json_schema behind one call.
 */
export function getStructuredModel<T extends ZodTypeAny>(
  schema: T,
  schemaName: string,
): ReturnType<BaseChatModel['withStructuredOutput']> {
  const base = getChatModel({ temperature: 0, streaming: false, maxTokens: 4096 });
  return base.withStructuredOutput(schema, { name: schemaName });
}
