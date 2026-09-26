# Core concepts

The product model describes reusable definitions and observable executions. Each concept has one job.

## Definition hierarchy

| Concept | Meaning |
| --- | --- |
| Workflow | A versioned process containing stages, inputs, routes, and completion policy. |
| Stage | One unit of orchestration that invokes agent bindings or direct actions. |
| Agent | Reusable instructions, capabilities, context requirements, and a result contract. |
| Model profile | A saved provider/model selection used by an agent binding. |
| Agent binding | An agent, model profile, and reasoning setting assigned to a stage. |
| Action | One executable capability, such as a tool call, script, or host operation. |
| Route | A typed rule selecting the next stage, a declared loop, or a stopped outcome. |
| Trigger | An event or command requesting a new run. |

The Advisor, Implementer, and Reviewer are example agent definitions. They share one Pi adapter. Their role names do not require separate engines or inheritance trees.

## Definitions are not runs

A **run** executes one frozen workflow definition with specific inputs and resolved model bindings. Its stage and agent attempts record actual work. Reusing a definition does not reuse mutable execution state.

A **trace event** records an observable fact about that run: a stage started, an action returned, a route was selected, or execution stopped for input.

An **artifact** is an output or evidence object associated with a run or attempt. A trace references large artifacts instead of copying them into every event.

## Actions can run directly

```text
Agent stage → Pi agent → allowed tool Actions
Script stage → Script Action
Approval stage → application-owned approval Action
```

Checks and deterministic scripts do not consume a model call just to start a process. Agents receive only their declared capabilities. Privileged host actions remain application-controlled.

## State is owned by the runner

The runner decides which work is eligible and records outcomes. The browser displays that state. Moving a node changes layout; it does not start, complete, or approve a stage.

Default limits are two active runs and two simultaneous model calls globally, both configurable. Independent runs and parallel reviewers share the model-call capacity. A parent stage waiting for its reviewers must not hold a model-call slot.
