#!/usr/bin/env bun
import { readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { RunlaneService, type ServiceAddress } from "./service.ts";
import {
  active,
  diagnostic,
  object,
  RunlaneError,
  type RunRecord,
  type TraceEvent,
  type Workspace,
} from "./types.ts";

const help = `Runlane execution proof (Bun required)

bun run runlane serve [--state-dir PATH] [--max-calls 2]
bun run runlane workspace add PATH [--name NAME]
bun run runlane workspace list
bun run runlane validate WORKFLOW [--workspace ID]
bun run runlane run WORKFLOW --input FILE [--workspace ID] [--wait]
bun run runlane runs [RUN_ID] [--workspace ID]
bun run runlane logs RUN_ID [--follow]
bun run runlane cancel RUN_ID

All commands accept --state-dir PATH and --json.
RUNLANE_HOME defaults to ~/.runlane. WORKFLOW is an ID in workflows/ or a .mjs path.
Use one Agent stage without tools. CLI disconnect never cancels a run.
`;

/** Reads only a private loopback descriptor, never forwarding its token to a remote URL. */
async function address(stateDir: string): Promise<ServiceAddress> {
  try {
    const path = join(stateDir, "service.json");
    const info = await stat(path);
    if (
      (info.mode & 0o077) !== 0 ||
      (process.getuid && info.uid !== process.getuid())
    )
      throw new Error();
    const value = object(
      JSON.parse(await readFile(path, "utf8")),
      "Service descriptor",
    );
    if (
      value.version !== 1 ||
      typeof value.url !== "string" ||
      !/^http:\/\/127\.0\.0\.1:\d+$/.test(value.url) ||
      typeof value.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.token)
    )
      throw new Error();
    return value as ServiceAddress;
  } catch {
    throw new RunlaneError(
      "SERVICE_UNAVAILABLE",
      "No valid service descriptor. Start 'bun run runlane serve' with the same state directory.",
    );
  }
}

