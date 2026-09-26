# Runlane

Runlane is a workflow automation and observability platform for agents. This glossary defines the language used in its design documents.

## Language

**Workspace**:
A registered context that groups workflow definitions, configuration, schedules, runs, and evidence under a stable identity and source root.
_Avoid_: Repository or worktree as synonyms

**Daemon**:
The background form of the local Runlane service that manages the current user's registered workspaces and executions.

**Workflow**:
A versioned process containing steps, input requirements, outcome routes, triggers, and completion policy.

**Step**:
A locally identified execution position within a Workflow that runs Agents or Actions and routes their result.
_Avoid_: Stage as a separate component

**Agent**:
A reusable configuration containing instructions, capabilities, a profile, reasoning effort, and a result contract.
_Avoid_: Agent binding as a separate public configuration type

**Agent assignment**:
The use of an Agent in a step, identified separately from other uses of the same Agent.

**Advisor**:
An Agent preset that produces a plan or decision for a workflow.
_Avoid_: Route

**Profile**:
Saved execution settings referenced by an Agent or a model-backed Action. An Agent Profile selects a Runtime and its supported provider and model settings.

**Runtime**:
The execution system selected for an Agent attempt, responsible for its agent loop, native context, and observable progress.
_Avoid_: AgentHarness as another object, or Workflow Runner as a synonym

**Workflow Runner**:
The coordinator that admits and schedules workflow work, validates results, and records routes, loop counters, and execution state.
_Avoid_: Runtime as a synonym

**Action**:
A capability executed directly by a step or made available to an Agent, such as a tool, script, model decision, or application-owned operation.

**Script Action**:
An Action implemented by a script file and an explicit interpreter.
_Avoid_: Script as a parallel execution engine

**Review**:
Work within a Workflow that assesses an earlier result against declared criteria.
_Avoid_: Trigger or a separate review engine

**Decision**:
A structured result used to choose a declared workflow path, with any evidence required by its result contract.
_Avoid_: A separate agent type or execution engine

**Result schema**:
The definition of an execution result's shape and allowed outcomes, shared by its producer and consumers.

**Route**:
A rule that maps an accepted, validated step outcome to another step, a declared loop, completion, or stopped execution.
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
