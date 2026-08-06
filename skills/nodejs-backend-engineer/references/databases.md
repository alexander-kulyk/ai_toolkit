# Databases and data access

## Contents

- [Universal rules](#universal-rules)
- [PostgreSQL](#postgresql)
- [MySQL/MariaDB](#mysqlmariadb)
- [MongoDB](#mongodb)
- [Redis](#redis)
- [ORMs and query builders](#orms-and-query-builders)
- [Choosing SQL vs document storage](#choosing-sql-vs-document-storage)

## Universal rules

- Choose a database from access patterns, consistency, scale, operations, and team expertise—not trend.
- Let the database enforce unique, foreign-key, check, and not-null invariants where supported and appropriate.
- Select only required fields. Paginate unbounded collections.
- Understand query count and generated queries.
- Add indexes for real filters, joins, ordering, and uniqueness; validate planner usage.
- Keep connection pools bounded and aligned with database and deployment limits.
- Map persistence errors to application errors without exposing internals.
- Treat backups, restore testing, retention, and data deletion as part of design.

## PostgreSQL

Use PostgreSQL when relational integrity, transactions, rich querying, or analytical joins are important.

- Prefer database constraints for invariants.
- Use appropriate column types; do not store structured relational data as opaque text.
- Use JSONB for genuinely flexible subdocuments, not to avoid modeling everything.
- Understand MVCC, transaction isolation, locks, and deadlock behavior for concurrent updates.
- Use `EXPLAIN (ANALYZE, BUFFERS)` carefully in safe environments for query investigation.
- Add composite indexes in an order matching predicates and ordering; avoid unused index accumulation.
- Use keyset/cursor pagination for large changing tables.
- Consider partial or expression indexes when justified by stable query patterns.

## MySQL/MariaDB

- Verify exact server flavor/version and SQL mode.
- Use InnoDB for transactional workloads unless the project intentionally requires otherwise.
- Understand collation and case-sensitivity implications for unique values and searches.
- Use explicit transactions and inspect locking behavior for concurrent updates.
- Avoid relying on permissive coercions; validate and use strict SQL behavior.
- Examine query plans and composite index ordering.

## MongoDB

Design around aggregate boundaries and query patterns.

- Embed data that belongs to one bounded aggregate and is read/updated together.
- Reference data with independent lifecycle, high cardinality, or many-to-many relationships.
- Avoid unbounded arrays and ever-growing documents.
- Add schema validation and application validation.
- Create indexes for actual filters/sorts and account for index memory/write cost.
- Use atomic single-document operations when possible.
- Use multi-document transactions only when required and understand topology/performance implications.
- Use projections and bounded pagination; avoid full collection scans and unbounded `skip` for large pages.
- Store password hashes only in protected authentication records and never include them in public projections/endpoints.

## Redis

Define Redis's role explicitly:

- cache
- distributed coordination/lock
- rate-limit store
- session store
- queue/stream
- ephemeral state

For caches:

- use namespaced/versioned keys
- set TTLs unless permanence is intentional
- define invalidation and stale-data tolerance
- prevent cache stampedes with coalescing, locks, or probabilistic refresh
- avoid caching authorization decisions longer than their safe revocation window
- degrade safely when Redis is unavailable if it is only a cache

Do not treat Redis as the source of truth unless persistence, durability, backup, and failure semantics are deliberately designed.

## ORMs and query builders

### Prisma

- Read generated query behavior and relation loading strategy.
- Use transactions with clear boundaries.
- Avoid selecting full models when APIs need a subset.
- Review migrations before applying; generated SQL is not automatically production-safe.
- Keep schema/client generation synchronized in CI and deployment.

### TypeORM

- Confirm Data Mapper vs Active Record style used by the project.
- Avoid accidental lazy-loading query explosions.
- Do not enable automatic schema synchronization in production.
- Use migrations and explicit transaction managers/query runners correctly.
- Review cascade and orphan behavior.

### Drizzle

- Preserve schema/type definitions as the source of truth used by the project.
- Review generated migrations and SQL.
- Use explicit selects and transactions.
- Do not assume TypeScript typing replaces runtime validation.

### Sequelize

- Inspect association aliases, eager loading, and generated joins.
- Avoid broad `sync({ alter: true })` production schema management.
- Use transactions explicitly and ensure the transaction object propagates to every query.

### Knex

- Keep query construction parameterized.
- Review migration ordering and rollback safety.
- Centralize transaction ownership and pass transaction handles explicitly.

### Mongoose

- Distinguish schema defaults/validation from API validation.
- Use lean queries for read-only plain-object paths when compatible with behavior.
- Avoid hooks that hide important side effects or create recursion/query surprises.
- Control selected fields so sensitive fields are excluded by default and explicitly.
- Add indexes deliberately; schema declarations still require operational index management.

## Choosing SQL vs document storage

Prefer SQL when:

- cross-entity constraints and transactions are central
- reporting and ad hoc querying matter
- relationships are first-class and evolving

Prefer document storage when:

- data forms clear aggregates read together
- shape varies legitimately by aggregate/version
- joins are not central to main access patterns

A project can use both, but each additional datastore adds operational and consistency cost. Require a concrete reason.
