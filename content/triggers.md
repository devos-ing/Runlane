# Start runs with triggers

A `Trigger` requests a run of its containing workflow version. Workflow definitions declare triggers separately from their stages. Manual and cron requests use the same validation, frozen snapshot, and admission path.

These plain objects are proposed definitions, not working scheduler code. Manual starts belong to the first usable milestone. Cron follows the real workflow and live graph. Importing a definition does not enable its schedule.

## Define manual and cron triggers

```js
// A reusable trigger list imported by a workflow module.
export const triggers = [
	{
		kind: "manual",
		id: "manual-change-review",
		version: 1,
	},
	{
		kind: "cron",
		id: "weekday-dependency-audit",
		version: 1,
		expression: "0 9 * * 1-5",
		timezone: "Asia/Hong_Kong",
		inputs: { repository: "example/service", task: "Review dependency changes" },
		overlapPolicy: "skip-unfinished",
		offlinePolicy: "skip",
		enabled: false,
	},
];
```

Reference this list in the workflow object's `triggers` field. The first milestone's [workflow example](workflows.md) includes only a manual trigger.

The cron expression uses the five-field convention. It describes 09:00 on weekdays in Hong Kong. The disabled definition does not admit scheduled runs. Enabling it must be a separate, explicit application action that validates the workflow, model profiles, inputs, and time zone first.

Use stable trigger IDs and increment the trigger version when its schedule or inputs change. Preview upcoming occurrence times before enabling a cron trigger. Use a cron parser with explicit time-zone support and document its daylight-saving behavior.

Trigger IDs are unique within a workflow registration. Qualify them with workspace ID and workflow ID. Two workspaces may use the same reusable workflow and trigger names without sharing schedule state.

Check overlap across versions of the same workspace, workflow, and trigger IDs. Updating a schedule must not bypass an unfinished run. Apply any shared concurrency key too, such as a coding template's workspace and Ticket identity.

## Admit each occurrence once

Identify a cron occurrence by workspace ID, workflow ID, trigger ID, trigger version, and scheduled UTC instant. Persist the occurrence and its admission decision atomically with any queued run. If delivery repeats, return the existing occurrence.

The registered schedule pins its workflow source version. Changing that version or the schedule inputs creates a new trigger version. Already admitted runs retain their original workspace and source identity.

`overlapPolicy: "skip-unfinished"` skips an occurrence while the previous run from that trigger remains nonterminal, including when it waits for user input. `offlinePolicy: "skip"` discards occurrences that pass while the scheduler is offline. The scheduler does not catch up missed times or wake a sleeping computer.

Manual requests can supply workflow inputs when the user starts a run. Cron inputs come from the trigger definition. Both paths validate required inputs and resolve the exact workflow version before creating an immutable run snapshot.

## Share application capacity

Manual and cron runs share service-wide limits across every workspace. The defaults are two active runs and two concurrent model calls, both configurable. Work that exceeds either limit waits in a visible queued state. Triggers and workspaces do not create separate capacity pools.

Schedules belong to the service, not a CLI connection or desktop window. Closing a client leaves them active. A service stop disables admission and scheduling until startup and recovery complete. See [CLI, daemon, and workspaces](cli-workspaces.md) for lifecycle behavior.

GitHub event triggers and remote runners are later integration decisions. The GitHub Actions comparison does not promise compatibility with its event API or workflow syntax.
