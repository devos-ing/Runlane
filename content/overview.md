# Workflow automation for agents

Define the work. Connect your agents. See every step.

An automation platform for developers to manage agents, compose workflows, and inspect each run. GitHub Actions is the reference for the execution graph and trace.

The authoring model has five components: Workflow, Agent, Action, Trigger, and Profile. A Workflow contains steps that invoke Agents or Actions. Scripts implement Actions; Review is a workflow activity. Runtime is the planned parent class for Agent execution integrations.

> The CLI execution proof is available. This graph still uses simulated events. Multi-step execution, background daemon commands, desktop packaging, and schedules remain planned.

<!-- playground -->

Use [Submit a task](cli-quickstart.md) to register a workspace, send a JSON task to a real Pi Agent, and inspect its persisted result. The example produces a plan without editing files.

## The product in one minute

| Surface | What a developer does |
| --- | --- |
| Workspaces | Register source roots and keep workflow definitions and execution records attributable. |
| Workflows | Define identified steps, routes, and loops in `.mjs` files. |
| Agents | Reuse configurations containing instructions, capabilities, result contracts, and selected models. |
| Actions | Run an operation, with planned Script Action support for `.mjs` and `.sh`. |
| Profiles | Select a Runtime and supported provider/model settings for Agents; retain direct provider settings for model-backed Actions. |
| Runtimes | Extend the common execution parent with Pi, then Codex and Claude integrations. Planned; the current CLI invokes Pi directly. |
| Decisions | Return a final outcome from a script or Advisor; add Jev through an Action later. |
| Runs | Start work and see which steps are queued, running, complete, or blocked. |
| Trace | Inspect inputs, outputs, action calls, timing, usage, and routing decisions. |
| Triggers | Start manually, then add calendar schedules through the same runner. |

The first usable milestone is a real workflow controlled through the CLI and visible in the existing graph. Start with one Pi invocation and durable trace, then add checks, parallel review, bounded repair, and independent runs across workspaces. Connect React Flow before adding Jev, desktop packaging, or cron.

One foreground service owns execution and shared capacity. Background daemon launch and Desktop packaging follow that same core. The desktop client reuses the React UI; a separately delivered web product and a TUI remain optional. Closing a client does not stop admitted work while the service remains running.

## What stays below the product

The selected Runtime executes the agent loop and owns its native conversation context. Pi is the first integration; the current proof has verified its execution and Pi durable's checkpoint mapping on Bun. Pi durable remains the application persistence foundation when more Runtimes are added. The product exposes runs, execution attempts, and their evidence.

Tickets, Git worktrees, and draft PRs belong to a coding-workflow template. A workflow that checks dependencies, prepares a report, or runs a script does not need those concepts as mandatory inputs.

## A small, composable system

```text
Trusted workflow.mjs → Validate → Frozen workflow version
Trigger + inputs → Run of that version → Steps
                                        ├─ Agents → allowed Actions
                                        ├─ Direct Actions
                                        └─ Routes → to / repeat / stop / complete
```

The workflow file is the authoring source. React Flow displays the validated graph, run status, and trace. Its first version supports inspection and layout changes. Execution changes happen in code.

Each run belongs to a registered workspace. Definitions are plain objects with imported schemas. The core loads definitions, executes Agents through Runtime subclasses and Actions through their implementations, and stores its records. The [Runtime parent class](runtimes.md) owns shared invocation behavior; the runner starts work only after validation and admission.

The docs use Step as the canonical name. The current CLI still uses the earlier `stages` fields; [Submit a task](cli-quickstart.md) explains the runnable format until the planned migration.

Decision sources own their rules and return final outcomes with evidence. The runner validates one result schema and persists the declared route before advancing. It does not apply a generic confidence policy. Model-backed decisions share global capacity. [Routing and loops](routing-loops.md) explains the interface and recovery behavior.

## Read with your teammate

Start with [Core concepts](concepts.md), [Runtime parent class](runtimes.md), and [CLI, daemon, and workspaces](cli-workspaces.md), then explore [How React Flow works](react-flow.md). Use [Decisions and delivery](decisions.md) to distinguish agreed direction from open implementation choices.

For the reference interaction, GitHub documents an execution graph whose nodes expose job status and logs: [GitHub Actions visualization](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph).
