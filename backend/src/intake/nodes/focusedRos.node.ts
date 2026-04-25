import type { IntakeState, IntakeStateUpdate } from '../state.js';
import type { RosSystem } from '../../shared/brief.schema.js';
import { rosPrompt } from '../prompts/phasePrompts.js';
import { runAssistantTurn, stateDigest } from './_helpers.js';

export async function focusedRosNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const category = state.ccCategory ?? 'other';
  const remaining: RosSystem[] = state.rosTargets.filter(
    (s) => !state.rosCovered.includes(s),
  );

  // Pick the next system to ask about (the head of remaining)
  const askingNow = remaining[0];

  const message = await runAssistantTurn({
    state,
    phasePrompt: rosPrompt(category, remaining),
    context: stateDigest(state),
  });

  // Mark this system as covered for the next turn — the question went out, the
  // patient's answer becomes part of the transcript and is extracted at finalize.
  const newlyCovered = askingNow ? [askingNow] : [];
  const noneRemainingAfter = remaining.length <= 1;

  return {
    messages: [message],
    rosCovered: newlyCovered,
    phase: noneRemainingAfter ? 'redFlags' : 'ros',
    turnsInPhase: noneRemainingAfter ? 0 : state.turnsInPhase + 1,
    turnCount: state.turnCount + 1,
  };
}
