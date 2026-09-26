import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import lockfile from "proper-lockfile";
import { availableModel, executeAgent, ModelRuntime } from "./agent.ts";
import { loadDefinition, validateValue } from "./definitions.ts";
import { appendEvent, RunStore } from "./store.ts";
import {
  active,
  diagnostic,
  type JsonObject,
  object,
  RunlaneError,
  type RunRecord,
  text,
} from "./types.ts";

export type ServiceAddress = {
  url: string;
  token: string;
  pid: number;
  version: 1;
};

/** Removes an existing service descriptor without hiding other filesystem failures. */
async function removeDescriptor(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Parses a JSON request while treating malformed bodies as client input errors. */
async function requestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return object(await request.json(), "Request");
  } catch (error) {
    if (error instanceof RunlaneError) throw error;
    throw new RunlaneError(
      "INVALID_JSON",
      "The request body must contain valid JSON.",
    );
  }
}

/** Owns HTTP admission, the bounded execution queue, and the single durable writer. */
export class RunlaneService {
  private server?: ReturnType<typeof Bun.serve>;
  private stopping = false;
  private closing?: Promise<void>;
  private readonly jobs = new Map<
    string,
    { controller: AbortController; finished: Promise<void> }
  >();
  readonly token = randomBytes(32).toString("hex");

  /** Stores dependencies shared by every admitted invocation. */
  private constructor(
    readonly stateDir: string,
    private readonly store: RunStore,
    private readonly models: ModelRuntime,
    private readonly release: () => Promise<void>,
    private readonly maxCalls: number,
  ) {}

