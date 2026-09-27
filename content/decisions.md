# Decisions and delivery

Use this page as the starting point for a teammate design review. This documentation set reflects the workflow-platform direction and supersedes the earlier session- and Ticket-centered product framing.

Use [Development scope](development-scope.md) to bound a work item by its goal, reason, approach, exclusions, and completion evidence.

## Agreed direction

- Build a local-first workflow automation and observability platform for agents.
- Deliver the CLI and runner foundation first, with durable trace from the first real invocation.
- Use one local service per operating-system user to manage all registered workspaces. Foreground and daemon modes use the same runner.
- Define Workspace as a stable identity, display name, and source root. Scope workflows, schedules, runs, and evidence to it.
- Use five authoring components: Workflow, Agent, Action, Trigger, and Profile.
- Keep `steps` inside Workflow as identified execution positions. A Step references Agents or Actions and has no standalone class or registry.
- Treat Script as an Action implementation, with planned `.mjs` and `.sh` support through explicit interpreters.
- Treat Review as workflow work performed by Reviewer Agents or checking Actions. A Trigger starts a Run; it does not perform review.
- Author workflows in `.mjs`, with optional `.ts` support. Import reusable agents, scripts, and trigger definitions from trusted sources.
- Combine instructions, capabilities, Profile reference, effort, and result contract in Agent. A step or parallel assignment identifies where that configuration is used; it does not require a separate public Agent binding type.
- Keep authoring definitions as plain objects. Use one `Runtime` parent class for coding-agent integrations, with `PiRuntime` first and planned `CodexRuntime` and `ClaudeRuntime` subclasses. Advisor, Implementer, and Reviewer remain Agent presets.
- Let Agent Profiles select a Runtime and its supported provider/model settings. Preserve `modelProfiles`, `modelProfile`, and explicit Agent effort. Runtime instances belong to the service, outside workflow snapshots.
- Give Runtime a shared `run` entry point and native validation/execution methods. Keep routing, retries, global capacity, result validation, and checkpoint writes in the Workflow Runner. Script Actions keep their direct execution path.
- Use one imported result schema as the source of truth for result validation and allowed outcomes. Do not repeat those outcomes in another configuration field.
- Allow scripts and Advisors to supply decisions through the same result interface. Add Jev after the real workflow and graph work together.
- Keep confidence rules inside the decision Action that needs them. The runner validates the final result and selects a declared route; it has no generic DecisionPolicy engine.
- Declare every route destination in advance. A decision is an execution result, not another parent class or agent engine.
- Commit accepted decisions and selected routes before advancing. Recovery reuses committed decisions rather than calling a model to select again.
- Connect the existing React Flow view to real events in the first usable milestone, before Jev integration or desktop packaging.
- Use React Flow for viewing execution, inspecting trace, and arranging layout. Edit execution logic in source files.
- Reuse Pi as the first Runtime implementation and Pi durable as the application persistence foundation for all Runtimes.
- Reuse the coding-agent SDK entry point, ModelRuntime catalog/authentication, SessionManager, and approved Pi tools inside PiRuntime. Do not build a second agent loop, model registry, credential store, or transcript database.
- Keep Runlane Agent as reusable definition data, with the planned TypeScript name `AgentDefinition`. Native Pi Agent instances and their mutable state belong to individual attempts.
- Let contributors add agents, prompts, and scripts through validated definitions.
- Keep explicit profiles, bounded loops, and defaults of two active runs and two simultaneous model calls across all workspaces.
- Verify native request control before enabling additional Runtimes under that model-call limit. An external Runtime attempt can contain several requests or subagents; an attempt limit needs a separate, explicit policy decision.
- Include model-backed decision Actions in that shared capacity. Distinguish valid uncertainty from provider failures and malformed results.
- Start with a controlled set of retained source files and recorded dependency versions. Edits apply to new runs. Missing or unsupported recovery inputs block execution instead of triggering automatic environment reconstruction.
- Support independent runs and parallel read-only reviewers. Every designated reviewer must approve in the coding-review template.
- Keep native conversation management inside each Runtime integration. Store opaque execution references for evidence without adding a product-facing session manager. Treat Tickets, worktrees, and PRs as coding-template capabilities.

## Interface and lifecycle direction

The CLI is the first client for workspace registration, workflow validation, starting runs, status, logs, and explicit cancellation. It supports readable output and JSON for automation. The service owns all execution and persistence; the CLI does not create a second runner.

Start the service in the foreground during the first runtime slice. One service owns the user's state directory and all registered workspaces. Client disconnects do not cancel runs. Preserve interruption records and committed routes from the start. Add manual daemon start, status, and graceful stop around the same implementation after the first usable milestone.

