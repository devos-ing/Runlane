# Core concepts

The product model describes reusable definitions and observable executions. Each concept has one job.

## Definition hierarchy

| Concept | Meaning |
| --- | --- |
| Workspace | A registered identity and source root that groups workflows, configuration, schedules, and execution records. |
| Workflow | A versioned process authored in code, containing stages, inputs, routes, and triggers. |
| Stage | A step that assigns work to agents or direct actions and routes the result. |
| Agent | A reusable configuration with instructions, capabilities, a model profile, reasoning effort, and a result contract. |
| Model profile | A saved provider and model selection referenced by an Agent or model-backed Action. |
| Action | One executable capability, such as a tool call, script, model decision, or host operation. |
| Decision | A structured result used to choose a declared path, produced by an Agent or Action. |
| Result schema | The single definition of a result's shape and allowed outcomes. |
| Route | A typed rule selecting the next stage, a declared loop, completion, or stopped execution. |
| Trigger | An event or command requesting a new run. |

A workspace owns workflow registrations. It need not be a Git repository, and it is distinct from a coding run's worktree. Workflow and stage definitions remain reusable across workspaces.

An agent assignment is the use of an Agent in a stage. It has a stable local ID for trace attribution, but it is not a separate public `AgentBinding` configuration type. Import an Agent to reuse it. Create another Agent from shared settings when a different model or capability set is needed.

The Advisor, Implementer, and Reviewer are presets of Agent. Scripts and Agents can produce decisions; a Jev Action can be added later. The source owns its decision rules and returns a final outcome. The runner validates that result and selects a declared route. Decision is a use of a result, not another executor or parent class.

## Four core responsibilities

Use plain definition objects and a shared execution type or interface for Agent and Action adapters. A common interface does not require a base class. Extract shared implementation only when real adapters repeat the same behavior.

The loader validates definitions, and adapters perform work. Contributors import configurations, prompts, schemas, and scripts without extending a framework. Each result schema defines its outcome enum once. The `on` map supplies destinations for those outcomes.

| Module | Responsibility |
| --- | --- |
| Definition loader | Load trusted configuration and imported schemas, validate the graph, and retain the supported source set. |
| Runner | Admit work, call adapters, validate final results, commit routes, and enforce concurrency and loop limits. |
| Execution adapters | Execute Pi Agents and scripts first, then additional concrete Action kinds when needed. |
| Run store | Persist workspace registration, attempts, results, events, source references, and atomic transitions using the selected Pi durable foundation. |

These are responsibilities, not four required packages. Workspace, Route, Loop, and Model profile can remain data. The CLI and graph read the same operations and records. Add background launch management, cron, and desktop packaging around that core later. The current repository implements the documentation site and simulated graph only.

## Definitions are not runs

A **run** executes one frozen workflow definition within a workspace, with specific inputs and resolved model profiles. Its stage and agent attempts record actual work. Reusing a definition does not reuse mutable execution state.

The run retains its supported scripts, prompts, schemas, and dependency version references. Start with a controlled source set and a verified environment. A hash cannot restore missing files. Source edits affect new runs; unavailable or changed recovery inputs block the existing run. The first version does not reconstruct arbitrary environments.

A **trace event** records an observable fact about that run: a stage started, an action returned, a route was selected, or execution stopped for input.

An **artifact** is an output or evidence object associated with a run or attempt. A trace references large artifacts instead of copying them into every event.

## Actions can run directly

```text
Agent stage → Pi agent → allowed tool Actions
Script stage → Script Action
Decision stage → Script Action, Advisor Agent, or Jev Action
Approval stage → application-owned approval Action
```

Checks and deterministic scripts do not consume a model call just to start a process. Agents receive only their declared capabilities. Privileged host actions remain application-controlled.

A model-backed Action does consume model-call capacity. The direct Action path avoids an unnecessary agent loop, but it keeps the same attempt, timeout, cancellation, usage, and recovery requirements. See [Routing and loops](routing-loops.md) for replaceable decision sources.

## State is owned by the runner

The runner decides which work is eligible and records outcomes. One local service owns that state for all registered workspaces. Foreground execution and a daemon are two launch modes for the same service. The CLI and graphical clients display recorded state. Moving a node changes layout; it does not start, complete, or approve a stage.

Default limits are two active runs and two simultaneous model calls across all workspaces, both configurable. Independent runs, parallel reviewers, and model-backed decisions share the model-call capacity. A parent stage waiting for its reviewers must not hold a model-call slot. See [CLI, daemon, and workspaces](cli-workspaces.md) for ownership and lifecycle rules.
