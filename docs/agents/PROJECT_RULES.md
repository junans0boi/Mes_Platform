# Mes Platform project rules

## Purpose

`Mes_Platform` is the reusable MES platform for future businesses. It is not a second copy of Kdit and it is not a direct migration of Kdit's source tree.

Kdit is the reference system used to recover real workflows, identify defects, and validate improvements. New code belongs here only after the underlying requirement and boundary are understood.

## Working agreement

- Inspect the repository and relevant reference code before editing.
- Keep one source of truth for each decision. Put durable architecture decisions in `docs/decisions/` and feature specifications in `docs/specs/`.
- Use the repository's terminology consistently: `MesPlatform` for .NET solution and project names, `mes-web` for the frontend application, and `Mes_Platform` for this repository.
- Prefer feature-oriented modules with clear interfaces and local ownership over large generic base layers.
- Keep controllers, pages, and shared components thin. A shared module should hide real complexity; it should not merely forward calls.
- Treat database tables, SQL statements, and transport DTOs as implementation details of a use case. Do not design the frontend around table names.
- Keep the API contract explicit. Frontend pages call feature-owned query and command adapters, not raw URLs or generic entity endpoints.
- Use server-side filtering, sorting, pagination, and projection for large datasets. The browser must not load a million-row dataset to find a page.
- Use projection read models for realtime screens. Realtime events identify changed records or invalidate a query; they do not stream an entire table to every browser.
- Keep `requestId`, `operationId`, `correlationId`, `asOf`, and connection state visible where they help an operator diagnose a result.
- Prefer accessible, keyboard-usable controls and meaningful text alongside status color.
- Do not introduce a dependency, abstraction, or framework layer without identifying the problem it solves and its ownership boundary.
- Do not push changes, create or close external issues, or change external systems unless the task explicitly authorizes that action.

## Planned technology direction

The platform direction is:

- C# and ASP.NET Core for the backend
- SQL Server on Windows Server
- React and TypeScript for one frontend application
- MUI and MUI X DataGrid Premium for dense enterprise data views
- TanStack Query for server state
- SignalR for realtime notifications and projection changes
- OpenAPI-generated TypeScript contracts at the transport boundary

The exact package versions and implementation choices are recorded in approved specifications, not guessed from this summary.

## Frontend boundaries

The frontend is one application with feature-oriented modules:

```text
src/app          application composition, routing, providers, shell
src/platform     API, auth, permissions, realtime, i18n, telemetry
src/shared       reusable UI primitives and pure utilities
src/modules      production, quality, inventory, shipping, monitoring, and system features
```

Server state belongs to the server-state layer. URL state belongs in the route. Local form and interaction state belongs to the feature. Global UI state is kept small and intentional.

The default page patterns are:

- list and management
- master-detail
- operation and scanning
- realtime monitoring
- quality inspection workspace
- traceability and history

New pages should compose these patterns rather than create a new shell for each screen.

## Reference and evidence

When recovering behavior from Kdit, record evidence with:

- source path and line when practical
- API endpoint or procedure name
- tables, views, projections, or queues involved
- user action and expected result
- observed performance or correctness problem
- proposed replacement behavior

An assumption is not a recovered fact. Mark unresolved points as questions in the current specification.
