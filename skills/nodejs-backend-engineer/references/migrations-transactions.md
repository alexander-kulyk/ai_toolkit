# Migrations, transactions, and concurrency

## Migration workflow

1. Inspect current schema and migration tool/version.
2. Determine whether the change is backward compatible with currently deployed application versions.
3. Estimate table/collection size, lock duration, rewrite risk, index-build behavior, and backfill cost.
4. Create a new migration; do not rewrite applied history unless the repository explicitly allows it.
5. Test against representative schema/data.
6. Plan deploy order and verification.
7. Define roll-forward recovery; rollback may be unsafe after writes in the new shape.

## Expand → migrate → contract

For zero/low-downtime changes:

1. **Expand**: add nullable/new columns, tables, indexes, or fields without removing old readers.
2. **Deploy compatible code**: read old/new safely; dual-write only when necessary and observable.
3. **Backfill**: process bounded batches, checkpoint progress, throttle load, and make reruns idempotent.
4. **Switch reads**: verify correctness and metrics.
5. **Contract**: remove legacy code/columns in a later deployment.

Avoid adding a required column with an expensive default to a large table without understanding database-version behavior.

## Transaction ownership

The application operation that requires atomicity should normally own the transaction. All participating repositories receive the transaction context explicitly or through a well-understood scoped mechanism.

Keep transactions:

- short
- deterministic
- free of user interaction
- free of slow remote calls
- limited to necessary rows/documents

## Isolation and races

Identify whether the operation can suffer:

- lost updates
- duplicate creation
- dirty/non-repeatable reads
- write skew
- double processing
- stale authorization or inventory checks

Possible controls:

- unique/check constraints
- atomic conditional update (`WHERE version = ?`, compare-and-set)
- optimistic version columns
- row/document locks
- serializable transactions with retry
- idempotency keys
- queue partitioning/deduplication

Do not solve a correctness race with an in-process mutex when multiple instances can execute the operation.

## Idempotency

For operations that may be retried:

- define the idempotency scope and key owner
- store request fingerprint and final result/status where appropriate
- reject key reuse with a different payload
- handle concurrent first attempts atomically
- define expiration based on business semantics
- make downstream calls idempotent or record a durable state machine

## Events and database consistency

When a committed database change must produce an event, prefer a transactional outbox or database-native change mechanism over "commit then publish" without recovery.

Consumers should assume at-least-once delivery unless the platform guarantees otherwise. Make side effects idempotent and track processed event identity where required.

## Backfills

- batch by stable key, not large offset pagination
- checkpoint progress
- make each batch safe to retry
- expose metrics and failure counts
- cap concurrency and database load
- validate counts/samples before and after
- preserve audit requirements
