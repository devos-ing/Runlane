# Define agents and actions

An Agent is reusable configuration for an invocation through its selected Runtime. An Action is an executable operation; a Script Action implements that operation using a file and interpreter. Workflow steps refer to an Agent or Action through `run`. Script is not another core execution component. Authoring definitions remain plain objects. The planned execution integrations extend the [Runtime parent class](runtimes.md).

The CLI proof loads one Agent with imported JSON schemas and no tools. The reusable and multi-step examples below describe the broader design; ScriptAction is not implemented yet. [Submit a task](cli-quickstart.md) documents the runnable subset. Public SDK packaging and constructor helpers remain deferred.

## Define an agent as data

```js
// agents/advisor.mjs
import { taskInput } from "../schemas/inputs.mjs";
import { planResult } from "../schemas/results.mjs";

export const advisor = {
	kind: "agent",
	id: "advisor",
	instructions: { file: new URL("../prompts/advisor.md", import.meta.url) },
	input: taskInput,
	modelProfile: "planning-model",
	reasoning: "high",
	actions: ["files.read", "files.search"],
	result: planResult,
};
```

The current Profile resolves to an explicit Pi provider and model. The target Profile also selects a Runtime by ID, while keeping `modelProfiles` and `modelProfile` and reasoning effort explicit on the Agent. Runtime validates that it supports the requested settings and capabilities. An unavailable Profile blocks the invocation. Advisor, Implementer, and Reviewer are presets, not subclasses. Reuse configuration with imports and object spread. Mutable attempts, outputs, and status belong to the run.

Runtime subclasses implement native validation and execution. Agent authors reuse registered Runtimes without writing a subclass. A Profile change applies to new runs; admitted attempts keep their recorded Runtime, model, effort, and implementation version. [Runtime parent class](runtimes.md) separates the target contract from the current Pi-only CLI.

The planned TypeScript name `AgentDefinition` distinguishes this reusable data from Pi's executing Agent class. PiRuntime creates a native AgentSession for each attempt and reuses Pi's model catalog and tools. Keep Agent reuse as imports and object composition; no Agent subclass or separate catalog service is needed. [Pi reuse](pi-integration.md#agent-definitions-and-native-instances) defines this separation.

## Define each result schema once

The imported schema is the source of truth for the result shape and allowed outcomes. Do not combine a contract registry ID with a second `outcomes` list that must stay synchronized. The runner validates results against the schema and verifies that `on` covers its outcome enum. Route mappings add destinations; they do not redefine the schema.

This proposed JSON Schema illustrates the review result envelope. A concrete workflow can specify the required fields inside `data` more narrowly:

```js
// schemas/results.mjs
export const reviewResult = {
	type: "object",
	required: ["outcome", "data"],
	additionalProperties: false,
	properties: {
		outcome: {
			type: "string",
			enum: ["approved", "changes_requested", "needs_input"],
		},
		data: { type: "object" },
	},
};
```

The CLI proof uses Ajv with isolated compilation, so repeated loads of a schema with the same `$id` do not collide. The other schema imports in these examples follow this pattern; no global schema registry is required.

Parallel reviewers share settings and a result schema while selecting different models:

```js
// agents/reviewers.mjs
import { candidateInput } from "../schemas/inputs.mjs";
import { reviewResult } from "../schemas/results.mjs";

const reviewerSettings = {
	kind: "agent",
	instructions: { file: new URL("../prompts/reviewer.md", import.meta.url) },
	input: candidateInput,
	reasoning: "high",
	actions: ["files.read", "files.search"],
	result: reviewResult,
};

export const correctness = {
	...reviewerSettings,
	id: "correctness-reviewer",
	modelProfile: "review-model-a",
};

export const maintainability = {
	...reviewerSettings,
	id: "maintainability-reviewer",
	modelProfile: "review-model-b",
};
```

## Script Actions support mjs and sh

The planned Script Action adapter supports these initial forms. Neither executes in the current CLI proof:

| Script | Explicit executable | Execution |
| --- | --- | --- |
| `.mjs` | `bun` | Run the module as the step's script process. |
| `.sh` | `sh` | Run the file with a POSIX shell. |

```js
// actions/check-dependencies.mjs
import { candidateInput } from "../schemas/inputs.mjs";
import { checkResult } from "../schemas/results.mjs";

export const checkDependencies = {
	kind: "script",
	id: "dependency-check",
	executable: "bun",
	scriptFile: new URL("../scripts/check-dependencies.mjs", import.meta.url),
	args: [],
	timeoutMs: 60_000,
	input: candidateInput,
	result: checkResult,
};
```

The shell variant uses the same Action shape and result schema:

```js
// actions/check-shell.mjs
import { candidateInput } from "../schemas/inputs.mjs";
import { checkResult } from "../schemas/results.mjs";

export const shellCheck = {
	kind: "script",
	id: "shell-check",
	executable: "sh",
	scriptFile: new URL("../scripts/check.sh", import.meta.url),
	args: [],
	timeoutMs: 60_000,
	input: candidateInput,
	result: checkResult,
};
```

Launch the configured executable, script path, and arguments as an argument array. Do not interpolate workflow input into a `sh -c` command. The file extension does not grant capabilities or create a different timeout, cancellation, or trace path.

An `.mjs` workflow module describes configuration. An `.mjs` Script Action is a process invoked by a step. Loading a trusted definition evaluates its author code, but declaring an Action is not a request to start its script.

Resolve prompt and script URLs against their declaring module. Retain the supported source files for the run. The script's execution directory is a separate setting.

The runner passes bounded JSON on stdin, including workspace, run, step, and attempt identity, declared inputs, and relevant validated prior results. The script emits one result object on stdout and diagnostics on stderr. Input, output, and diagnostics have size limits.

```json
{ "outcome": "pass", "data": { "checkedFiles": 12 } }
```

A completed check returns `pass`, `fail`, or `unknown` with exit code zero. A nonzero exit, launch failure, timeout, or invalid result is an execution failure. It does not silently select the `fail` repair route. Record bounded output, exit status, and timing.

## Keep decision rules inside their source

A ScriptAction can use ordinary conditions or an expression library to return a declared outcome. An Advisor can return the same shape. Neither requires another executor hierarchy or a generic policy language.

Later, a Jev-backed Action can satisfy that interface. The Action owns provider normalization and confidence thresholds. It returns the final `outcome` and preserves the provider's proposal, confidence, and local rule settings as evidence. The runner validates that result and maps it through `on`; it does not interpret Jev confidence or apply another decision policy.

A valid uncertain response may yield `needs_input`. Provider errors, unsupported choices, and malformed responses remain failures. See [Routing and loops](routing-loops.md) for persistence and recovery.

Model-backed Actions use the shared model-call capacity and normal attempt, timeout, cancellation, and usage records. A deterministic script needs no model slot. Managed model calls use a provider adapter; arbitrary HTTP calls inside contributed scripts are not automatically visible to the scheduler. Jev integration follows the real workflow and live graph milestone.

## Preserve execution controls

Validate action IDs and declared capabilities before execution. Approval and publication remain application-owned, step-only operations. Listing their IDs in an Agent does not grant permission to invoke them.

Only load explicitly trusted definition roots. Importing `.mjs` executes JavaScript and its imports; schema validation and working directories are not sandboxes. Runtime work belongs in referenced Agents or Actions, not callbacks hidden in graph edges. The initial loader accepts a controlled source set as described in [Define a workflow](workflows.md).
