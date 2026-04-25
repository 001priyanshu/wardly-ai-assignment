import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { redFlagsPrompt } from '../prompts/phasePrompts.js';
import { runAssistantTurn, stateDigest } from './_helpers.js';
import { redFlagsForCategory } from '../clinical/redFlagRules.js';

export async function redFlagScreenNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const category = state.ccCategory ?? 'other';
  const rules = redFlagsForCategory(category);
  const remaining = rules.filter((r) => !state.redFlagsAsked.includes(r.flag));

  const askingNow = remaining[0];

  const message = await runAssistantTurn({
    state,
    phasePrompt: redFlagsPrompt(category, state.redFlagsAsked),
    context: stateDigest(state),
  });

  const newlyAsked = askingNow ? [askingNow.flag] : [];
  const noneRemainingAfter = remaining.length <= 1;

  return {
    messages: [message],
    redFlagsAsked: newlyAsked,
    phase: noneRemainingAfter ? 'readBack' : 'redFlags',
    turnsInPhase: noneRemainingAfter ? 0 : state.turnsInPhase + 1,
    turnCount: state.turnCount + 1,
  };
}
