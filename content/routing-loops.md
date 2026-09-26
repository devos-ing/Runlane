# Route outcomes and bound repetition

Routing connects a validated stage outcome to the next stage. A loop repeats declared work within the same run and consumes a finite allowance.

## Three destinations

```json
[
  {"when": {"field": "verdict", "op": "eq", "value": "pass"}, "to": "review"},
  {"when": {"field": "verdict", "op": "eq", "value": "fail"}, "repeat": "repair"},
  {"when": {"field": "verdict", "op": "eq", "value": "unknown"}, "stop": "needs_input"}
]
```

Each route has exactly one destination form. Conditions use supported typed fields and comparisons. The runner rejects missing destinations, ambiguous matches, incompatible values, and unsupported cycles. It does not evaluate JavaScript from a workflow definition.

## A finite loop

```json
{
  "id": "repair",
  "entryStage": "implement",
  "maxReentries": 2,
  "onExhausted": "needs_input"
}
```

The first implementation is not a re-entry. Two re-entries allow initial work plus two repairs. Keep one declared loop per workflow initially; iterations do not overlap.

The runner records the result, counter increment, and next attempt together. Restart, repeated commands, or a browser refresh cannot reset the counter. Several reviewers requesting changes in one round consume one repair allowance.

## Keep the result meaningful

A check failure can request a repair. An unavailable executable or model is an execution blocker. Malformed output cannot be treated as approval.

In the coding template, a new candidate invalidates old check and review evidence. Every designated reviewer inspects the new candidate. Publication still requires matching human approval.

## Route selection is inspectable

The graph should highlight the selected route. The trace should explain the source outcome, matched condition, destination, and remaining allowance.

Conditional automatic model selection is deferred. Model bindings remain explicit and frozen for a run.
