import type { Edge, Node } from "@xyflow/react";

export type Status = "queued" | "running" | "succeeded" | "failed";
export type FlowData = {
  label: string;
  model: string;
  kind: "agent" | "action" | "trigger" | "group";
  status: Status;
};
export type FlowNode = Node<FlowData>;
export type TraceEvent = {
  id: string;
  seconds: number;
  stage: string;
  type: string;
  message: string;
  updates?: Record<string, Status>;
  output?: Record<string, unknown>;
  attempt?: number;
};

export const executionDetails: Record<
  string,
  {
    title: string;
    model: string;
    purpose: string;
    input: Record<string, unknown>;
  }
> = {
  trigger: {
    title: "Manual trigger",
    model: "No model",
    purpose: "Start a run with a frozen workflow and inputs.",
    input: { workflow: "change-review@1", source: "documentation-demo" },
  },
  plan: {
    title: "Plan",
    model: "planning-model · high",
    purpose: "The Advisor prepares a bounded implementation plan.",
    input: {
      request: "Improve the example navigation",
      context: "Supplied file references",
      actions: ["files.read", "files.search"],
    },
  },
  implement: {
    title: "Implement",
    model: "implementation-model · medium",
    purpose:
      "The Implementer applies the plan. A repair continues this run's existing context.",
    input: {
      planRef: "demo-plan",
      scope: ["example/navigation"],
      actions: ["files.read", "files.edit"],
    },
  },
  review: {
    title: "Review step",
    model: "2 read-only reviewers",
    purpose:
      "Wait for every designated Reviewer. The parent step holds no model slot.",
    input: {
      completion: "all-approved",
      candidateRef: "demo-candidate",
      maxModelCalls: 2,
    },
  },
  "review.correctness": {
    title: "Correctness review",
    model: "review-model-a · high",
    purpose:
      "Inspect the candidate against the original requirements using a fresh invocation.",
    input: {
      candidateRef: "demo-candidate",
      inputContract: "review-context-v1",
      actions: ["files.read", "files.search"],
    },
  },
  "review.maintainability": {
    title: "Maintainability review",
    model: "review-model-b · high",
    purpose:
      "Independently inspect the same candidate for unnecessary complexity.",
    input: {
      candidateRef: "demo-candidate",
      focus: "Maintainability",
      actions: ["files.read", "files.search"],
    },
  },
  result: {
    title: "Collect results",
    model: "Direct action · no model",
    purpose: "Collect the validated reports as a run artifact.",
    input: {
      reports: ["correctness", "maintainability"],
      resultMode: "artifact",
    },
  },
};

/** Creates the deliberate template layout used by the documentation canvas. */
export function initialNodes(): FlowNode[] {
  return [
    {
      id: "trigger",
      type: "execution",
      position: { x: 0, y: 0 },
      data: {
        label: "Manual",
        model: "Trigger",
        kind: "trigger",
        status: "queued",
      },
      ariaLabel: "Manual trigger",
    },
    {
      id: "plan",
      type: "execution",
      position: { x: 0, y: 160 },
      data: {
        label: "Plan",
        model: "planning-model",
        kind: "agent",
        status: "queued",
      },
      ariaLabel: "Plan step",
    },
    {
      id: "implement",
      type: "execution",
      position: { x: 205, y: 160 },
      data: {
        label: "Implement",
        model: "implementation-model",
        kind: "agent",
        status: "queued",
      },
      ariaLabel: "Implement step",
    },
    {
      id: "review",
      type: "reviewGroup",
      position: { x: 420, y: 60 },
      data: {
        label: "Review",
        model: "all must approve",
        kind: "group",
        status: "queued",
      },
      style: { width: 230, height: 290 },
      draggable: false,
      ariaLabel: "Parallel review step",
    },
    {
      id: "review.correctness",
      type: "execution",
      parentId: "review",
      extent: "parent",
      position: { x: 30, y: 62 },
      data: {
        label: "Correctness",
        model: "review-model-a",
        kind: "agent",
        status: "queued",
      },
      ariaLabel: "Correctness reviewer",
    },
    {
      id: "review.maintainability",
      type: "execution",
      parentId: "review",
      extent: "parent",
      position: { x: 30, y: 174 },
      data: {
        label: "Maintainability",
        model: "review-model-b",
        kind: "agent",
        status: "queued",
      },
      ariaLabel: "Maintainability reviewer",
    },
    {
      id: "result",
      type: "execution",
      position: { x: 715, y: 160 },
      data: {
        label: "Collect results",
        model: "Script action",
        kind: "action",
        status: "queued",
      },
      ariaLabel: "Collect results action",
    },
  ];
}

export const initialEdges: Edge[] = [
  {
    id: "start-plan",
    source: "trigger",
    target: "plan",
    targetHandle: "trigger",
  },
  { id: "plan-implement", source: "plan", target: "implement" },
  {
    id: "implement-correctness",
    source: "implement",
    target: "review.correctness",
  },
  {
    id: "implement-maintainability",
    source: "implement",
    target: "review.maintainability",
  },
  { id: "correctness-result", source: "review.correctness", target: "result" },
  {
    id: "maintainability-result",
    source: "review.maintainability",
    target: "result",
  },
];

