# Route outcomes and bound repetition

The runner accepts a validated result, looks up its `outcome` in the step's `on` map, and commits the declared transition. Decision sources can change without adding another policy engine to the runner.

The CLI proof validates one Agent result and commits either completion or `needs_input`. Multi-step routes, scripts, bounded loops, and Jev remain planned. [Submit a task](cli-quickstart.md) documents the current subset; no public SDK is published.

The examples use the target Step names, including `entryStep` for loop entry. The current loader still uses `stages` and `entryStage` and rejects loop definitions. The terminology change does not remove the identity needed for routing or repeated attempts.

## Keep the decision inside its source

| Source | Responsibility |
| --- | --- |
| Existing step output | Return the result already needed by the workflow. No extra decision call is required. |
| ScriptAction | Use ordinary conditions or an expression library over declared inputs. Return the final outcome. |
| Advisor Agent | Produce a result through its selected Runtime, initially Pi, using the same input and result schemas as other sources. |
| Jev Action, later | Normalize the provider response, apply its own confidence rules, and return the final outcome and evidence. |

The runner owns schema validation, destination checks, capacity, cancellation, and durable transitions. It does not understand model confidence or maintain a generic DecisionPolicy definition. Agents use the Runtime execution contract; Script and Jev Actions keep their direct paths. Decision sources do not need their own inheritance hierarchy.

Keep file access and model requests inside visible Agents or Actions. An edge must not hide those operations. A separate expression engine is unnecessary until a real workflow needs one.

## Declare every destination

This step fragment assumes that the containing workflow declares `research` and `implement`. The imported result schema for `choosePath` defines the allowed outcomes once.

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

Definition validation checks that `on` covers every schema outcome and that every destination exists. The first format uses this one transition map; `next` shorthand is deferred. A result cannot introduce a step, change permissions, bypass required review, or reset the loop counter.

Each route has exactly one destination: `to`, `repeat`, `stop`, or `complete`. `stop: "needs_input"` suspends execution and leaves the run unfinished. `complete: true` completes the workflow.

## Preserve decision evidence

A later Jev Action can use Choice, which returns a selected option, probabilities, and confidence. Those provider fields are normalized inside the Action. [TypeSafe Choice reference](https://docs.typesafe.ai/primitives/choice)

The Action may map a valid but uncertain choice to `needs_input`. Its result preserves the proposal and the reason without asking the runner to apply another rule:

```json
{
	"outcome": "needs_input",
	"data": {
		"proposedChoice": "implement",
		"confidence": 0.42,
		"reason": "below-confidence-threshold"
	}
}
```

Retain the Action's code version, declared settings, and bounded provider response with the attempt. Confidence thresholds are specific to that Action and task; confidence is not a correctness guarantee. [TypeSafe confidence reference](https://docs.typesafe.ai/confidence)

Invalid required fields, unsupported choices, provider errors, and timeouts are execution failures. They must not become ordinary uncertainty or an approval. A source with no confidence measurement does not invent one. The shared runner validates the final result against its imported schema and routes its outcome.

## Commit before advancing

1. Record the attempt and frozen input references.
2. Execute the Agent or Action under the applicable limits and cancellation rules.
3. Validate its final result and resolve the `on` destination.
4. Commit the result, route, loop counter update, pending next work, and events together.
5. Dispatch the recorded next work.

A duplicate response or stale attempt cannot create another transition or consume another repair. Attribute records to the workspace, run, and step attempt.

| State at restart | Behavior |
| --- | --- |
| Result and route committed | Reuse the recorded transition. Do not ask the source to choose again. |
| Final Action or Agent result saved, route not committed | Check that the attempt remains eligible, validate the saved result, and commit its declared route once. |
| No final result saved | Record interruption. Preserve any raw evidence. Reconcile or explicitly retry through a new attempt. |

A raw provider response is not a completed Action result. The runner does not reconstruct provider-specific decisions from it. Source-specific reconciliation can be added when required; otherwise the run remains blocked for an explicit decision. A provider call may have completed before its response was saved, so a retry may call it again. Durable transitions do not guarantee exactly-once external requests.

## Bound one repair loop

The [review workflow](workflows.md) declares one shared repair allowance:

```js
loop: {
	id: "repair",
	entryStep: "implement",
	maxReentries: 2,
	onExhausted: "needs_input",
}
```

A failed check and a review round requesting changes both use `{ repeat: "repair" }`. The first implementation does not consume a re-entry. Two re-entries permit initial work plus two repairs. Iterations do not overlap.

Every designated reviewer inspects the same immutable candidate. Wait for every assignment to settle or be handled before aggregating. All must approve. Several rejections in one round consume one repair allowance. A blocked or invalid reviewer result prevents advancement; it is not a request to repair the candidate.

A repair produces a new candidate and invalidates prior check and review evidence. Re-run the check and every designated reviewer. Commit the counter with the transition so a browser refresh, client reconnect, or daemon restart cannot grant extra repairs.

## Share capacity and trace

Agents and model-backed Actions, including a later Jev adapter, share the default limit of two model calls across all workspaces. Waiting steps and deterministic scripts do not hold model slots. Managed model calls use the shared provider path.

Additional Runtimes must prove their native requests obey this limit. Native fan-out cannot be counted as one model call merely because it belongs to one attempt. See [Runtime capacity](runtimes.md#capacity-is-an-integration-requirement).

The trace records source identity, input references, model when used, final result, supporting evidence, selected destination, timing, and reported usage. Missing usage stays unavailable. The graph highlights the committed route; the inspector shows the Action's evidence without re-running its logic.

Keep model selection explicit. Replacing a source does not imply provider fallback. The [first usable milestone](decisions.md#delivery-sequence) uses Pi Agents and scripts, with real graph and trace, before adding Jev.
