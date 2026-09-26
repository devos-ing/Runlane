import { join } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { validateValue } from "./definitions.ts";
import {
  type JsonObject,
  object,
  RunlaneError,
  type RunRecord,
  type Snapshot,
} from "./types.ts";

export { ModelRuntime };

/** Checks the exact configured provider and model without choosing a fallback. */
export async function availableModel(
  runtime: ModelRuntime,
  snapshot: Snapshot,
): Promise<void> {
  const { provider, id } = snapshot.model;
  if (
    !runtime.getModel(provider, id) ||
    !(await runtime.getAvailable(provider)).some((model) => model.id === id)
  ) {
    throw new RunlaneError(
      "MODEL_UNAVAILABLE",
      "The explicitly configured provider/model is unavailable; configure Pi authentication or change the workflow.",
    );
  }
}

/** Executes one tool-free Pi invocation using only the retained definition and input. */
export async function executeAgent(
  run: RunRecord,
  runtime: ModelRuntime,
  stateDir: string,
  signal: AbortSignal,
  started: (details: {
    sessionFile: string;
    provider: string;
    model: string;
    reasoning: string;
  }) => Promise<void>,
): Promise<{ result: JsonObject; usage: JsonObject }> {
  const snapshot = run.snapshot;
  const model = runtime.getModel(snapshot.model.provider, snapshot.model.id);
  if (!model)
    throw new RunlaneError(
      "MODEL_UNAVAILABLE",
      "The recorded model is unavailable.",
    );
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: false, maxRetries: 0 },
  });
  const resourceLoader = new DefaultResourceLoader({
    cwd: run.workspaceRoot,
    agentDir: getAgentDir(),
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: `${snapshot.prompt}\n\nReturn exactly one JSON object matching this schema. Do not use Markdown fences or commentary.\n${JSON.stringify(snapshot.resultSchema)}`,
  });
  await resourceLoader.reload();
  if (signal.aborted)
    throw new RunlaneError("ABORTED", "The invocation was interrupted.");
  const manager = SessionManager.create(
    run.workspaceRoot,
    join(stateDir, "pi-sessions", run.id),
  );
  const { session, modelFallbackMessage } = await createAgentSession({
    cwd: run.workspaceRoot,
    modelRuntime: runtime,
    model,
    thinkingLevel: snapshot.model.reasoning,
    settingsManager,
    sessionManager: manager,
    resourceLoader,
    tools: [],
    noTools: "all",
  });
  let outputBytes = 0;
  let overflow = false;
  let providerFailed = false;
  let usage: JsonObject = {};
  /** Preserves Pi's configured provider implementation while binding the host cancellation signal. */
  const stream = session.agent.streamFunction;
  session.agent.streamFunction = (selectedModel, context, options) => {
    signal.throwIfAborted();
    return stream(selectedModel, context, {
      ...options,
      signal: AbortSignal.any([
        signal,
        ...(options?.signal ? [options.signal] : []),
      ]),
    });
  };
  /** Stops Pi's current operation without exposing upstream exception details. */
  const abort = () => {
    void session.abort().catch(() => {});
  };
  /** Detaches the invocation's observable-event listener during cleanup. */
  const unsubscribe = session.subscribe((event) => {
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      outputBytes += Buffer.byteLength(event.assistantMessageEvent.delta);
      if (outputBytes > 64 * 1024) {
        overflow = true;
        abort();
      }
    }
    if (event.type === "message_end" && event.message.role === "assistant") {
      providerFailed = event.message.stopReason === "error";
      usage = {
        inputTokens: event.message.usage.input,
        outputTokens: event.message.usage.output,
        totalTokens: event.message.usage.totalTokens,
      };
    }
  });
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (
      modelFallbackMessage ||
      session.model?.provider !== snapshot.model.provider ||
      session.model?.id !== snapshot.model.id ||
      session.thinkingLevel !== snapshot.model.reasoning
    ) {
      throw new RunlaneError(
        "MODEL_MISMATCH",
        "Pi did not select the exact model and effort requested.",
      );
    }
    if (signal.aborted)
      throw new RunlaneError("ABORTED", "The invocation was interrupted.");
    await started({
      sessionFile: manager.getSessionFile() ?? "",
      provider: session.model.provider,
      model: session.model.id,
      reasoning: session.thinkingLevel,
    });
    if (signal.aborted)
      throw new RunlaneError("ABORTED", "The invocation was interrupted.");
    await session.prompt(
      `Process this workflow input:\n${JSON.stringify(run.input)}`,
    );
    if (signal.aborted)
      throw new RunlaneError("ABORTED", "The invocation was interrupted.");
    if (overflow)
      throw new RunlaneError(
        "RESULT_TOO_LARGE",
        "The model output exceeded 64 KiB.",
      );
    if (providerFailed)
      throw new RunlaneError(
        "PROVIDER_FAILED",
        "The configured provider did not complete the invocation.",
      );
    let result: unknown;
    try {
      result = JSON.parse(session.getLastAssistantText() ?? "");
    } catch {
      throw new RunlaneError(
        "INVALID_RESULT",
        "The model did not return one JSON result object.",
      );
    }
    validateValue(snapshot.resultSchema, result, "Agent result");
    const value = object(result, "Agent result") as JsonObject;
    if (
      typeof value.outcome !== "string" ||
      !Object.hasOwn(snapshot.routes, value.outcome)
    )
      throw new RunlaneError(
        "INVALID_RESULT",
        "The result has no declared destination.",
      );
    return { result: value, usage };
  } catch (error) {
    if (error instanceof RunlaneError) throw error;
    throw new RunlaneError(
      "PROVIDER_FAILED",
      "The configured provider did not complete the invocation.",
    );
  } finally {
    signal.removeEventListener("abort", abort);
    unsubscribe();
    await session.abort().catch(() => {});
    session.dispose();
  }
}
