import {
  ArrowClockwiseIcon,
  CheckIcon,
  CircleIcon,
  CodeIcon,
  CpuIcon,
  LightningIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useNodesState,
} from "@xyflow/react";
import { useEffect, useState } from "react";
import {
  executionDetails,
  type FlowNode,
  initialEdges,
  initialNodes,
  repairTrace,
  type Status,
  statesAt,
  successTrace,
} from "./demo";

/** Displays one simulated execution status without implying a live model connection. */
function StatusMark({ status }: { status: Status }) {
  if (status === "succeeded") return <CheckIcon size={12} weight="bold" />;
  if (status === "failed") return <XIcon size={12} weight="bold" />;
  return (
    <CircleIcon size={11} weight={status === "running" ? "fill" : "regular"} />
  );
}

/** Renders an Agent or direct Action as a selectable React Flow node. */
function ExecutionCard({ data, selected }: NodeProps<FlowNode>) {
  /** Selects the icon for an agent, action, or trigger execution. */
  const Icon =
    data.kind === "trigger"
      ? LightningIcon
      : data.kind === "action"
        ? CodeIcon
        : CpuIcon;
  return (
    <div
      className={`execution-node status-${data.status}${selected ? " is-selected" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="execution-node-top">
        <Icon size={17} />
        <span className="node-status">
          <StatusMark status={data.status} />
        </span>
      </div>
      <strong>{data.label}</strong>
      <span className="node-model">{data.model}</span>
      <Handle
        type="source"
        position={data.kind === "trigger" ? Position.Bottom : Position.Right}
      />
      {data.label === "Plan" && (
        <Handle type="target" position={Position.Top} id="trigger" />
      )}
      {data.label === "Implement" && (
        <Handle type="target" position={Position.Bottom} id="repair" />
      )}
    </div>
  );
}

/** Groups independent reviewer nodes under their shared Stage completion rule. */
function ReviewGroup({ data }: NodeProps<FlowNode>) {
  return (
    <div className={`review-group status-${data.status}`}>
      <div className="review-group-label">
        <span>Review stage</span>
        <span>ALL</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="repair" />
    </div>
  );
}

const nodeTypes = { execution: ExecutionCard, reviewGroup: ReviewGroup };
const defaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: "#a6b0ba",
  },
  style: { stroke: "#adb7c0", strokeWidth: 1.5 },
};

/** Returns a concise phase label for the simulated run snapshot. */
function phaseLabel(states: Record<string, Status>): string {
  if (states.result === "succeeded") return "Completed";
  if (states.review === "failed") return "Changes requested";
  if (states.review === "running") return "Reviewing";
  if (states.implement === "running") return "Implementing";
  if (states.plan === "running") return "Planning";
  return "In progress";
}

/** Demonstrates event projection, node selection, and layout using real React Flow. */
export default function FlowPlayground() {
  const [scenario, setScenario] = useState<"success" | "repair">("success");
  const [index, setIndex] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState("review.correctness");
  const [inspector, setInspector] = useState<"trace" | "input" | "output">(
    "trace",
  );
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<FlowNode> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    initialNodes(),
  );
  const events = scenario === "success" ? successTrace : repairTrace;
  const visibleEvents = events.slice(0, index + 1);
  const currentEvent = events[index];
  const states = statesAt(events, index);
  const details = executionDetails[selectedId];
  const selectedStatus = states[selectedId] ?? "queued";
  const activeCalls = nodes.filter(
    (node) => node.data.kind === "agent" && states[node.id] === "running",
  ).length;
  const selectedEvents = visibleEvents.filter(
    (event) =>
      event.stage === selectedId ||
      (selectedId === "review" && event.stage.startsWith("review.")),
  );
  const completed =
    selectedStatus === "succeeded" || selectedStatus === "failed";
  const output = !completed
    ? undefined
    : selectedId === "review"
      ? {
          outcome:
            selectedStatus === "succeeded" ? "approved" : "changes_requested",
          requiredReviewers: 2,
        }
      : [...selectedEvents].reverse().find((event) => event.output)?.output;
  const visibleNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedId,
    ariaLabel: `${node.data.label}: ${states[node.id] ?? "queued"}. ${node.data.model}`,
    data: { ...node.data, status: states[node.id] ?? "queued" },
  }));
  const edges = initialEdges.map((edge) => ({
    ...edge,
    style: {
      stroke: states[edge.source] === "succeeded" ? "#23865a" : "#b6bfc7",
      strokeWidth: 1.6,
    },
  }));
  if (scenario === "repair") {
    edges.push({
      id: "repair-loop",
      source: "review",
      sourceHandle: "repair",
      target: "implement",
      targetHandle: "repair",
      label: "repair · max 2",
      style: { stroke: index >= 10 ? "#ad6c14" : "#b6bfc7", strokeWidth: 1.6 },
    });
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= events.length - 1) setPlaying(false);
      else setIndex((previous) => previous + 1);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [playing, index, events.length]);

  useEffect(() => {
    if (!flowInstance) return;
    const media = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    /** Keeps the active review readable when the canvas crosses the mobile breakpoint. */
    function fitResponsiveView() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        void flowInstance?.fitView({
          padding: 0.12,
          nodes: media.matches ? [{ id: "review" }] : undefined,
        });
      });
    }
    media.addEventListener("change", fitResponsiveView);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", fitResponsiveView);
    };
  }, [flowInstance]);

  /** Returns the simulation and node positions to their initial state. */
  function reset() {
    setPlaying(false);
    setIndex(0);
    setNodes(initialNodes());
  }

  /** Starts the deterministic replay or pauses its next scheduled frame. */
  function toggleReplay() {
    if (playing) setPlaying(false);
    else {
      setIndex(0);
      setPlaying(true);
    }
  }

  return (
    <section className="playground" aria-label="Interactive React Flow example">
      <div className="playground-heading">
        <div className="sample-title">
          <span className="run-glyph">
            <PlayIcon size={13} weight="fill" />
          </span>
          <strong>change-review</strong>
          <span className="sample-id">#0241</span>
        </div>
        <span className="simulation-label">Simulated run</span>
      </div>
      <div className="run-summary">
        <span>
          <span
            className={`tiny-dot ${states.result === "succeeded" ? "green" : "amber"}`}
          />
          {phaseLabel(states)}
        </span>
        <span>
          <CpuIcon size={14} /> {activeCalls}/2 model slots
        </span>
        <span className="event-count">
          Event {index + 1} of {events.length}
        </span>
      </div>
      <div className="flow-canvas">
        <ReactFlow<FlowNode>
          nodes={visibleNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onInit={setFlowInstance}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          defaultEdgeOptions={defaultEdgeOptions}
          nodesConnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          minZoom={0.3}
          maxZoom={1.7}
          fitView
          fitViewOptions={{
            padding: 0.07,
            nodes: window.matchMedia("(max-width: 760px)").matches
              ? [{ id: "review" }]
              : undefined,
          }}
        >
          <Panel position="top-right" className="canvas-hint">
            Pan or zoom to explore
          </Panel>
          <Background
            color="#cdd6de"
            gap={20}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
      <div className="playback-bar">
        <div className="playback-buttons">
          <button
            type="button"
            className="button primary compact"
            onClick={toggleReplay}
          >
            {playing ? (
              <PauseIcon size={14} weight="fill" />
            ) : (
              <PlayIcon size={14} weight="fill" />
            )}
            {playing ? "Pause" : "Replay sample"}
          </button>
          <button
            type="button"
            className="button compact"
            disabled={index >= events.length - 1 || playing}
            onClick={() =>
              setIndex((previous) => Math.min(previous + 1, events.length - 1))
            }
          >
            <SkipForwardIcon size={15} />
            Step
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Reset sample and layout"
            title="Reset sample and layout"
            onClick={reset}
          >
            <ArrowClockwiseIcon size={17} />
          </button>
        </div>
        <label className="scenario-label">
          <span>Scenario</span>
          <select
            value={scenario}
            onChange={(event) => {
              setScenario(
                event.target.value === "repair" ? "repair" : "success",
              );
              setPlaying(false);
              setIndex(0);
            }}
          >
            <option value="success">Successful run</option>
            <option value="repair">One repair loop</option>
          </select>
        </label>
      </div>
      <div className="node-inspector">
        <div className="inspector-heading">
          <div>
            <span className="overline">Execution inspector</span>
            <h3>{details.title}</h3>
          </div>
          <label className="sr-only" htmlFor="execution-selector">
            Inspect execution
          </label>
          <select
            id="execution-selector"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              if (window.matchMedia("(max-width: 760px)").matches) {
                void flowInstance?.fitView({
                  nodes: [{ id: event.target.value }],
                  padding: 0.4,
                  maxZoom: 1.2,
                });
              }
            }}
          >
            {Object.entries(executionDetails).map(([id, detail]) => (
              <option key={id} value={id}>
                {detail.title}
              </option>
            ))}
          </select>
        </div>
        <p className="inspector-description">{details.purpose}</p>
        <div className="inspector-tabs">
          <div>
            {(["trace", "input", "output"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                aria-pressed={inspector === tab}
                className={inspector === tab ? "selected" : ""}
                onClick={() => setInspector(tab)}
              >
                {tab === "trace"
                  ? "Trace events"
                  : tab === "input"
                    ? "Input"
                    : "Output"}
              </button>
            ))}
          </div>
          <span className="inspector-model">{details.model}</span>
        </div>
        {inspector === "trace" ? (
          <ol className="trace-list" aria-label="Simulated trace events">
            {selectedEvents.length === 0 ? (
              <li className="trace-empty">
                Waiting for this execution. Step the sample forward to see its
                events.
              </li>
            ) : (
              selectedEvents.slice(-4).map((event) => (
                <li key={event.id}>
                  <time>00:{String(event.seconds).padStart(2, "0")}</time>
                  <span className="trace-event-line" />
                  <div>
                    <span className="trace-type">
                      {event.type}
                      {event.attempt ? (
                        <span className="attempt-label">
                          attempt {event.attempt}
                        </span>
                      ) : null}
                    </span>
                    <p>{event.message}</p>
                  </div>
                </li>
              ))
            )}
          </ol>
        ) : (
          <pre className="inspector-json">
            <code>
              {inspector === "input"
                ? JSON.stringify(details.input, null, 2)
                : output
                  ? JSON.stringify(output, null, 2)
                  : "No completed output for this execution yet."}
            </code>
          </pre>
        )}
      </div>
      <div className="demo-footnote">
        <span className="tiny-dot green" />
        Real React Flow canvas<span>·</span>Local simulated events<span>·</span>
        No model calls
        <span className="sample-time">
          Sample time 00:{String(currentEvent.seconds).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
