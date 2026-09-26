# Runtime parent class

Runtime is the parent class for executing an Agent through a selected coding-agent system. The planned subclasses are `PiRuntime`, `CodexRuntime`, and `ClaudeRuntime`. Each subclass translates the same request into its native execution protocol.

This is an agreed design, not an implemented API. The CLI proof still invokes Pi directly through `runtime/agent.ts`. The Runtime extraction starts with that working path. Codex and Claude integrations follow the first usable milestone.

Workflow, Agent, Action, Trigger, and Profile remain authoring data. Runtime is the execution extension that contributors subclass when adding another coding-agent system. There is no separate `AgentHarness` object or additional adapter class around each Runtime.

## Responsibilities

| Owner | Responsibility |
| --- | --- |
| Workflow | Describe steps, dependencies, routes, parallel work, and bounded loops. |
| Agent | Describe instructions, required capabilities, reasoning effort, and input and result schemas. |
| Profile | Select a Runtime and the explicit provider and model settings that it supports. |
| Runner | Admit and schedule attempts, enforce shared capacity, validate results, and commit workflow transitions. |
| Runtime parent | Provide the common invocation entry point, check Runtime identity, and check cancellation around validation and execution. |
| Runtime subclass | Validate native settings, execute the agent loop, translate observable events, and clean up native resources. |

The agent's read → edit → check tool loop belongs to its Runtime. The workflow's Implement → Review → repair loop belongs to the Runner. A Runtime does not select routes, consume the repair allowance, or write workflow records.

Script Actions keep their explicit Bun or shell execution path. They do not subclass Runtime. A model-backed Action can also keep its direct provider adapter when it needs no agent loop.

## Profile selection

The target Profile adds `runtime`. Existing `modelProfiles` and `modelProfile` keys remain. Reasoning effort stays on the Agent and is resolved into the execution request.

```js
// Proposed definition fragment; the current CLI does not accept runtime yet.
export const modelProfiles = {
	planning: {
		runtime: "pi",
		provider: "openai-codex",
		model: "gpt-6-luna",
	},
	coding: {
		runtime: "codex",
		model: "gpt-6-sol",
	},
};
```

`provider: "openai-codex"` selects a model provider inside Pi. `runtime: "codex"` selects Codex's own agent execution. These settings have different meanings.

Runtime-specific validation rejects unsupported providers, models, effort values, tools, and permission requirements. Unknown fields are errors. A subclass must not silently ignore requested settings, broaden permissions, or substitute another Runtime or model.

Workflow files contain the Runtime ID. The service owns an explicit lookup of those IDs to Runtime instances. Live clients, processes, credentials, and class instances do not enter definition snapshots. Creating an instance does not start agent work. Initial registration is explicit in service code; automatic plugin discovery is deferred.

## Parent contract

This proposed TypeScript contract shows the shared behavior and subclass methods. The types describe one attempt; they do not expose the mutable Run record or store to a Runtime.

```ts
// Proposed runtime/runtimes/base.ts
import { RunlaneError, type JsonObject } from "../types.ts";

export type RuntimeRequest = {
	workspaceId: string;
	runId: string;
	stepId: string;
	attemptId: string;
	cwd: string;
	instructions: string;
	input: JsonObject;
	capabilities: readonly string[];
	resultSchema: JsonObject;
	profile: { runtime: string; provider?: string; model: string };
	reasoning: string;
};

export type RuntimeEvent = {
	type: "started" | "activity" | "usage";
	data: JsonObject;
};

export type RuntimeContext = {
	signal: AbortSignal;
	/** Records bounded progress against the calling attempt. */
	emit: (event: RuntimeEvent) => Promise<void>;
};

export type RuntimeResult = {
	output: unknown;
	usage?: JsonObject;
};

/** Runs Agent attempts through a concrete coding-agent integration. */
export abstract class Runtime {
	abstract readonly id: string;

	/** Checks supported settings and availability without starting agent work. */
	abstract validate(request: RuntimeRequest, signal: AbortSignal): Promise<void>;

	/** Validates and executes one attempt with shared cancellation checks. */
	async run(
		request: RuntimeRequest,
		context: RuntimeContext,
	): Promise<RuntimeResult> {
		context.signal.throwIfAborted();
		if (request.profile.runtime !== this.id) {
			throw new RunlaneError("RUNTIME_MISMATCH", "The selected Runtime does not match the request.");
		}
		await this.validate(request, context.signal);
		context.signal.throwIfAborted();
		const result = await this.execute(request, context);
		context.signal.throwIfAborted();
		return result;
	}

	/** Executes native work and releases attempt resources before settling. */
	protected abstract execute(
		request: RuntimeRequest,
		context: RuntimeContext,
	): Promise<RuntimeResult>;
}
```

Subclasses extend `Runtime`, declare their ID, and implement `validate` and `execute`. The supported extension points exclude overriding `run`. TypeScript has no `final` method modifier, so contributor review and the focused integration check enforce that rule.

