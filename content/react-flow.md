# How React Flow works

React Flow renders the workflow and its execution state. The runner remains responsible for deciding what actually executes.

The delivery starts with a CLI and durable trace. The planned Desktop client reuses this React UI and connects to the same service. Its window can close while admitted work continues. A standalone browser client can use the same presentation later without becoming another runner.

The example below uses the real `@xyflow/react` library. Drag nodes to explore layout, select an execution to inspect its trace, or step through the simulated events.

<!-- playground -->

## From definitions to nodes

A node has an ID, a position, a type, and data. Our custom node renders the stage or agent label, model alias, and execution status. Assigned reviewers appear inside their parent review stage.

```tsx
const node = {
  id: "review.correctness",
  type: "execution",
  parentId: "review",
  position: { x: 20, y: 55 },
  data: { label: "Correctness", status: "running" }
};
```

`nodeTypes` connects that type to a React component. Handles define connection points, while edges reference source and target IDs. See [React Flow custom nodes](https://reactflow.dev/learn/customization/custom-nodes).

## Two kinds of data

| Execution data | Presentation data |
| --- | --- |
| Stage IDs and validated routes | Node positions and viewport |
| Assigned agents and resolved models | Selection and expanded details |
| Run status and attempt results | Colors, labels, and grouping |
| Trace event identity | Inspector tab and local filters |

The `.mjs` workflow is the authoring source. The loader produces a validated graph description from its exported definition. React Flow reads that description. It does not parse arbitrary JavaScript to discover control flow.

Store layout separately by workspace, workflow version, and stable node ID. Moving nodes affects presentation only. The first version does not add execution edges or rewrite source files from the canvas. Arbitrary JavaScript cannot reliably round-trip through a visual editor.

For an active run, display its frozen graph and source version. A changed workflow file updates the definition preview and future runs without changing an existing run's graph.

## Show replaceable decision sources

A decision stage uses the same graph structure whether it runs a script, Advisor, or Jev Action. Its `on` map declares candidate edges before execution. The model cannot add a node or return an undeclared destination.

The inspector shows the decision source, input references, proposed choice, any reported confidence, applied policy, and accepted outcome. Highlight the committed route. A low-confidence proposal can select `needs_input`; a provider failure leaves the attempt failed or blocked without inventing a selected edge.

Replay reads recorded decisions. It does not call a model again or run the current policy against an old result. These are planned live-client behaviors; the current preview still uses its existing sample traces.

## Project run events onto the graph

```text
Runner → persisted event → client event stream
       → workspace and run snapshot → node.data.status
```

An event such as `agent.started` updates the matching node in the selected workspace and run. Selecting that node opens its attempt and trace. The client reconnects from a durable cursor and current snapshot. Refreshing the page or switching workspaces does not restart service-owned work.

This website simulates that event stream locally. Replay changes view data only; there is no agent runner behind the preview.

## What React Flow handles

React Flow supplies node rendering, handles, edges, selection, pan, zoom, and viewport controls. The application supplies scheduling, routing, loop limits, persistence, and permissions. Node and edge concepts are documented in the [React Flow overview](https://reactflow.dev/learn/concepts/terms-and-definitions).

## Start with explicit layout

Use deliberate positions for the first templates. Add an automatic layout library only when real workflow complexity requires it. Keep the graph usable through a stage selector and readable trace so interaction does not depend entirely on dragging.

The preview uses controlled node state and an inspection panel. Its connections are read-only, so a layout experiment cannot change execution semantics. [React Flow API reference](https://reactflow.dev/api-reference/react-flow)
