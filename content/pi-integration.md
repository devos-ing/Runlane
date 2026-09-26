# Reuse Pi and Pi durable

The CLI proof pins Pi coding-agent and Pi durable at 0.87.1. Pi executes one tool-free Agent, and Pi durable stores workspace and run checkpoint documents through a small Bun SQLite facade. The broader multi-step mapping remains future work.

## Verified slice-A mapping

Each Runlane workspace and run is a Pi durable session-scoped document. A run checkpoint contains its immutable input and resolved definition, current status, final result, and attributable event history. Replacing that checkpoint commits the transition and events together. No second model transcript is created; Pi's SessionManager owns the conversation file.

Bun's missing-row result is normalized to the `undefined` required by Pi durable's facade. The database uses WAL and `synchronous=FULL`. A separate SQLite exclusive transaction holds service ownership for the process lifetime; it has no expiring lease. File permissions and the local bearer token protect the service connection.

The proof has executed `openai-codex/gpt-6-luna` with `low` effort, using configured Pi authentication and no tools or discovered workspace resources. [Submit a task](cli-quickstart.md) explains how to run the example. These results do not verify ScriptAction, multi-step recovery, or cron.

## The agent execution boundary

Reuse the full coding-agent SDK for its agent loop, selected model, tools, events, resource loading, and lifecycle controls. The planned `PiRuntime` extends the [Runtime parent class](runtimes.md), turns a configured Agent into an invocation, and translates observable events into the shared contract. The current implementation still uses the direct `executeAgent` function. [Pi SDK](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/sdk.md)

Use Pi's model runtime for provider/model lookup and supported authentication. The application validates the agent's configuration and records the actual model and effort; it never silently substitutes an unavailable model. [Model selection](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/02-custom-model.ts)

Pi's `ModelRuntime` is an SDK detail inside `PiRuntime`, not Runlane's Runtime parent class. The current `openai-codex` provider still executes through Pi. A future `CodexRuntime` invokes Codex's own agent system. Selecting another Runtime does not replace the Workflow Runner or application store.

## Persistence with Pi durable

Pi durable exposes record contracts and storage implementations for conversation, task, and document data. The current proof uses its portable SQLite core with Bun's synchronous database API. [Pi durable](https://raw.githubusercontent.com/earendil-works/pi/main/packages/durable/README.md)

We still define run identity, attempt state, event ordering, loop counters, approval evidence, and which updates must commit together. A package with durable storage does not automatically implement those business rules.

The user-owned service is the sole writer of application execution records for its state directory. It owns the workspace registry and records workspace identity on runs, schedules, events, and evidence. Pi durable does not provide our workspace registry, process ownership, or daemon lifecycle rules automatically.

Pi remains authoritative for its conversation history. Other Runtimes retain their native history in their own integrations. Pi durable continues to store Runlane's application records for all Runtimes. An opaque execution reference identifies native evidence without creating a second transcript store or a product-facing session manager.

## Reuse resources and tools

Reuse approved Pi tools and its extension interface for application-owned structured submission. Contributor definitions select allowed capabilities and result contracts. Load only explicitly trusted resources for managed invocations. [Tool selection](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/05-tools.ts), [Extensions](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/06-extensions.ts)

Deterministic checks and scripts do not need a model invocation. Workflow routing, schedules, concurrency limits, and the run graph belong to the application.

Runlane also owns the `.mjs` definition loader and retention of each run's source version. Pi conversation persistence does not preserve arbitrary workflow modules, checking scripts, or their dependencies for us.

## Add decision models through an Action adapter

Jev is a later decision source, after the real workflow and live graph. Its Action adapter uses the provider's decision interface, applies its own confidence rules, and returns the final result with evidence. Do not assume that a decision-model endpoint accepts Pi's conversational or tool-loop protocol.

Agent execution uses the selected Runtime, initially Pi. The direct Jev Action path shares attempt records, the global model-call limit, timeout and cancellation handling, reported usage, and durable decision evidence. It does not inherit from Runtime or add an agent loop. Its Profile selects an explicit provider and version, and the adapter validates the capabilities it requires.

The runner validates the final result against its imported schema and commits the declared route. It has no generic confidence-policy module. A Jev Action can convert valid uncertainty to `needs_input`; provider failures remain failures. The [routing design](routing-loops.md) defines that interface. Jev integration has not been implemented or verified in this repository.

## Prove the integration first

Pin a published package version and inspect its declarations. Verify explicit models, event delivery, independent invocations, cancellation, clean shutdown, durable record mapping, and transaction behavior before relying on them.

Keep this proof bounded to one invocation and the records needed to preserve its result and transition. Retain a known source set and verify the existing dependency environment. Do not expand a compatibility problem into another persistence abstraction, a general bundler, or automatic environment reconstruction without concrete need.

An earlier Pied Piper integration recorded a Bun/macOS shutdown issue with Pi 0.82.1's SDK entry point. The current 0.87.1 proof has loaded and executed successfully on this Bun environment. Keep the versions pinned and recheck the bounded lifecycle when upgrading.
