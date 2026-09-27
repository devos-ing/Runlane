# Reuse Pi and Pi durable

The reuse design delegates agent execution, model catalog, authentication, tools, resource loading, and native conversation storage to Pi. The planned `PiRuntime` connects those capabilities to the Runtime contract. Runlane owns workflow scheduling, result validation, routes, repair limits, and durable application records.

The current proof pins Pi coding-agent and Pi durable at 0.87.1. It executes one tool-free Agent and stores workspace and run checkpoints through the existing Bun SQLite facade. The plan keeps these versions and behavior during extraction. Runtime classes, tool-enabled workflows, and the live graph remain planned.

This page owns the reuse mapping and integration requirements. [Decisions and delivery](decisions.md#pi-reuse-implementation-plan) owns the implementation order and completion evidence. The findings below were checked against the installed 0.87.1 declarations and source; the links use that version where available.

## Reuse map

| Capability | Reuse from Pi | Runlane work |
| --- | --- | --- |
| Agent loop | `createAgentSession()` and the underlying `pi-agent-core` Agent. | Map one retained Agent definition and input to one native attempt. Do not rebuild the model/tool loop. |
| Model catalog | `ModelRuntime.getProviders()`, `getModels()`, `getModel()`, and `getAvailable()`. | Resolve explicit Profile choices and preserve actual execution settings. Do not maintain another provider/model registry. |
| Authentication | Pi's ModelRuntime and credential handling. | Report bounded availability failures. Keep credentials out of Profiles, snapshots, and trace. |
| Tools | Pi's built-in tools and its custom-tool extension interface. | Map declared capabilities to an explicit tool allowlist, scoped to the attempt directory. |
| Resources | `DefaultResourceLoader` and explicit overrides. | Select trusted, retained instructions and resources. Preserve disabled discovery during the extraction. |
| Native history | `SessionManager`. | Keep an opaque reference per attempt. Store workflow evidence separately. |
| Observable progress | AgentSession message, tool, usage, and lifecycle events. | Normalize bounded events and await durable event delivery before reporting completion. |
| Application persistence | Pi durable `SqliteStorage` and the existing Bun facade. | Keep RunStore as the application record owner, including atomic result/route transitions. |

The coding-agent SDK already assembles the lower-level Agent and model services. Continue using it as the entry point. A second direct construction path through `pi-agent-core` would duplicate lifecycle wiring without meeting a new requirement.

## Agent definitions and native instances

The public Runlane Agent remains a plain reusable definition. Use `AgentDefinition` as its TypeScript type name when extracting that shape, to distinguish it from Pi's stateful `Agent` class. This is a naming convention for the planned code, not a new authoring object or an implemented export.

An Advisor or Reviewer imports a definition containing instructions, capabilities, a Profile reference, effort, and schemas. `PiRuntime extends Runtime` creates an `AgentSession` for each attempt. It does not inherit from Pi's Agent or keep one conversation shared across workflow steps.

Keep the Runtime parent independent of Pi types. The Pi subclass composes the SDK objects behind that interface. Agent definitions, Profiles, and workflow snapshots stay serializable; native clients and sessions stay in the service.

Reuse Agent definitions through `.mjs` imports. The installed SDK has no public `AgentCatalog` API matching Runlane's reusable role definitions. That does not require another catalog service or plugin registry.

## Model catalog and Profile selection

ModelRuntime is the Pi implementation's authority for known models and configured availability. A Profile selects one exact provider/model pair from that catalog. `getModels()` describes known models; `getAvailable()` checks configured availability. Neither replaces validation of the requested capabilities or guarantees that a later provider call will succeed. [Pi 0.87.1 ModelRuntime](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/src/core/model-runtime.ts)

The current service already creates one ModelRuntime with `modelsPath: null` and `allowModelNetwork: false`. Preserve these built-in-only, no-network-catalog-refresh settings during extraction. Move ownership into the Pi integration and remove the ModelRuntime re-export from the general execution path. Separate attempts can use that shared model service while keeping their native sessions independent.

The extraction reuses `availableModel` behavior for preflight validation. Resolve the recorded provider/model, check availability, and compare the created session's actual model and effort before dispatch. Reject fallback, unsupported settings, or missing models. A catalog refresh never changes an admitted run's recorded selection.

Record the selected model settings and implementation version needed to explain the attempt. Do not copy the full catalog or credentials into RunStore. A future model picker can query the Pi integration when needed; this plan adds no catalog database, model-list CLI command, or catalog methods to the Runtime parent.

Pi's catalog applies to Pi execution. A future CodexRuntime or ClaudeRuntime validates its own native model support. A model being listed under Pi's `openai-codex` provider does not establish that a native Codex integration is available.

## Verified slice-A mapping

Each Runlane workspace and run is a Pi durable session-scoped document. A run checkpoint contains its immutable input and resolved definition, current status, final result, and attributable event history. Replacing that checkpoint commits the transition and events together. No second model transcript is created; Pi's SessionManager owns the conversation file.

Bun's missing-row result is normalized to the `undefined` required by Pi durable's facade. The database uses WAL and `synchronous=FULL`. A separate SQLite exclusive transaction holds service ownership for the process lifetime; it has no expiring lease. File permissions and the local bearer token protect the service connection.

The proof has executed `openai-codex/gpt-6-luna` with `low` effort, using configured Pi authentication and no tools or discovered workspace resources. [Submit a task](cli-quickstart.md) explains how to run the example. These results do not verify ScriptAction, multi-step recovery, or cron.

## The agent execution boundary

Reuse the full coding-agent SDK for its agent loop, selected model, tools, events, resource loading, and lifecycle controls. The planned `PiRuntime` extends the [Runtime parent class](runtimes.md), turns a configured Agent into an invocation, and translates observable events into the shared contract. The current implementation still uses the direct `executeAgent` function. [Pi 0.87.1 SDK](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/docs/sdk.md)

Use Pi's model runtime for provider/model lookup and supported authentication. The application validates the agent's configuration and records the actual model and effort; it never silently substitutes an unavailable model. [Model selection](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/examples/sdk/02-custom-model.ts)

Pi's `ModelRuntime` is an SDK detail inside `PiRuntime`, not Runlane's Runtime parent class. The current `openai-codex` provider still executes through Pi. A future `CodexRuntime` invokes Codex's own agent system. Selecting another Runtime does not replace the Workflow Runner or application store.

## Map a retained attempt to the SDK

| Retained Runlane value | Pi mapping |
| --- | --- |
| Execution directory | Explicit `cwd` for the session and tools. |
| Agent instructions | Explicit system prompt through ResourceLoader, using the retained prompt content. |
| Profile provider and model | The exact Model object resolved through ModelRuntime. |
| Agent reasoning effort | `thinkingLevel`, followed by an actual-value check. |
| Declared capabilities | Explicit tool names or approved custom tools, with no implicit additions. |
| Native execution reference | The attempt's SessionManager file reference. |
| Validated task input | The prompt payload for this attempt. |
| Result schema | Output instructions for Pi; authoritative validation stays in the Runner. |

One invocation follows this order:

1. The Runner validates input, resolves the definition and Profile, checks native availability, and commits the attempt's frozen execution data.
2. PiRuntime creates the explicit resource loader, settings, SessionManager, and AgentSession. Session storage is isolated by attempt identity, including repair attempts and parallel reviewers.
3. Bind host cancellation and observation before dispatch. Confirm the actual model and effort, then await the durable started event with the native reference.
4. Call `session.prompt()` with the retained input. Reuse Pi's loop and tools. Never implement a second loop around model responses.
5. Wait for native completion and pending event writes, parse the bounded output, and clean up the attempt. Return the parsed value without choosing a route.
6. The Runner validates the result schema and declared outcome, then atomically commits the result, route, and completion evidence before dispatching the next step.

Keep automatic Pi retries and compaction disabled during extraction, as in the current proof. Workflow repair is governed by the Runner's shared allowance. Any later use of native retries or model-backed compaction requires explicit accounting and recovery evidence.

## Preserve event ordering and cancellation

`message_end` provides completed-message evidence. `agent_end` is not a sufficient completion signal because Pi can continue with automatic work. Use the documented `prompt()` lifecycle and `agent_settled` semantics for the pinned SDK, then finish Runlane's pending writes and cleanup before accepting a result.

Pi 0.87.1's `AgentSession.subscribe()` listener returns `void`; its emitter invokes listeners without awaiting returned promises. Passing an async durable-write callback does not make Pi wait for it. Keep a small bounded, ordered write chain inside the Pi adapter, coalesce text deltas where appropriate, and drain it before returning. Preserve critical lifecycle and tool evidence. Event-write failure or buffer overflow aborts the attempt and prevents success. This is an adapter detail, not another event bus. [Pinned AgentSession source](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/src/core/agent-session.ts)

For tool-enabled work, calculate final usage once from the attempt's settled native assistant messages. Streamed usage notifications are progress evidence, not additional amounts to add to that total. The proof currently retains usage from its single tool-free response; carrying only the last message's usage would undercount a multi-turn attempt. Missing provider usage remains unavailable.

Preserve the existing host signal binding at `session.agent.streamFunction`, including the check after the awaited startup checkpoint. Abort during resource loading, prompt preparation, or execution must not escape the host cancellation rule. Await native idle/abort and clean up in `finally`; do not report success after cancellation or an unconfirmed cleanup.

## Persistence with Pi durable

Pi durable exposes record contracts and storage implementations for conversation, task, and document data. The current proof uses its portable SQLite core with Bun's synchronous database API. [Pi durable](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/durable/README.md)

We still define run identity, attempt state, event ordering, loop counters, approval evidence, and which updates must commit together. A package with durable storage does not automatically implement those business rules.

The user-owned service is the sole writer of application execution records for its state directory. It owns the workspace registry and records workspace identity on runs, schedules, events, and evidence. Pi durable does not provide our workspace registry, process ownership, or daemon lifecycle rules automatically.

Pi remains authoritative for its conversation history. Other Runtimes retain their native history in their own integrations. Pi durable continues to store Runlane's application records for all Runtimes. An opaque execution reference identifies native evidence without creating a second transcript store or a product-facing session manager.

Reuse `runtime/store.ts` and its serialized document commits. Native SessionManager files and Pi durable workflow checkpoints have different owners and purposes. The initial restart behavior remains interrupted without automatic replay, including after the Runtime extraction.

## Reuse resources and tools

The extraction stays tool-free. In slice B, reuse Pi's `read`, `grep`, `find`, and `ls` tools for read-only work. Enable `edit`, `write`, or `bash` only for explicitly authorized Agent capabilities. Map existing Runlane capability names locally in PiRuntime; unsupported mappings block admission. A selected working directory is not an OS sandbox. [Pinned tool-selection example](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/examples/sdk/05-tools.ts)

Reuse DefaultResourceLoader with explicit overrides. Keep extensions, skills, templates, themes, and context-file discovery disabled until a workflow explicitly declares trusted, retained resources. Custom tool integrations use Pi's extension interface only when a required capability is missing. Approval and publication remain application-owned, step-only Actions. [Pinned full-control example](https://raw.githubusercontent.com/earendil-works/pi/v0.87.1/packages/coding-agent/examples/sdk/12-full-control.ts)

Deterministic checks and scripts do not need a model invocation. Workflow routing, schedules, concurrency limits, and the run graph belong to the application.

Runlane also owns the `.mjs` definition loader and retention of each run's source version. Pi conversation persistence does not preserve arbitrary workflow modules, checking scripts, or their dependencies for us.

## Capacity belongs to Runlane

Pi can run an agent's internal tool loop, but it does not supply Runlane's global workspace admission, parallel-review approval, or repair-budget policy. Keep the shared defaults of two active Runs and two managed model calls. Waiting steps do not reserve model-call capacity.

The extraction preserves the current one-call-per-attempt proof. Before enabling tools, integrate capacity with the actual managed Pi request stream, retaining a permit until that request's stream settles. Release it on completion, failure, or cancellation. Do not release a permit merely because a stream object was returned, and do not hold it while a step only waits for reviewers. Verify any other SDK path capable of issuing a model request before enabling it.

Reuse Pi's provider streaming implementation inside that accounting hook. Scripts that issue arbitrary network requests are outside automatic accounting. Additional native Runtimes still require the [capacity evidence](runtimes.md#capacity-is-an-integration-requirement) defined by the shared contract.

## Add decision models through an Action adapter

Jev is a later decision source, after the real workflow and live graph. Its Action adapter uses the provider's decision interface, applies its own confidence rules, and returns the final result with evidence. Do not assume that a decision-model endpoint accepts Pi's conversational or tool-loop protocol.

Agent execution uses the selected Runtime, initially Pi. The direct Jev Action path shares attempt records, the global model-call limit, timeout and cancellation handling, reported usage, and durable decision evidence. It does not inherit from Runtime or add an agent loop. Its Profile selects an explicit provider and version, and the adapter validates the capabilities it requires.

The runner validates the final result against its imported schema and commits the declared route. It has no generic confidence-policy module. A Jev Action can convert valid uncertainty to `needs_input`; provider failures remain failures. The [routing design](routing-loops.md) defines that interface. Jev integration has not been implemented or verified in this repository.

## Prove the integration first

Pin a published package version and inspect its declarations. Verify explicit models, event delivery, independent invocations, cancellation, clean shutdown, durable record mapping, and transaction behavior before relying on them.

Keep this proof bounded to one invocation and the records needed to preserve its result and transition. Retain a known source set and verify the existing dependency environment. Do not expand a compatibility problem into another persistence abstraction, a general bundler, or automatic environment reconstruction without concrete need.

An earlier Pied Piper integration recorded a Bun/macOS shutdown issue with Pi 0.82.1's SDK entry point. The current 0.87.1 proof has loaded and executed successfully on this Bun environment. Keep the versions pinned and recheck the bounded lifecycle when upgrading.