The Runner calls `validate` before admission with a bounded cancellation signal. The parent repeats it before execution because availability may change while an attempt is queued. Validation honors that signal and may inspect native configuration but does not issue a task prompt, start tools, or change authentication. Runtime identity and the implementation version are recorded with the resolved settings.

The Runner supplies a timeout-bound cancellation signal. Checks before and after execution do not interrupt native work by themselves: `execute` must bind the signal before dispatch, handle abort during startup and execution, and clean up in `finally`. An already-aborted signal must prevent dispatch. Initial clients and child processes belong to individual attempts and are released before `execute` settles. Shared process pools are deferred.

The service may reuse one Runtime instance for concurrent attempts. Instructions, working directories, native sessions, output, and cancellation state remain local to each invocation. The base class has no mutable current-session field.

## Events and completion

The subclass awaits `emit` for the `started` event before the first task request or tool side effect. That event includes the confirmed Runtime, model and effort, implementation version, and native execution reference when available. An execution reference contains the Runtime ID and opaque native identifiers or private paths, never credentials. If the native protocol reveals an identifier only after dispatch, the Runner records dispatch intent first and the subclass emits the identifier when received. That interval remains an interruption risk, not a safe replay point.

The Runner binds events to the request's workspace, run, step, and attempt. It assigns durable ordering and rejects stale delivery. Runtime events contain bounded observable activity and reported usage. They do not claim access to hidden reasoning. Missing usage remains unavailable; cumulative native usage must not be reported as per-attempt usage without a valid baseline.

`execute` returns only after native work has settled and cleanup has completed. The subclass converts its native response to `output`; the Runner validates it against the retained result schema. It then commits the result, route, and completion event together before starting the next step. Native process exit or a final text message alone does not mark a workflow successful.

Unsupported settings, authentication failure, malformed output, cancellation, and cleanup failure remain execution failures or interruptions. They do not become an `approved` or `needs_input` result. The service preserves intentional bounded diagnostics and sanitizes unexpected native errors. When cleanup cannot confirm that work stopped, record uncertainty and reconcile before releasing ownership or dispatching replacement work.

## Checkpoints and native history

Runlane owns workflow checkpoints, attempts, validated results, and chosen routes. Pi durable continues to store those application records regardless of the selected Runtime. Each coding-agent system owns its native conversation history.

An opaque execution reference can identify evidence for later reconciliation. It does not prove that an interrupted operation can resume safely. Initial recovery keeps the current interrupted-without-replay behavior. Cross-Runtime handoffs use declared inputs, validated outputs, and artifacts. A Pi session reference cannot resume a Codex conversation.

## Capacity is an integration requirement

The agreed defaults remain two active runs and two simultaneous managed model calls across all workspaces. Runtime instances do not create independent capacity pools. The Pi extraction must preserve the existing capacity behavior.

An external coding agent can make several requests or start native subagents inside one attempt. Limiting two Runtime invocations does not prove a limit of two actual model calls. Before enabling Codex or Claude under the strict policy, verify that the integration can enforce that limit, including native retries and subagents. If it cannot, keep that mode unavailable under the strict policy and record a separate decision about an explicitly named attempt limit. Do not silently change the existing promise.

The Runtime contract above does not claim to solve native request scheduling. Additional request-control hooks belong in the concrete integration only when its protocol supports them. Script Actions that issue arbitrary HTTP requests also remain outside automatic model-call accounting.

## Reuse and delivery

| Existing code | Planned change |
| --- | --- |
| `runtime/agent.ts` | Move Pi execution, model lookup, authentication integration, and native cleanup into `PiRuntime`. Keep `ModelRuntime` private to that implementation. |
| `runtime/service.ts` | Resolve the Runtime by Profile ID, call preflight validation and `run`, and keep scheduling and all durable transitions. |
| `runtime/definitions.ts` | Validate the target Profile shape and freeze Runtime ID, implementation version, and resolved settings. |
| Agent result validation | Move schema and route validation from the Pi-specific path into the shared Runner completion path. |
| `runtime/types.ts` | Version stored snapshots and replace Pi-only execution references without reinterpreting historical results. |
| `runtime/store.ts` | Reuse Pi durable records and atomic commits. No new transcript database. |

Step naming alignment remains a separate migration. Runtime extraction follows it and precedes the real multi-step workflow. Existing slice-A records are explicitly recognized as Pi records; their IDs, original snapshots, results, and event history remain readable without execution. New definitions require the explicit Runtime selector once that format is introduced. Do not maintain two permanent authoring formats.

Codex is the second planned implementation; Claude follows after the shared contract has evidence from two integrations. The [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) is the initial candidate for automated jobs. [Codex app-server](https://learn.chatgpt.com/docs/app-server) is an option if richer approval and interaction control becomes necessary. The [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) supplies Claude's agent loop and tools. Authentication, supported settings, event semantics, permissions, and cancellation must be verified against the selected version before admission support is enabled.

The [delivery plan](decisions.md#runtime-extraction-and-later-integrations) owns scope and acceptance evidence. This document does not introduce a public SDK package, terminal UI, session-management product, or automatic approval system.