/** Sends an authenticated request and surfaces only the service's public diagnostics. */
async function request<T>(
  server: ServiceAddress,
  path: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${server.url}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${server.token}`,
        "content-type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    });
  } catch {
    if (signal.aborted)
      throw new RunlaneError(
        "CLIENT_INTERRUPTED",
        "The client disconnected; admitted work was not cancelled.",
      );
    throw new RunlaneError(
      "SERVICE_UNAVAILABLE",
      "The local service did not respond. Check that it is running.",
    );
  }
  const value = await response.json();
  if (!response.ok) {
    const failure = object(object(value, "Response").error, "Error");
    throw new RunlaneError(
      String(failure.code),
      String(failure.message),
      response.status,
    );
  }
  return value as T;
}

/** Resolves explicit workspace identity or an unambiguous current-directory registration. */
async function workspaceId(
  server: ServiceAddress,
  explicit: string | undefined,
  signal: AbortSignal,
): Promise<string> {
  const workspaces = await request<Workspace[]>(server, "/workspaces", signal);
  if (explicit) {
    if (!workspaces.some((workspace) => workspace.id === explicit))
      throw new RunlaneError("WORKSPACE_NOT_FOUND", "Workspace not found.");
    return explicit;
  }
  const cwd = await realpath(process.cwd());
  const matching = workspaces.filter(
    (workspace) =>
      cwd === workspace.root || cwd.startsWith(workspace.root + sep),
  );
  if (matching.length !== 1)
    throw new RunlaneError(
      "WORKSPACE_REQUIRED",
      "Use --workspace because the current directory has no unique workspace registration.",
    );
  return matching[0].id;
}

/** Formats JSON without allowing model content to inject terminal control sequences. */
function output(value: unknown, compact: boolean): void {
  process.stdout.write(
    `${JSON.stringify(value, null, compact ? undefined : 2)}\n`,
  );
}

/** Maps a completed wait to a meaningful process exit status. */
function completionCode(run: RunRecord): number {
  return run.status === "succeeded" ? 0 : run.status === "needs_input" ? 2 : 1;
}

/** Runs the requested CLI operation against the sole local execution owner. */
async function main(): Promise<void> {
  if (process.env.npm_lifecycle_event === "runlane" && process.env.INIT_CWD) {
    process.chdir(process.env.INIT_CWD);
  }
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      "state-dir": { type: "string" },
      workspace: { type: "string" },
      name: { type: "string" },
      input: { type: "string" },
      "max-calls": { type: "string" },
      json: { type: "boolean" },
      wait: { type: "boolean" },
      follow: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || !positionals.length) {
    process.stdout.write(help);
    return;
  }
  const stateDir = resolve(
    values["state-dir"] ??
      process.env.RUNLANE_HOME ??
      join(homedir(), ".runlane"),
  );
  const command =
    positionals[0] === "workspace"
      ? positionals.slice(0, 2).join(" ")
      : positionals[0];
  const allowed: Record<string, string[]> = {
    serve: ["max-calls"],
    "workspace add": ["name"],
    "workspace list": [],
    validate: ["workspace"],
    run: ["workspace", "input", "wait"],
    runs: ["workspace"],
    logs: ["follow"],
    cancel: [],
  };
  const counts: Record<string, number[]> = {
    serve: [1],
    "workspace add": [3],
    "workspace list": [2],
    validate: [2],
    run: [2],
    runs: [1, 2],
    logs: [2],
    cancel: [2],
  };
  if (
    !allowed[command] ||
    !counts[command].includes(positionals.length) ||
    Object.keys(values).some(
      (key) => !["state-dir", "json", ...allowed[command]].includes(key),
    )
  ) {
    throw new RunlaneError(
      "USAGE",
      "Unsupported command or options. Use --help.",
    );
  }
  if (command === "serve") {
    const service = await RunlaneService.start(
      stateDir,
      Number(values["max-calls"] ?? 2),
    );
    output(
      {
        event: "service.ready",
        url: service.address().url,
        pid: process.pid,
        stateDir,
      },
      Boolean(values.json),
    );
    await new Promise<void>((finished, failed) => {
      /** Stops foreground execution and preserves interruption records on process signals. */
      const stop = () => {
        void service.close().then(finished, failed);
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
    return;
  }
  const connection = await address(stateDir);
  const controller = new AbortController();
  /** Disconnects this client without submitting a run cancellation. */
  const disconnect = () => controller.abort();
  process.once("SIGINT", disconnect);
  try {
    const signal = controller.signal;
    if (command === "workspace add") {
      const root = resolve(positionals[2]);
      output(
        await request(connection, "/workspaces", signal, {
          root,
          name: values.name ?? basename(root),
        }),
        Boolean(values.json),
      );
    } else if (command === "workspace list") {
      output(
        await request(connection, "/workspaces", signal),
        Boolean(values.json),
      );
    } else if (command === "validate" || command === "run") {
      const selected = await workspaceId(connection, values.workspace, signal);
      if (command === "validate")
        output(
          await request(connection, "/validate", signal, {
            workspaceId: selected,
            workflow: positionals[1],
          }),
          Boolean(values.json),
        );
      else {
        if (!values.input)
          throw new RunlaneError(
            "INPUT_REQUIRED",
            "Provide --input with a JSON task file.",
          );
        let input: unknown;
        try {
          const contents = await readFile(resolve(values.input), "utf8");
          if (Buffer.byteLength(contents) > 32 * 1024) throw new Error();
          input = JSON.parse(contents);
        } catch {
          throw new RunlaneError(
            "INVALID_INPUT",
            "The input file must contain valid JSON of at most 32 KiB.",
          );
        }
        const submitted = await request<{ id: string }>(
          connection,
          "/runs",
          signal,
          { workspaceId: selected, workflow: positionals[1], input },
        );
        if (!values.wait) output(submitted, Boolean(values.json));
        else {
          if (!values.json)
            process.stderr.write(
              `Submitted ${submitted.id}; waiting for its result.\n`,
            );
          let run: RunRecord;
          do {
            run = await request<RunRecord>(
              connection,
              `/runs/${submitted.id}`,
              signal,
            );
            if (active(run.status)) await delay(300, undefined, { signal });
          } while (active(run.status));
          output(run, Boolean(values.json));
          process.exitCode = completionCode(run);
        }
      }
    } else if (command === "runs") {
      const path = positionals[1]
        ? `/runs/${encodeURIComponent(positionals[1])}`
        : `/runs${values.workspace ? `?workspaceId=${encodeURIComponent(values.workspace)}` : ""}`;
      output(await request(connection, path, signal), Boolean(values.json));
    } else if (command === "logs") {
      let after = 0;
      for (;;) {
        const page = await request<{
          status: RunRecord["status"];
          events: TraceEvent[];
        }>(
          connection,
          `/runs/${encodeURIComponent(positionals[1])}/events?after=${after}`,
          signal,
        );
        for (const event of page.events) {
          if (values.json) output(event, true);
          else
            process.stdout.write(
              `${event.seq} ${event.at} ${event.type} ${JSON.stringify(event.data)}\n`,
            );
          after = event.seq;
        }
        if (!values.follow || !active(page.status)) break;
        await delay(300, undefined, { signal });
      }
    } else if (command === "cancel") {
      output(
        await request(
          connection,
          `/runs/${encodeURIComponent(positionals[1])}/cancel`,
          signal,
          {},
        ),
        Boolean(values.json),
      );
    }
  } catch (error) {
    if (controller.signal.aborted) {
      process.exitCode = 130;
      return;
    }
    throw error;
  } finally {
    process.removeListener("SIGINT", disconnect);
  }
}

if (import.meta.main) {
  void main().catch((error) => {
    process.stderr.write(`${JSON.stringify(diagnostic(error))}\n`);
    process.exitCode = 1;
  });
}
