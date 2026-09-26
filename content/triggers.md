# Start runs with triggers

A `Trigger` requests a run of its containing workflow version. Workflow definitions declare triggers separately from their stages. Manual and cron requests use the same validation, frozen snapshot, and admission path.

The `@runlane/sdk` examples are proposed definitions, not working scheduler code. The `Trigger` factories return definitions. They do not create active schedules.

## Define manual and cron triggers

```js
// A reusable trigger list imported by a workflow module.
import { Trigger } from "@runlane/sdk";

export const triggers = [
  Trigger.manual({
  id: "manual-change-review",
  version: 1,
  }),
  Trigger.cron("0 9 * * 1-5", {
  id: "weekday-dependency-audit",
  version: 1,
  timezone: "Asia/Hong_Kong",
  inputs: { repository: "example/service", task: "Review dependency changes" },
  overlapPolicy: "skip-unfinished",
  offlinePolicy: "skip",
  enabled: false,
  }),
];
```

Pass this list as `triggers` in `new Workflow({ ... })`, or define the same list inline as shown in [Define a workflow](workflows.md).

The cron expression uses the five-field convention. It describes 09:00 on weekdays in Hong Kong. The disabled definition does not admit scheduled runs. Enabling it must be a separate, explicit application action that validates the workflow, model profiles, inputs, and time zone first.

Use stable trigger IDs and increment the trigger version when its schedule or inputs change. Preview upcoming occurrence times before enabling a cron trigger. Use a cron parser with explicit time-zone support and document its daylight-saving behavior.

The proposed trigger IDs are unique within a registered project. Check overlap across versions of the same trigger ID. Updating a schedule must not bypass an unfinished run. Apply any shared concurrency key too, such as a coding template's Ticket identity.

## Admit each occurrence once

Identify a cron occurrence by trigger ID, trigger version, and scheduled UTC instant. Persist the occurrence and its admission decision atomically with any queued run. If delivery repeats, return the existing occurrence instead of creating a second run.

`overlapPolicy: "skip-unfinished"` skips an occurrence while the previous run from that trigger remains nonterminal, including when it waits for user input. `offlinePolicy: "skip"` discards occurrences that pass while the scheduler is offline. The scheduler does not catch up missed times or wake a sleeping computer.

Manual requests can supply workflow inputs when the user starts a run. Cron inputs come from the trigger definition. Both paths validate required inputs and resolve the exact workflow version before creating an immutable run snapshot.

## Share application capacity

Manual and cron runs share application-wide limits. The defaults are two active runs and two concurrent model calls, and the application can configure both values. Work that exceeds either limit waits in a visible queued state. Triggers do not create separate capacity pools.

GitHub event triggers and remote runners are later integration decisions. The GitHub Actions comparison does not promise compatibility with its event API or workflow syntax.
