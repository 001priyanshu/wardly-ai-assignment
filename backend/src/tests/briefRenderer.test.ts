import { describe, expect, it } from 'vitest';
import type { ClinicalBrief } from '../shared/brief.schema.js';
import { renderBriefMarkdown } from '../intake/clinical/briefRenderer.js';

const fixture: ClinicalBrief = {
  meta: {
    sessionId: 'sess_1',
    generatedAt: '2026-04-25T14:30:00Z',
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    disclaimer: 'Patient-reported during pre-visit intake.',
    warnings: [],
  },
  patient: { name: 'Maria Lopez', dob: '1978-03-12' },
  chiefComplaint: {
    statement: 'Chest pressure since yesterday morning.',
    duration: '~1 day',
    category: 'cardiovascular',
  },
  hpi: {
    onset: 'yesterday morning',
    provocation: 'climbing stairs',
    palliation: 'rest',
    quality: 'pressure',
    region: 'substernal',
    radiation: 'left arm',
    severity: '6/10',
    timing: 'intermittent, 5–10 min episodes',
    associatedSymptoms: ['mild dyspnea on exertion'],
    modifyingFactors: ['rest improves'],
    priorEpisodes: null,
    currentMedicationsForIssue: [],
    narrative:
      '47-year-old female presents with 1-day history of substernal chest pressure radiating to the left arm, exacerbated by exertion and relieved by rest, accompanied by mild dyspnea. Denies diaphoresis, nausea, or syncope. No prior episodes.',
  },
  ros: [
    {
      system: 'Cardiovascular',
      pertinentPositives: ['exertional chest pressure with radiation'],
      pertinentNegatives: ['palpitations', 'syncope', 'lower-extremity edema'],
    },
    {
      system: 'Respiratory',
      pertinentPositives: ['mild dyspnea on exertion'],
      pertinentNegatives: ['cough', 'hemoptysis', 'wheeze'],
    },
    {
      system: 'Constitutional',
      pertinentPositives: [],
      pertinentNegatives: ['fever', 'weight loss', 'night sweats'],
    },
  ],
  redFlagScreen: [
    {
      flag: 'Chest pain radiating to arm, neck, or jaw',
      present: true,
      detail: 'left arm',
      escalationAdvised: true,
    },
    {
      flag: 'Syncope or near-syncope',
      present: false,
      detail: null,
      escalationAdvised: false,
    },
  ],
  patientConfirmation: {
    summaryReadBack:
      'Chest pressure since yesterday, worse with stairs, better with rest, with some shortness of breath.',
    confirmed: true,
    corrections: [],
  },
  triageImpression: {
    acuityHint: 'urgent',
    rationale:
      'Exertional substernal pressure with radiation to left arm and mild dyspnea.',
    suggestedNextStep: 'In-person evaluation today; consider ED if symptoms recur with exertion.',
  },
  clinicianNotes: null,
};

describe('renderBriefMarkdown', () => {
  const md = renderBriefMarkdown(fixture);

  it('includes the chief complaint section', () => {
    expect(md).toMatch(/## Chief Complaint/);
    expect(md).toMatch(/Chest pressure since yesterday morning/);
  });

  it('does not surface the LLM provider/model in the patient-facing header', () => {
    expect(md).not.toMatch(/Provider:/i);
    expect(md).not.toMatch(/anthropic\/claude/i);
    expect(md).not.toMatch(/openai\/gpt/i);
  });

  it('renders a clinician-style HPI narrative', () => {
    expect(md).toMatch(/## History of Present Illness/);
    expect(md).toMatch(/47-year-old female presents with/);
  });

  it('includes the OPQRST table with all rows', () => {
    expect(md).toMatch(/\| Onset \| yesterday morning \|/);
    expect(md).toMatch(/\| Severity \| 6\/10 \|/);
    expect(md).toMatch(/\| Radiation \| left arm \|/);
  });

  it('renders pertinent negatives as "denies …" without double-negation', () => {
    expect(md).toMatch(/denies palpitations/);
    expect(md).toMatch(/denies syncope/);
    expect(md).not.toMatch(/denies no /);
    expect(md).not.toMatch(/denies denies/);
  });

  it('flags red flags with escalation advised', () => {
    expect(md).toMatch(/Chest pain radiating to arm.*present.*escalation advised/i);
  });

  it('shows triage impression with acuity and the explicit "not a diagnosis" disclaimer', () => {
    expect(md).toMatch(/## Triage Impression/);
    expect(md).toMatch(/Acuity:.*urgent/);
    expect(md).toMatch(/Not a diagnosis/i);
  });

  it('puts ROS systems on separate paragraphs, not a single line', () => {
    // Paragraph break (blank line) between Cardiovascular and Respiratory blocks
    expect(md).toMatch(/\*\*Cardiovascular\*\*[\s\S]*\n\n\*\*Respiratory\*\*/);
  });

  it('strips negation words like "no" / "denies" / "without" from negative entries', () => {
    const adversarial = {
      ...fixture,
      ros: [
        {
          system: 'Cardiovascular' as const,
          pertinentPositives: [],
          pertinentNegatives: ['no fever', 'denies palpitations', 'without syncope', 'no shortness of breath'],
        },
      ],
    };
    const out = renderBriefMarkdown(adversarial);
    expect(out).toMatch(/denies fever/);
    expect(out).toMatch(/denies palpitations/);
    expect(out).toMatch(/denies syncope/);
    expect(out).toMatch(/denies shortness of breath/);
    expect(out).not.toMatch(/denies no /);
    expect(out).not.toMatch(/denies denies /);
    expect(out).not.toMatch(/denies without /);
  });
});