const opening: TraceEvent[] = [
  {
    id: "evt-001",
    seconds: 0,
    stage: "trigger",
    type: "run.started",
    message: "Frozen change-review@1 and its supplied inputs.",
    updates: { trigger: "succeeded" },
    output: { runId: "demo-0241", workflow: "change-review@1" },
  },
  {
    id: "evt-002",
    seconds: 1,
    stage: "plan",
    type: "agent.started",
    message: "Advisor acquired one model slot.",
    updates: { plan: "running" },
  },
  {
    id: "evt-003",
    seconds: 2,
    stage: "plan",
    type: "action.completed",
    message: "files.read returned the supplied navigation context.",
  },
  {
    id: "evt-004",
    seconds: 4,
    stage: "plan",
    type: "agent.completed",
    message: "Validated an implementation plan.",
    updates: { plan: "succeeded" },
    output: { outcome: "ready", artifactRef: "demo-plan", steps: 3 },
  },
  {
    id: "evt-005",
    seconds: 5,
    stage: "implement",
    type: "agent.started",
    message: "Implementer received the plan and bounded scope.",
    updates: { implement: "running" },
  },
  {
    id: "evt-006",
    seconds: 9,
    stage: "implement",
    type: "agent.completed",
    message: "Recorded the simulated candidate and check evidence.",
    updates: { implement: "succeeded" },
    output: { candidateRef: "demo-candidate", checks: "passed in simulation" },
  },
  {
    id: "evt-007",
    seconds: 10,
    stage: "review",
    type: "step.started",
    message: "Two independent reviewers acquired the two global slots.",
    updates: {
      review: "running",
      "review.correctness": "running",
      "review.maintainability": "running",
    },
  },
  {
    id: "evt-008",
    seconds: 11,
    stage: "review.correctness",
    type: "action.completed",
    message: "files.read returned the candidate and original criteria.",
  },
];

export const successTrace: TraceEvent[] = [
  ...opening,
  {
    id: "evt-009",
    seconds: 13,
    stage: "review.correctness",
    type: "agent.completed",
    message: "Correctness reviewer approved the candidate.",
    updates: { "review.correctness": "succeeded" },
    output: {
      outcome: "approved",
      findings: [],
      inputTokens: 1240,
      outputTokens: 186,
    },
    attempt: 1,
  },
  {
    id: "evt-010",
    seconds: 14,
    stage: "review.maintainability",
    type: "agent.completed",
    message: "Maintainability reviewer approved. All required reviews passed.",
    updates: { review: "succeeded", "review.maintainability": "succeeded" },
    output: { outcome: "approved", findings: [] },
    attempt: 1,
  },
  {
    id: "evt-011",
    seconds: 15,
    stage: "result",
    type: "route.selected",
    message: "all-approved selected the result action.",
    updates: { result: "running" },
  },
  {
    id: "evt-012",
    seconds: 16,
    stage: "result",
    type: "run.completed",
    message: "Collected the reports. No publication action was requested.",
    updates: { result: "succeeded" },
    output: { artifactRef: "demo-review-report", status: "complete" },
  },
];

export const repairTrace: TraceEvent[] = [
  ...opening,
  {
    id: "repair-009",
    seconds: 13,
    stage: "review.correctness",
    type: "agent.completed",
    message: "Reviewer requested clearer empty-state handling.",
    updates: { "review.correctness": "failed" },
    output: {
      outcome: "changes_requested",
      findings: ["Handle an empty navigation list."],
    },
    attempt: 1,
  },
  {
    id: "repair-010",
    seconds: 14,
    stage: "review.maintainability",
    type: "agent.completed",
    message:
      "Second reviewer approved; the combined round requests one repair.",
    updates: { review: "failed", "review.maintainability": "succeeded" },
    output: { outcome: "approved", findings: [] },
    attempt: 1,
  },
  {
    id: "repair-011",
    seconds: 15,
    stage: "review",
    type: "route.selected",
    message: "repeat:repair → Implement. Consumed re-entry 1 of 2.",
    updates: {
      implement: "running",
      review: "queued",
      "review.correctness": "queued",
      "review.maintainability": "queued",
    },
  },
  {
    id: "repair-012",
    seconds: 19,
    stage: "implement",
    type: "agent.completed",
    message: "Recorded a new simulated candidate and fresh checks.",
    updates: { implement: "succeeded" },
    output: { candidateRef: "demo-candidate-2" },
    attempt: 2,
  },
  {
    id: "repair-013",
    seconds: 20,
    stage: "review",
    type: "step.started",
    message: "Fresh reviewer invocations inspect candidate 2.",
    updates: {
      review: "running",
      "review.correctness": "running",
      "review.maintainability": "running",
    },
    attempt: 2,
  },
  {
    id: "repair-014",
    seconds: 22,
    stage: "review.correctness",
    type: "agent.completed",
    message: "Correctness reviewer approved candidate 2.",
    updates: { "review.correctness": "succeeded" },
    output: { outcome: "approved", findings: [] },
    attempt: 2,
  },
  {
    id: "repair-015",
    seconds: 23,
    stage: "review.maintainability",
    type: "agent.completed",
    message: "All reviewers approved candidate 2.",
    updates: { review: "succeeded", "review.maintainability": "succeeded" },
    output: { outcome: "approved", findings: [] },
    attempt: 2,
  },
  {
    id: "repair-016",
    seconds: 24,
    stage: "result",
    type: "run.completed",
    message: "Collected the updated review reports.",
    updates: { result: "succeeded" },
    output: { artifactRef: "demo-review-report-2", status: "complete" },
  },
];

/** Projects a bounded prefix of simulated events into visible node status. */
export function statesAt(
  events: TraceEvent[],
  index: number,
): Record<string, Status> {
  const states: Record<string, Status> = {};
  for (const event of events.slice(0, index + 1))
    Object.assign(states, event.updates);
  return states;
}
