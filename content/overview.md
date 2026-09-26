# Workflow automation for agents

Define the work. Connect your agents. See every step.

An automation platform for developers to manage agents, compose workflows, and inspect each run. GitHub Actions is the reference for the execution graph and trace.

> Interactive design preview. Graph events are simulated. The CLI, daemon, workspace registry, Pi integrations, and schedules are not implemented.

<!-- playground -->

## The product in one minute

| Surface | What a developer does |
| --- | --- |
| Workspaces | Register source roots and keep workflow definitions and execution records attributable. |
| Workflows | Author stages, agents, scripts, routes, and triggers in `.mjs` files. |
| Agents | Reuse configurations containing instructions, capabilities, result contracts, and selected models. |
| Decisions | Use rules, scripts, Advisors, or Jev-backed Actions to choose among declared routes. |
| Runs | Start work and see which stages are queued, running, complete, or blocked. |
| Trace | Inspect inputs, outputs, action calls, timing, usage, and routing decisions. |
| Triggers | Start manually, then add calendar schedules through the same runner. |

The delivery starts with a CLI and one foreground runner for the current user, then adds background daemon operation across workspaces. Durable trace belongs in the first runtime slice. The planned Desktop GUI adds the live graph and inspector through the same client interface.

The desktop client reuses the React UI. A separately delivered web product and a TUI are optional later clients. Closing an interface does not stop admitted background work.

## What stays below the product

Pi executes the agent loop and owns its conversation internals. Pi durable is the selected persistence foundation, subject to a concrete data-mapping and Bun compatibility check. The product exposes runs and execution attempts, rather than a chat-session management interface.

Tickets, Git worktrees, and draft PRs belong to a coding-workflow template. A workflow that checks dependencies, prepares a report, or runs a script does not need those concepts as mandatory inputs.

## A small, composable system

```text
Trusted workflow.mjs → Validate → Frozen workflow version
Trigger + inputs → Run of that version → Stages
                                        ├─ Agents → allowed Actions
                                        ├─ Direct Actions
                                        └─ Routes → next / repeat / stop / complete
```

The workflow file is the authoring source. React Flow displays the validated graph, run status, and trace. Its first version supports inspection and layout changes. Execution changes happen in code.

Each run belongs to a registered workspace. One service manages all workspaces and their shared capacity. Keep definitions separate from their executions. Reuse one agent executor and a small set of action handlers. The proposed constructors create definitions only; the runner starts work after validation and admission.

Decision sources are replaceable. The runner validates their results, applies declared policies, and persists the selected route before advancing. Model-backed decisions share the global model-call capacity. [Routing and loops](routing-loops.md) explains the contract and recovery behavior.

## Read with your teammate

Start with [Core concepts](concepts.md) and [CLI, daemon, and workspaces](cli-workspaces.md), then explore [How React Flow works](react-flow.md). Use [Decisions and delivery](decisions.md) to distinguish agreed direction from open implementation choices.

For the reference interaction, GitHub documents an execution graph whose nodes expose job status and logs: [GitHub Actions visualization](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph).
