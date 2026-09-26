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
- Share an internal `Executable` parent contract between Agent and Action. Advisor, Implementer, and Reviewer remain Agent presets.
- Keep outcome routing deterministic. An Advisor supplies a result; the runner validates and routes it.
- Add the live graph through a graphical client after the CLI and daemon foundation. Reuse the same execution records and events.
- Use React Flow for viewing execution, inspecting trace, and arranging layout. Edit execution logic in source files.
- Reuse Pi for agent execution and adopt Pi durable for the persistence foundation.
- Let contributors add agents, prompts, and scripts through validated definitions.
- Keep explicit model profiles, bounded loops, and defaults of two active runs and two simultaneous model calls across all workspaces.
- Retain each run's definition, source files, and dependency version references. Edits apply to new runs, and recovery uses the recorded version.
- Support independent runs and parallel read-only reviewers. Every designated reviewer must approve in the coding-review template.
- Keep session management inside the Pi integration. Treat Tickets, worktrees, and PRs as coding-template capabilities.

## Interface and lifecycle direction

The CLI is the first client for workspace registration, workflow validation, starting runs, status, logs, and explicit cancellation. It supports readable output and JSON for automation. The service owns all execution and persistence; the CLI does not create a second runner.

Start the service in the foreground during the first runtime slice. Add manual daemon start, status, and graceful stop around that same implementation. One service owns the user's state directory and all registered workspaces. Client disconnects do not cancel runs. Service shutdown and recovery are explicit operations.

Desktop is the planned graphical client. Reuse React and React Flow for graphs, trace, and workspace navigation. Keep that UI reusable for browser access without requiring a separately delivered web product in the first release. A TUI is deferred until terminal monitoring needs justify it. These clients use the same operations and durable events, without requiring feature parity.

The detailed contract and proposed commands are in [CLI, daemon, and workspaces](cli-workspaces.md). No CLI, daemon, or desktop runtime is implemented by this documentation site. Desktop framework selection, login startup, and operating-system service installers remain later decisions.

## Delivery sequence

| Slice | Outcome | Status |
| --- | --- | --- |
| Documentation | Markdown site, shared vocabulary, interactive React Flow demonstration. | This preview |
| CLI runner proof | Register one workspace, load and retain one trusted `.mjs` workflow, and invoke one real agent through a foreground service with durable status and trace. | Planned |
| Daemon and workspaces | Background lifecycle, multiple registered roots, scoped records, one state owner, and recovery after service interruption. | Planned |
| Execution controls | Direct scripts, typed routing, bounded repetition, cancellation, parallel work, global limits. | Planned |
| Contributor authoring | Reusable Agent and Action examples, validation diagnostics, and source reload for future runs. | Planned |
| Graphical client | Desktop shell around the shared React UI, workspace navigation, live graph, layout persistence, and selected-node trace from the service. | Planned |
| Schedules | Manual and cron triggers, occurrence identity, overlap policy, visible history. | Planned |
| Coding template | Optional worktree, candidate checks, independent review, human-approved draft PR. | Planned |

The runtime and persistence proof includes package/version selection and lifecycle verification. A model invocation or persisted record must not be reported as successful from a simulated trace.

The `@runlane/sdk` imports and constructors in these pages are proposed interfaces. The package and loader are not implemented. SDK constructors create definitions only. Importing author JavaScript can still execute arbitrary code, so the loader accepts explicitly trusted sources.

Visual editing of execution logic is deferred. Supporting arbitrary `.mjs` round-tripping would require a separate restricted authoring format or source transformation design.

## First implementation boundary

The first runtime slice registers one workspace and accepts a CLI-submitted workflow with declared inputs and one configured Agent. A foreground service loads the workflow and records its workspace identity, validated definition, and retained source version before creating an attempt.

CLI status and trace show admission, execution, validated output, actual model, and effort from persisted records. A failed definition load or unavailable model appears as a blocker before execution. Cancellation and service interruption preserve attributable evidence. Disconnecting a client does not launch, cancel, or duplicate work.

This slice proves workspace identity, the loader, Pi adapter, Pi durable mapping, and the client event path together. Later slices add daemon lifecycle, multiple workspaces, scripts, parallel stages, bounded loops, the graphical client, and schedules to that same path. The existing graph remains a simulated preview until connected to real events.

## Discuss before implementation

1. Which Pi durable public records map cleanly to a run, attempt, event, and artifact?
2. Can those records satisfy our atomic transition and occurrence-deduplication requirements on Bun?
3. Which one-agent manual workflow should be the first reusable example?
4. Which Agent and Action result contracts need to ship before custom result schemas?
5. What is the smallest retained source format that preserves imported modules, prompts, scripts, and pinned dependencies across restart?
6. Which local client transport supports the CLI and graphical client while preserving one authenticated state owner?

These questions do not justify building a plugin framework or a second agent runtime. Resolve them with bounded integration evidence and a concrete workflow.

## Verification policy

AI contributors must not write, run, or delegate unit or end-to-end tests. Use typechecking, lint, build, and the smallest permitted integration check for load-bearing runtime behavior. Browser screenshots can support visual inspection; they do not prove live agent execution.

The current website is a static documentation application with a deterministic client-side demonstration. It has no backend runner, credentials, model calls, active cron jobs, or Pi durable database.

## Maintain this site

The pages are ordinary files in `content/`. Edit Markdown, then update the small navigation list when adding a page. The `<!-- playground -->` marker inserts the React Flow demonstration; it does not execute code from Markdown.

Use the source link on each page to inspect or download its Markdown. Share page URLs and heading anchors during review. The product is named Runlane. The hosting destination remains undecided.
