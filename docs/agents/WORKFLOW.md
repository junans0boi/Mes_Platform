# Mes Platform delivery workflow

This workflow is the default for architecture and feature work. A smaller change may use fewer stages when the task explicitly says so.

## 0. Repository bootstrap

Confirm the agent entrypoints, shared rules, issue templates, and validation scripts exist.

Completion criterion: `node scripts/agent-check.mjs` passes.

## 1. Reverse engineering

Recover the current Kdit behavior before designing its replacement.

Trace the path from user action to page state, API, procedure or query, tables and projections, background processing, and final result. Capture the findings in `docs/reverse-engineering/`.

Completion criterion: every in-scope workflow has a documented happy path, failure path, data path, and known performance limitation, or an explicit unresolved question.

## 2. Grilling

Stress-test the proposed direction before implementation. Visit the decision tree in rounds. Ask for decisions only when the answer is not recoverable from the repository or reference evidence.

Completion criterion: the user and agent share an explicit decision for every frontier item that changes scope, ownership, performance, or delivery risk.

## 3. Specification

Write the approved design in `docs/specs/`. A specification must describe goals, non-goals, boundaries, data and API contracts, UI patterns, performance constraints, failure behavior, testing, and migration or adoption notes.

Completion criterion: a reviewer can determine what will be built, what will not be built, and how it will be verified without reading implementation code.

## 4. Approval gate

Do not implement an architectural design until the user approves the written specification. Record meaningful rejected alternatives in `docs/decisions/` when they will prevent future re-litigation.

Completion criterion: the specification has an explicit approval message or task instruction.

## 5. Wayfinder

Map the current repository and the target seams. Identify entrypoints, feature boundaries, dependency direction, existing conventions, test surfaces, and likely change points.

If a named Wayfinder tool is unavailable in the current environment, produce the same evidence-backed result in `docs/maps/` using repository search and file inspection.

Completion criterion: the map names the files or directories that will change and the files that must remain untouched.

## 6. Wayfinder-map

Turn the repository map into an implementation dependency map. Show the order in which seams can be introduced, the contracts between them, and the validation point for each seam.

Completion criterion: implementation can proceed in small vertical slices without an unexplained dependency cycle or broad speculative refactor.

## 7. Tickets

Convert the approved specification and dependency map into GitHub Issues. Use one Epic for the outcome and child issues for independently verifiable vertical slices.

Every issue must contain:

- purpose
- scope
- non-scope
- related API or contract
- related screen or module
- acceptance criteria
- test method
- completion evidence

Completion criterion: each ticket has one owner-sized outcome and an explicit dependency, if any.

## 8. Issue registration

Register tickets only after the ticket set is reviewed. External issue creation is a deliberate delivery action, not a side effect of documentation generation.

Completion criterion: the repository contains links or identifiers for all registered issues.

## 9. Implementation

Implement one ticket at a time. Keep changes local to the mapped seam. Update the specification or decision record when implementation reveals a real requirement change.

Completion criterion: the ticket acceptance criteria are met and the relevant automated checks pass.

## 10. Verification and review

Run type checks, lint, unit or integration tests, and the relevant Playwright or API checks. Review the diff for accidental scope expansion, performance regressions, traceability gaps, and user-facing wording.

Completion criterion: the evidence required by the issue is attached or linked, and no known required check is skipped without an explicit reason.

## 11. Close

Close an issue only after implementation, verification, documentation, and review evidence are complete. The close note should identify the delivered behavior and the checks that prove it.
