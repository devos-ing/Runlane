# Decisions and delivery

Use this page as the starting point for a teammate design review. This documentation set reflects the workflow-platform direction and supersedes the earlier session- and Ticket-centered product framing.

Use [Development scope](development-scope.md) to bound a work item by its goal, reason, approach, exclusions, and completion evidence.

## Agreed direction

- Build a local-first workflow automation and observability platform for agents.
- Deliver the CLI and runner foundation first, with durable trace from the first real invocation.
- Use one local service per operating-system user to manage all registered workspaces. Foreground and daemon modes use the same runner.
- Define Workspace as a stable identity, display name, and source root. Scope workflows, schedules, runs, and evidence to it.
- Use Workflow → Stages → Agents → Actions, with direct actions where no model is needed.
- Author workflows in `.mjs`, with optional `.ts` support. Import reusable agents, scripts, and trigger definitions from trusted sources.
- Combine instructions, capabilities, model profile, effort, and result contract in Agent. Stage assignment identifies where an Agent is used; it does not require a separate public Agent binding type.
- Use plain definition objects and a shared execution interface for Agent and Action adapters. Add no base class until duplicated behavior justifies one. Advisor, Implementer, and Reviewer remain Agent presets.
- Use one imported result schema as the source of truth for result validation and allowed outcomes. Do not repeat those outcomes in another configuration field.
- Allow scripts and Advisors to supply decisions through the same result interface. Add Jev after the real workflow and graph work together.
- Keep confidence rules inside the decision Action that needs them. The runner validates the final result and selects a declared route; it has no generic DecisionPolicy engine.
- Declare every route destination in advance. A decision is an execution result, not another parent class or agent engine.
- Commit accepted decisions and selected routes before advancing. Recovery reuses committed decisions rather than calling a model to select again.
- Connect the existing React Flow view to real events in the first usable milestone, before Jev integration or desktop packaging.
- Use React Flow for viewing execution, inspecting trace, and arranging layout. Edit execution logic in source files.
- Reuse Pi for agent execution and adopt Pi durable for the persistence foundation.
- Let contributors add agents, prompts, and scripts through validated definitions.
- Keep explicit model profiles, bounded loops, and defaults of two active runs and two simultaneous model calls across all workspaces.
- Include model-backed decision Actions in that shared capacity. Distinguish valid uncertainty from provider failures and malformed results.
- Start with a controlled set of retained source files and recorded dependency versions. Edits apply to new runs. Missing or unsupported recovery inputs block execution instead of triggering automatic environment reconstruction.
- Support independent runs and parallel read-only reviewers. Every designated reviewer must approve in the coding-review template.
- Keep session management inside the Pi integration. Treat Tickets, worktrees, and PRs as coding-template capabilities.

## Interface and lifecycle direction

The CLI is the first client for workspace registration, workflow validation, starting runs, status, logs, and explicit cancellation. It supports readable output and JSON for automation. The service owns all execution and persistence; the CLI does not create a second runner.

Start the service in the foreground during the first runtime slice. One service owns the user's state directory and all registered workspaces. Client disconnects do not cancel runs. Preserve interruption records and committed routes from the start. Add manual daemon start, status, and graceful stop around the same implementation after the first usable milestone.

Connect the existing React and React Flow view to the local service early, with a read-only graph and trace inspector. This proves observability without waiting for a desktop shell. Desktop packaging follows later and reuses that UI. A separately delivered web product and a TUI remain optional later clients. Feature parity is not required.

The detailed contract and proposed commands are in [CLI, daemon, and workspaces](cli-workspaces.md). No CLI, daemon, or desktop runtime is implemented by this documentation site. Desktop framework selection, login startup, and operating-system service installers remain later decisions.

## Delivery sequence