Connect the existing React and React Flow view to the local service early, with a read-only graph and trace inspector. This proves observability without waiting for a desktop shell. Desktop packaging follows later and reuses that UI. A separately delivered web product and a TUI remain optional later clients. Feature parity is not required.

The detailed contract is in [CLI, daemon, and workspaces](cli-workspaces.md); [Submit a task](cli-quickstart.md) documents the implemented foreground CLI. Background daemon commands and Desktop packaging remain planned. The static documentation canvas is not connected to the runtime yet.

## Delivery sequence

| Slice | Outcome | Status |
| --- | --- | --- |
| Documentation | Markdown site, shared vocabulary, interactive React Flow demonstration. | This preview |
| A. Execution proof | Workspace registration, foreground service, one tool-free Pi Agent, JSON input/result validation, Pi durable records, CLI status, logs, and cancellation. | Implemented subset; see quickstart |
| Step naming alignment | Rename the definition, snapshot, and trace fields together, update the runnable example, and preserve access to existing run history. No new execution behavior. | Next; not implemented by this docs change |
| Runtime extraction | Introduce the parent and `PiRuntime` by reusing the working SDK path and model catalog. Make Profile selection explicit, centralize result validation, and preserve cancellation, trace ordering, and readable history. | Pi reuse steps P1–P2 after naming alignment; design only |
| B. Real workflow | Workflow steps execute Plan → Implement → Script checks → parallel Review with one shared two-repair loop. Add `.mjs` and `.sh` Script Actions, and exercise independent runs across two workspaces under shared capacity. | Planned |
| C. Live observation | Connect the existing React Flow view and inspector to those real records. Show active work, results, failures, and the chosen repair route. | Planned |
| Codex Runtime | Prove a second subclass with explicit settings, observable events, cancellation, structured results, and enforceable capacity. | After A–C; native integration unverified |
| Claude Runtime | Reuse the parent contract and verify Claude-specific settings, authentication, tools, events, cancellation, and capacity. | After Codex evidence; native integration unverified |
| Daemon operation | Manual background start, status, graceful stop, and reconciliation using the same runner and records. | After A–C |
| Jev Action | Optional decision adapter with local confidence rules, shared model capacity, and normal result validation. | After A–C |
| Desktop packaging | Package the shared React UI and connect it to the existing local service. | After A–C |
| Schedules | Cron admission, occurrence identity, overlap policy, and visible history. | After A–C |
| Coding template | General repository and worktree provisioning, plus human-approved draft PR publication. Reuse the demonstrated checks and review loop. | Later |

The CLI proof pins Pi coding-agent and Pi durable at 0.87.1. A real `openai-codex/gpt-6-luna` invocation with `low` effort produced a validated result. Pi durable document writes and reopen work through the Bun SQLite adapter. [Submit a task](cli-quickstart.md) describes the implemented boundary. The canvas remains simulated.

A–C form the first usable milestone. A alone is an integration proof, not delivery of the workflow product. Preserve both requested forms of parallelism, every designated reviewer's approval, and configurable defaults of two active runs and two model calls across workspaces.

The Runtime parent design is approved, but neither the extraction nor additional integrations are implemented. The first milestone remains Pi-backed. Additional Runtime work does not gate the Pi workflow or its live graph.

Use an isolated example directory for the code-change workflow. Parallel reviewers inspect the same immutable candidate, and independent writing runs use different workspaces. General repository provisioning and PR publication stay in the later coding template.

The CLI proof loads the single-Agent subset of the plain-object definition format. Multi-step definitions, scripts, loops, and schedules remain proposals and are rejected by that loader. Public SDK packaging is deferred. Importing author JavaScript executes code, so workspace sources must be trusted.

Visual editing of execution logic is deferred. Supporting arbitrary `.mjs` round-tripping would require a separate restricted authoring format or source transformation design.

## Align Step naming before slice B

The authoring vocabulary uses Step now, but the implemented CLI still uses the earlier field names. The planned change is bounded to naming and record compatibility:

| Current CLI field | Target field |
| --- | --- |
| `stages` | `steps` |
| `entryStage` | `entryStep` |
| `stageId` | `stepId` |

Update the loader, stored snapshots, API and trace shapes, sample definitions, and their documentation together. Preserve IDs, inputs, results, and event history. Existing runs must remain readable without re-execution; handle stored-format versions explicitly rather than silently rewriting historical meaning. Preserve validation, cancellation, capacity, and result-routing behavior.

This is one naming migration, not a reason to add Step constructors, a registry, or a permanent pair of interchangeable authoring fields. Profile remains data; the existing `modelProfiles` and `modelProfile` keys do not need an unrelated rename. The Runtime selector and stored execution-reference changes belong to the following extraction slice.

## Runtime extraction and later integrations

