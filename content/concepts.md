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
| Decision policy | A declared rule that accepts a proposal or maps it to another allowed outcome. |
| Route | A typed rule selecting the next stage, a declared loop, completion, or stopped execution. |
| Trigger | An event or command requesting a new run. |

A workspace owns workflow registrations. It need not be a Git repository, and it is distinct from a coding run's worktree. Workflow and stage definitions remain reusable across workspaces.

An agent assignment is the use of an Agent in a stage. It has a stable local ID for trace attribution, but it is not a separate public `AgentBinding` configuration type. Import an Agent to reuse it. Create another Agent from shared settings when a different model or capability set is needed.

The Advisor, Implementer, and Reviewer are presets of Agent. An Advisor can produce a plan or decision. A script or a Jev-backed Action can also supply a decision. The shared result path validates the proposal and applies any configured decision policy. A Route maps the accepted outcome to a declared destination. Decision is a use of the existing execution contract, not another parent class.

## One execution contract

Agent and Action share an internal `Executable` parent contract for identity, input and result contracts, timeout, and cancellation. Keep this hierarchy shallow. Role presets do not need their own subclasses.

The public constructors create definitions. Runtime adapters perform the work through that shared contract. Contributors add agent configurations and scripts without implementing an executor or extending the internal parent.

| Module | Responsibility |
| --- | --- |
| Workspace registry | Resolve stable workspace IDs, names, and source roots for every client. |
| Definition loader | Load trusted author code, validate its exported workflow, and retain the source version for a run. |
| Runner | Admit work, invoke execution adapters, validate results, apply decision policies, commit routes, and enforce parallel and loop limits. |
| Pi adapter | Execute configured agents and translate their observable events. |
| Action adapters | Execute tools, scripts, decision-model requests, and application-owned operations. |
| Trigger service | Request runs from manual starts and registered schedules. |
| Run store | Persist workspace ownership, attempts, events, artifacts, and transitions using the selected Pi durable foundation. |
| Client interface | Expose validation, submission, status, cancellation, snapshots, and events to CLI and graphical clients. |
| Graph and inspector | Display the workflow and recorded execution state. |

These are design boundaries, not a requirement for separate packages or services. The current repository implements the documentation site and simulated graph only.

## Definitions are not runs

A **run** executes one frozen workflow definition within a workspace, with specific inputs and resolved model profiles. Its stage and agent attempts record actual work. Reusing a definition does not reuse mutable execution state.

The run also retains the corresponding scripts, prompts, and dependency version references. A definition hash alone cannot recover deleted or changed source files. Source edits affect new runs. An existing run must resume with its recorded version or report that the required source is unavailable.

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
