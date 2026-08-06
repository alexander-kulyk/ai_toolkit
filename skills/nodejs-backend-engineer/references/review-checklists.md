# Review checklists

Prioritize findings that can change behavior or production safety. Each finding should include severity, location, failure scenario, and smallest correction.

## Correctness

- Does code implement the stated behavior for success and failure paths?
- Are null/optional/empty/invalid values handled?
- Are async operations awaited or intentionally detached?
- Can concurrent requests/jobs violate an invariant?
- Are retries and duplicate delivery safe?
- Are ordering, timezone, precision, and rounding rules correct?
- Does error mapping preserve the intended status/contract?

## Data

- Is the transaction boundary correct?
- Can partial writes occur?
- Are constraints/indexes/migrations included?
- Could a migration lock/rewrite a large table or break old app versions?
- Is there N+1 or unbounded data loading?
- Are projections excluding sensitive fields?
- Are generated ORM cascades/deletes understood?

## Security

- Is every trust boundary validated?
- Is authentication verified correctly?
- Is resource-level and tenant-level authorization enforced?
- Can input cause SQL/NoSQL/command/template/path injection or SSRF?
- Are cookies/tokens/webhooks configured and verified safely?
- Are payload size, rate, and expensive operation limits present?
- Are secrets or personal data exposed in response/logs/errors?

## Reliability

- Are timeouts present for external I/O?
- Are retries bounded, jittered, and limited to safe errors?
- Can resource pools/concurrency be exhausted?
- Are streams/listeners/timers/connections cleaned up?
- Does shutdown drain work safely?
- Is cache failure safe and invalidation defined?

## API compatibility

- Does the change alter fields, status codes, defaults, validation, pagination, or event payloads?
- Can old and new versions coexist during rollout?
- Are docs/schema/generated clients updated?
- Is versioning or deprecation required?

## Tests

- Is there a regression test for the reported bug?
- Do tests prove auth and negative paths?
- Do database tests cover constraints and atomicity?
- Are mocks realistic enough to expose timeout/partial failure?
- Are tests deterministic and isolated?

## Operability

- Can an incident be diagnosed from logs/metrics/traces?
- Are high-cardinality or sensitive telemetry fields introduced?
- Are health/readiness and startup behavior preserved?
- Is deployment/migration order documented for risky changes?

## Noise filter

Do not report:

- style already enforced by formatter/linter
- speculative architecture rewrites unrelated to the diff
- personal naming preferences with no ambiguity or convention violation
- missing comments where code is already clear
- theoretical performance concerns without a plausible workload/path
