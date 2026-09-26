export const input = {
  type: "object",
  required: ["task"],
  additionalProperties: false,
  properties: {
    task: { type: "string", minLength: 1, maxLength: 4000 },
    acceptanceCriteria: {
      type: "array",
      maxItems: 10,
      items: { type: "string", maxLength: 500 },
    },
  },
};

export const result = {
  type: "object",
  required: ["outcome", "data"],
  additionalProperties: false,
  properties: {
    outcome: { type: "string", enum: ["ready", "needs_input"] },
    data: {
      type: "object",
      required: ["summary", "steps"],
      additionalProperties: false,
      properties: {
        summary: { type: "string", maxLength: 1000 },
        steps: {
          type: "array",
          maxItems: 6,
          items: { type: "string", maxLength: 500 },
        },
      },
    },
  },
};
