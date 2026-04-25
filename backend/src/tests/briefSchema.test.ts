import { describe, expect, it } from 'vitest';
import { ClinicalBriefSchema, ClinicalBriefExtractionSchema } from '../shared/brief.schema.js';

describe('ClinicalBriefSchema', () => {
  it('rejects missing required fields', () => {
    const result = ClinicalBriefSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts a valid minimal brief', () => {
    const min = {
      meta: {
        sessionId: 's',
        generatedAt: 'now',
        model: 'm',
        provider: 'anthropic',
        disclaimer: 'd',
        warnings: [],
      },
      patient: { name: null, dob: null },
      chiefComplaint: { statement: 'x', duration: null, category: 'other' },
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
        narrative: 'n',
      },
      ros: [],
      redFlagScreen: [],
      patientConfirmation: { summaryReadBack: '', confirmed: false, corrections: [] },
      triageImpression: {
        acuityHint: 'routine',
        rationale: 'r',
        suggestedNextStep: 'n',
      },
      clinicianNotes: null,
    };
    expect(ClinicalBriefSchema.safeParse(min).success).toBe(true);
  });

  it('extraction schema omits meta', () => {
    const keys = Object.keys(ClinicalBriefExtractionSchema.shape);
    expect(keys).not.toContain('meta');
    expect(keys).toContain('chiefComplaint');
    expect(keys).toContain('modelWarnings');
  });
});
