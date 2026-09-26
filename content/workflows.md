# Define a workflow

A workflow is a plain object exported from a trusted `.mjs` module. It declares steps and maps result outcomes to destinations through `on`. Agents and Actions are reusable configuration values referenced by those steps.

The example below uses the target `steps` and `entryStep` fields. The current CLI proof still requires `stages` and `entryStage`; it does not accept the renamed fields yet. Use [Submit a task](cli-quickstart.md) and its checked-in example for the runnable subset. There is no standalone Step class, public SDK, or global Step registry.

A step's `id` identifies an execution position within this workflow. The same Agent or Action can appear in more than one position without sharing attempt state. Routes and loop entry refer to these local IDs.

## A bounded review workflow

This example imports Agent and Action definitions from [Agents and actions](agents-actions.md). Each definition imports its result schema once. The workflow's `on` maps must cover the outcomes declared by those schemas.

```js
// workflows/change-review.mjs
import { advisor } from "../agents/advisor.mjs";
import { implementer } from "../agents/implementer.mjs";
import { correctness, maintainability } from "../agents/reviewers.mjs";
import { checkDependencies } from "../actions/check-dependencies.mjs";
import { taskInput } from "../schemas/inputs.mjs";

export const changeReview = {
	id: "change-review",
	version: 1,
	input: taskInput,
	entryStep: "plan",
	triggers: [{ kind: "manual", id: "manual-change-review", version: 1 }],
	loop: {
		id: "repair",
		entryStep: "implement",
		maxReentries: 2,
		onExhausted: "needs_input",
	},
	steps: [
		{
			id: "plan",
			run: advisor,
			on: {
				ready: { to: "implement" },
				needs_input: { stop: "needs_input" },
			},
		},
		{
			id: "implement",
			run: implementer,
			on: {
				completed: { to: "check" },
				needs_input: { stop: "needs_input" },
			},
		},
		{
			id: "check",
			run: checkDependencies,
			on: {
				pass: { to: "review" },
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
};
```

The input schema defines the task and source context required by this workflow. The implementation result supplies a candidate reference. Checks and both reviewers inspect that same immutable candidate. A repair receives the previous round's findings and produces a new candidate.

Every designated reviewer must approve. Wait for all assignments to settle or be handled before aggregating the round. A blocked reviewer prevents advancement. Several reviewers requesting changes consume one repair allowance. Check failures use that same counter. The initial implementation plus two repairs is the maximum; iterations do not overlap.

The initial format uses only `on` for outcome transitions. A `next` shorthand would introduce another success-outcome convention and is deferred. All destinations and result-schema outcomes are validated before admission.

## Keep authoring reusable

```text
runlane/
  workflows/change-review.mjs
  agents/advisor.mjs
  agents/implementer.mjs
  agents/reviewers.mjs
  actions/check-dependencies.mjs
  schemas/inputs.mjs
  schemas/results.mjs
  prompts/
  scripts/check-dependencies.mjs
  package.json
  bun.lock
```

The CLI selects a registered Workspace before validation or execution. Workflow IDs are local to that workspace. The service records ownership; shared modules do not hard-code workspace IDs.

Definitions contain data and source references. Importing `.mjs` still executes JavaScript, so roots and dependencies must be explicitly trusted. Reading a definition is not an instruction to start its steps or enable its schedules. Put runtime behavior in referenced Agents and Actions so it has an attributable attempt and trace.

## Route results without a policy framework

A decision source can be a script, Advisor, or later a Jev Action. It returns the final outcome and supporting evidence. Confidence rules and provider-specific handling belong inside that source. The runner validates the result schema, resolves `on`, and records the transition. It does not reinterpret confidence.

A replacement source must satisfy the same input and result schemas. Replacing it does not alter the allowed destinations, permissions, designated-reviewer rule, or repair limit. See [Routing and loops](routing-loops.md).

## Retain a controlled source set

At admission, freeze resolved definitions and schemas, input references, profiles, source identity, and the execution directory. Retain the explicitly supported workflow modules, prompts, scripts, schemas, and lockfile in an immutable source directory or a small retained copy. Record adapter and dependency versions used by the invocation.

The first milestone supports one known source set and an existing, verified dependency environment. Imports or resources outside that supported set block admission. It does not discover and bundle arbitrary transitive dependencies, build containers, reconstruct environments, or serialize closures.

Recovery uses the recorded sources and verifies that the required environment remains available. Missing, changed, or unsupported inputs leave the run blocked. A hash identifies content but cannot restore a missing file. Edits affect new runs; they must not silently change a pending invocation in an existing run.

Commit completed results, selected routes, loop counters, and pending next work before dispatch. An uncertain external side effect requires reconciliation; automatic replay is not a general recovery strategy. [Runs and traces](traces.md) describes the recorded evidence.

## Share execution capacity

The service defaults to two active runs and two concurrent model calls across all registered workspaces. Independent runs and parallel reviewers share those configurable limits. Waiting for capacity is visible in CLI status and the live graph.

The first usable milestone includes both forms of parallelism and connects the existing React Flow view to real events. Jev, background launch management, desktop packaging, and cron follow that milestone. Tickets, repository provisioning, and PR publication remain optional coding-template capabilities.
