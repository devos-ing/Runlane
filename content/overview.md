# Workflow automation for agents

Define the work. Connect your agents. See every step.

An automation platform for developers to manage agents, compose workflows, and inspect each run. GitHub Actions is the reference for the execution graph and trace.

> Interactive design preview. Graph events are simulated. The workflow runner, Pi integrations, and schedules are not connected.

<!-- playground -->

## The product in one minute

| Surface | What a developer does |
| --- | --- |
| Workflows | Author stages, agents, scripts, routes, and triggers in `.mjs` files. |
| Agents | Reuse configurations containing instructions, capabilities, result contracts, and selected models. |
| Runs | Start work and see which stages are queued, running, complete, or blocked. |
| Trace | Inspect inputs, outputs, action calls, timing, usage, and routing decisions. |
| Triggers | Start manually, then add calendar schedules through the same runner. |

The graph and trace are the main product experience. They belong in the first working slice, alongside a real agent invocation.

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

Keep definitions separate from their executions. Reuse one agent executor and a small set of action handlers. The proposed constructors create definitions only; the runner starts work after validation and admission.

## Read with your teammate

Start with [Core concepts](concepts.md), then explore [How React Flow works](react-flow.md). Use [Decisions and delivery](decisions.md) to distinguish agreed direction from open implementation choices.

For the reference interaction, GitHub documents an execution graph whose nodes expose job status and logs: [GitHub Actions visualization](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph).
