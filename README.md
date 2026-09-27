# Runlane

A local execution proof and Markdown design documentation for Runlane, a workflow automation and observability platform for agents. The CLI submits real tasks to one Pi Agent and stores durable run history. The React Flow canvas is still a simulated demonstration.

The execution proof pins Pi coding-agent and Pi durable at 0.87.1 and runs on Bun. Start with [Submit a task](content/cli-quickstart.md) for the supported commands and [the slice-A specification](docs/specs/cli-submission.md) for its limits.

[Current architecture](docs/architecture.md) describes the implemented service and persistence path, separately from the broader design pages.

## Run the CLI proof

```sh
bun install --frozen-lockfile
bun run runlane serve
```

In another terminal, register `./examples/task-workspace`, then use the returned workspace ID to validate and submit `plan-task` with `--input examples/task-workspace/task.json`. The example requires configured Pi authentication for `openai-codex/gpt-6-luna`, runs at `low` effort, and produces a plan without editing files. See the quickstart for complete commands, logs, cancellation, and restart behavior.

The agreed design uses `.mjs` workflow files to compose steps, configured agents, direct actions, and triggers. React Flow displays the validated graph and each run's trace. Execution changes happen in source files; canvas changes affect layout.

The five authoring components are Workflow, Agent, Action, Trigger, and Profile. A Step is an identified position inside a Workflow. Script is an Action implementation, with planned `.mjs` and `.sh` support; Review is work performed by Agents or Actions. The current CLI still uses `stages`, `entryStage`, and `stageId`. The design documents use their target Step names, and the migration is explicitly planned before slice B.

The agreed [Runtime parent class](content/runtimes.md) provides the Agent execution extension, with planned Pi, Codex, and Claude subclasses. Agent Profiles select a Runtime by ID. The parent class and selector are not implemented: Pi extraction follows Step naming alignment, and additional integrations follow the first usable milestone. The [delivery plan](content/decisions.md#runtime-extraction-and-later-integrations) records the migration and integration checks.

The [Pi reuse mapping](content/pi-integration.md) delegates native execution, model catalog, authentication, tools, and conversation history to the existing SDK. The [implementation plan](content/decisions.md#pi-reuse-implementation-plan) keeps Runlane focused on definition loading, workflow scheduling, validated results, checkpoints, and observation.

[Routing and loops](content/routing-loops.md) defines final outcomes and explicit destinations. The current runner accepts only completion or `needs_input` from one Agent. Multi-step routes, scripts, bounded loops, and Jev remain planned.

The first usable milestone combines CLI control, a real workflow with checks and parallel review, a bounded repair loop, and the existing React Flow view connected to live records. A foreground service manages workspaces and shared capacity. Background daemon launch, Jev, desktop packaging, and cron follow that milestone. Read [CLI, daemon, and workspaces](content/cli-workspaces.md) for ownership and lifecycle rules.

Read [the glossary](CONTEXT.md), [workflow authoring](content/workflows.md), and [decisions and delivery](content/decisions.md) for the broader design. The runnable subset lives in `examples/task-workspace`; unsupported definition shapes are rejected. Public SDK packaging is deferred.

Before planning development, read [Development scope](content/development-scope.md). It defines the goal, reason, approach, boundaries, and completion evidence for each work item. [AGENTS.md](AGENTS.md) points coding agents to the same rules.

## Start the site

Use Bun to install the pinned dependencies and start the local server:

```sh
bun install --frozen-lockfile
bun run dev
```

Open [the local documentation](http://127.0.0.1:4173/). The server binds to loopback. A teammate needs their own copy or a separately hosted build; this local URL is not a public share link.

## Edit the documentation

The documentation pages live in [content](content). Edit the `.md` files directly. Add a page to the small navigation list in [src/docs.ts](src/docs.ts) when creating a new document.

Use ordinary Markdown headings, tables, links, and fenced examples. A standalone `<!-- playground -->` line inserts the React Flow example. Markdown does not execute JavaScript or arbitrary embedded components.

Each page provides its Markdown source, heading anchors, and adjacent-page navigation. Search uses the local Markdown text. Fonts are bundled locally; reading the site does not require a font CDN.

## Understand the implementation

| File | Responsibility |
| --- | --- |
| `runtime/cli.ts` | Manual task submission, workspace commands, status, logs, and cancellation. |
| `runtime/service.ts` | Authenticated loopback admission, one state owner, and bounded scheduling. |
| `runtime/definitions.ts` | Fresh trusted-module loading, shape checks, schemas, and resolved snapshots. |
| `runtime/agent.ts` | Explicit Pi model invocation, cancellation, and validated JSON results. |
| `runtime/store.ts` | Pi durable workspace/run documents through Bun SQLite. |
| `src/App.tsx` | Document layout, navigation, search, and Markdown rendering. |
| `src/docs.ts` | Navigation metadata and Markdown/source loading. |
| `src/FlowPlayground.tsx` | React Flow nodes, selected-execution inspector, and replay controls. |
| `src/demo.ts` | Explicit sample events, template layout, and status projection. |
| `src/styles.css` | Reading layout, responsive behavior, and graph presentation. |

The graph supports layout exploration and node inspection. Connections are read-only. Replay advances local sample data only. The node selector also exposes every execution without requiring precise canvas interaction. On narrow screens, the initial view focuses on the Review group; pan, zoom, or choose an execution to explore the rest.

The canvas does not connect to the CLI service yet. Its sample events must not be read as live execution evidence. The CLI proof has real Pi and Pi durable integration, but no background launcher, desktop shell, plugins, active schedule, tools, ScriptAction, or multi-step runner.

## Build and inspect

```sh
bun run typecheck
bun run lint
bun run build
bun run preview
```

The `build` command also typechecks. It emits a static site in `dist/`, including Markdown downloads and self-hosted fonts. Query-based document URLs work on a basic static server without custom route rewrites. Stop an existing development server before using the preview command on the same port.

The production build checks both the documentation site and runtime TypeScript. It does not make the simulated graph a live client.

## Evidence and limits

- Implemented: the foreground single-Agent CLI proof, workspace registration, JSON task submission, status/logs/cancellation, Pi durable records, and the documentation site.
- Verification uses TypeScript, Biome, the production build, focused integration checks, and a manually submitted real planning task. No unit or end-to-end tests are included.
- Visual evidence: desktop page inspection and narrow-viewport layout/containment inspection during the earlier local inspection.
- Planned: multi-step execution, parallel reviewers, bounded repair, ScriptAction, live graph connection, background launch management, desktop packaging, Jev, and scheduling. Slice A is not the full A–C milestone.
