# Reuse Pi and Pi durable

Pi is the selected agent execution engine. Pi durable is the selected persistence foundation. Their concrete compatibility and data mapping remain integration work.

## The agent execution boundary

Reuse the full coding-agent SDK for its agent loop, selected model, tools, events, resource loading, and lifecycle controls. A small adapter turns a configured Agent into an invocation and translates its observable events into our trace contract. [Pi SDK](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/sdk.md)

Use Pi's model runtime for provider/model lookup and supported authentication. The application validates the agent's configuration and records the actual model and effort; it never silently substitutes an unavailable model. [Model selection](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/02-custom-model.ts)

## Persistence with Pi durable

Pi durable exposes durable record contracts and storage implementations for conversation, task, and document data. Its portable SQLite core can support synchronous database adapters; compatibility with our Bun deployment needs verification. [Pi durable](https://raw.githubusercontent.com/earendil-works/pi/main/packages/durable/README.md)

We still define run identity, attempt state, event ordering, loop counters, approval evidence, and which updates must commit together. A package with durable storage does not automatically implement those business rules.

Pi remains authoritative for its conversation history. Avoid creating a second transcript store or a product-facing session manager.

## Reuse resources and tools

Reuse approved Pi tools and its extension interface for application-owned structured submission. Contributor definitions select allowed capabilities and result contracts. Load only explicitly trusted resources for managed invocations. [Tool selection](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/05-tools.ts), [Extensions](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/06-extensions.ts)

Direct scripts remain model-free actions. Workflow routing, schedules, concurrency limits, and the run graph belong to the application.

Runlane also owns the `.mjs` definition loader and retention of each run's source version. Pi conversation persistence does not preserve arbitrary workflow modules, checking scripts, or their dependencies for us.

## Prove the integration first

Pin a published package version and inspect its declarations. Verify explicit models, event delivery, independent invocations, cancellation, clean shutdown, durable record mapping, and transaction behavior before relying on them.

An earlier Pied Piper integration recorded a Bun/macOS shutdown issue with Pi 0.82.1's SDK entry point. Treat that as a version-specific investigation lead, not a claim that the current SDK is incompatible. No live Pi or Pi durable integration has been executed by this documentation project.