The [Runtime parent class](runtimes.md) owns the execution contract. This work replaces the earlier recommendation to use only interfaces for Agent execution. It introduces one parent class, not an inheritance hierarchy for authoring definitions.

| Scope field | Runtime work |
| --- | --- |
| Goal and reason | Let one Runner execute an Agent through a selected coding-agent system while keeping workflow behavior and evidence consistent. |
| Approach | Extract the verified Pi invocation into `PiRuntime extends Runtime`. Put shared identity and cancellation checks in `run`; native validation and execution belong to subclass methods. |
| Documentation scope | Record the Runtime parent contract, concrete Pi reuse mapping, terminology, and implementation sequence. No executable Runtime implementation or dependency change. |
| Next implementation | Introduce the parent and Pi subclass, explicit Profile Runtime ID, versioned execution metadata, and common result validation. Update the runnable example and quickstart with the code. |
| Boundaries | Preserve exact model and effort, capability restrictions, cancellation during startup, atomic completion, global capacity, and interruption without automatic replay. Keep historical records readable. |
| Exclusions | Codex and Claude execution in the Pi extraction, a plugin loader, shared process pools, public SDK packaging, native transcript migration, and a session-management UI. |
| Current completion evidence | Documentation links and navigation agree, stale no-base-class guidance is removed, and lint/typecheck/site build pass. These checks do not verify the proposed integrations. |
| Implementation completion evidence | Focused permitted integration evidence through the real Pi subclass covers accepted execution, catalog rejection, invalid output, startup cancellation, interruption, historical record access, and completion waiting for trace writes. No unit or end-to-end tests. |

The extraction moves provider lookup and Pi's `ModelRuntime` behind `PiRuntime`. It moves final schema and outcome-route checks into the Runner so later subclasses cannot bypass them. Preserve the same sanitization and cleanup requirements. New snapshots record Runtime ID, implementation version, and resolved settings; legacy slice-A records are identified explicitly as Pi records without re-execution or rewriting their original evidence.

The Codex slice then proves that two subclasses satisfy the same contract. Verify native permission enforcement and model-call accounting before enabling admission; limit claims must include native subagents and retries. If the protocol cannot enforce the agreed model-call policy, record that blocker and decide separately whether an attempt-based policy is acceptable. Claude follows the same acceptance boundary after Codex provides concrete evidence.

Both integrations must preserve Runlane's result schema, observable progress, bounded errors, cancellation, and checkpoint rules. Native session IDs are evidence, not automatic restart instructions. Authentication and native session ownership stay inside each integration.

## Pi reuse implementation plan

