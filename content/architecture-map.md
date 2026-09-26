# Architecture review

These three diagrams show the agreed Runlane design. They are static architecture references with interactive inspection, not live run views. The CLI proof currently executes one tool-free Pi Agent and stores its result and trace. Runtime classes, scripts, multi-step workflows, and the live graph remain planned.

Each diagram supports zoom, selection, light and dark themes, and export. Open the full diagram for readable labels and relationship inspection.

## The whole system

[Open the system architecture](/diagrams/system.html)

![System architecture with the CLI, loader, Runner, execution paths, and durable records](/diagrams/system-preview.png)

One local service owns all registered workspaces. The CLI submits task input. The loader resolves trusted definitions and the Runner controls execution. Agent work uses a selected Runtime; direct Actions use their own execution path. Both report output and observable events to the Runner, which validates results and saves checkpoints through Pi durable.

The React Flow client reads the same execution records as CLI logs. Its live connection is planned. A future Desktop shell reuses this client. A future TUI can use the same service operations. Background daemon launch changes service lifecycle, not the workflow engine.

The arrows show the principal dependency and execution paths. Return events and results are described in the diagram's notes; they do not create a second state owner.

## Runtime inheritance and selection

[Open the Runtime diagram](/diagrams/runtime.html)

![Agent Profile selection and the Runtime parent with Pi, Codex, and Claude subclasses](/diagrams/runtime-preview.png)

Agent contains the reusable work definition. Its Profile selects a Runtime ID and supported model settings. The service resolves that ID to a Runtime instance and calls the parent's `run` method. `PiRuntime`, `CodexRuntime`, and `ClaudeRuntime` extend that parent and implement native validation and execution. Dashed arrows labeled `extends` describe inheritance, not simultaneous execution of all three systems.

The Runtime handles the native agent loop, observable progress, and cleanup. The Runner owns workflow routes, attempts, shared limits, final result validation, and durable transitions. Agent and Profile remain plain data. Script Actions do not inherit Runtime.

The [Runtime contract](runtimes.md) defines cancellation, native references, and implementation boundaries. The first extraction reuses the working Pi path; Codex and Claude integrations remain later work.

## The review and repair loop

[Open the workflow diagram](/diagrams/review.html)

![Task planning, implementation, script checks, parallel reviewers, and the bounded return to implementation](/diagrams/review-preview.png)

A user submits the task. Plan prepares that task's implementation, then Implement produces a candidate. Script checks run before Reviewer A and Reviewer B assess the same immutable candidate. Each Agent can select a different Profile. The Runner waits for both review results, and every designated reviewer must approve.

A valid failed check or a review round requesting changes enters the same repair budget. If an allowance remains, the return arrow starts another Implement attempt in the same Run. That candidate receives fresh checks and fresh reviews. The initial implementation plus two repairs is the maximum. Exhaustion stops automatic work with `needs_input`.

Malformed results, provider errors, cancellation, and uncertain side effects do not become ordinary review rejection. They stop advancement for failure handling or reconciliation. A valid `needs_input` result from any step also stops automatic work; those exception arrows are summarized in the notes to keep the main loop readable.

## Decisions to confirm

| Question | Current design |
| --- | --- |
| Who decides what runs next? | The Workflow Runner interprets declared routes. Runtime owns only the agent's native work. |
| Where does reuse happen? | Import Agent, Action, Profile, and Workflow definitions. Extend Runtime only to add an execution system. |
| What can run in parallel? | Independent Runs across workspaces and designated reviewers inside a Run. Each attempt keeps separate state. |
| What limits the work? | Shared defaults of two active runs and two managed model calls. External Runtime support must prove it can enforce the request limit, including subagents. |
| Does review loop? | Yes. Checks and review share two repairs, and the counter is persisted before the next attempt. |
| What does cron do? | A later cron Trigger admits a new Run through the same service. It does not resume the previous Run's repair loop. |
| What survives restart? | Committed inputs, results, events, and routes. Native references identify evidence; unfinished work is not blindly replayed. |
| What works today? | Workspace registration, the foreground CLI service, one Pi Agent, cancellation, and Pi durable run history. |

The [delivery plan](decisions.md#delivery-sequence) separates that implemented proof from the Runtime extraction, multi-step workflow, live observation, and later integrations.
