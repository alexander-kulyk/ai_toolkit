# Observability and performance

## Contents

- [Start with a question](#start-with-a-question)
- [Structured logging](#structured-logging)
- [Metrics and tracing](#metrics)
- [Performance investigation](#performance-investigation)
- [Common Node.js issues](#common-nodejs-issues)
- [Caching](#caching)
- [Memory](#memory)
- [Health checks](#health-checks)

## Start with a question

Define the problem and target:

- p50/p95/p99 latency
- throughput
- error rate
- memory/CPU
- event-loop delay
- database query count/time
- queue lag
- startup/readiness time
- cost per operation

Capture a baseline under a representative workload before changing code.

## Structured logging

Logs should be structured and searchable. Common context:

- timestamp and severity
- service/version/environment
- request/trace/correlation ID
- route or operation name, not raw high-cardinality URL
- actor/tenant identifier only when permitted and appropriately protected
- job/event identifier
- duration and outcome
- error type/code and causal chain

Do not log secrets, tokens, cookies, authorization headers, password hashes, payment data, or full bodies by default. Apply redaction at logger configuration and call sites.

Avoid duplicate logging at every layer. Log an error at the boundary that has enough context to act.

## Metrics

Use low-cardinality labels. Useful service metrics:

- request/job count, duration, errors
- active requests/jobs
- database pool usage and query duration
- cache hit/miss and errors
- dependency latency/errors/timeouts
- queue depth/lag/retries/dead letters
- process memory/CPU/event-loop delay
- readiness state

Business metrics can be more valuable than generic technical counters when they reveal failed workflows.

## Tracing

Propagate context across HTTP, queues, scheduled jobs, and database/external calls. Add spans around meaningful operations, not every function. Record safe attributes and status. Ensure sampling supports incident investigation without uncontrolled cost.

## Performance investigation

1. reproduce with representative inputs
2. profile the actual bottleneck
3. inspect event-loop blocking, query plans/counts, serialization, memory allocations, and network waits
4. change one major variable at a time
5. rerun the same workload
6. document trade-offs and regression protection

## Common Node.js issues

- synchronous I/O or CPU work on hot paths
- unbounded `Promise.all`
- large JSON parse/stringify
- retaining request objects/listeners/caches and causing leaks
- creating clients/pools per request
- connection pool exhaustion
- N+1 queries
- missing timeouts
- excessive logs or high-cardinality telemetry
- buffering large files instead of streaming
- retry amplification across service layers

## Caching

Define:

- cache owner and source of truth
- key format/version
- TTL and stale policy
- invalidation trigger
- maximum value/total size
- serialization format
- tenant/security boundary
- stampede protection
- behavior during cache outage

Do not cache errors or authorization decisions accidentally. Measure hit ratio and end-to-end benefit.

## Memory

For suspected leaks:

- confirm growing retained heap across equivalent workload and GC cycles
- compare heap snapshots safely
- inspect listeners, timers, closures, maps, caches, buffers, and request/session retention
- bound caches and queues
- avoid collecting unbounded arrays before responding

Raising the heap limit is not a leak fix.

## Health checks

- **Liveness**: process is running and not irrecoverably stuck; keep simple.
- **Readiness**: instance can safely accept traffic/work; may include required dependency and initialization state.
- **Startup**: optional for slow initialization so orchestrators do not kill a healthy startup.

Do not overload health endpoints with expensive checks. Protect detailed diagnostic endpoints.
