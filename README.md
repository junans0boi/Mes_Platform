# Mes Platform

Reusable MES platform for future manufacturing projects.

This repository is being designed from the lessons learned while building Kdit MES. Kdit remains the reference system for reverse engineering and workflow validation; it is not copied into this repository as-is.

## Current phase

Frontend foundation in progress: `frontend/mes-web` toolchain (FE-01) and AppShell/routing/theme (FE-03) are implemented. FE-02, FE-04, and FE-05 wait for the shared API contract (CON-01).

The planned first implementation slice is:

1. Agent and repository foundation
2. Frontend AppShell, routing, API client, permissions, and shared data patterns
3. WorkOrder list and detail
4. `ProcessUnitStatusCurrent` realtime process status

## Agent entrypoints

- Codex reads `AGENTS.md`.
- Claude Code reads `CLAUDE.md`.
- Both entrypoints point to `docs/agents/PROJECT_RULES.md`.
- The delivery sequence is defined in `docs/agents/WORKFLOW.md`.

Run the repository checks with:

```bash
node scripts/agent-check.mjs
```

## Documentation layout

```text
docs/reverse-engineering/  recovered behavior from reference systems
docs/specs/                 approved feature and architecture specifications
docs/maps/                  repository and implementation dependency maps
docs/decisions/             durable decisions and rejected alternatives
docs/tickets/               ticket sets before external registration
```

## Backend

The backend is a modular monolith in `MesPlatform.sln` (.NET SDK 10.0.400, `net10.0`).

- `MesPlatform.Server` (HTTP API and SignalR Hub) and `MesPlatform.Worker` (background processing) are **separate processes**. They are the only executable projects.
- Project dependencies point inward only: `Domain ← Application ← Infrastructure ← Server/Worker`. `Contracts` references no project. `tests/MesPlatform.Architecture.Tests` enforces this.
- The Worker is disabled by default in development (the safe host is built in BE-04).
- Local tests must never connect to a production database. Use a dedicated test connection string (database tickets BE-02, DB-01).

```bash
dotnet restore MesPlatform.sln
dotnet build MesPlatform.sln -c Release
dotnet test MesPlatform.sln -c Release
```

## Planned solution shape

```text
MesPlatform.sln
├─ src/MesPlatform.Server
├─ src/MesPlatform.Worker
├─ src/MesPlatform.Domain
├─ src/MesPlatform.Application
├─ src/MesPlatform.Infrastructure
├─ src/MesPlatform.Contracts
├─ frontend/mes-web
└─ database/MesPlatform.Database
```

The solution and feature structure will be created from approved specifications rather than from an unreviewed scaffold.
