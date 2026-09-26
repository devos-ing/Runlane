# Follow a run through its trace

The trace answers a developer's practical questions: what is running, what input did it receive, what did it do, and why did the workflow move or stop?

## Observable events

| Event | What it explains |
| --- | --- |
| `run.started` | The workspace, frozen definition, source version, and input selected for execution. |
| `stage.started` | The stage now eligible to perform work. |
| `agent.started` | The assigned agent and resolved model holding a slot. |
| `action.started` | The action attempt, its adapter, and any model profile using shared capacity. |
| `action.completed` | A tool, script, or decision-model result and its evidence references. |
| `action.failed` | An execution or result-validation failure, distinct from a valid uncertain decision. |
| `agent.completed` | A validated result and provider-reported usage when available. |
| `route.selected` | The accepted outcome, applied policy, and committed destination. |
| `run.needs_input` | A blocker or exhausted loop that requires a decision. |

These event names are proposed application contracts. They are not a claim that Pi emits the same names.

## Event shape

```json
{
  "id": "event-042",
  "workspaceId": "ws_app",
  "runId": "run-017",
  "stageId": "review",
  "assignmentId": "correctness",
  "type": "agent.completed",
  "attempt": 1,
  "result": {"outcome": "approved"},
  "artifactRefs": ["review-report-042"]
}
```

The workspace ID attributes the event to its registered context. A run's attempts and artifacts retain that ownership. Workflow names and node IDs from another workspace cannot match this run accidentally.

The assignment ID identifies an agent's place in the stage. It distinguishes two uses of the same Agent definition without introducing a separate public Agent binding type.

Large inputs, outputs, and logs belong in artifacts. Events carry bounded summaries and references. Display provider-reported usage honestly; missing usage stays unavailable. Never present hidden model reasoning as an observable trace.

## Explain a decision and its route

A decision uses the normal Agent or Action attempt records. Its evidence identifies the source, input snapshot, provider and model when used, raw response, timing, and reported usage. The selected route records the accepted outcome and any policy adjustment.

This proposed event shows a valid model response that did not meet the configured confidence policy:

```json
{
	"id": "event-043",
	"workspaceId": "ws_app",
	"runId": "run-017",
	"stageId": "choose-path",
	"attemptId": "attempt-007",
	"type": "route.selected",
	"sourceId": "choose-path",
	"proposedChoice": "implement",
	"confidence": 0.42,
	"acceptedOutcome": "needs_input",
	"policyRef": "choose-path-policy-v1",
	"policyReason": "below-confidence-threshold",
	"destination": { "stop": "needs_input" },
	"artifactRefs": ["decision-response-007"]
}
```

Confidence is optional for sources that do not produce it. Do not fill in a guessed value for a deterministic script or an Advisor. A configured policy that requires confidence rejects a response without a valid value.

Provider errors and malformed responses remain failed or blocked attempts. They do not produce a successful `route.selected` event. CLI and graphical clients distinguish these failures from an accepted `needs_input` route.

## One record, several views

The CLI, run list, graph, timeline, and selected-node inspector read the same execution records. They agree on whether work is queued, running, blocked, cancelled, or complete. The first runtime slice exposes CLI status and trace. The graphical client adds views over that same data.

Persist critical transitions with their events before notifying clients. Ignore exact duplicate deliveries. Conflicting or stale attempt results must not advance the current run.

Disconnecting a client does not interrupt the run. Another client can read its snapshot and resume the event stream from a durable cursor. A service interruption is a separate event that requires reconciliation.

## Recovery is visible

An interrupted process produces an interrupted attempt. Reconciliation inspects recorded evidence before resuming. A timed-out external action has an unknown outcome until checked; it is not automatically safe to repeat.

Recovery uses the run's recorded definition, prompts, scripts, and dependency version references. If those sources cannot be restored, record a blocker. Importing today's workflow file is not recovery of yesterday's run.

A committed decision and route remain authoritative after restart. If only a matching provider response is saved, apply the recorded validation and policy before advancing. If no response was saved, record an interrupted attempt. A permitted retry creates a new attempt and may make another provider request. See [Routing and loops](routing-loops.md) for the atomic transition rules.

Cancel preserves useful output and records cleanup. Retrying creates a new attributable attempt. The UI shows both the original failure and the later outcome.
