# Route outcomes and bound repetition

A stage's `next` field names the next stage for its validated success outcome. Its `on` map routes the other named outcomes in the result contract. Reject a definition that routes the same outcome through both `next` and `on`. Routing is declarative data. The workflow does not run JavaScript predicates to choose a path.

These examples use the proposed `@runlane/sdk` API. The SDK and runner are not implemented.

## Route by outcome

```js
// workflows/repair-demo.mjs
import { Workflow } from "@runlane/sdk";
import { implementer } from "../agents/implementer.mjs";
import { correctness, maintainability } from "../agents/reviewers.mjs";
import { checkDependencies } from "../actions/check-dependencies.mjs";

export const repairDemo = new Workflow({
	id: "repair-demo",
	version: 1,
	entryStage: "implement",
	loop: {
		id: "repair",
		entryStage: "implement",
		maxReentries: 2,
		onExhausted: "needs_input",
	},
	stages: [
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

The check stage and review stage reference the same `repair` loop. The candidate contract's `completed` outcome advances to `check`; `needs_input` suspends execution. The check contract returns `pass`, `fail`, or `unknown`. These excerpts assume the workflow inputs and imported contracts described in [Define a workflow](workflows.md). The `all-approved` policy emits `approved` only when both reviewers approve the same candidate. Rejections do not carry separate limits. Each selected `repeat: "repair"` route consumes one shared re-entry.

The runner validates each assignment result against its result contract before routing. The `completion: "all-approved"` policy emits `approved` only when every assigned reviewer returns `approved`. If one or more reviewers return `changes_requested`, that outcome selects the repair route after every assignment in the round has finished or been handled. A blocked reviewer takes precedence over `changes_requested`; resolve the blocker before routing a repair. A `needs_input` result suspends execution and leaves the run unfinished. An invalid result, failed process, timeout, or unavailable model blocks execution. It cannot select `next` or approve a candidate.

Each `on` entry maps one exact outcome name to one route. A route has exactly one destination: `to`, `repeat`, `stop`, or `complete`. `to` names another stage. `stop` suspends stage execution with the named status. `needs_input` is nonterminal and remains unfinished until a person resolves or cancels it. `complete: true` marks successful workflow completion. `repeat` names a declared loop. The loop owns the entry stage, shared re-entry limit, and exhaustion status.

## Bound a repair loop

`maxReentries: 2` permits the initial implementation and two later entries to `implement`. The first arrival is not a re-entry. Every route that references `repair` increments the same counter once. When the limit is exhausted, `onExhausted` selects `needs_input` instead of entering `implement` again.

The counter belongs to durable run state. Persist the selected route, counter update, and next attempt together so a restart cannot grant extra repairs. All reviewers in one review stage contribute to one stage outcome and one loop counter. Several reviewers requesting changes in that round consume one re-entry.

Allow one declared loop in the initial design. Its iterations do not overlap. Reject missing destinations, unknown outcomes, duplicate `next` and `on` handling, invalid limits, and unsupported graph cycles before a run starts. Keep each route visible in the graph and trace, including the source outcome, selected destination, counter, and remaining re-entries.

## Keep attempts and evidence tied to a candidate

Each parallel assignment has a stable ID within its stage. Assignments in one stage receive the same immutable run inputs and candidate reference. They have separate attempts and results. The stage aggregates those results using its declared success and outcome rules.

When a repeat route starts a new implementation attempt, later review assignments inspect the new candidate. Evidence from an older candidate cannot approve the new one. An unavailable executable, invalid output, or model error is a blocker rather than a request to repair the candidate.

Model profiles remain explicit on agent definitions and are frozen with the run. Routing cannot silently switch providers or models based on an outcome.
