# How React Flow works

React Flow renders the workflow and its execution state. The runner remains responsible for deciding what actually executes.

The example below uses the real `@xyflow/react` library. Drag nodes to explore layout, select an execution to inspect its trace, or step through the simulated events.

<!-- playground -->

## From definitions to nodes

A node has an ID, a position, a type, and data. Our custom node renders the stage or agent label, model alias, and execution status. Review bindings appear inside their parent review stage.

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
| Agent/model bindings | Selection and expanded details |
| Run status and attempt results | Colors, labels, and grouping |
| Trace event identity | Inspector tab and local filters |

Keep the workflow definition as the source of execution semantics. Store layout separately by stable ID. In a future editor, an added connection proposes a route; the server validates it before it becomes executable.

## Project run events onto the graph

```text
Runner → persisted event → HTTP event stream
       → browser run snapshot → node.data.status
```

An event such as `agent.started` updates the matching node. Selecting that node opens the related attempt and its trace. The browser reconnects from a durable cursor and current snapshot. Refreshing the page does not restart server-owned work.

This website simulates that event stream locally. Replay changes view data only; there is no agent runner behind the preview.

## What React Flow handles

React Flow supplies node rendering, handles, edges, selection, pan, zoom, and viewport controls. The application supplies scheduling, routing, loop limits, persistence, and permissions. Node and edge concepts are documented in the [React Flow overview](https://reactflow.dev/learn/concepts/terms-and-definitions).

## Start with explicit layout

Use deliberate positions for the first templates. Add an automatic layout library only when real workflow complexity requires it. Keep the graph usable through a stage selector and readable trace so interaction does not depend entirely on dragging.

The preview uses controlled node state and an inspection panel. Its connections are read-only, so a layout experiment cannot change execution semantics. [React Flow API reference](https://reactflow.dev/api-reference/react-flow)
