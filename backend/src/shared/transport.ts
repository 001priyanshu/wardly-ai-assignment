import type { ClinicalBrief, IntakePhase } from './brief.schema.js';

// Server -> client SSE event names emitted by /api/sessions/:id/messages
export const SSE_EVENTS = {
  Token: 'token',
  Phase: 'phase',
  RedFlag: 'red-flag',
  AssistantMessage: 'assistant-message',
  Error: 'error',
  Done: 'done',
} as const;

export interface TokenEventData {
  text: string;
}
export interface PhaseEventData {
  phase: IntakePhase;
  turnCount: number;
}
export interface RedFlagEventData {
  flag: string;
  detail?: string;
}
export interface AssistantMessageEventData {
  content: string;
  messageId: string;
}
export interface DoneEventData {
  phase: IntakePhase;
  finalized: boolean;
  brief?: { markdown: string; json: ClinicalBrief };
}
export interface ErrorEventData {
  message: string;
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
