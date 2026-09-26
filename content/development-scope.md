# Development scope

Runlane's development action limiter is a scope record for a work item. It states the goal, reason, approach, boundaries, and completion evidence before work expands. Human contributors and coding agents use the same record.

This is a development rule, not a new runtime module. Runtime Actions and their execution limits are defined in [Agents and actions](agents-actions.md), [Routing and loops](routing-loops.md), and [Core concepts](concepts.md).

## Goal

Help developers define reusable agent workflows and understand each execution through a graph and trace. A developer should be able to change an agent, model, script, or step without editing the runner for each workflow.

The product reference is GitHub Actions for agent workflows. Runlane makes orchestration and execution evidence visible while the selected Runtime handles the agent loop. The current proof uses Pi.

## Why

Ad hoc scripts and manual handoffs make it difficult to see which agent did what, which input it used, and why the next step started. Runlane records those relationships and presents them in one run view.

Development needs the same discipline. Adding a new agent should not produce another execution engine. Adding a client should not produce another scheduler. A bounded work item gives reviewers a concrete way to distinguish required changes from unrelated expansion.

## How

The agreed design uses trusted `.mjs` definitions, a validated graph, and a retained source version for each run. One service for the current operating-system user manages registered workspaces. Its runner owns execution state, outcome routing, shared capacity, and bounded repetition. The CLI proof now executes one Agent through Pi and commits run checkpoints through Pi durable on Bun SQLite; broader workflow behavior remains planned.

Delivery starts with a CLI and foreground service. Prove one invocation, then add the real review loop and connect the existing React Flow view to its records. The first usable milestone includes independent runs across workspaces and parallel reviewers under shared limits. Background launch management, Jev, desktop packaging, and cron follow it. A separate web product and a TUI remain later options. See [Decisions and delivery](decisions.md).

Contributors configure Workflow, Agent, Action, Trigger, and Profile. Workflow owns its identified steps. Scripts implement Actions; Review is work within the workflow. Reuse plain configurations and imported result schemas, with no standalone Step registry or Review engine. Contributors adding an execution system extend the agreed Runtime parent class. Keep its interface small and mutable state on attempts and runs.

## Product boundaries

| Area | Runlane owns | Boundary |
| --- | --- | --- |
| Workspaces | Stable registration, source roots, and ownership of workflows and execution records. | A workspace need not be a Git repository and is not a process sandbox. Shared definitions do not share run state. |
| Workflow authoring | Five components with identified steps inside each Workflow. | `.mjs` remains authoritative. A Step is local workflow data, not another component or registry. |
| Script Actions | Planned `.mjs` and `.sh` execution using explicit interpreters and one Action contract. | Keep input, output, timeout, cancellation, and trace handling shared. No separate Script engine. |
| Review | Reviewer Agents and deterministic checking Actions inside a workflow. | Preserve designated-reviewer approval rules. A Trigger requests a new Run; Review assesses existing work. |
| Orchestration | Admission, attempts, result validation, routing, cancellation, and recovery. | Each Runtime owns its native agent loop and context. Keep session management below the product. |
| Runtime extensions | One parent class with shared invocation checks and concrete native integrations. | Extract Pi first. Keep authoring data separate from instances, preserve global capacity, and gate additional integrations on real evidence. |
| Decisions | Replaceable sources that return a schema-validated final outcome and evidence. | Keep confidence rules inside the relevant Action, destinations explicit, and model calls within shared capacity. No generic DecisionPolicy engine. |
| Observability | Run history, graph state, trace events, and evidence references. | Show observable execution. Simulated events never prove a live integration. |
| Persistence | Run identity, ordering, loop counters, controlled source references, and atomic transitions. | Verify Pi durable first. Block unsupported recovery rather than building a general environment restorer or another conversation store. |
| Extensions | Agent definitions, prompts, scripts, and declared capabilities. | Load explicitly trusted sources. Validation and working directories are not sandboxes. |
| Coding workflows | Optional Ticket input, candidate checks, worktrees, review, and publication actions. | Keep those requirements in the coding template, outside the general workflow core. |
| Deployment | One user-owned local service, foreground and daemon launch modes, and CLI and graphical clients. | Hosted runners, distributed scheduling, tenant management, and a plugin marketplace are outside current scope. Automatic OS service installation is deferred. |

GitHub Actions YAML compatibility, a chat or IDE product, arbitrary JavaScript visual editing, and automatic model fallback are also outside the current direction.

## Limit each work item

