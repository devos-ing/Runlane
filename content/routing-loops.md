# Route outcomes and bound repetition

A stage's `next` field names the next stage for its validated success outcome. Its `on` map routes named outcomes from the result contract. Reject a definition that routes the same outcome through both `next` and `on`.

The decision source is replaceable. The mapping from an accepted outcome to a declared destination stays explicit. Rules, scripts, an Advisor, and Jev can supply decisions without changing the runner's transition rules.

These examples use the proposed `@runlane/sdk` API. The SDK and runner are not implemented.

## Reuse Agent and Action for decisions

A decision is a use of an execution result, not a new executor or parent class. A stage can run an existing Agent or Action and route its result.

| Decision source | Execution path |
| --- | --- |
| Existing named outcome | Map the stage's validated result directly through `on` or `next`. No additional call is needed. |
| Rules or expressions | Use a deterministic Action over declared inputs. The first implementation can use the shared ScriptAction path. |
| Custom script | Run a ScriptAction with its normal input, result contract, timeout, and trace. |
| Advisor | Run an Agent through Pi and validate its structured result. |
| Jev | Run an Action through a decision-model adapter, with an explicit model profile and normal attempt records. |

Keep file reads, API calls, and model requests inside visible execution steps. An edge's condition must not hide those operations. Contributors can change the imported decision implementation when its input and result contracts remain compatible. A separate expression-language engine or plugin framework is not required for the first version.

## Declare every possible destination

This stage fragment assumes that the containing workflow declares `research` and `implement`. `choosePath` is an imported Agent or Action that accepts the request context and returns `research`, `implement`, or `needs_input`.

```js
{
	id: "choose-path",
	run: choosePath,
	on: {
		research: { to: "research" },
		implement: { to: "implement" },
		needs_input: { stop: "needs_input" },
	},
}
```

The result contract declares the complete outcome set. Definition validation requires a destination for every accepted outcome and rejects unknown stage IDs. A decision cannot introduce a stage, change permissions, bypass designated reviewers, or reset a loop allowance. React Flow can draw every candidate edge before execution.

## Preserve proposed and accepted decisions

The decision source returns a result with a named outcome and contract-defined data. For Jev, the adapter retains the provider response and normalizes the proposed choice into Runlane's contract. Jev Choice returns `choice`, `probabilities`, and `confidence`. [TypeSafe Choice reference](https://docs.typesafe.ai/primitives/choice)

A deterministic decision policy may accept that choice or produce a declared `needs_input` outcome. For example, a choice can fail a configured confidence threshold. The accepted result then preserves both the proposal and the effective outcome:

```json
{
	"outcome": "needs_input",
	"data": {
		"proposedChoice": "implement",
		"confidence": 0.42,
		"policyReason": "below-confidence-threshold"
	}
}
```

The provider adapter normalizes its response. The shared result path validates that response, applies the configured policy, and validates the accepted outcome before routing. Preserve the raw response as bounded evidence. Never turn an unsupported option or malformed response into an ordinary low-confidence result.

Freeze the policy with the workflow source version. It declares any required confidence field, threshold, and low-confidence outcome. A missing or invalid required field blocks evaluation. Deterministic scripts do not need invented confidence values. Confidence is not a guarantee of correctness, and thresholds depend on the task. [TypeSafe confidence reference](https://docs.typesafe.ai/confidence)

Valid uncertainty produces a declared outcome. API errors, timeouts, unavailable models, and schema failures produce failed or blocked attempts. They do not silently select another provider or an approval route. The policy configuration syntax remains a proposal; it does not allow arbitrary callbacks in route definitions.

## Record a decision before advancing

The runner uses the same sequence for a script, Advisor, or Jev decision:

1. Record the attempt and frozen input references before invoking the decision source.
2. Execute through its adapter under the applicable capacity, timeout, and cancellation rules.
3. Validate the result and apply the frozen decision policy, when configured.
4. Commit the accepted outcome, selected route, loop counter update, pending next work, and their events together.
5. Dispatch the recorded next work after that transition is durable.

Attribute each transition to its workspace, run, stage attempt, and decision source. A duplicate response or stale attempt cannot create another transition or consume another repair allowance.

| State at restart | Recovery behavior |
| --- | --- |
| Accepted decision and route are committed | Use the recorded transition and pending work. Do not ask the source to choose again. |
| A matching response is durable but the route is not committed | Confirm that the attempt is still eligible, validate the saved response with the frozen policy, and commit the transition once. |
| No response was saved | Record the interruption. An authorized retry creates a new attributable attempt; do not invent a result. |

A provider may have completed a request before the service lost the response. A retry can make another model call. Durable transitions prevent duplicate workflow advancement; they do not guarantee exactly-once external requests. Side-effecting Actions still require the reconciliation rules in [Runs and traces](traces.md).

## Share model capacity and evidence

Jev and other model-backed Actions acquire capacity from the same global model-call limit as Agents, across all workspaces. One provider request holds one slot until it settles. Waiting stages and local deterministic scripts do not consume model slots.

Record the selected provider and model, input references, provider proposal, policy version and reason, accepted outcome, selected destination, timing, and reported usage. Missing usage remains unavailable. The graph highlights the committed route and the inspector explains any difference between the proposal and the accepted outcome.

Keep model profiles explicit and frozen for the run. Replacing a decision adapter does not imply automatic model selection or fallback. Pi executes ordinary Agents; the planned Jev adapter uses its supported decision interface without assuming a chat or tool loop.

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

Model profiles remain explicit on Agents and model-backed Actions and are frozen with the run. Routing cannot silently switch providers or models based on an outcome.
