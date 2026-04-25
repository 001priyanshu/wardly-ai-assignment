import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { hpiPrompt } from '../prompts/phasePrompts.js';
import { runAssistantTurn, stateDigest } from './_helpers.js';

const HPI_TURN_TARGET = 5; // covers most OPQRST when grouped naturally

export async function hpiNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const turnsInPhase = state.turnsInPhase;
  const message = await runAssistantTurn({
    state,
    phasePrompt: hpiPrompt(turnsInPhase),
    context: stateDigest(state),
  });

  const nextTurnsInPhase = turnsInPhase + 1;
  const advance = nextTurnsInPhase >= HPI_TURN_TARGET;

  return {
    messages: [message],
    phase: advance ? 'ros' : 'hpi',
    turnsInPhase: advance ? 0 : nextTurnsInPhase,
    turnCount: state.turnCount + 1,
  };
}
