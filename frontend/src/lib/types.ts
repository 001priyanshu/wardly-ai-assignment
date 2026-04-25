/**
 * Frontend-side mirror of backend/src/shared types.
 * Kept in sync manually — the backend's zod schema is the source of truth and
 * runtime validation happens server-side. The frontend only needs structural
 * types for TypeScript.
 */

export type IntakePhase =
  | 'greet'
  | 'identify'
  | 'cc'
  | 'hpi'
  | 'ros'
  | 'redFlags'
  | 'readBack'
  | 'finalize'
  | 'done';

export type RosSystem =
  | 'Constitutional'
  | 'HEENT'
  | 'Cardiovascular'
  | 'Respiratory'
  | 'GI'
  | 'GU'
  | 'Musculoskeletal'
  | 'Neurological'
  | 'Psychiatric'
  | 'Skin'
  | 'Endocrine'
  | 'Hematologic';

export type ClinicalCategory =
  | 'cardiovascular'
  | 'respiratory'
  | 'gastrointestinal'
  | 'genitourinary'
  | 'neurological'
  | 'psychiatric'
  | 'musculoskeletal'
  | 'dermatologic'
  | 'endocrine'
  | 'constitutional'
  | 'heent'
  | 'other';

export type Acuity = 'routine' | 'soon' | 'urgent' | 'emergent';

export interface ClinicalBrief {
  meta: {
    sessionId: string;
    generatedAt: string;
    model: string;
    provider: 'anthropic' | 'openai';
    disclaimer: string;
    warnings: string[];
  };
  patient: { name: string | null; dob: string | null };
  chiefComplaint: { statement: string; duration: string | null; category: ClinicalCategory };
  hpi: {
    onset: string | null;
    provocation: string | null;
    palliation: string | null;
    quality: string | null;
    region: string | null;
    radiation: string | null;
    severity: string | null;
    timing: string | null;
    associatedSymptoms: string[];
    modifyingFactors: string[];
    priorEpisodes: string | null;
    currentMedicationsForIssue: string[];
    narrative: string;
  };
  ros: { system: RosSystem; pertinentPositives: string[]; pertinentNegatives: string[] }[];
  redFlagScreen: {
    flag: string;
    present: boolean;
    detail: string | null;
    escalationAdvised: boolean;
  }[];
  patientConfirmation: {
    summaryReadBack: string;
    confirmed: boolean;
    corrections: string[];
  };
  triageImpression: {
    acuityHint: Acuity;
    rationale: string;
    suggestedNextStep: string;
  };
  clinicianNotes: string | null;
}

export interface SessionListItem {
  id: string;
  status: 'active' | 'finalized' | 'abandoned';
  phase: IntakePhase;
  cc: string | null;
  patientName: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
}

export interface SessionDetail extends SessionListItem {
  patient: { name: string | null; dob: string | null };
  brief: { markdown: string; json: ClinicalBrief } | null;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
}

export const SSE_EVENTS = {
  Token: 'token',
  Phase: 'phase',
  RedFlag: 'red-flag',
  AssistantMessage: 'assistant-message',
  Error: 'error',
  Done: 'done',
} as const;
export type SseEventName = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

export const PHASE_LABELS: Record<IntakePhase, string> = {
  greet: 'Greeting',
  identify: 'Patient identity',
  cc: 'Chief complaint',
  hpi: 'History of present illness',
  ros: 'Focused review of systems',
  redFlags: 'Red-flag screen',
  readBack: 'Read-back & confirm',
  finalize: 'Finalising',
  done: 'Complete',
};

export const PHASE_ORDER: IntakePhase[] = [
  'greet',
  'identify',
  'cc',
  'hpi',
  'ros',
  'redFlags',
  'readBack',
  'finalize',
  'done',
];
