# CLI submission proof

## Approved scope

Implement slice A from the agreed delivery plan. A developer registers a workspace, submits task input to one manual workflow, receives a durable run ID, and reads status and trace through the CLI. One foreground service owns execution and storage. The user authorized implementation and a documentation update after reviewing the proposed CLI commands.

The initial supported workflow has one Agent stage, an imported JSON input and result schema, explicit provider, model, and effort, and declared completion or `needs_input` outcomes. Pi executes the Agent. Pi durable stores application records. Reject unsupported workflow shapes rather than partially executing them.

## Acceptance

- `serve`, workspace registration and listing, `validate`, `run --input`, `runs`, `logs --follow`, and explicit cancellation use one local service.
- Valid submission persists an immutable input and supported definition snapshot before returning its run ID. Invalid input or unavailable models cannot appear as successful execution.
- A bounded real Pi invocation records the actual model and effort, validated result, and attributable events. No silent model fallback.
- CLI disconnect does not cancel the service-owned run. Cancellation aborts the invocation and records its outcome.
- Restart preserves records and marks unfinished attempts interrupted rather than automatically replaying model calls. Recorded results never change merely because the service restarted.
- One process owns the state directory. Local access is authenticated, client-supplied paths and IDs are validated, and logs do not expose credentials.
- Schema validation and Pi durable mapping use real dependencies. No fake model output is presented as live execution.

## Boundaries

Use plain configuration objects and the smallest supported source set. Retain the serialized validated definition, loaded prompt, schema objects, and actual model settings. There is no executable ScriptAction in this slice, so script/dependency reconstruction is not required. Unsupported schemas, tools, schedules, multi-stage graphs, parallel stages, and loops are rejected with a clear message.

Shared default capacity remains two active model invocations. Desktop packaging, daemon background launch, plugins, external issue trackers, a backlog database, Jev, cron, and live graph integration are later slices. This implementation provides manual submission directly; a plugin is not required.

## Verification

Use lint, TypeScript, the documentation build, and focused integration evidence at the service and persistence boundaries, including invalid input, cancellation or interruption, reopen, and one real provider invocation. Do not write or run unit or end-to-end tests. Record the exact verified boundary and any credential or provider limitation.

Completion is a runnable slice-A implementation and accurate English documentation. It is not completion of the full A–C product milestone.
