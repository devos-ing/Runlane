# Define a workflow

A workflow describes what should run and how validated outcomes affect the next step. Its definition is independent of React Flow and the browser.

## The minimum definition

The proposed contract needs a stable ID and version, declared inputs, an entry stage, stage bindings, and routes. These examples illustrate the design; a production schema is not implemented yet.

```json
{
  "id": "change-review",
  "version": 1,
  "entryStage": "plan",
  "stages": [
    {
      "id": "plan",
      "execution": "agents",
      "agents": [{
        "id": "advisor",
        "agentRef": "advisor",
        "modelProfile": "planning-model",
        "reasoning": "high"
      }],
      "routes": [{"when": {"field": "decision", "op": "eq", "value": "ready"}, "to": "implement"}]
    }
  ]
}
```

This is a definition fragment. A complete definition must provide every referenced stage and handle every required outcome, including missing input.

## Execution sequence

1. Validate the definition and resolve referenced agents, actions, and models.
2. Freeze the workflow and inputs for a new run.
3. Admit eligible work under the global execution limits.
4. Record an attempt before invoking an agent or action.
5. Validate and record the result, then evaluate its route.
6. Publish events so the run graph and trace can update.

Selecting a different model affects future runs. An unavailable model produces a visible blocker rather than a substitute.

## Parallel work

Independent runs can progress together. A review stage can declare multiple read-only agent bindings over the same input snapshot. All designated reviewers must approve before that stage passes.

Parallel eligibility does not guarantee simultaneous start. With two global model slots, four eligible reviewers run in batches. Waiting for capacity is a visible state, not a failed model call.

## Coding is one template

A coding workflow may add a worktree, candidate commit, checks, review, and exact-candidate publication approval. These are template requirements. The general runner accepts other workflows without requiring a Ticket or Git repository.

The initial platform does not promise GitHub Actions YAML compatibility, hosted runners, or automatic agent spawning.
