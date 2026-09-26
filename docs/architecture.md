# Current execution proof

The repository contains a static documentation site and a separate Bun CLI/service implementation. The React Flow canvas is not connected to the service yet.

## Runtime modules

| Module | Current responsibility |
| --- | --- |
| `runtime/cli.ts` | Parse commands, select a workspace, submit JSON input, and display recorded status and events. |
| `runtime/service.ts` | Own one private state directory, authenticate loopback HTTP requests, and schedule at most the configured number of single-Agent invocations. |
| `runtime/definitions.ts` | Load one trusted `.mjs` export in a fresh process, reject unsupported shapes, compile schemas in isolation, and retain resolved execution data. |
| `runtime/agent.ts` | Invoke Pi with an explicit model/effort, no tools or discovered resources, host-bound cancellation, and strict JSON result validation. |
| `runtime/store.ts` | Adapt Bun SQLite to Pi durable and commit workspace/run checkpoints atomically. |
| `runtime/types.ts` | Define stored data and bounded public diagnostics. |

The CLI sends a request to the local service. The service resolves the workspace and definition, validates input and model availability, commits a queued run, and returns its ID. Scheduling and execution continue after the CLI disconnects. Agent completion, result, selected terminal route, and final lifecycle events are one durable checkpoint update.

## Ownership and persistence

`owner.sqlite` holds an exclusive transaction for the service lifetime. It is an ownership lock only. A paused process keeps it; process death releases it. Descriptor removal and storage cleanup happen before releasing ownership.

`runs.sqlite` is the Pi durable database. Workspace and run records are session-scoped documents. A run checkpoint includes its input, resolved schema/prompt/model snapshot, status, result, and event history. Writes are serialized in the owner process. The Bun facade uses WAL and `synchronous=FULL`, normalizes missing rows to `undefined`, and wraps Pi durable commit batches in SQLite transactions.

Pi SessionManager owns conversation files under the private state directory. Runlane records their paths without maintaining another model transcript. Run history is loaded into memory in this initial proof; pagination and retention are later work if history size requires them.

## Cancellation and recovery

User cancellation and timeouts abort the Pi invocation. Cancellation is checked after persisted startup and bound at the provider stream boundary, covering asynchronous Pi prompt preparation. The service saves cancelled, failed, or interrupted status without reporting approval.

Foreground service shutdown aborts running invocations and preserves interruption records. Startup marks leftover queued/running records interrupted. It does not replay them. Already committed results remain unchanged. A saved raw provider response alone is not treated as a completed result.

## Interface and current limits

HTTP listens on loopback and requires the private descriptor's bearer token. Browser Origin headers are rejected in slice A. Logs are cursor-based reads of stored lifecycle events. Upstream exception details and credentials are not returned as public errors.

The documentation dev server excludes `.scratch` in addition to Vite's normal private-file rules, so local execution evidence and connection descriptors there are not exposed as static files. Keep normal runtime state outside the web project, as the default `~/.runlane` location does.

Definitions support one tool-free Agent stage, explicit built-in model profiles, synchronous object schemas, and terminal `on` routes. Model output must be one JSON object matching its result schema. Other graph shapes are rejected. Source imports execute trusted JavaScript; the loader process is not a security sandbox.

The current entry point is `bun run runlane`. A globally installed CLI, background launcher, generic plugin system, ScriptAction executor, multi-stage workflow, parallel reviewers, bounded repair, Jev, cron, and live graph remain outside this implementation. See [the slice-A specification](specs/cli-submission.md) and [the quickstart](../content/cli-quickstart.md).
