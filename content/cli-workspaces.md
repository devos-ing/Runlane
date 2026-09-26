# CLI, daemon, and workspaces

Runlane starts with a CLI and one local runner service for the current operating-system user. That service manages every registered workspace. Foreground execution and a background daemon use the same runner, persistence, and scheduling logic.

This page records the target design. The foreground CLI proof implements workspace registration, one tool-free Agent invocation, durable status and logs, and cancellation. Background daemon commands and the broader workflow lifecycle remain planned. Use [Submit a task](cli-quickstart.md) for commands that run today.

The first usable milestone uses the foreground service, supports the required workflow and parallelism, and connects the existing graph to real records. Background daemon commands, desktop packaging, Jev, and cron follow that milestone. Workspace identity and one state owner are retained from the start.

## One service for all workspaces

The service owns the workspace registry, workflow loading, run admission, attempts, schedules, and durable records. It is the only writer of application execution state. A CLI command submits work or reads records through the service; it does not start another scheduler.

One process owns the user's Runlane state directory. Starting the daemon when it is already running returns that service's status. A competing foreground service reports the existing owner instead of opening another writer. Different operating-system users have separate services and state.

Default limits of two active runs and two simultaneous model calls apply across all workspaces. Two workspaces do not receive two model slots each. Parallel reviewers, independent runs, and model-backed decision Actions share that capacity. The queue must give eligible work from other workspaces a chance to progress.

The service also owns the planned Runtime instances selected by Agent Profiles. Instances share these limits across workspaces and keep mutable attempt state separate. External Runtime admission requires evidence that native requests and subagents respect the configured limit; an invocation count alone is insufficient. See [Runtime parent class](runtimes.md).

An idle daemon does not invoke models. A workspace's failed run is recorded without stopping unrelated runs. A service crash can interrupt work in several workspaces, so each run needs durable recovery evidence.

## A workspace is a registered context

The initial Workspace record contains identity, a display name, and a source root:

```ts
type Workspace = {
	id: string;
	name: string;
	root: string;
};
```

| Field | Meaning |
| --- | --- |
| `id` | A service-assigned stable identifier that survives a display-name change. |
| `name` | A label shown in CLI output and graphical clients. |
| `root` | The canonical absolute directory used to discover the workspace's workflow definitions and resources. |

The service stores registration in its registry. A contributor does not need to subclass Workspace or add a workspace ID to a reusable workflow module. Registering the same canonical root resolves to the existing workspace.

A workspace groups workflows, configuration, schedules, runs, and evidence. It does not require a Git repository. A coding run may use a separate worktree as its execution directory while retaining the original workspace identity. A source root and a working directory have different jobs.

Workspace registration does not import or execute every file in the directory. Loading `.mjs` definitions is an explicit operation on trusted code. Workspace scoping does not sandbox JavaScript or child processes.

## Identity travels with the work

Every workflow registration, schedule, run, event, and artifact belongs to a workspace, directly or through its owning run. Requests and trace events carry workspace identity so clients can filter and attribute results correctly.

Workflow IDs are unique within a workspace. Both `ws_app` and `ws_reports` can register a workflow named `review`. A run records its workspace ID, workflow ID, frozen source version, inputs, and resolved profiles. Moving or renaming the workspace does not rewrite historical runs.

Agents and actions can be shared through trusted imports. Invocation context, mutable state, outputs, and evidence remain separate. Shared definitions do not grant access to another workspace's run records.

A missing root blocks work that requires its files, without removing history or switching to a similarly named directory. Recovery uses retained sources and the recorded execution context. It never substitutes the current contents of a moved workspace silently.

## Proposed CLI commands

The table describes the target command surface. For implemented commands, use the repository entry point `bun run runlane ...`; no global binary is installed. The `daemon` commands are future work. Examples assume registration returned `ws_app` and `workflows/review.mjs` exists.

| Command | Behavior |
| --- | --- |
| `runlane serve` | Run the service in the foreground for development or CI. |
| `runlane daemon start` | Start the same service in the background, or report the existing daemon. |
| `runlane daemon status` | Show whether the service is available. |
| `runlane daemon stop` | Request a graceful stop for the shared service. |
| `runlane workspace add ./my-project --name app` | Register a root and return its workspace ID. |
| `runlane workspace list` | List registered workspace IDs, names, and roots. |
| `runlane validate ./workflows/review.mjs --workspace ws_app` | Load and validate a trusted definition without starting a run or enabling a schedule. |
| `runlane run review --workspace ws_app` | Submit a registered workflow and return its durable run ID. |
| `runlane run review --workspace ws_app --wait` | Submit work and wait for completion or a state that requires input. |
| `runlane runs --workspace ws_app` | List runs and their states in the selected workspace. |
| `runlane logs <run-id> --follow` | Read recorded events and follow new events. |
| `runlane cancel <run-id>` | Explicitly cancel that run and record cleanup. |

CLI operations use the running service. If it is unavailable, report how to start it. The first version does not silently launch a second execution path. Service lifecycle commands are the exception because they start or inspect the service itself.

Interactive commands may infer the workspace from the current directory when exactly one registration matches. Missing or ambiguous matches require `--workspace`. Scripts and CI use explicit IDs. Relative source paths resolve against the selected workspace root, not the daemon's process directory.

Automation-facing commands support JSON output. `run` reports acceptance only after the run is recorded. A successful submission does not mean the workflow succeeded. `--wait` reports the final observed state; failure, cancellation, interruption, or `needs_input` cannot look like successful completion.

## Disconnect, stop, and recover

Closing a CLI client terminal, disconnecting a log stream, or closing a desktop window leaves an admitted run active. Interrupting `run --wait` stops that client's wait. Cancellation requires `runlane cancel`. Ending the process running `serve` stops the service itself and is a separate lifecycle operation.

A graceful service stop disables new admission and scheduling, stops dispatching new invocations, and drains invocations already executing. It persists their results and pending next work before exiting. Queued work and runs awaiting input remain recorded; they do not keep shutdown waiting indefinitely. Stopping the service affects all workspaces.

On restart, reconcile interrupted attempts before dispatching pending work. An external action with an unknown outcome cannot be repeated merely because the process restarted. Preserve counters, selected models and effort, source versions, Action settings, and event identities. Reuse committed final results and routes. Retain a controlled source set and verify the dependency environment; missing or unsupported recovery inputs block the run.

The current proof implements a narrower stop/recovery path: a foreground service signal aborts active invocations and records interruption. Startup marks unfinished records interrupted without replay. The drain-and-stop daemon behavior above remains planned.

Cron runs only while the service is running. The initial design skips missed offline occurrences and does not wake a sleeping computer. Background startup is manual initially. Login startup and operating-system service installation are later work.

## Clients share the same operations and events

The client interface covers workspace selection, validation, submission, status, cancellation, snapshots, and event subscriptions. The CLI formats responses; the runner makes execution decisions. Persist events before broadcasting them so another client can reconnect from a cursor.

Connect the existing React Flow view and trace inspector to the foreground service during the first usable milestone. Desktop packaging follows later and reuses that UI. Its window connects to the same service and does not own the runner's lifetime.

Keep the web UI source reusable without requiring a separately shipped web product in the first release. A future TUI can consume the same operations and events. Each client can expose the interactions that fit its medium; feature parity is not required.

The client connection is local to the current user. A future local HTTP endpoint must enforce local access and reject unrelated browser origins. Transport and desktop packaging choices remain implementation decisions; this plan does not introduce remote access or a distributed runner.
