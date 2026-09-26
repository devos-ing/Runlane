# Architecture diagram sources

These diagrams describe the agreed design. They do not report live execution. The [architecture review page](../../content/architecture-map.md) explains the current implementation boundary and the relationships to confirm.

| Specification | Type | Standalone artifact |
| --- | --- | --- |
| [system.architecture.json](system.architecture.json) | Architecture | [system.html](../../public/diagrams/system.html) |
| [runtime.architecture.json](runtime.architecture.json) | Architecture | [runtime.html](../../public/diagrams/runtime.html) |
| [review.workflow.json](review.workflow.json) | Workflow | [review.html](../../public/diagrams/review.html) |

The specifications are the editable source. The HTML files are self-contained Archify 2.16 outputs. Keep the generated HTML unchanged after delivery. The site serves them as static assets; their viewer code is not imported into the documentation application's JavaScript bundle.

## Regenerate one diagram

With the Archify skill available, set `ARCHIFY_SKILL_ROOT` to its installation directory. Run from the repository root:

```sh
node "$ARCHIFY_SKILL_ROOT/bin/archify.mjs" validate architecture docs/diagrams/system.architecture.json --quality showcase --json
node "$ARCHIFY_SKILL_ROOT/bin/archify.mjs" deliver architecture docs/diagrams/system.architecture.json public/diagrams/system.html --quality showcase --json
node "$ARCHIFY_SKILL_ROOT/bin/archify.mjs" visual-check public/diagrams/system.html --json
```

Use `workflow` for `review.workflow.json`. After each edit, validate before delivery. Inspect captured light and dark screenshots as well as the containment measurements. An automated capture receipt does not prove visual review.

The site previews are unchanged copies of the final 1440×900 light screenshots. Additional local screenshots and capture sidecars stay in `.scratch/architecture-review`. The [delivery receipts](receipts.json) retain the specification and HTML hashes, validation results, and visual-review status for the committed artifacts.
