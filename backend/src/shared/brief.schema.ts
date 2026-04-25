import { z } from 'zod';

export const ROS_SYSTEMS = [
  'Constitutional',
  'HEENT',
  'Cardiovascular',
  'Respiratory',
  'GI',
  'GU',
  'Musculoskeletal',
  'Neurological',
  'Psychiatric',
  'Skin',
  'Endocrine',
  'Hematologic',
] as const;
export const RosSystemSchema = z.enum(ROS_SYSTEMS);
export type RosSystem = z.infer<typeof RosSystemSchema>;

export const CLINICAL_CATEGORIES = [
  'cardiovascular',
  'respiratory',
  'gastrointestinal',
  'genitourinary',
  'neurological',
  'psychiatric',
  'musculoskeletal',
  'dermatologic',
  'endocrine',
  'constitutional',
  'heent',
  'other',
] as const;
export const ClinicalCategorySchema = z.enum(CLINICAL_CATEGORIES);
export type ClinicalCategory = z.infer<typeof ClinicalCategorySchema>;

export const ACUITY = ['routine', 'soon', 'urgent', 'emergent'] as const;
export const AcuitySchema = z.enum(ACUITY);

export const HpiSchema = z.object({
  onset: z.string().nullable(),
  provocation: z.string().nullable(),
  palliation: z.string().nullable(),
  quality: z.string().nullable(),
  region: z.string().nullable(),
  radiation: z.string().nullable(),
  severity: z.string().nullable(),
  timing: z.string().nullable(),
  associatedSymptoms: z.array(z.string()),
  modifyingFactors: z.array(z.string()),
  priorEpisodes: z.string().nullable(),
  currentMedicationsForIssue: z.array(z.string()),
  narrative: z.string(),
});
export type Hpi = z.infer<typeof HpiSchema>;

export const RosEntrySchema = z.object({
  system: RosSystemSchema,
  pertinentPositives: z.array(z.string()),
  pertinentNegatives: z.array(z.string()),
});
export type RosEntry = z.infer<typeof RosEntrySchema>;

export const RedFlagSchema = z.object({
  flag: z.string(),
  present: z.boolean(),
  detail: z.string().nullable(),
  escalationAdvised: z.boolean(),
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

export const ClinicalBriefSchema = z.object({
  meta: z.object({
    sessionId: z.string(),
    generatedAt: z.string(),
    model: z.string(),
    provider: z.enum(['anthropic', 'openai']),
    disclaimer: z.string(),
    warnings: z.array(z.string()),
  }),
  patient: z.object({
    name: z.string().nullable(),
    dob: z.string().nullable(),
  }),
  chiefComplaint: z.object({
    statement: z.string(),
    duration: z.string().nullable(),
    category: ClinicalCategorySchema,
  }),
  hpi: HpiSchema,
  ros: z.array(RosEntrySchema),
  redFlagScreen: z.array(RedFlagSchema),
  patientConfirmation: z.object({
    summaryReadBack: z.string(),
    confirmed: z.boolean(),
    corrections: z.array(z.string()),
  }),
  triageImpression: z.object({
    acuityHint: AcuitySchema,
    rationale: z.string(),
    suggestedNextStep: z.string(),
  }),
  clinicianNotes: z.string().nullable(),
});
export type ClinicalBrief = z.infer<typeof ClinicalBriefSchema>;

// LLM-extraction shape: omits server-controlled meta and is what we ask the model for.
export const ClinicalBriefExtractionSchema = ClinicalBriefSchema.omit({ meta: true }).extend({
  // model may surface its own warnings during extraction (e.g. "patient declined to answer X")
  modelWarnings: z.array(z.string()).default([]),
});
export type ClinicalBriefExtraction = z.infer<typeof ClinicalBriefExtractionSchema>;

export const INTAKE_PHASES = [
  'greet',
  'identify',
  'cc',
  'hpi',
  'ros',
  'redFlags',
  'readBack',
  'finalize',
  'done',
] as const;
export const IntakePhaseSchema = z.enum(INTAKE_PHASES);
export type IntakePhase = z.infer<typeof IntakePhaseSchema>;
