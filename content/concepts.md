# Core concepts

Runlane has five authoring components: Workflow, Agent, Action, Trigger, and Profile. Steps are execution positions inside a Workflow. Scripts implement Actions, and review is work performed inside the workflow.

## Five authoring components

| Concept | Meaning |
| --- | --- |
| Workflow | A versioned process with inputs, `steps`, outcome routes, and bounded loops. |
| Agent | A reusable configuration with instructions, capabilities, a profile, reasoning effort, and a result contract. |
| Action | One executable capability, such as a tool call, script, model decision, or host operation. |
| Trigger | An event or command requesting a new run. |
| Profile | Saved execution settings referenced by an Agent or model-backed Action. Its initial scope is explicit provider and model selection. |

Profiles remain configuration data. The current CLI calls these model-specific fields `modelProfiles` and `modelProfile`; reasoning effort stays explicit on the Agent. A general profile inheritance system is unnecessary.

## Steps belong to the workflow

A Step has a local `id`, a `run` reference, and an `on` map. The reference selects an Agent or Action; a parallel review step can contain several identified Agent assignments. There is no standalone Step class, registry, or execution engine.

Keep step identity even when the Agent or Action is reusable. The same Agent can run as `initial-analysis` and `follow-up` in one workflow. Attempts, trace, loop re-entry, and graph selection must distinguish those positions.

The target definition uses `steps` and `entryStep`; traces use `stepId`. The current CLI proof still accepts `stages` and `entryStage` and stores `stageId`. The terminology migration is planned, not implemented by this documentation update. [Decisions and delivery](decisions.md) records its acceptance boundary.

## Script is an Action implementation

A Script Action combines a script file with an explicit interpreter. The planned initial formats are `.mjs` through Bun and `.sh` through a specified shell. Both use the same input, result schema, timeout, cancellation, and trace contract. [Agents and actions](agents-actions.md) shows the definitions.

Actions also cover operations that do not need a script file, such as a tool or a later Jev provider call. Script support does not require another core component or plugin system. The CLI proof does not execute Script Actions yet.

## Trigger and review have different roles

A Trigger requests a new Run. Review evaluates work inside an existing Run. AI review uses a Reviewer Agent; deterministic checks use an Action. Human approval, when added, is an application-owned Action. These uses do not require a Review engine.

The coding workflow still requires every designated reviewer to approve the same candidate. Naming the containing position a Step does not change that rule or the shared repair allowance.

## Supporting context and records

A Workspace owns workflow registrations. It need not be a Git repository, and it is distinct from a coding run's worktree. Run, Attempt, Trace event, and Artifact describe execution evidence. They remain necessary without becoming more authoring components.

Result schemas define allowed output once. Routes and loops are data interpreted by the runner. The simplified relationship is Trigger → Workflow → Steps → Agent or Action, with Profiles supplying model settings.

An agent assignment is the use of an Agent in a step. It has a stable local ID for trace attribution, but it is not a separate public `AgentBinding` configuration type. Import an Agent to reuse it. Create another Agent from shared settings when a different model or capability set is needed.

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

These are responsibilities, not four required packages. Workspace, Route, Loop, and Profile can remain data. The CLI proof now loads a single-Agent definition, executes through Pi, and stores records in Pi durable. The graph remains simulated. Background launch management, multi-step execution, cron, and desktop packaging follow later.

## Definitions are not runs

A **run** executes one frozen workflow definition within a workspace, with specific inputs and resolved profiles. Its step and agent attempts record actual work. Reusing a definition does not reuse mutable execution state.

The run retains its supported scripts, prompts, schemas, and dependency version references. Start with a controlled source set and a verified environment. A hash cannot restore missing files. Source edits affect new runs; unavailable or changed recovery inputs block the existing run. The first version does not reconstruct arbitrary environments.

A **trace event** records an observable fact about that run: a step started, an action returned, a route was selected, or execution stopped for input.

An **artifact** is an output or evidence object associated with a run or attempt. A trace references large artifacts instead of copying them into every event.

## Actions can run directly

```text
Agent step → Pi agent → allowed tool Actions
Script step → Script Action
Decision step → Script Action, Advisor Agent, or Jev Action
Approval step → application-owned approval Action
```

Checks and deterministic scripts do not consume a model call just to start a process. Agents receive only their declared capabilities. Privileged host actions remain application-controlled.

A model-backed Action does consume model-call capacity. The direct Action path avoids an unnecessary agent loop, but it keeps the same attempt, timeout, cancellation, usage, and recovery requirements. See [Routing and loops](routing-loops.md) for replaceable decision sources.

## State is owned by the runner

The runner decides which work is eligible and records outcomes. One local service owns that state for all registered workspaces. Foreground execution and a daemon are two launch modes for the same service. The CLI and graphical clients display recorded state. Moving a node changes layout; it does not start, complete, or approve a step.

Default limits are two active runs and two simultaneous model calls across all workspaces, both configurable. Independent runs, parallel reviewers, and model-backed decisions share the model-call capacity. A parent step waiting for its reviewers must not hold a model-call slot. See [CLI, daemon, and workspaces](cli-workspaces.md) for ownership and lifecycle rules.
