# Core concepts

The product model describes reusable definitions and observable executions. Each concept has one job.

## Definition hierarchy

| Concept | Meaning |
| --- | --- |
| Workflow | A versioned process authored in code, containing stages, inputs, routes, and triggers. |
| Stage | A step that assigns work to agents or direct actions and routes the result. |
| Agent | A reusable configuration with instructions, capabilities, a model profile, reasoning effort, and a result contract. |
| Model profile | A saved provider and model selection referenced by an agent. |
| Action | One executable capability, such as a tool call, script, or host operation. |
| Route | A typed rule selecting the next stage, a declared loop, completion, or stopped execution. |
| Trigger | An event or command requesting a new run. |

An agent assignment is the use of an Agent in a stage. It has a stable local ID for trace attribution, but it is not a separate public `AgentBinding` configuration type. Import an Agent to reuse it. Create another Agent from shared settings when a different model or capability set is needed.

The Advisor, Implementer, and Reviewer are presets of Agent. An Advisor can produce a plan or a decision. A Route maps that validated decision to a declared destination. Keeping those responsibilities separate lets the runner enforce loop limits even when an Advisor requests more work.

## One execution contract

Agent and Action share an internal `Executable` parent contract for identity, input and result contracts, timeout, and cancellation. Keep this hierarchy shallow. Role presets do not need their own subclasses.

The public constructors create definitions. Runtime adapters perform the work through that shared contract. Contributors add agent configurations and scripts without implementing an executor or extending the internal parent.

| Module | Responsibility |
| --- | --- |
| Definition loader | Load trusted author code, validate its exported workflow, and retain the source version for a run. |
| Runner | Admit work, invoke execution adapters, evaluate routes, and enforce parallel and loop limits. |
| Pi adapter | Execute configured agents and translate their observable events. |
| Action adapters | Execute tools, scripts, and application-owned operations. |
| Trigger service | Request runs from manual starts and registered schedules. |
| Run store | Persist attempts, events, artifacts, and transitions using the selected Pi durable foundation. |
| Graph and inspector | Display the workflow and recorded execution state. |

These are design boundaries, not a requirement for separate packages or services. The current repository implements the documentation site and simulated graph only.

## Definitions are not runs

A **run** executes one frozen workflow definition with specific inputs and resolved model profiles. Its stage and agent attempts record actual work. Reusing a definition does not reuse mutable execution state.

The run also retains the corresponding scripts, prompts, and dependency version references. A definition hash alone cannot recover deleted or changed source files. Source edits affect new runs. An existing run must resume with its recorded version or report that the required source is unavailable.

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
