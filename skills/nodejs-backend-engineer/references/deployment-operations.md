# Deployment and operations

## Build artifact

- Build from a clean, reproducible dependency install using the repository lockfile.
- Separate build-time and runtime dependencies.
- Verify the compiled output under the production Node/module configuration.
- Do not rely on dev-only transpilers or file watchers in production unless intentionally designed.
- Include required generated clients/schemas/assets.
- Record application version/commit for diagnostics.

## Containers

- Use a supported, pinned-enough Node base strategy consistent with organizational policy.
- Run as a non-root user where practical.
- Keep build tools out of the final image through multi-stage builds when useful.
- Copy lockfile and manifest before source to improve caching without compromising correctness.
- Use `.dockerignore` to exclude secrets, local caches, tests/build output as appropriate.
- Define signal handling and graceful shutdown; avoid wrappers that swallow signals.
- Do not bake secrets into image layers.

## Configuration and secrets

- Validate all required config on startup.
- Use the deployment platform's secret manager/injection mechanism.
- Rotate credentials and support overlap where required.
- Keep environment-specific behavior explicit; avoid large branches on `NODE_ENV` scattered across code.
- Fail fast on invalid critical configuration.

## CI/CD

A typical quality gate may include:

1. reproducible install
2. format/lint
3. typecheck
4. unit tests
5. integration/contract tests
6. build
7. dependency/security scanning
8. migration validation
9. image/package build
10. smoke test

Use repository-specific commands and avoid duplicating work unnecessarily.

## Deployment compatibility

Plan for overlap between old and new instances:

- API/event backward compatibility
- database schema compatibility
- cache key versions
- job payload versions
- rolling deployment behavior
- feature flags and rollback

## Graceful shutdown

On termination:

- mark not-ready
- stop accepting new HTTP requests/jobs
- drain current work within a deadline
- stop schedulers/consumers
- close server, pools, brokers, telemetry
- exit with clear status

Jobs that exceed the shutdown window need lease/visibility-timeout semantics or durable checkpoints so another worker can resume safely.

## Serverless

- reuse clients/pools across warm invocations when supported
- keep initialization bounded
- account for concurrent invocation and connection limits
- do not rely on in-memory state for correctness
- set function and outbound timeouts coherently
- make handlers idempotent when the platform retries

## Operational readiness

Before production changes, check:

- migrations and rollback/roll-forward plan
- dashboards/alerts for the affected path
- logs and correlation IDs
- rate/resource limits
- dependency timeouts/retries
- runbook or clear failure response
- backup/restore implications
- feature flag or staged rollout for high-risk changes
