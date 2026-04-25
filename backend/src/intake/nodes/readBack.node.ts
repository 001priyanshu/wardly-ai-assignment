import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { readBackPrompt, finalizingPrompt } from '../prompts/phasePrompts.js';
import { latestUserText, runAssistantTurn, stateDigest } from './_helpers.js';

const AFFIRMATIVE =
  /\b(yes|yeah|yep|yup|sure|correct|right|that'?s right|sounds (right|good|correct)|all good|looks (right|good|correct)|accurate|confirm(ed)?|acknowledg(e|ed|ing)|approve|go ahead|generate)\b/i;
const NEGATIVE =
  /\b(no|nope|not (quite|really|right|exactly)|wrong|incorrect|change|fix|update|actually|but|except|missed|forgot)\b/i;

const MAX_RESUMMARISE = 4; // safety cap on read-back loops before we just finalize

function classifyResponse(text: string): 'confirm' | 'correct' | 'unclear' {
  if (!text.trim()) return 'unclear';
  const aff = AFFIRMATIVE.test(text);
  const neg = NEGATIVE.test(text);
  if (aff && !neg) return 'confirm';
  if (neg) return 'correct';
  // Short replies like "ok" / "sure" without a negative cue → treat as confirm
  if (text.trim().length < 16 && aff) return 'confirm';
  return 'unclear';
}

export async function readBackNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const turnsInPhase = state.turnsInPhase;

  // First entry: produce the initial summary and ask for acknowledgment.
  if (turnsInPhase === 0) {
    const message = await runAssistantTurn({
      state,
      phasePrompt: readBackPrompt(false),
      context: stateDigest(state),
    });
    return {
      messages: [message],
      phase: 'readBack',
      turnsInPhase: 1,
      turnCount: state.turnCount + 1,
    };
  }

  // Subsequent entries: classify the user's reply.
  const verdict = classifyResponse(latestUserText(state));

  // Patient acknowledged → produce a short closing message and advance to finalize.
  if (verdict === 'confirm') {
    const message = await runAssistantTurn({
      state,
      phasePrompt: finalizingPrompt(),
      context: stateDigest(state),
    });
    return {
      messages: [message],
      phase: 'finalize',
      turnsInPhase: 0,
      readBackConfirmed: true,
      turnCount: state.turnCount + 1,
    };
  }

  // Safety cap — too many round-trips, just finalize with what we have.
  if (turnsInPhase >= MAX_RESUMMARISE) {
    const message = await runAssistantTurn({
      state,
      phasePrompt: `Phase: WRAP-UP (forced).
Tell the patient warmly that you'll prepare the brief now and the clinician can address any remaining questions. Keep it to one or two sentences. Do NOT ask any new questions.`,
      context: stateDigest(state),
    });
    return {
      messages: [message],
      phase: 'finalize',
      turnsInPhase: 0,
      readBackConfirmed: false,
      warnings: ['Read-back loop exceeded; patient did not give a clear acknowledgment.'],
      turnCount: state.turnCount + 1,
    };
  }

  // Patient pushed back OR reply was unclear — re-produce an updated summary
  // that incorporates whatever they just said (the LLM has the full transcript,
  // so it will fold the correction in), then ask again for acknowledgment.
  const message = await runAssistantTurn({
    state,
    phasePrompt: readBackPrompt(true),
    context: stateDigest(state),
  });
  return {
    messages: [message],
    phase: 'readBack',
    turnsInPhase: turnsInPhase + 1,
    turnCount: state.turnCount + 1,
  };
}