Use one scope record in the existing ticket, plan, or PR. Do not create another tracking system. Reuse information already present in the work item. A spelling correction or small documentation repair can state its scope in a sentence.

| Field | Required answer |
| --- | --- |
| Goal | What can a developer do or observe after this change? |
| Why | Which current problem or accepted requirement needs it? |
| How | What is the smallest change, and what existing module or dependency can be reused? |
| In scope | Which behavior and owned modules may change? |
| Boundaries | Which interfaces, invariants, and authoritative records must remain valid? |
| Out of scope | Which adjacent improvements are deliberately excluded? |
| Evidence | What permitted checks demonstrate the outcome and its relevant failure behavior? |
| Done | What observable result ends this work? |
| Stop or revisit | Which discovery would require a different product decision or more authorization? |

Planning, implementation, and review use this same record. Planning identifies the change and its evidence. Implementation follows that boundary. Review checks the result against the stated outcome and preserved invariants. A useful adjacent improvement can become a separate proposal without delaying completion of the current work.

## Example for slice A, the execution proof

| Field | Runner proof |
| --- | --- |
| Goal | Register one workspace, start one manual workflow with one configured Agent from the CLI, and inspect durable status and trace. |
| Why | Prove authoring, execution, persistence, and observation work together before adding more orchestration. |
| How | Run the service in the foreground, resolve a registered workspace, validate and retain its workflow source, invoke Pi, and expose recorded events to the CLI. |
| In scope | Minimal workspace registration, the loader, one invocation path, required durable records, CLI status, and trace output. |
| Boundaries | Explicit model and effort, validated input and output, workspace attribution, one state owner, retained source, and visible cancellation or interruption. |
| Out of scope | Background process management, Jev integration, parallel steps, repair loops, cron, desktop packaging, live graph integration, PR publication, and a general plugin system. |
| Evidence | Typecheck, lint, build, and a focused permitted integration check covering the real invocation and the relevant interruption or failure path. |
| Done | A real result appears in the workspace's recorded run and trace. Invalid input or an unavailable model cannot appear as success. Client reconnection preserves run identity. Service interruption does not silently duplicate work. |
| Stop or revisit | Pi durable cannot meet the required atomic transition, the selected Pi version fails the required lifecycle, or source retention requires capabilities outside this slice. Record the evidence and resolve the affected design choice. |

Slice A is implemented as a bounded integration proof, not completion of the product milestone. Step naming alignment and then the Pi Runtime extraction precede slice B; each must preserve readable history. The Runtime parent design does not claim implementation. Slices B and C add the bounded workflow and live graph. Their acceptance evidence must cover `.mjs` and `.sh` Script Actions, a real review result, a repair round, a visible failure, both forms of parallelism, shared capacity, and preserved state on reconnect or restart.

Use the existing graph for that evidence before adding Jev or desktop packaging. Source retention starts with a controlled set of known files and a verified dependency environment. Unsupported or missing inputs block the run. These boundaries keep the milestone small without dropping validation, recovery, or the user's required parallel behavior.

This plan is not an instruction to expand the runtime during every task. The repository includes the single-Agent CLI proof and documentation site; the graph is still simulated. [Submit a task](cli-quickstart.md) records the current boundary. A planned capability becomes implementation work only when the current task includes it.

## Completion and scope changes

Continue routine implementation choices within the existing authorization. Ask for clarification only when an unresolved choice changes the requested outcome, a product boundary, or an action that needs additional authorization. Pause the affected part and continue independent authorized work.

Keep required validation, recovery, and safety checks. A smaller patch that drops those checks does not satisfy the scope record. Avoid unrelated refactors, speculative abstractions, and dependencies that the current outcome does not require.

Finish when the stated outcome and required evidence are complete. Reopen verification when a new change, failure, or unresolved concern warrants it. Record a discovered limitation without silently adding its solution to the same task.

Use the [verification policy](decisions.md#verification-policy). AI contributors must not write, run, or delegate unit or end-to-end tests. Static checks and permitted integration evidence must be described accurately.

## Keep the rules maintainable

This page owns the development scope rule. [Core concepts](concepts.md) owns module responsibilities. [Decisions and delivery](decisions.md) owns agreed direction, recommendations, and delivery order. Work items own their specific acceptance evidence.

When a decision changes, update its owning document and the affected work item together. Replace obsolete rules instead of accumulating exceptions. `AGENTS.md` and the README link to these documents so contributors can find the same rules without maintaining copies.