  /** Acquires one private state directory before opening storage or accepting requests. */
  static async start(stateDir: string, maxCalls = 2): Promise<RunlaneService> {
    if (
      !isAbsolute(stateDir) ||
      !Number.isSafeInteger(maxCalls) ||
      maxCalls < 1 ||
      maxCalls > 16
    )
      throw new RunlaneError(
        "INVALID_CONFIG",
        "Use an absolute state directory and a capacity between 1 and 16.",
      );
    await mkdir(stateDir, { recursive: true, mode: 0o700 });
    const info = await stat(stateDir);
    if (
      (info.mode & 0o077) !== 0 ||
      (process.getuid && info.uid !== process.getuid())
    )
      throw new RunlaneError(
        "STATE_PERMISSIONS",
        "The state directory must be owned by you with mode 0700.",
      );
    let compromised = false;
    let service: RunlaneService | undefined;
    /** Releases the process lock after durable storage has closed. */
    let release: () => Promise<void>;
    try {
      release = await lockfile.lock(stateDir, {
        stale: 5000,
        update: 1000,
        retries: 0,
        onCompromised: () => {
          compromised = true;
          if (service) void service.close();
        },
      });
    } catch {
      throw new RunlaneError(
        "SERVICE_ALREADY_RUNNING",
        "Another service owns this state directory, or a crashed owner's lock has not expired yet.",
        409,
      );
    }
    let store: RunStore | undefined;
    try {
      store = await RunStore.open(join(stateDir, "runs.sqlite"));
      await store.recover();
      const models = await ModelRuntime.create({
        modelsPath: null,
        allowModelNetwork: false,
      });
      if (compromised)
        throw new RunlaneError(
          "STATE_LOCK_LOST",
          "The service lost ownership of its state directory.",
          500,
        );
      service = new RunlaneService(stateDir, store, models, release, maxCalls);
      service.server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        maxRequestBodySize: 128 * 1024,
        fetch: (request) => service!.handle(request),
      });
      await writeFile(
        join(stateDir, "service.json"),
        `${JSON.stringify(service.address())}\n`,
        { mode: 0o600, flag: "w" },
      );
      return service;
    } catch (error) {
      if (service?.server) service.server.stop(true);
      if (store) await store.close();
      await release();
      throw error;
    }
  }

  /** Returns local connection data without copying provider credentials. */
  address(): ServiceAddress {
    return {
      version: 1,
      url: `http://127.0.0.1:${this.server!.port}`,
      token: this.token,
      pid: process.pid,
    };
  }

  /** Refuses new mutations once shutdown begins. */
  private accepting(): void {
    if (this.stopping)
      throw new RunlaneError(
        "SERVICE_STOPPING",
        "The service is stopping.",
        503,
      );
  }

  /** Validates local authentication before dispatching a bounded API request. */
  private async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (
        request.headers.has("origin") ||
        !["127.0.0.1", "localhost"].includes(url.hostname)
      )
        throw new RunlaneError(
          "LOCAL_ACCESS_ONLY",
          "Browser origins are not enabled in slice A.",
          403,
        );
      if (request.headers.get("authorization") !== `Bearer ${this.token}`)
        throw new RunlaneError(
          "UNAUTHORIZED",
          "A valid local service token is required.",
          401,
        );
      this.accepting();
      const parts = url.pathname.split("/").filter(Boolean);
      let result: unknown;
      if (request.method === "GET" && url.pathname === "/health") {
        result = {
          status: "ready",
          version: 1,
          maxModelCalls: this.maxCalls,
          activeCalls: this.jobs.size,
        };
      } else if (request.method === "GET" && url.pathname === "/workspaces") {
        result = this.store.workspaces();
      } else if (request.method === "POST" && url.pathname === "/workspaces") {
        const body = await requestBody(request);
        const requested = text(body.root, "Workspace root", 4096);
        if (!isAbsolute(requested))
          throw new RunlaneError(
            "INVALID_INPUT",
            "Workspace roots must be absolute.",
          );
        let root: string;
        try {
          root = await realpath(requested);
          if (!(await stat(root)).isDirectory()) throw new Error();
        } catch {
          throw new RunlaneError(
            "WORKSPACE_NOT_FOUND",
            "Workspace directory does not exist.",
            404,
          );
        }
        this.accepting();
        result = await this.store.addWorkspace(
          root,
          text(body.name ?? basename(root), "Workspace name"),
        );
      } else if (
        request.method === "POST" &&
        ["/validate", "/runs"].includes(url.pathname)
      ) {
        const body = await requestBody(request);
        const workspace = this.store.workspace(
          text(body.workspaceId, "Workspace ID"),
        );
        const snapshot = await loadDefinition(
          workspace,
          text(body.workflow, "Workflow", 1024),
        );
        await availableModel(this.models, snapshot);
        this.accepting();
        if (url.pathname === "/validate") {
          result = {
            valid: true,
            workflowId: snapshot.workflowId,
            model: snapshot.model,
            source: snapshot.source,
          };
        } else {
          const input = object(body.input, "Workflow input") as JsonObject;
          validateValue(snapshot.inputSchema, input, "Workflow input");
          const now = new Date().toISOString();
          const run: RunRecord = {
            id: `run_${randomUUID()}`,
            workspaceId: workspace.id,
            workspaceRoot: workspace.root,
            createdAt: now,
            updatedAt: now,
            status: "queued",
            input,
            snapshot,
            events: [],
          };
          appendEvent(run, "run.queued", {
            workspaceId: workspace.id,
            workflowId: snapshot.workflowId,
          });
          await this.store.createRun(run);
          result = {
            id: run.id,
            workspaceId: run.workspaceId,
            workflowId: snapshot.workflowId,
            status: run.status,
          };
          this.dispatch();
        }
      } else if (request.method === "GET" && url.pathname === "/runs") {
        const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
        if (workspaceId) this.store.workspace(workspaceId);
        result = this.store.runs(workspaceId).map((run) => ({
          id: run.id,
          workspaceId: run.workspaceId,
          workflowId: run.snapshot.workflowId,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
        }));
      } else if (parts[0] === "runs" && parts[1]) {
        const run = this.store.run(parts[1]);
        if (request.method === "GET" && parts.length === 2) result = run;
        else if (
          request.method === "GET" &&
          parts.length === 3 &&
          parts[2] === "events"
        ) {
          const after = Number(url.searchParams.get("after") ?? 0);
          if (!Number.isSafeInteger(after) || after < 0)
            throw new RunlaneError(
              "INVALID_CURSOR",
              "Event cursor must be a nonnegative integer.",
            );
          result = {
            status: run.status,
            events: run.events.filter((event) => event.seq > after),
          };
        } else if (
          request.method === "POST" &&
          parts.length === 3 &&
          parts[2] === "cancel"
        ) {
          this.jobs.get(run.id)?.controller.abort("cancelled");
          result = await this.store.updateRun(run.id, (current) => {
            if (current.status === "queued") {
              current.status = "cancelled";
              appendEvent(current, "run.cancelled");
            } else if (current.status === "running")
              appendEvent(current, "run.cancel_requested");
            else if (current.status === "needs_input") {
              current.status = "cancelled";
              appendEvent(current, "run.cancelled");
            }
          });
        } else throw new RunlaneError("NOT_FOUND", "Endpoint not found.", 404);
      } else throw new RunlaneError("NOT_FOUND", "Endpoint not found.", 404);
      return Response.json(result, {
        headers: { "cache-control": "no-store" },
      });
    } catch (error) {
      return Response.json(
        { error: diagnostic(error) },
        {
          status: error instanceof RunlaneError ? error.status : 500,
          headers: { "cache-control": "no-store" },
        },
      );
    }
  }

  /** Starts queued runs while reserving no more than the configured number of slots. */
  private dispatch(): void {
    if (this.stopping) return;
    for (const run of this.store.runs().reverse()) {
      if (this.jobs.size >= this.maxCalls) break;
      if (run.status !== "queued" || this.jobs.has(run.id)) continue;
      const controller = new AbortController();
      const finished = this.perform(run.id, controller)
        .catch(() => {
          process.stderr.write(
            "Runlane could not persist execution state; stopping the service.\n",
          );
          queueMicrotask(() => {
            void this.close();
          });
        })
        .finally(() => {
          this.jobs.delete(run.id);
          this.dispatch();
        });
      this.jobs.set(run.id, { controller, finished });
    }
  }

  /** Records one invocation's start, validated completion, or explicit interruption. */
  private async perform(
    id: string,
    controller: AbortController,
  ): Promise<void> {
    const run = await this.store.updateRun(id, (current) => {
      if (current.status !== "queued") return;
      current.status = "running";
      appendEvent(current, "run.started", {
        stageId: current.snapshot.stageId,
        attempt: 1,
      });
    });
    if (run.status !== "running") return;
    const timer = setTimeout(
      () => controller.abort("timeout"),
      run.snapshot.timeoutMs,
    );
    try {
      const output = await executeAgent(
        run,
        this.models,
        this.stateDir,
        controller.signal,
        async (details) => {
          await this.store.updateRun(id, (current) => {
            current.sessionFile = details.sessionFile;
            appendEvent(current, "agent.started", {
              provider: details.provider,
              model: details.model,
              reasoning: details.reasoning,
            });
          });
        },
      );
      await this.store.updateRun(id, (current) => {
        if (controller.signal.aborted) {
          this.markAbort(current, controller.signal.reason);
          return;
        }
        const outcome = String(output.result.outcome);
        const route = current.snapshot.routes[outcome];
        current.result = output.result;
        current.status = "complete" in route ? "succeeded" : "needs_input";
        appendEvent(current, "agent.completed", {
          result: output.result,
          usage: output.usage,
        });
        appendEvent(current, "route.selected", { outcome, destination: route });
        appendEvent(current, `run.${current.status}`);
      });
    } catch (error) {
      await this.store.updateRun(id, (current) => {
        if (controller.signal.aborted) {
          this.markAbort(current, controller.signal.reason);
          return;
        }
        current.status = "failed";
        current.error = diagnostic(error);
        appendEvent(current, "run.failed", current.error);
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Separates user cancellation, service interruption, and execution timeout. */
  private markAbort(run: RunRecord, reason: unknown): void {
    run.status =
      reason === "cancelled"
        ? "cancelled"
        : reason === "timeout"
          ? "failed"
          : "interrupted";
    if (reason === "timeout")
      run.error = {
        code: "TIMEOUT",
        message: "The configured invocation timeout expired.",
      };
    appendEvent(run, `run.${run.status}`, { reason: String(reason) });
  }

  /** Stops admission and aborts active invocations before releasing the one storage owner. */
  close(): Promise<void> {
    if (!this.closing) this.closing = this.shutdown();
    return this.closing;
  }

  /** Persists interruption before removing the descriptor and releasing the lock. */
  private async shutdown(): Promise<void> {
    this.stopping = true;
    this.server?.stop(true);
    for (const job of this.jobs.values())
      job.controller.abort("service_stopping");
    await Promise.allSettled(
      [...this.jobs.values()].map((job) => job.finished),
    );
    for (const run of this.store.runs().filter((run) => active(run.status))) {
      await this.store.updateRun(run.id, (current) =>
        this.markAbort(current, "service_stopping"),
      );
    }
    await this.store.close();
    await removeDescriptor(join(this.stateDir, "service.json"));
    await this.release();
  }
}
