import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv from "ajv";
import {
  type Effort,
  type JsonObject,
  object,
  type Route,
  RunlaneError,
  type Snapshot,
  text,
  type Workspace,
} from "./types.ts";

const efforts = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

/** Compiles one definition without a process-global schema-ID registry or cache. */
function validator(value: Record<string, unknown>) {
  return new Ajv({
    strict: true,
    allErrors: false,
    ownProperties: true,
  }).compile(value);
}

/** Rejects fields the execution proof cannot honor instead of ignoring them. */
function fields(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new RunlaneError(
      "UNSUPPORTED_DEFINITION",
      `${label} contains unsupported fields for slice A.`,
    );
  }
}

/** Resolves an existing file inside the selected canonical workspace root. */
async function localFile(root: string, value: string): Promise<string> {
  const requested = value.startsWith("file:")
    ? fileURLToPath(value)
    : resolve(root, value);
  let path: string;
  try {
    path = await realpath(requested);
  } catch {
    throw new RunlaneError(
      "SOURCE_NOT_FOUND",
      "Definition or prompt file was not found.",
      404,
    );
  }
  const part = relative(root, path);
  if (part === ".." || part.startsWith(`..${sep}`) || isAbsolute(part)) {
    throw new RunlaneError(
      "SOURCE_OUTSIDE_WORKSPACE",
      "Source files must belong to the selected workspace.",
    );
  }
  return path;
}

/** Reads a subprocess's bounded JSON output without buffering unlimited module logs. */
async function boundedOutput(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > limit)
        throw new RunlaneError(
          "DEFINITION_TOO_LARGE",
          "Definition output exceeds 256 KiB.",
        );
      output += decoder.decode(chunk.value, { stream: true });
    }
    return output + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

