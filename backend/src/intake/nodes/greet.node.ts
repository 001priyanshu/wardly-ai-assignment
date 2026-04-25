import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { greetPrompt } from '../prompts/phasePrompts.js';
import { runAssistantTurn } from './_helpers.js';

export async function greetNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const message = await runAssistantTurn({ state, phasePrompt: greetPrompt() });
  return {
    messages: [message],
    phase: 'identify',
    turnsInPhase: 0,
    turnCount: state.turnCount + 1,
  };
}
