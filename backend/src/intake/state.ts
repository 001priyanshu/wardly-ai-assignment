import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { ClinicalCategory, IntakePhase, RosSystem } from '../shared/brief.schema.js';

export interface PatientInfo {
  name?: string;
  dob?: string;
}

const replaceReducer = <T>(prev: T, next: T | undefined): T => (next === undefined ? prev : next);
const mergeReducer = <T extends object>(prev: T, next: Partial<T> | undefined): T =>
  ({ ...prev, ...(next ?? {}) }) as T;
const concatUniqueReducer = (prev: string[], next: string[] | undefined): string[] =>
  Array.from(new Set([...(prev ?? []), ...(next ?? [])]));

export const IntakeStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  phase: Annotation<IntakePhase>({
    reducer: replaceReducer,
    default: () => 'greet' as IntakePhase,
  }),
  turnCount: Annotation<number>({
    reducer: replaceReducer,
    default: () => 0,
  }),
  turnsInPhase: Annotation<number>({
    reducer: replaceReducer,
    default: () => 0,
  }),
  patient: Annotation<PatientInfo>({
    reducer: mergeReducer,
    default: () => ({}),
  }),
  cc: Annotation<string | null>({
    reducer: replaceReducer,
    default: () => null,
  }),
  ccCategory: Annotation<ClinicalCategory | null>({
    reducer: replaceReducer,
    default: () => null,
  }),
  rosTargets: Annotation<RosSystem[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  rosCovered: Annotation<RosSystem[]>({
    reducer: (prev, next) =>
      Array.from(new Set([...(prev ?? []), ...(next ?? [])])) as RosSystem[],
    default: () => [],
  }),
  redFlagsAsked: Annotation<string[]>({
    reducer: concatUniqueReducer,
    default: () => [],
  }),
  readBackConfirmed: Annotation<boolean>({
    reducer: replaceReducer,
    default: () => false,
  }),
  emergencyEscalation: Annotation<boolean>({
    reducer: replaceReducer,
    default: () => false,
  }),
  warnings: Annotation<string[]>({
    reducer: (prev, next) => [...(prev ?? []), ...(next ?? [])],
    default: () => [],
  }),
});

export type IntakeState = typeof IntakeStateAnnotation.State;
export type IntakeStateUpdate = Partial<IntakeState>;