/** Imports trusted author code in a fresh process so module caches cannot leak stale definitions. */
async function importDefinition(path: string, root: string): Promise<unknown> {
  const child = Bun.spawn([process.execPath, import.meta.path, path], {
    cwd: root,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "ignore",
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
  try {
    const output = await boundedOutput(child.stdout, 256 * 1024);
    if ((await child.exited) !== 0)
      throw new RunlaneError(
        "DEFINITION_LOAD_FAILED",
        "The trusted module failed to load or exceeded its load timeout.",
      );
    try {
      return JSON.parse(output);
    } catch {
      throw new RunlaneError(
        "DEFINITION_LOAD_FAILED",
        "Export one plain workflow object and keep module stdout empty.",
      );
    }
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await child.exited;
    }
  }
}

/** Compiles supported JSON schemas and rejects asynchronous or unresolved validation. */
export function schema(value: unknown, label: string): JsonObject {
  const candidate = object(value, label);
  if (candidate.$async || candidate.type !== "object")
    throw new RunlaneError(
      "INVALID_SCHEMA",
      `${label} must be a synchronous object schema.`,
    );
  try {
    validator(candidate);
  } catch {
    throw new RunlaneError(
      "INVALID_SCHEMA",
      `${label} is not a supported JSON Schema.`,
    );
  }
  return candidate as JsonObject;
}

/** Validates a supplied value without coercion, mutation, or disclosure of input values. */
export function validateValue(
  definition: JsonObject,
  value: unknown,
  label: string,
): void {
  if (!validator(definition)(value))
    throw new RunlaneError(
      "SCHEMA_MISMATCH",
      `${label} does not match its declared schema.`,
    );
}

/** Resolves the single-stage supported definition into an immutable execution snapshot. */
export async function loadDefinition(
  workspace: Workspace,
  selection: string,
): Promise<Snapshot> {
  if (selection.length > 1024)
    throw new RunlaneError("INVALID_INPUT", "Workflow selection is too long.");
  const requested = selection.endsWith(".mjs")
    ? selection
    : `workflows/${text(selection, "Workflow ID")}.mjs`;
  const path = await localFile(workspace.root, requested);
  if (!path.endsWith(".mjs"))
    throw new RunlaneError(
      "UNSUPPORTED_DEFINITION",
      "Slice A supports .mjs workflow modules.",
    );
  const workflow = object(
    await importDefinition(path, workspace.root),
    "Workflow",
  );
  fields(
    workflow,
    [
      "id",
      "version",
      "input",
      "entryStage",
      "triggers",
      "stages",
      "modelProfiles",
    ],
    "Workflow",
  );
  const workflowId = text(workflow.id, "Workflow ID");
  if (!Number.isSafeInteger(workflow.version) || Number(workflow.version) < 1)
    throw new RunlaneError(
      "INVALID_INPUT",
      "Workflow version must be a positive integer.",
    );
  if (!Array.isArray(workflow.stages) || workflow.stages.length !== 1)
    throw new RunlaneError(
      "UNSUPPORTED_DEFINITION",
      "Slice A supports exactly one Agent stage.",
    );
  if (workflow.triggers !== undefined) {
    if (!Array.isArray(workflow.triggers))
      throw new RunlaneError("INVALID_INPUT", "Triggers must be an array.");
    for (const value of workflow.triggers) {
      const trigger = object(value, "Trigger");
      fields(trigger, ["kind", "id", "version"], "Trigger");
      if (trigger.kind !== "manual")
        throw new RunlaneError(
          "UNSUPPORTED_DEFINITION",
          "Only manual triggers are supported.",
        );
      text(trigger.id, "Trigger ID");
      if (
        !Number.isSafeInteger(trigger.version) ||
        Number(trigger.version) < 1
      ) {
        throw new RunlaneError(
          "INVALID_INPUT",
          "Trigger version must be a positive integer.",
        );
      }
    }
  }
  const stage = object(workflow.stages[0], "Stage");
  fields(stage, ["id", "run", "on"], "Stage");
  const stageId = text(stage.id, "Stage ID");
  if (workflow.entryStage !== stageId)
    throw new RunlaneError(
      "INVALID_INPUT",
      "The entry stage must identify the only stage.",
    );
  const agent = object(stage.run, "Agent");
  fields(
    agent,
    [
      "kind",
      "id",
      "instructions",
      "input",
      "modelProfile",
      "reasoning",
      "actions",
      "result",
      "timeoutMs",
    ],
    "Agent",
  );
  if (
    agent.kind !== "agent" ||
    (agent.actions !== undefined &&
      (!Array.isArray(agent.actions) || agent.actions.length))
  ) {
    throw new RunlaneError(
      "UNSUPPORTED_DEFINITION",
      "Slice A supports Agent invocations with no tools.",
    );
  }
  const inputSchema = schema(workflow.input, "Workflow input");
  if (
    agent.input !== undefined &&
    JSON.stringify(schema(agent.input, "Agent input")) !==
      JSON.stringify(inputSchema)
  ) {
    throw new RunlaneError(
      "UNSUPPORTED_DEFINITION",
      "The single Agent must use the workflow input schema.",
    );
  }
  const resultSchema = schema(agent.result, "Agent result");
  const properties = object(resultSchema.properties, "Result properties");
  const outcomes = object(properties.outcome, "Outcome schema").enum;
  if (
    !Array.isArray(outcomes) ||
    !outcomes.length ||
    !outcomes.every((outcome) => typeof outcome === "string") ||
    new Set(outcomes).size !== outcomes.length
  ) {
    throw new RunlaneError(
      "INVALID_SCHEMA",
      "The result schema must define a unique string outcome enum.",
    );
  }
  if (
    !Array.isArray(resultSchema.required) ||
    !resultSchema.required.includes("outcome")
  )
    throw new RunlaneError(
      "INVALID_SCHEMA",
      "The result schema must require outcome.",
    );
  const routes = object(stage.on, "Routes");
  if (
    Object.keys(routes).length !== outcomes.length ||
    outcomes.some((outcome) => !Object.hasOwn(routes, outcome))
  )
    throw new RunlaneError(
      "INVALID_ROUTE",
      "Routes must cover exactly the result schema's outcomes.",
    );
  for (const value of Object.values(routes)) {
    const route = object(value, "Route");
    if (
      Object.keys(route).length !== 1 ||
      (route.complete !== true && route.stop !== "needs_input")
    )
      throw new RunlaneError(
        "UNSUPPORTED_DEFINITION",
        "Slice A routes must complete or stop for needs_input.",
      );
  }
  const profileName = text(agent.modelProfile, "Model profile");
  const profile = object(
    object(workflow.modelProfiles, "Model profiles")[profileName],
    "Selected model profile",
  );
  fields(profile, ["provider", "model"], "Model profile");
  if (typeof agent.reasoning !== "string" || !efforts.has(agent.reasoning))
    throw new RunlaneError(
      "INVALID_INPUT",
      "An explicit supported reasoning effort is required.",
    );
  const instructions = object(agent.instructions, "Instructions");
  fields(instructions, ["text", "file"], "Instructions");
  if (Object.keys(instructions).length !== 1)
    throw new RunlaneError(
      "INVALID_INPUT",
      "Provide instructions.text or instructions.file.",
    );
  const prompt =
    instructions.text !== undefined
      ? instructions.text
      : await readFile(
          await localFile(
            workspace.root,
            text(instructions.file, "Prompt file", 4096),
          ),
          "utf8",
        );
  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    Buffer.byteLength(prompt) > 32 * 1024
  )
    throw new RunlaneError(
      "INVALID_INPUT",
      "Agent instructions must be nonempty and at most 32 KiB.",
    );
  const timeoutMs = agent.timeoutMs ?? 120_000;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    Number(timeoutMs) < 100 ||
    Number(timeoutMs) > 300_000
  )
    throw new RunlaneError(
      "INVALID_INPUT",
      "Agent timeout must be between 100 and 300000 ms.",
    );
  return {
    workflowId,
    version: Number(workflow.version),
    stageId,
    agentId: text(agent.id, "Agent ID"),
    inputSchema,
    resultSchema,
    prompt,
    model: {
      provider: text(profile.provider, "Provider"),
      id: text(profile.model, "Model"),
      reasoning: agent.reasoning as Effort,
    },
    routes: routes as Record<string, Route>,
    timeoutMs: Number(timeoutMs),
    source: {
      path,
      sha256: createHash("sha256")
        .update(JSON.stringify(workflow))
        .update(prompt)
        .digest("hex"),
    },
  };
}

if (import.meta.main) {
  try {
    const loaded = await import(pathToFileURL(process.argv[2]).href);
    const candidates = loaded.default
      ? [loaded.default]
      : Object.values(loaded).filter(
          (value) => value && typeof value === "object" && "stages" in value,
        );
    if (candidates.length !== 1) process.exit(1);
    const output = JSON.stringify(candidates[0], (_key, value) => {
      if (
        typeof value === "function" ||
        typeof value === "symbol" ||
        typeof value === "bigint" ||
        value === undefined
      )
        throw new Error("Non-data definition");
      return value;
    });
    process.stdout.write(output);
  } catch {
    process.exitCode = 1;
  }
}
