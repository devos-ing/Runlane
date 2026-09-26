# Runlane design documentation

A local Markdown documentation website for Runlane, a workflow automation and observability platform for agents. It includes a real React Flow canvas with a deterministic, explicitly simulated trace demonstration.

Pi SDK execution and Pi durable persistence are planned integrations. This site does not implement the workflow runner or those integrations.

## Start the site

Use Bun to install the pinned dependencies and start the local server:

```sh
bun install --frozen-lockfile
bun run dev
```

Open [the local documentation](http://127.0.0.1:4173/). The server binds to loopback. A teammate needs their own copy or a separately hosted build; this local URL is not a public share link.

## Edit the documentation

The ten pages live in [content](content). Edit the `.md` files directly. Add a page to the small navigation list in [src/docs.ts](src/docs.ts) when creating a new document.

Use ordinary Markdown headings, tables, links, and fenced examples. A standalone `<!-- playground -->` line inserts the React Flow example. Markdown does not execute JavaScript or arbitrary embedded components.

Each page provides its Markdown source, heading anchors, and adjacent-page navigation. Search uses the local Markdown text. Fonts are bundled locally; reading the site does not require a font CDN.

## Understand the implementation

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Document layout, navigation, search, and Markdown rendering. |
| `src/docs.ts` | Navigation metadata and Markdown/source loading. |
| `src/FlowPlayground.tsx` | React Flow nodes, selected-execution inspector, and replay controls. |
| `src/demo.ts` | Explicit sample events, template layout, and status projection. |
| `src/styles.css` | Reading layout, responsive behavior, and graph presentation. |

The graph supports layout exploration and node inspection. Connections are read-only. Replay advances local sample data only. The node selector also exposes every execution without requiring precise canvas interaction. On narrow screens, the initial view focuses on the Review group; pan, zoom, or choose an execution to explore the rest.

The demo has no credentials, backend runner, Pi invocation, Pi durable database, or active schedule. Its event names and configuration snippets are proposed application contracts.

## Build and inspect

```sh
bun run typecheck
bun run lint
bun run build
bun run preview
```

The `build` command also typechecks. It emits a static site in `dist/`, including Markdown downloads and self-hosted fonts. Query-based document URLs work on a basic static server without custom route rewrites. Stop an existing development server before using the preview command on the same port.

The production build also runs TypeScript checks. These checks validate the documentation site, not the future agent runtime.

## Evidence and limits

- Implemented: ten Markdown pages, navigation/search, source links, responsive reading layout, and the React Flow demonstration.
- Verified: TypeScript, Biome, and the production build. The browser rendered the documentation and graph without reported console errors during the earlier local inspection.
- Visual evidence: desktop page inspection and narrow-viewport layout/containment inspection during the earlier local inspection.
- Unverified: live agent execution, persistence integration, real model limits, script execution, and scheduling. Those remain product implementation work.