The [Pi reuse map](pi-integration.md#reuse-map) defines what to delegate to the installed 0.87.1 SDK. Keep the agreed Runtime parent class. Its Pi subclass composes `createAgentSession`, ModelRuntime, explicit resource loading, and SessionManager. Retain the current package versions and RunStore implementation.

Step naming alignment remains the prerequisite. The following steps refine the existing Runtime extraction and slices B–C; they do not create another product milestone or authorize execution during this documentation task.

| Step | Implementation and ownership | Completion evidence |
| --- | --- | --- |
| P1. Extract the verified Pi path | Move `executeAgent` and `availableModel` from `runtime/agent.ts` into PiRuntime behind Runtime. Keep Pi's ModelRuntime private. Use `AgentDefinition` for reusable authoring data, add the explicit Runtime selector and versioned records, and move result-schema/route checks into the Runner. | The same tool-free task executes with the exact selected model and effort. Unknown or unavailable models are rejected before dispatch. Legacy Pi history remains readable without replay. No duplicate catalog or fallback path. |
| P2. Preserve lifecycle and trace | Reuse Pi's prompt, event, abort, and disposal APIs. Keep native sessions isolated by attempt, bridge synchronous session events to bounded ordered writes, and wait for those writes before completion. Retain the existing cancellation check at the provider stream boundary. | A permitted real-dependency integration check covers cancellation during startup, event-write failure, durable completion ordering, and interrupted reopen. A native final message alone cannot advance the workflow. |
| P3. Enable explicit tools in slice B | Map declared capabilities to Pi tools and explicitly trusted resources. Keep automatic resource discovery, native retries, and compaction disabled initially. Account for each managed model request until its stream settles; aggregate completed-message usage once. | Read-only reviewers have only their allowed tools. Two independent attempts keep separate context and cancellation. Multi-turn calls obey shared capacity and do not undercount usage; cancellation releases a settled request's permit. |
| P4. Compose the real workflow in slice B | Reuse the Pi execution path for Plan, Implement, and every Reviewer. Add direct `.mjs` and `.sh` Script Actions, step attempts, shared review aggregation, and durable repair counters in the Runner. Reuse Pi durable commits. | An accepted flow, a repair round, and an exhausted allowance demonstrate all-reviewers approval, the two-repair bound, and preserved state. Invalid results cannot route successfully. Independent runs across two workspaces share capacity. |
| P5. Connect observation in slice C | Project persisted Runlane events into the existing React Flow view and inspector. Reuse the service operations used by CLI status and logs. | The graph and CLI agree on the same run, including active work, repair, failure, and reconnect. The view does not invoke Pi to reconstruct history. |

Use the smallest permitted integration evidence for each changed behavior. Extend the existing scenario when it can demonstrate a new load-bearing invariant; do not add unit tests, end-to-end tests, or a second fake-agent framework. Preserve validation, ownership, sanitization, and interruption handling throughout.

P1–P2 preserve the single-Agent proof while changing its execution structure. P3–P4 introduce the tool-enabled workflow already planned for slice B. P5 completes the first usable milestone. Codex and Claude follow that milestone and validate their own native model support; Pi's catalog is not their capability authority.

Model catalog display, custom provider configuration, native session continuation, and automatic catalog refresh remain separate future needs. The first extraction keeps `modelsPath: null` and `allowModelNetwork: false`; it adds no catalog database, agent registry, or new CLI command. Existing `.mjs` imports are enough to share Agent definitions.

Revisit the affected integration if the pinned SDK cannot meet cancellation, event-write ordering, permission, or model-call capacity requirements. Record the failing evidence before changing versions or expanding the Runtime interface. The present plan update does not run models or claim these future checks have passed.

## First usable milestone

The first runtime slice registers one workspace and accepts a CLI-submitted workflow with declared inputs and one configured Agent. A foreground service loads the workflow and records its workspace identity, validated definition, and retained source version before creating an attempt.

CLI status and trace show admission, execution, validated output, actual model, and effort from persisted records. A failed definition load or unavailable model appears as a blocker before execution. Cancellation and service interruption preserve attributable evidence. Disconnecting a client does not launch, cancel, or duplicate work.

Then extend that path to a real workflow with deterministic checks, parallel review, bounded repair, and the existing graph. A failed review round consumes one repair allowance. A malformed result or provider error remains a failed or blocked attempt. A client reconnect or service restart cannot reset counters or replace a committed decision.

Completion means the CLI can control real work and the graph shows the same durable state, including a repair and a failure. The current graph remains simulated until that connection is implemented.

## Keep the core small

Keep four core responsibilities: load and validate definitions, run the workflow, execute through adapters, and store records. Workspace registration and source references can be records in that store. Routing and bounded repetition can be data interpreted by the runner. These responsibilities do not require four packages or a class for every domain term.

The five authoring components describe what contributors configure; these four responsibilities describe how the runtime implements them. Steps, Scripts, and Review do not add three more engines.

Retain schema validation, explicit model selection, source identity, cancellation, global capacity, and atomic transitions. The Runtime parent is the one agreed execution base class. Defer a universal policy engine, additional class hierarchies, an expression engine, and automatic dependency or environment reconstruction. Extract another shared module only when real implementations repeat the same behavior.

## Resolve before the next slice

1. How should the current run checkpoint represent multiple step attempts while keeping transitions and their events atomic?
2. Which result schemas do implementation, checks, and review require beyond the demonstrated planning result?
3. Which controlled script and candidate source set can slice B retain and verify without a general-purpose bundler?
4. How should the graphical client authenticate to the existing loopback interface with an explicit allowed origin?

Slice A resolved the initial model invocation, workspace/run document mapping, SQLite ownership, and CLI transport questions. The planning example in `examples/task-workspace` is the current runnable reference. Later cron work still needs occurrence-deduplication evidence.

Jev provider selection, its confidence settings, and desktop packaging are later decisions. They do not block the execution proof or live graph.

These questions do not expand the Runtime extraction into a plugin framework or require us to recreate a native agent loop. Resolve them with bounded integration evidence and a concrete workflow.

## Verification policy

AI contributors must not write, run, or delegate unit or end-to-end tests. Use typechecking, lint, build, and the smallest permitted integration check for load-bearing runtime behavior. Browser screenshots can support visual inspection; they do not prove live agent execution.

The website's canvas is a deterministic client-side demonstration. The separate CLI proof has a foreground backend, real Pi execution, and Pi durable storage. It has no Runtime parent class, Codex or Claude Runtime, active cron jobs, background daemon launcher, ScriptAction executor, multi-step runner, or live graph connection.

## Maintain this site

The pages are ordinary files in `content/`. Edit Markdown, then update the small navigation list when adding a page. The `<!-- playground -->` marker inserts the React Flow demonstration; it does not execute code from Markdown.

Use the source link on each page to inspect or download its Markdown. Share page URLs and heading anchors during review. The product is named Runlane. The hosting destination remains undecided.
