# Testing and quality

## Contents

- [Test pyramid by risk](#test-pyramid-by-risk)
- [Bug fixes and database tests](#bug-fixes)
- [Auth tests](#auth-tests)
- [Time, randomness, and concurrency](#time-randomness-and-concurrency)
- [Mocking and assertions](#mocking)
- [Test hygiene](#test-hygiene)
- [Verification command selection](#verification-command-selection)

## Test pyramid by risk

Use a balanced suite rather than maximizing one test type.

### Unit tests

Best for:

- business rules and policies
- mapping and parsing
- state transitions
- retry/idempotency decisions
- error classification

Keep them fast and independent of framework/bootstrap where possible.

### Integration tests

Best for:

- real database queries and constraints
- ORM mappings and transactions
- cache/queue adapters
- framework modules/plugins and middleware order
- serialization and validation adapters

Use isolated schemas/databases/containers or a repository-established test environment. Reset state deterministically.

### Endpoint/e2e tests

Prove:

- route wiring
- validation and status codes
- authentication and authorization
- response serialization and sensitive-field exclusion
- side effects and transaction behavior
- global middleware/guards/pipes/filters/interceptors

### Contract tests

Use for third-party APIs, internal service boundaries, events, and public SDK contracts. Test compatibility, not only example payloads.

## Bug fixes

Create a test that fails for the reported behavior before or alongside the fix when feasible. Test the user-visible failure and important boundary conditions.

## Database tests

- run migrations from a clean state
- test unique/foreign/check constraints
- test rollback/atomicity on mid-operation failure
- test concurrent behavior when race conditions matter
- inspect query count for N+1-sensitive paths
- use representative data shape/volume for performance claims

## Auth tests

Include:

- unauthenticated
- authenticated but unauthorized
- correct role but wrong tenant/owner
- expired/invalid credential
- hidden/sensitive field exclusion
- privilege changes/revocation where relevant

## Time, randomness, and concurrency

Inject clocks/ID generators where helpful. Use fake timers carefully; they do not emulate all event-loop/network behavior. Seed randomness. Avoid arbitrary sleeps; wait for observable conditions with deadlines.

For concurrency, coordinate operations with barriers/hooks so the race is reproducible rather than probabilistic.

## Mocking

Mock a boundary, not every internal function.

Good candidates:

- remote APIs
- email/SMS provider
- nondeterministic clock/randomness
- slow infrastructure in focused unit tests

Prefer real database/cache/queue substitutes in integration tests when semantics matter. Ensure mocks can represent errors, timeouts, retries, and partial failures.

## Assertions

Assert outcomes:

- returned data/status
- durable state
- emitted event/job
- authorization decision
- external call contract
- observable logs/metrics only when they are part of required behavior

Avoid over-asserting call order and private implementation details.

## Test hygiene

- no shared mutable state across tests
- deterministic cleanup
- unique test data
- no production credentials
- no network by accident
- failures should explain the violated behavior
- keep fixtures small and purposeful

## Verification command selection

Use existing scripts. Inspect workspace filters for monorepos. Start focused, then broaden. Do not run destructive migration/deployment commands against unknown environments.
