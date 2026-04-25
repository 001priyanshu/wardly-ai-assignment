import type { IntakeState } from './state.js';
import { END } from '@langchain/langgraph';

// Node names must not collide with IntakeState field names (LangGraph reserves
// state attribute keys as channel names). State has `cc`, so use `chiefComplaint` here.
export const NODE_NAMES = {
  greet: 'greetNode',
  identify: 'identifyNode',
  cc: 'chiefComplaintNode',
  hpi: 'hpiNode',
  ros: 'focusedRosNode',
  redFlags: 'redFlagScreenNode',
  readBack: 'readBackNode',
  finalize: 'finalizeNode',
} as const;

export type NodeName = (typeof NODE_NAMES)[keyof typeof NODE_NAMES];

/**
 * Decides which node should run for the current super-step based on state.phase.
 * Used as the START -> ? conditional edge.
 */
export function entryRouter(state: IntakeState): NodeName | typeof END {
  switch (state.phase) {
    case 'greet':
      return NODE_NAMES.greet;
    case 'identify':
      return NODE_NAMES.identify;
    case 'cc':
      return NODE_NAMES.cc;
    case 'hpi':
      return NODE_NAMES.hpi;
    case 'ros':
      return NODE_NAMES.ros;
    case 'redFlags':
      return NODE_NAMES.redFlags;
    case 'readBack':
      return NODE_NAMES.readBack;
    case 'finalize':
      return NODE_NAMES.finalize;
    case 'done':
      return END;
    default:
      return END;
  }
}
