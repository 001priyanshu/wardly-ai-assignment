import { StateGraph, START, END } from '@langchain/langgraph';
import { IntakeStateAnnotation } from './state.js';
import { entryRouter, NODE_NAMES } from './routing.js';
import { greetNode } from './nodes/greet.node.js';
import { identifyNode } from './nodes/identify.node.js';
import { chiefComplaintNode } from './nodes/chiefComplaint.node.js';
import { hpiNode } from './nodes/hpi.node.js';
import { focusedRosNode } from './nodes/focusedRos.node.js';
import { redFlagScreenNode } from './nodes/redFlagScreen.node.js';
import { readBackNode } from './nodes/readBack.node.js';
import { finalizeNode } from './nodes/finalize.node.js';
import { getCheckpointer } from './checkpointer.js';

let compiled: ReturnType<ReturnType<typeof buildGraph>['compile']> | null = null;

function buildGraph() {
  return new StateGraph(IntakeStateAnnotation)
    .addNode(NODE_NAMES.greet, greetNode)
    .addNode(NODE_NAMES.identify, identifyNode)
    .addNode(NODE_NAMES.cc, chiefComplaintNode)
    .addNode(NODE_NAMES.hpi, hpiNode)
    .addNode(NODE_NAMES.ros, focusedRosNode)
    .addNode(NODE_NAMES.redFlags, redFlagScreenNode)
    .addNode(NODE_NAMES.readBack, readBackNode)
    .addNode(NODE_NAMES.finalize, finalizeNode)
    // Each node ends after one super-step — the user supplies the next input.
    .addConditionalEdges(START, entryRouter, {
      [NODE_NAMES.greet]: NODE_NAMES.greet,
      [NODE_NAMES.identify]: NODE_NAMES.identify,
      [NODE_NAMES.cc]: NODE_NAMES.cc,
      [NODE_NAMES.hpi]: NODE_NAMES.hpi,
      [NODE_NAMES.ros]: NODE_NAMES.ros,
      [NODE_NAMES.redFlags]: NODE_NAMES.redFlags,
      [NODE_NAMES.readBack]: NODE_NAMES.readBack,
      [NODE_NAMES.finalize]: NODE_NAMES.finalize,
      [END]: END,
    })
    .addEdge(NODE_NAMES.greet, END)
    .addEdge(NODE_NAMES.identify, END)
    .addEdge(NODE_NAMES.cc, END)
    .addEdge(NODE_NAMES.hpi, END)
    .addEdge(NODE_NAMES.ros, END)
    .addEdge(NODE_NAMES.redFlags, END)
    .addEdge(NODE_NAMES.readBack, END)
    .addEdge(NODE_NAMES.finalize, END);
}

export function getIntakeGraph() {
  if (compiled) return compiled;
  compiled = buildGraph().compile({ checkpointer: getCheckpointer() });
  return compiled;
}
