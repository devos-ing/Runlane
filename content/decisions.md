# Decisions and delivery

Use this page as the starting point for a teammate design review. This documentation set reflects the workflow-platform direction and supersedes the earlier session- and Ticket-centered product framing.

## Agreed direction

- Build a local-first workflow automation and observability platform for agents.
- Use Workflow → Stages → Agents → Actions, with direct actions where no model is needed.
- Make the run graph and inspectable trace part of the first working slice.
- Reuse Pi for agent execution and adopt Pi durable for the persistence foundation.
- Let contributors add agents, prompts, and scripts through validated definitions.
- Keep explicit model bindings, bounded loops, and defaults of two active runs and two simultaneous model calls globally.
- Support independent runs and parallel read-only reviewers. Every designated reviewer must approve in the coding-review template.
- Keep session management inside the Pi integration. Treat Tickets, worktrees, and PRs as coding-template capabilities.

## Delivery sequence

| Slice | Outcome | Status |
| --- | --- | --- |
| Documentation | Markdown site, shared vocabulary, interactive React Flow demonstration. | This preview |
| Runner proof | One real workflow invocation, durable events, live graph, selected-node trace. | Planned |
| Execution controls | Direct scripts, typed routing, bounded repetition, cancellation, parallel work, global limits. | Planned |
| Contributor authoring | Validated Agent/Action catalog, workflow forms, definition editing and layout persistence. | Planned |
| Schedules | Manual and cron triggers, occurrence identity, overlap policy, visible history. | Planned |
| Coding template | Optional worktree, candidate checks, independent review, human-approved draft PR. | Planned |

The runtime and persistence proof includes package/version selection and lifecycle verification. A model invocation or persisted record must not be reported as successful from a simulated trace.

## Discuss before implementation

1. Which Pi durable public records map cleanly to a run, attempt, event, and artifact?
2. Can those records satisfy our atomic transition and occurrence-deduplication requirements on Bun?
3. What is the smallest first workflow that a teammate will use repeatedly?
4. Which Agent and Action result contracts need to ship before custom result schemas?
5. Which routes and parallel groups must the first editor support?

These questions do not justify building a plugin framework or a second agent runtime. Resolve them with bounded integration evidence and a concrete workflow.

## Verification policy

AI contributors must not write, run, or delegate unit or end-to-end tests. Use typechecking, lint, build, and the smallest permitted integration check for load-bearing runtime behavior. Browser screenshots can support visual inspection; they do not prove live agent execution.

The current website is a static documentation application with a deterministic client-side demonstration. It has no backend runner, credentials, model calls, active cron jobs, or Pi durable database.

## Maintain this site

The pages are ordinary files in `content/`. Edit Markdown, then update the small navigation list when adding a page. The `<!-- playground -->` marker inserts the React Flow demonstration; it does not execute code from Markdown.

Use the source link on each page to inspect or download its Markdown. Share page URLs and heading anchors during review. The product is named Runlane. The hosting destination remains undecided.
