# Decisions and delivery

Use this page as the starting point for a teammate design review. This documentation set reflects the workflow-platform direction and supersedes the earlier session- and Ticket-centered product framing.

## Agreed direction

- Build a local-first workflow automation and observability platform for agents.
- Use Workflow → Stages → Agents → Actions, with direct actions where no model is needed.
- Author workflows in `.mjs`, with optional `.ts` support. Import reusable agents, scripts, and trigger definitions from trusted sources.
- Combine instructions, capabilities, model profile, effort, and result contract in Agent. Stage assignment identifies where an Agent is used; it does not require a separate public Agent binding type.
- Share an internal `Executable` parent contract between Agent and Action. Advisor, Implementer, and Reviewer remain Agent presets.
- Keep outcome routing deterministic. An Advisor supplies a result; the runner validates and routes it.
- Make the run graph and inspectable trace part of the first working slice.
- Use React Flow for viewing execution, inspecting trace, and arranging layout. Edit execution logic in source files.
- Reuse Pi for agent execution and adopt Pi durable for the persistence foundation.
- Let contributors add agents, prompts, and scripts through validated definitions.
- Keep explicit model profiles, bounded loops, and defaults of two active runs and two simultaneous model calls globally.
- Retain each run's definition, source files, and dependency version references. Edits apply to new runs, and recovery uses the recorded version.
- Support independent runs and parallel read-only reviewers. Every designated reviewer must approve in the coding-review template.
- Keep session management inside the Pi integration. Treat Tickets, worktrees, and PRs as coding-template capabilities.

## Interface recommendation

Use the web application as the primary interface for workflow graphs, parallel stage status, run history, and trace inspection. Add a small CLI for workflow validation, starting runs, status, logs, and explicit cancellation. CLI output should support readable text and JSON for scripts and CI. These commands are proposed capabilities, not implemented commands.

Both clients call the same application service. One local service owns execution, persistence, schedules, and global capacity. The web application does not import workflow code, and the CLI does not create a second runner or database owner. Closing a browser or disconnecting a CLI client does not cancel an admitted background run. If the service stops, recovery follows the recorded attempt state.

Start with one service and two small clients in the same repository. The first working slice needs a manual CLI start and a web graph with a trace inspector. A TUI is deferred until repeated terminal monitoring needs justify another interactive interface. This Web and CLI split is a recommendation for discussion.

## Delivery sequence

| Slice | Outcome | Status |
| --- | --- | --- |
| Documentation | Markdown site, shared vocabulary, interactive React Flow demonstration. | This preview |
| Runner proof | Load one trusted `.mjs` workflow, validate and retain its source, then manually run one real agent with durable events, a live graph, and selected-node trace. | Planned |
| Execution controls | Direct scripts, typed routing, bounded repetition, cancellation, parallel work, global limits. | Planned |
| Contributor authoring | Reusable Agent and Action examples, validation diagnostics, source reload for future runs, and layout persistence. | Planned |
| Schedules | Manual and cron triggers, occurrence identity, overlap policy, visible history. | Planned |
| Coding template | Optional worktree, candidate checks, independent review, human-approved draft PR. | Planned |

The runtime and persistence proof includes package/version selection and lifecycle verification. A model invocation or persisted record must not be reported as successful from a simulated trace.

The `@runlane/sdk` imports and constructors in these pages are proposed interfaces. The package and loader are not implemented. SDK constructors create definitions only. Importing author JavaScript can still execute arbitrary code, so the loader accepts explicitly trusted sources.

Visual editing of execution logic is deferred. Supporting arbitrary `.mjs` round-tripping would require a separate restricted authoring format or source transformation design.

## First implementation boundary

The first runtime slice accepts a manually started workflow with declared inputs and one configured Agent. It loads the workflow outside the browser and records its validated definition and retained source version before creating an attempt.

The graph shows admission, execution, and completion from persisted events. Selecting the agent shows its input, validated output, actual model, effort, and observable trace. A failed definition load or unavailable model appears as a blocker before execution. Cancelling or restarting produces a visible recoverable state instead of silently launching another invocation.

This slice proves the loader, Pi adapter, Pi durable mapping, and graph update path together. Later slices add scripts, parallel stages, bounded loops, and schedules to that same path.

## Discuss before implementation

1. Which Pi durable public records map cleanly to a run, attempt, event, and artifact?
2. Can those records satisfy our atomic transition and occurrence-deduplication requirements on Bun?
3. Which one-agent manual workflow should be the first reusable example?
4. Which Agent and Action result contracts need to ship before custom result schemas?
5. What is the smallest retained source format that preserves imported modules, prompts, scripts, and pinned dependencies across restart?

These questions do not justify building a plugin framework or a second agent runtime. Resolve them with bounded integration evidence and a concrete workflow.

## Verification policy

AI contributors must not write, run, or delegate unit or end-to-end tests. Use typechecking, lint, build, and the smallest permitted integration check for load-bearing runtime behavior. Browser screenshots can support visual inspection; they do not prove live agent execution.

The current website is a static documentation application with a deterministic client-side demonstration. It has no backend runner, credentials, model calls, active cron jobs, or Pi durable database.

## Maintain this site

The pages are ordinary files in `content/`. Edit Markdown, then update the small navigation list when adding a page. The `<!-- playground -->` marker inserts the React Flow demonstration; it does not execute code from Markdown.

Use the source link on each page to inspect or download its Markdown. Share page URLs and heading anchors during review. The product is named Runlane. The hosting destination remains undecided.
