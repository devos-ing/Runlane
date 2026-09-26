# Add agents and actions

Contributors extend the platform with definitions, prompts, and scripts. New roles should use the existing execution paths.

## An agent is a reusable definition

```json
{
  "id": "dependency-reviewer",
  "instructionsFile": "../prompts/dependency-reviewer.md",
  "allowedActions": ["files.read", "files.search"],
  "inputContract": "review-context-v1",
  "outputContract": "review-result-v1"
}
```

A stage binding selects the model profile and reasoning setting. The same definition can therefore be used with several models. The runtime provides the structured submission tool required by the output contract.

Advisor, Implementer, and Reviewer are built-in definitions. Session behavior stays inside the Pi integration; the product exposes the related execution attempt.

## Three action kinds

| Kind | Responsibility |
| --- | --- |
| Tool | An allowed Pi capability such as reading or editing a file. |
| Script | A command executed through the shared process adapter. |
| Host | An application-owned operation such as approval or publication. |

Stage-only host actions cannot become agent tools simply because a definition references their IDs. Apply the same validation and permission checks to built-in and contributed definitions.

## A script action

```json
{
  "id": "dependency-policy",
  "kind": "script",
  "executable": "bun",
  "scriptFile": "../scripts/check-dependencies.ts",
  "args": [],
  "resultMode": "decision",
  "timeoutMs": 60000
}
```

The adapter passes bounded JSON on stdin. A decision script writes one validated `pass`, `fail`, or `unknown` result to stdout and diagnostics to stderr. A code finding is distinct from a launch failure, timeout, or malformed result.

## The contributor path

```text
definitions/
  agents/dependency-reviewer.json
  prompts/dependency-reviewer.md
  actions/dependency-policy.json
  scripts/check-dependencies.ts
  workflows/change-review.json
```

Add files to an explicitly registered definition root, then reference their IDs from a workflow. The application validates definitions before executing them. Freeze resolved contents and identities for a run; changes affect future runs.

These are proposed configuration fragments. They demonstrate the extension model, not an implemented loader or final schema.
