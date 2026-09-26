# Define agents and actions

An `Agent` holds instructions, an explicit model profile, reasoning effort, allowed actions, and a result contract. A `ScriptAction` describes one process to run. Workflow stages refer to either kind through the same `run` field.

The `@runlane/sdk` API below is a proposal. No SDK loader, agent runner, or script adapter is implemented.

## Define reusable agents

```js
// agents/advisor.mjs
import { Agent } from "@runlane/sdk";

export const advisor = new Agent({
  id: "advisor",
  instructions: { file: new URL("../prompts/advisor.md", import.meta.url) },
  input: { contract: "task-context-v1" },
  modelProfile: "planning-model",
  reasoning: "high",
  actions: ["files.read", "files.search"],
  result: { contract: "plan-v1", outcomes: ["ready", "needs_input"] },
});
```

An agent definition declares the input context it accepts, its instructions, model profile, reasoning effort, allowed action IDs, and result contract. The contract names the accepted `outcome` values, its success outcome, and the corresponding structured data. Any outcomes repeated in configuration must agree with that contract. The workflow maps those outcomes to routes. A model profile resolves to an explicit provider and model configuration. If that profile is unavailable, the runner reports a blocker. It does not choose a substitute.

Reuse a definition by importing it into another workflow or exporting it from a trusted preset package. Do not create a public `AgentBinding` type for stage-specific copies. A stage assignment has a stable local ID for event and result records; the referenced `Agent` remains unchanged. The Advisor, Implementer, and Reviewer are presets, not subclasses. Their roles do not need separate execution engines.

Agent definitions carry no mutable run state. Attempts, outputs, and status belong to a run snapshot and its events. The SDK can route agents and actions through an internal `Executable` contract, but contributors define `Agent` and action values instead of extending that internal contract.

Reusable agents accept only their declared input context. A workflow supplies frozen run inputs and prior validated results through that contract. It does not rely on mutable shared state between assignments.

Parallel reviewers can use separate explicit model profiles:

```js
// agents/reviewers.mjs
import { Agent } from "@runlane/sdk";

const reviewerSettings = {
  instructions: { file: new URL("../prompts/reviewer.md", import.meta.url) },
  input: { contract: "candidate-review-v1" },
  reasoning: "high",
  actions: ["files.read", "files.search"],
  result: {
    contract: "review-v1",
    outcomes: ["approved", "changes_requested", "needs_input"],
  },
};

export const correctness = new Agent({
  ...reviewerSettings,
  id: "correctness-reviewer",
  modelProfile: "review-model-a",
});

export const maintainability = new Agent({
  ...reviewerSettings,
  id: "maintainability-reviewer",
  modelProfile: "review-model-b",
});
```

## Describe an action

An action can be a trusted built-in capability, a script, or an application-owned operation. Agent `actions` lists the IDs that the agent may call. Workflow stages can run an action directly through the same `run` field used for agents.

```js
// actions/check-dependencies.mjs
import { ScriptAction } from "@runlane/sdk";

export const checkDependencies = new ScriptAction({
  id: "dependency-check",
  executable: "bun",
  scriptFile: new URL("../scripts/check-dependencies.mjs", import.meta.url),
  args: [],
  timeoutMs: 60_000,
  result: { contract: "check-v1", outcomes: ["pass", "fail", "unknown"] },
});
```

Resolve prompt and script URLs against the declaring module. The loader normalizes them into retained source references. The script's execution directory is a separate run setting.

The application validates action IDs against allowed capabilities and workflow policy before a run starts. Approval and publication remain application-owned, stage-only actions. Adding their IDs to an Agent does not grant permission to invoke them.

## Use a JSON process protocol

The runner starts a script process from its configured executable and working directory. It writes one JSON request to stdin. A request includes the run and attempt IDs, stage and assignment IDs, frozen workflow inputs, and the validated results made available to that action.

```json
{
  "runId": "run-0241",
  "attemptId": "attempt-0004",
  "stageId": "check",
  "assignmentId": "dependency-check",
  "inputs": { "repository": "example/repo" },
  "priorResults": { "implement": { "outcome": "completed", "candidateRef": "candidate-2" } }
}
```

The script writes exactly one bounded JSON object to stdout. The object must match the declared result contract and include a named outcome. It writes human-readable diagnostics to stderr. The adapter also bounds stdin.

```json
{ "outcome": "pass", "data": { "checkedFiles": 12 } }
```

The runner validates the result before routing. It bounds stdout and stderr by configured byte limits. Malformed JSON, a contract mismatch, a nonzero exit, or a timeout is an execution failure, separate from a valid `outcome: "fail"`. None of those failures is a passing result. The runner records bounded output, exit status, and timing according to the configured retention policy.

A completed check returns `pass`, `fail`, or `unknown` with exit code zero. A nonzero exit or launch failure blocks execution rather than selecting a repair route.

## Treat definition code as trusted code

Register the directories from which Runlane may load workflow, agent, action, and trigger definitions. Loading an `.mjs` file executes that module and its imports. A root setting controls what the application loads; it does not sandbox JavaScript, packages, or a script process. Schema validation checks the returned definition values. It does not make imported code safe.

Use `.mjs` as the reference authoring format. `.ts` authoring is optional and depends on an explicitly configured loader. Keep definitions declarative: supported values include IDs, settings, paths, result schemas, and other data. Do not put callbacks or closures in a definition. The runner must not promise to serialize arbitrary JavaScript.

The `ScriptAction` file is executable code too. Review it and its dependencies before adding its root. A configured timeout limits how long the process may run; it does not claim to sandbox the process.
