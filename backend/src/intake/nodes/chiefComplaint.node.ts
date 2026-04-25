import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { ccPrompt } from '../prompts/phasePrompts.js';
import { latestUserText, runAssistantTurn, stateDigest } from './_helpers.js';
import { classifyChiefComplaint, focusedRosSystems } from '../clinical/ccSystemMap.js';

export async function chiefComplaintNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const userText = latestUserText(state);
  const cc = userText.trim().slice(0, 280);
  const ccCategory = classifyChiefComplaint(cc);
  const rosTargets = focusedRosSystems(ccCategory);

  const message = await runAssistantTurn({
    state,
    phasePrompt: ccPrompt(),
    context: stateDigest({ ...state, cc, ccCategory }),
  });

  return {
    messages: [message],
    cc,
    ccCategory,
    rosTargets,
    phase: 'hpi',
    turnsInPhase: 0,
    turnCount: state.turnCount + 1,
  };
}
