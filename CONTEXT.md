# Runlane

Runlane is a workflow automation and observability platform for agents. This glossary defines the language used in its design documents.

## Language

**Workspace**:
A registered context that groups workflow definitions, configuration, schedules, runs, and evidence under a stable identity and source root.
_Avoid_: Repository or worktree as synonyms

**Daemon**:
The background form of the local Runlane service that manages the current user's registered workspaces and executions.

**Workflow**:
A versioned process containing stages, input requirements, outcome routes, triggers, and completion policy.

**Stage**:
A step in a workflow that assigns work to agents or direct actions and routes the result.

**Agent**:
A reusable configuration containing instructions, capabilities, a model profile, reasoning effort, and a result contract.
_Avoid_: Agent binding as a separate public configuration type

**Agent assignment**:
The use of an Agent in a stage, identified separately from other uses of the same Agent.

**Advisor**:
An Agent preset that produces a plan or decision for a workflow.
_Avoid_: Route

**Model profile**:
A saved provider and model selection referenced by an Agent or a model-backed Action.

**Action**:
A capability executed directly by a stage or made available to an Agent, such as a tool, script, model decision, or application-owned operation.

**Decision**:
A structured result used to choose a declared workflow path, with any evidence required by its result contract.
_Avoid_: A separate agent type or execution engine

**Decision policy**:
A declared rule that accepts a proposed decision or maps it to another allowed outcome, such as a request for input.

**Route**:
A rule that maps an accepted, validated stage outcome to another stage, a declared loop, completion, or stopped execution.
_Avoid_: Advisor

**Loop**:
A declared repetition of work within one run, with a finite allowance for re-entry.

**Trigger**:
A command or event that requests a new workflow run.

**Run**:
One execution of a frozen workflow version within a workspace, with specific inputs and its own execution state.
_Avoid_: Session

**Attempt**:
One invocation of assigned work within a run, with an attributable result or interruption.

**Trace event**:
A recorded observable fact about a run, attempt, action, or routing decision.

**Artifact**:
An output or evidence object associated with a run or attempt.
