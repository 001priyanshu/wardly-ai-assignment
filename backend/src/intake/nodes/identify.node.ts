import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { identifyPrompt } from '../prompts/phasePrompts.js';
import { latestUserText, runAssistantTurn, stateDigest } from './_helpers.js';

const MAX_IDENTIFY_RETRIES = 1; // initial ask + at most 1 follow-up; then accept and move on

/**
 * Best-effort name + DOB extraction from the latest user message.
 * Deterministic — no LLM call. Anything we miss is fine; the final brief
 * extraction will pick it up from the transcript.
 */
function extractIdentity(text: string): { name?: string; dob?: string } {
  const out: { name?: string; dob?: string } = {};

  // DOB: matches like "March 12 1978", "12 March 1978", "03/12/1978", "1978-03-12"
  const isoDob = text.match(/\b(19|20)\d{2}-\d{1,2}-\d{1,2}\b/);
  if (isoDob) out.dob = isoDob[0];
  if (!out.dob) {
    const slashDob = text.match(/\b\d{1,2}\/\d{1,2}\/(?:19|20)\d{2}\b/);
    if (slashDob) out.dob = slashDob[0];
  }
  if (!out.dob) {
    const monthDob = text.match(
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b/i,
    );
    if (monthDob) out.dob = monthDob[0];
  }

  // Name: first capitalised pair of words, ignoring DOB substring if present
  const cleaned = out.dob ? text.replace(out.dob, ' ') : text;
  const nameMatch = cleaned.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z'’-]+){1,3})\b/);
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (!/^(I|My|Hi|Hello|Hey|Doctor|Dr)\b/.test(candidate)) {
      out.name = candidate;
    }
  }

  return out;
}

export async function identifyNode(state: IntakeState): Promise<IntakeStateUpdate> {
  const userText = latestUserText(state);
  const fresh = extractIdentity(userText);

  // Merge with anything we may have already captured on a prior turn.
  const merged = {
    name: fresh.name ?? state.patient.name,
    dob: fresh.dob ?? state.patient.dob,
  };

  const haveName = !!merged.name?.trim();
  const haveDob = !!merged.dob?.trim();
  const haveBoth = haveName && haveDob;
  const giveUp = state.turnsInPhase >= MAX_IDENTIFY_RETRIES;

  // We have enough (or we've asked too many times) — move on to CC elicitation.
  if (haveBoth || giveUp) {
    const message = await runAssistantTurn({
      state,
      phasePrompt: identifyPrompt(),
      context: stateDigest({ ...state, patient: merged }),
    });
    return {
      messages: [message],
      patient: fresh, // mergeReducer in state combines this with prior turns
      phase: 'cc',
      turnsInPhase: 0,
      turnCount: state.turnCount + 1,
    };
  }

  // Otherwise: stay in identify and ask specifically for whichever piece is missing.
  const askingFor = !haveName ? 'name' : 'date of birth';
  const haveAlready = haveName ? `their name (${merged.name})` : `their date of birth`;
  const followupPrompt = `Phase: IDENTIFY (follow-up).
The patient gave ${haveAlready} but did NOT share their ${askingFor}. Acknowledge briefly what they shared (e.g. address them by name once if you have it) and then ask only for their ${askingFor} in a single short, natural sentence. Do NOT yet ask the chief-complaint question. Vary your phrasing — examples: "Thanks${haveName ? `, ${merged.name?.split(' ')[0]}` : ''} — could I also get your date of birth?", "And what's your date of birth?". Keep it warm, not formal.`;

  const message = await runAssistantTurn({
    state,
    phasePrompt: followupPrompt,
    context: stateDigest({ ...state, patient: merged }),
  });

  return {
    messages: [message],
    patient: fresh,
    phase: 'identify',
    turnsInPhase: state.turnsInPhase + 1,
    turnCount: state.turnCount + 1,
  };
}
