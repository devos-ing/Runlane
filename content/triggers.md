# Start with manual and cron triggers

A trigger requests a new workflow run. It sits outside the stages and uses the same admission path regardless of how the request arrives.

## Manual trigger

The developer chooses a workflow version, supplies its inputs, resolves the required model profiles, and starts a run. An optional coding template can accept a Ticket and repository; they are not mandatory platform concepts.

## Cron trigger

```json
{
  "id": "weekday-audit",
  "kind": "cron",
  "expression": "0 9 * * 1-5",
  "timezone": "Asia/Hong_Kong",
  "workflowRef": {"id": "dependency-audit", "version": 1},
  "inputs": {"repositoryRef": "my-project"},
  "overlapPolicy": "skip-unfinished",
  "missedRuns": "skip",
  "enabled": false
}
```

This illustrative schedule represents 09:00 on weekdays in Hong Kong, using the five-field [cron convention](https://man7.org/linux/man-pages/man5/crontab.5.html). No schedule is created by this website.

Show upcoming occurrence times before enabling a schedule. Use a verified cron parser with explicit timezone support; document its daylight-saving behavior before promising calendar correctness.

## Deduplicate before execution

Record each occurrence by schedule ID, version, and scheduled UTC instant. Persist its admission decision and the queued run together. Duplicate delivery must refer to the existing occurrence.

Default to skipping an occurrence when the same schedule's previous run remains unfinished, including a wait for user input. Also enforce any explicit shared concurrency key. The coding template can use a Ticket identity as that key.

Skip missed times while the service is offline. The first local runner does not promise to wake a sleeping computer or install an OS background service.

## A new run is not a loop

Cron creates a new run with frozen inputs and fresh execution state. A bounded loop continues its current run. Both share global model capacity and action policies.

GitHub event triggers and remote runners are future integration decisions. The GitHub Actions comparison does not imply compatibility with its event API or workflow syntax.
