import { input, result } from "../schemas.mjs";

export const planTask = {
  id: "plan-task",
  version: 1,
  input,
  entryStage: "plan",
  triggers: [{ kind: "manual", id: "manual", version: 1 }],
  modelProfiles: {
    planning: { provider: "openai-codex", model: "gpt-6-luna" },
  },
  stages: [
    {
      id: "plan",
      run: {
        kind: "agent",
        id: "task-planner",
        instructions: { file: new URL("../planner.md", import.meta.url) },
        input,
        modelProfile: "planning",
        reasoning: "low",
        actions: [],
        result,
        timeoutMs: 120000,
      },
      on: { ready: { complete: true }, needs_input: { stop: "needs_input" } },
    },
  ],
};
