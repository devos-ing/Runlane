# Submit a task from the CLI

The execution proof runs one tool-free Agent through Pi, validates its JSON result, and stores run state and events through Pi durable on Bun SQLite. The graph in this documentation site remains simulated.

Tasks are workflow input. Submitting a task creates a Run directly; a plugin or a separate ticket database is not required. GitHub Issues and other task sources can become adapters later.

The design now calls workflow positions Steps. The runnable CLI and `examples/task-workspace` still use `stages`, `entryStage`, and snapshot `stageId`. Keep those names when running this proof. The planned `steps`, `entryStep`, and `stepId` fields are documented in [the naming plan](decisions.md#align-step-naming-before-slice-b) and are not accepted yet.

## Start the local service

Run these commands from the Runlane repository with Bun installed:

```sh
bun install --frozen-lockfile
bun run runlane serve
```

Leave that terminal open. The service binds to a loopback port and writes a private connection descriptor under `~/.runlane`. A native SQLite ownership lock prevents another service from using the same state directory, even if the first process pauses. A process crash releases the lock.

Use `--state-dir /absolute/private/path` on every command to select a separate instance. The directory must belong to you with mode `0700`. Background `daemon start` and `daemon stop` commands are not implemented yet.

The example uses the Pi `openai-codex` provider with `gpt-6-luna` and `low` effort for a short planning task. It requires your existing Pi authentication. The service does not copy or print credentials. See [Pi provider authentication](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md) to configure Pi, or edit the example's explicit `modelProfiles` entry to another available built-in model. Unavailable models fail validation; there is no fallback.

## Register the example workspace

In another terminal at the Runlane repository:

```sh
bun run runlane workspace add ./examples/task-workspace --name task-demo --json
bun run runlane workspace list
```

Registration returns a stable `ws_...` ID. Replace `ws_REPLACE_ME` below with that value.

```sh
bun run runlane validate plan-task --workspace ws_REPLACE_ME
```

Validation loads the trusted `.mjs` module in a fresh process and checks the supported shape, schemas, routes, and exact model availability. Importing author JavaScript executes its code, so register and load only trusted sources.

## Create the task input and submit it

The included `examples/task-workspace/task.json` contains:

```json
{
	"task": "Add an empty state to a project's task list.",
	"acceptanceCriteria": [
		"Show 'No tasks yet' when the list is empty.",
		"Show an accessible action labeled 'Create task'."
	]
}
```

Submit it to the example workflow:

```sh
bun run runlane run plan-task --workspace ws_REPLACE_ME --input examples/task-workspace/task.json
```

The response includes a durable `run_...` ID and its admission status. It does not mean that the workflow has finished. The example produces a plan only; it does not edit files or complete the proposed code change.

Add `--wait` to wait for that submission's result. Waiting exits with `0` for success, `2` for `needs_input`, and `1` for failed, cancelled, or interrupted execution. Interrupting the waiting client exits with `130` and leaves admitted work running.

## Inspect or cancel a run

Replace `run_REPLACE_ME` with the returned run ID:

```sh
bun run runlane runs --workspace ws_REPLACE_ME
bun run runlane runs run_REPLACE_ME
bun run runlane logs run_REPLACE_ME --follow
bun run runlane cancel run_REPLACE_ME
```

The detailed run contains its frozen input, resolved definition, model and effort, result, and lifecycle events. Pi owns the conversation file; Runlane stores its reference. A schema-invalid model result is a failure, not a successful route.

All commands accept `--json`. Following logs emits JSON lines. The other commands return JSON values. Cancellation is explicit; closing a log stream or a CLI terminal does not cancel a run.

## Stop and reopen safely

Press Ctrl+C in the service terminal to stop this foreground proof. It stops admission, aborts active invocations, records interruption, closes storage, and releases ownership. This differs from the later daemon's planned drain-and-stop command.

Start `serve` again with the same state directory to inspect prior runs. Queued or running records left by a crash become `interrupted`. They are not automatically replayed. Completed results and routes remain unchanged. To try unfinished work again in this slice, submit a new run explicitly.

## Supported boundary

| Available now | Planned later |
| --- | --- |
| Foreground service and private local CLI connection | Background launch commands and desktop packaging |
| Workspace add/list and direct JSON task submission | External issue-tracker adapters and optional backlog UI |
| One Agent step with no tools, using the current `stages` field | The Step field migration, multi-step graphs, `.mjs` and `.sh` Script Actions, parallel reviewers, and bounded repair |
| Imported object schemas and explicit `on` terminal routes | Broader result contracts and live graph projection |
| Explicit built-in profile and effort | Jev and additional adapter kinds |
| Pi durable run checkpoints and event history | Automatic recovery of additional execution kinds |

The initial workflow declares `modelProfiles` as a map from profile names to `{ provider, model }`. The Agent references one profile and sets its reasoning effort. Its result schema must require an `outcome` string enum, and `on` must cover every outcome with either `{ complete: true }` or `{ stop: "needs_input" }`.

The [Runtime parent class](runtimes.md) and Profile `runtime` selector are planned. Do not add that selector to this runnable example yet. The current service invokes Pi directly; selecting its `openai-codex` provider does not run Codex's own agent system.

The service defaults to two concurrent single-Agent runs; `serve --max-calls N` adjusts this limit. The snapshot retains resolved schemas, prompt text, inputs, source-content identity, and model settings. It does not need to re-import author code to display or settle recorded work. Unsupported tools, scripts, schedules, loops, and multi-step definitions are rejected rather than partially executed.

Use `bun run runlane --help` for the command list. Slice A does not complete the full workflow-and-live-graph milestone in [Decisions and delivery](decisions.md).
