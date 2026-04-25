import { AIMessage, SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { getChatModel } from '../../llm/factory.js';
import { PERSONA, RULES } from '../prompts/persona.js';
import type { IntakeState } from '../state.js';

export const ASSISTANT_TURN_TAG = 'assistant_stream';

const HISTORY_WINDOW = 30;

function buildSystemPrompt(phasePrompt: string, context?: string): SystemMessage {
  const parts = [PERSONA, RULES, phasePrompt];
  if (context) parts.push(context);
  return new SystemMessage(parts.join('\n\n'));
}

/**
 * Runs one streaming LLM call to produce the next assistant message for the
 * current phase. Returns the AI message ready to be appended to state.messages.
 *
 * The model invocation is tagged so the SSE route handler can capture
 * on_chat_model_stream events and forward tokens to the client.
 */
export async function runAssistantTurn(args: {
  state: IntakeState;
  phasePrompt: string;
  context?: string;
}): Promise<AIMessage> {
  const model = getChatModel({ streaming: true, temperature: 0.4, maxTokens: 400 });
  const system = buildSystemPrompt(args.phasePrompt, args.context);
  const history = (args.state.messages as BaseMessage[]).slice(-HISTORY_WINDOW);

  const result = await model
    .withConfig({ runName: 'assistant_turn', tags: [ASSISTANT_TURN_TAG] })
    .invoke([system, ...history]);

  const text =
    typeof result.content === 'string'
      ? result.content
      : (result.content as Array<{ type?: string; text?: string }>)
          .map((c) => c.text ?? '')
          .join('');
  return new AIMessage({ content: text });
}

/** Latest user message text (or empty string if none yet). */
export function latestUserText(state: IntakeState): string {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (m instanceof HumanMessage) {
      return typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    }
  }
  return '';
}

/**
 * Builds a small "context digest" string injected into the system prompt
 * so the LLM has cheap awareness of patient identity + chief complaint.
 */
export function stateDigest(state: IntakeState): string {
  const lines: string[] = [];
  if (state.patient.name || state.patient.dob) {
    const p: string[] = [];
    if (state.patient.name) p.push(state.patient.name);
    if (state.patient.dob) p.push(`DOB ${state.patient.dob}`);
    lines.push(`Patient: ${p.join(' · ')}`);
  }
  if (state.cc) lines.push(`Chief complaint (already captured): ${state.cc}`);
  if (state.ccCategory) lines.push(`CC category: ${state.ccCategory}`);
  return lines.length ? `Conversation context:\n${lines.join('\n')}` : '';
}
