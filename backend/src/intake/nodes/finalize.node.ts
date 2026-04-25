import { SystemMessage } from '@langchain/core/messages';
import {
  ClinicalBriefExtractionSchema,
  type ClinicalBrief,
} from '../../shared/brief.schema.js';
import { getModelName, getProvider, getStructuredModel } from '../../llm/factory.js';
import type { IntakeState, IntakeStateUpdate } from '../state.js';
import { finalizeExtractionPrompt } from '../prompts/finalizePrompt.js';

const DISCLAIMER =
  'Patient-reported during pre-visit intake. Not validated against medical record. For clinical use only.';

/**
 * Calls the structured-output model against the full transcript to produce
 * a ClinicalBrief. On parse failure, retries once with the validation error
 * appended; on second failure, returns a partial brief with a warning.
 */
export async function extractBrief(
  state: IntakeState,
  sessionId: string,
): Promise<ClinicalBrief> {
  const structured = getStructuredModel(ClinicalBriefExtractionSchema, 'clinical_brief');
  const system = new SystemMessage(finalizeExtractionPrompt);

  const provider = getProvider();
  const model = getModelName();
  const generatedAt = new Date().toISOString();

  const baseMeta: ClinicalBrief['meta'] = {
    sessionId,
    generatedAt,
    model,
    provider,
    disclaimer: DISCLAIMER,
    warnings: [],
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages = attempt === 0
        ? [system, ...state.messages]
        : [
            system,
            new SystemMessage(
              `Your previous output failed schema validation: ${lastError}. Return a corrected object that conforms exactly.`,
            ),
            ...state.messages,
          ];

      const raw = (await structured.invoke(messages)) as Record<string, unknown>;
      const parsed = ClinicalBriefExtractionSchema.parse(raw);

      const warnings = [
        ...parsed.modelWarnings,
        ...(state.emergencyEscalation ? ['Emergency escalation advised during chat.'] : []),
      ];

      const { modelWarnings: _drop, ...rest } = parsed;
      return { meta: { ...baseMeta, warnings }, ...rest } as ClinicalBrief;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  // Both attempts failed — return a minimal valid brief flagged as degraded.
  return {
    meta: {
      ...baseMeta,
      warnings: [
        'Structured extraction failed after retry. Brief may be incomplete; please review the transcript.',
        ...(lastError ? [`Last error: ${lastError.slice(0, 200)}`] : []),
      ],
    },
    patient: {
      name: state.patient.name ?? null,
      dob: state.patient.dob ?? null,
    },
    chiefComplaint: {
      statement: state.cc ?? '(not captured)',
      duration: null,
      category: state.ccCategory ?? 'other',
    },
    hpi: {
      onset: null,
      provocation: null,
      palliation: null,
      quality: null,
      region: null,
      radiation: null,
      severity: null,
      timing: null,
      associatedSymptoms: [],
      modifyingFactors: [],
      priorEpisodes: null,
      currentMedicationsForIssue: [],
      narrative: 'Brief generation failed; review transcript directly.',
    },
    ros: [],
    redFlagScreen: [],
    patientConfirmation: {
      summaryReadBack: '',
      confirmed: state.readBackConfirmed,
      corrections: [],
    },
    triageImpression: {
      acuityHint: 'soon',
      rationale: 'Insufficient structured data; review transcript for clinical assessment.',
      suggestedNextStep: 'Clinician review of intake transcript before visit.',
    },
    clinicianNotes: null,
  };
}

/**
 * Graph node wrapper. The actual brief persistence is handled by the route
 * (it has the sessionId and Mongo access). This node simply marks phase=done.
 */
export async function finalizeNode(state: IntakeState): Promise<IntakeStateUpdate> {
  return {
    phase: 'done',
    turnsInPhase: 0,
  };
}
