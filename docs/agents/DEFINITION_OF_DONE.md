# Definition of done

A change is complete only when the applicable items below are true.

## Design

- The work maps to an approved specification or a documented small-change decision.
- Scope and non-scope are explicit.
- The owning module and dependency direction are clear.
- API, data, permission, and realtime behavior are documented where relevant.

## Implementation

- The change is implemented at the intended seam.
- Feature code owns feature behavior; shared code contains only stable reusable behavior.
- Loading, empty, error, retry, cancellation, and permission states are handled.
- User-visible actions expose meaningful success or failure feedback.
- Request and operation identifiers remain available for diagnosis where applicable.

## Performance

- Large lists use server-side query behavior and virtualization.
- Realtime screens update projections or changed records instead of reloading full datasets.
- No unbounded client-side parsing, polling loop, or export operation was introduced.
- The relevant performance check or measurement is recorded.

## Verification

- Formatting, lint, type checks, and relevant tests pass.
- The relevant browser or API flow is verified.
- The diff was reviewed for unintended files and behavior.
- Documentation and issue acceptance evidence are updated.

## Delivery

- The issue describes what changed and how it was verified.
- External issue state is changed only by an authorized action.
- Push, release, or deployment is not implied by local completion.