| Slice | Outcome | Status |
| --- | --- | --- |
| Documentation | Markdown site, shared vocabulary, interactive React Flow demonstration. | This preview |
| A. Execution proof | One workspace, a foreground service, one real Pi invocation, result validation, durable attempts and events, and CLI status and cancellation. Verify Pi durable mapping before expanding it. | Next |
| B. Real workflow | A bounded Plan → Implement → Checks → parallel Review example with a shared two-repair loop. Exercise independent runs across two workspaces under shared capacity. | Planned |
| C. Live observation | Connect the existing React Flow view and inspector to those real records. Show active work, results, failures, and the chosen repair route. | Planned |
| Daemon operation | Manual background start, status, graceful stop, and reconciliation using the same runner and records. | After A–C |
| Jev Action | Optional decision adapter with local confidence rules, shared model capacity, and normal result validation. | After A–C |
| Desktop packaging | Package the shared React UI and connect it to the existing local service. | After A–C |
| Schedules | Cron admission, occurrence identity, overlap policy, and visible history. | After A–C |
| Coding template | General repository and worktree provisioning, plus human-approved draft PR publication. Reuse the demonstrated checks and review loop. | Later |

The runtime and persistence proof includes package/version selection and lifecycle verification. A model invocation or persisted record must not be reported as successful from a simulated trace.

A–C form the first usable milestone. A alone is an integration proof, not delivery of the workflow product. Preserve both requested forms of parallelism, every designated reviewer's approval, and configurable defaults of two active runs and two model calls across workspaces.

Use an isolated example directory for the code-change workflow. Parallel reviewers inspect the same immutable candidate, and independent writing runs use different workspaces. General repository provisioning and PR publication stay in the later coding template.

The definition objects and schema references in these pages are proposals. The loader and runtime are not implemented. Public SDK packaging is deferred. Importing author JavaScript can still execute arbitrary code, so the loader accepts explicitly trusted sources.

Visual editing of execution logic is deferred. Supporting arbitrary `.mjs` round-tripping would require a separate restricted authoring format or source transformation design.

## First usable milestone

The first runtime slice registers one workspace and accepts a CLI-submitted workflow with declared inputs and one configured Agent. A foreground service loads the workflow and records its workspace identity, validated definition, and retained source version before creating an attempt.

CLI status and trace show admission, execution, validated output, actual model, and effort from persisted records. A failed definition load or unavailable model appears as a blocker before execution. Cancellation and service interruption preserve attributable evidence. Disconnecting a client does not launch, cancel, or duplicate work.

Then extend that path to a real workflow with deterministic checks, parallel review, bounded repair, and the existing graph. A failed review round consumes one repair allowance. A malformed result or provider error remains a failed or blocked attempt. A client reconnect or service restart cannot reset counters or replace a committed decision.

Completion means the CLI can control real work and the graph shows the same durable state, including a repair and a failure. The current graph remains simulated until that connection is implemented.

## Keep the core small

Keep four core responsibilities: load and validate definitions, run the workflow, execute through adapters, and store records. Workspace registration and source references can be records in that store. Routing and bounded repetition can be data interpreted by the runner. These responsibilities do not require four packages or a class for every domain term.

Retain schema validation, explicit model selection, source identity, cancellation, global capacity, and atomic transitions. Defer a universal policy engine, an inheritance framework, an expression engine, and automatic dependency or environment reconstruction. Extract another shared module only when real implementations repeat the same behavior.

## Discuss before implementation

1. Which Pi durable public records map cleanly to a run, attempt, event, and artifact?
2. Can those records satisfy our atomic transition and occurrence-deduplication requirements on Bun?
3. Which one-agent manual workflow should be the first reusable example?
4. Which Agent and Action result contracts need to ship before custom result schemas?
5. Which controlled source set and existing dependency environment can the first workflow retain and verify without a general-purpose bundler?
6. Which local client transport supports the CLI and graphical client while preserving one authenticated state owner?

Jev provider selection, its confidence settings, and desktop packaging are later decisions. They do not block the execution proof or live graph.

These questions do not justify building a plugin framework or a second agent runtime. Resolve them with bounded integration evidence and a concrete workflow.

## Verification policy

AI contributors must not write, run, or delegate unit or end-to-end tests. Use typechecking, lint, build, and the smallest permitted integration check for load-bearing runtime behavior. Browser screenshots can support visual inspection; they do not prove live agent execution.

The current website is a static documentation application with a deterministic client-side demonstration. It has no backend runner, credentials, model calls, active cron jobs, or Pi durable database.

## Maintain this site

The pages are ordinary files in `content/`. Edit Markdown, then update the small navigation list when adding a page. The `<!-- playground -->` marker inserts the React Flow demonstration; it does not execute code from Markdown.

Use the source link on each page to inspect or download its Markdown. Share page URLs and heading anchors during review. The product is named Runlane. The hosting destination remains undecided.
