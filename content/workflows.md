# Define a workflow

Runlane workflows are declarative graphs of stages. A stage runs an `Agent` or an `Action`. `next` names the stage for a validated success outcome. The `on` map routes other named outcomes from the result contract.

The examples use the proposed `@runlane/sdk` API. The package and runner are not implemented. SDK constructors and trigger factories return configuration values. They do not start runs, invoke agents, execute scripts, or create schedules. Loading a `.mjs` module executes its JavaScript and imports.

## Author definitions in JavaScript

Use `.mjs` files as the reference format. A project may author `.ts` files when its chosen loader supports them. Constructors create definitions from data; keep callbacks and closures out of those definitions.

```text
runlane/
  workflows/change-review.mjs
  agents/
    advisor.mjs
    implementer.mjs
    reviewers.mjs
  actions/check-dependencies.mjs
  prompts/
    advisor.md
    implementer.md
    reviewer.md
  scripts/check-dependencies.mjs
  package.json
  bun.lock
```

Register trusted roots explicitly in application configuration. Importing a `.mjs` file executes its JavaScript, including its imports. A trusted root controls what the application loads. It does not sandbox JavaScript or packages. Definition validation checks shape and policy; it does not make author code safe. Only load roots whose code and dependencies you trust.

## A complete review workflow

```js
// workflows/change-review.mjs
import { Trigger, Workflow } from "@runlane/sdk";
import { advisor } from "../agents/advisor.mjs";
import { implementer } from "../agents/implementer.mjs";
import { correctness, maintainability } from "../agents/reviewers.mjs";
import { checkDependencies } from "../actions/check-dependencies.mjs";

export const changeReview = new Workflow({
	id: "change-review",
	version: 1,
	inputs: {
		task: { type: "string", required: true },
		repository: { type: "string", required: true },
	},
	entryStage: "plan",
	triggers: [
		Trigger.manual({ id: "manual-change-review", version: 1 }),
		Trigger.cron("0 9 * * 1-5", {
			id: "weekday-dependency-audit",
			version: 1,
			timezone: "Asia/Hong_Kong",
			inputs: { repository: "example/service", task: "Review dependency changes" },
			overlapPolicy: "skip-unfinished",
			offlinePolicy: "skip",
			enabled: false,
		}),
	],
	loop: {
		id: "repair",
		entryStage: "implement",
		maxReentries: 2,
		onExhausted: "needs_input",
	},
	stages: [
		{
			id: "plan",
			run: advisor,
			next: "implement",
			on: { needs_input: { stop: "needs_input" } },
		},
		{
			id: "implement",
			run: implementer,
			next: "check",
			on: { needs_input: { stop: "needs_input" } },
		},
		{
			id: "check",
			run: checkDependencies,
			next: "review",
			on: {
				fail: { repeat: "repair" },
				unknown: { stop: "needs_input" },
			},
		},
		{
			id: "review",
			run: [
				{ id: "correctness", agent: correctness },
				{ id: "maintainability", agent: maintainability },
			],
			completion: "all-approved",
			on: {
				approved: { complete: true },
				changes_requested: { repeat: "repair" },
				needs_input: { stop: "needs_input" },
			},
		},
	],
});
```

Each agent contract names its accepted outcomes in the `outcome` field. The plan agent returns `ready` or `needs_input`. The implementer returns `completed` or `needs_input`. The check action returns `pass`, `fail`, or `unknown`. Each reviewer returns `approved`, `changes_requested`, or `needs_input`. `next` handles the success outcomes `ready`, `completed`, and `pass`. The `on` map handles the other outcomes. The result contract declares which outcome counts as success. A definition cannot route one outcome through both `next` and `on`.

The review assignments receive the same frozen inputs and candidate reference. Each has a stable assignment ID and a separate result. The `all-approved` policy emits `approved` only when both reviewers return valid approvals for the same candidate. A dependency check failure and a review request both repeat the same `repair` loop and share its counter. Wait until both reviewers finish or are handled before routing the stage. A blocked reviewer takes precedence over `changes_requested`; reconcile or resolve the blocker before considering a repair. Invalid output and execution failures block the run; they cannot count as approval or as a valid `fail` outcome.

The workflow permits one declared loop. Its iterations do not overlap. The loop allows the initial implementation and at most two re-entries. When exhausted, it suspends the run as `needs_input`; the run remains unfinished.

Each invocation receives frozen workflow inputs and the relevant validated prior results. The implementation result supplies the candidate reference for checks and review. A repair includes the previous round's findings. Resolve those references from the current round; an older candidate's evidence cannot satisfy a new round.

Both trigger definitions belong to this workflow. The cron definition is disabled. The trigger service registers it only through an explicit application action after validation. See [Triggers and schedules](triggers.md) for occurrence handling.

## Freeze executable inputs for restart

At admission, resolve the workflow, trigger, inputs, agents, model profiles, action definitions, and policies into a run snapshot. The snapshot must identify the exact prompt and script contents and the dependency versions needed to resume the run. Record content hashes and retain an immutable source bundle or source revision, including the package lockfile. JSON configuration alone cannot restore executable files.

Store definition data, file references, and version identifiers. Do not serialize JavaScript closures. A restart uses the recorded snapshot and must stop with a visible blocker if required source or dependency versions are unavailable. Source edits apply to future runs.

The runtime defaults to two active runs and two concurrent model calls. Configure those application-wide limits explicitly. Eligible work waits in a visible queued state when either limit is full.

## Keep product concepts separate

The workflow definition is independent of the React Flow display. The UI renders the graph and run events; it does not decide execution order.

`Agent` is a reusable definition, not a role subclass or a stage binding. Import an existing agent definition or preset into another workflow when its instructions and result contract fit. The Advisor is an example preset. Parallel stage assignments add stable local IDs without copying or mutating the referenced agent.

The SDK may use an internal `Executable` contract for agents and actions. It is an implementation detail. Contributors create `Agent` or action definitions and do not extend a public base class.

Runlane does not require tickets, Git worktrees, commits, or pull requests. A coding workflow may add those as its own inputs and actions. The platform does not promise GitHub Actions YAML compatibility, hosted runners, or automatic agent spawning.
