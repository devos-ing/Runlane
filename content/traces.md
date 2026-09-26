# Follow a run through its trace

The trace answers a developer's practical questions: what is running, what input did it receive, what did it do, and why did the workflow move or stop?

## Observable events

| Event | What it explains |
| --- | --- |
| `run.started` | The frozen definition and input selected for execution. |
| `stage.started` | The stage now eligible to perform work. |
| `agent.started` | The agent binding and resolved model holding a slot. |
| `action.completed` | A tool or script outcome and its evidence references. |
| `agent.completed` | A validated result and provider-reported usage when available. |
| `route.selected` | The outcome rule used to select the next step. |
| `run.needs_input` | A blocker or exhausted loop that requires a decision. |

These event names are proposed application contracts. They are not a claim that Pi emits the same names.

## Event shape

```json
{
  "id": "event-042",
  "runId": "run-017",
  "stageId": "review",
  "agentBindingId": "correctness",
  "type": "agent.completed",
  "attempt": 1,
  "result": {"decision": "approved"},
  "artifactRefs": ["review-report-042"]
}
```

Large inputs, outputs, and logs belong in artifacts. Events carry bounded summaries and references. Display provider-reported usage honestly; missing usage stays unavailable. Never present hidden model reasoning as an observable trace.

## One record, several views

The run list, graph, timeline, and selected-node inspector read the same execution records. They should agree on whether work is queued, running, blocked, cancelled, or complete.

Persist critical transitions with their events before notifying the browser. Ignore exact duplicate deliveries. Conflicting or stale attempt results must not advance the current run.

## Recovery is visible

An interrupted process produces an interrupted attempt. Reconciliation inspects recorded evidence before resuming. A timed-out external action has an unknown outcome until checked; it is not automatically safe to repeat.

Cancel preserves useful output and records cleanup. Retrying creates a new attributable attempt. The UI shows both the original failure and the later outcome.
