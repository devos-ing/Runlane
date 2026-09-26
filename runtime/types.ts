export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Effort = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type Workspace = { id: string; name: string; root: string };
export type Route = { complete: true } | { stop: "needs_input" };
export type Snapshot = {
  workflowId: string;
  version: number;
  stageId: string;
  agentId: string;
  inputSchema: JsonObject;
  resultSchema: JsonObject;
  prompt: string;
  model: { provider: string; id: string; reasoning: Effort };
  routes: Record<string, Route>;
  timeoutMs: number;
  source: { path: string; sha256: string };
};
export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "needs_input"
  | "failed"
  | "cancelled"
  | "interrupted";
export type TraceEvent = {
  seq: number;
  at: string;
  type: string;
  data: JsonObject;
};
export type RunRecord = {
  id: string;
  workspaceId: string;
  workspaceRoot: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;
  input: JsonObject;
  snapshot: Snapshot;
  events: TraceEvent[];
  result?: JsonObject;
  error?: { code: string; message: string };
  sessionFile?: string;
};

/** Carries a bounded application diagnostic that is safe to return to a client. */
export class RunlaneError extends Error {
  /** Creates a diagnostic without copying upstream errors or credentials. */
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Rejects values that cannot be used as a JSON object. */
export function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RunlaneError("INVALID_INPUT", `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

/** Requires a nonempty bounded string without control characters. */
export function text(value: unknown, label: string, max = 200): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\x00-\x1f]/.test(value)
  ) {
    throw new RunlaneError(
      "INVALID_INPUT",
      `${label} must be a nonempty string of at most ${max} characters.`,
    );
  }
  return value;
}

/** Returns only intentional application diagnostics, hiding unexpected exception details. */
export function diagnostic(error: unknown): { code: string; message: string } {
  return error instanceof RunlaneError
    ? { code: error.code, message: error.message }
    : {
        code: "INTERNAL_ERROR",
        message:
          "The operation failed; no execution was reported as successful.",
      };
}

/** Identifies states that can still produce new events without another submission. */
export function active(status: RunStatus): boolean {
  return status === "queued" || status === "running";
}
