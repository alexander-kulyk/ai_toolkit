# Architecture and workflow

## Default decision rule

Fit the existing architecture before introducing a new one. Refactor only where the requested behavior crosses a fragile boundary, creates duplication with real change pressure, or cannot be tested safely in the current shape.

## Practical layers

Use these as responsibilities, not mandatory folders:

- **Transport**: HTTP routes/controllers/resolvers, message consumers, CLI parsing.
- **Application**: use cases, orchestration, authorization decisions tied to an operation, transaction coordination.
- **Domain**: business invariants, value objects, policies, domain services when behavior is genuinely domain-specific.
- **Infrastructure**: database, cache, queues, email, files, third-party APIs, telemetry.

Dependencies should normally point inward through interfaces or function contracts. Framework request/response objects should not flow through the whole application.

## Choosing an architecture

### Simple feature/module structure

Use for small services and CRUD-heavy applications:

```text
src/
  users/
    users.routes.ts
    users.service.ts
    users.repository.ts
    users.schema.ts
    users.test.ts
```

Keep related files together. Do not create five layers for a one-query endpoint.

### Modular monolith

Prefer when a single deployable application has multiple business capabilities. Each module owns its application logic and persistence contract. Cross-module calls go through public module interfaces or events, not direct table/repository access.

### Hexagonal/clean boundaries

Use selectively where infrastructure changes, complex rules, or test isolation justify ports/adapters. Do not wrap every library merely to claim architecture purity.

### Microservices

Do not recommend by default. Require an independently valuable boundary: scaling, ownership, deployment cadence, isolation, regulatory boundary, or failure containment. Account for distributed transactions, observability, versioning, retries, duplicate delivery, and operational cost.

## Pattern guidance

- **Strategy**: multiple interchangeable algorithms or provider-specific behavior selected at runtime.
- **Adapter**: translate an external/vendor interface into the application's expected contract.
- **Facade**: provide one coherent entry point to a multi-step subsystem.
- **Command/use case**: model an operation with meaningful orchestration, policies, or side effects.
- **Repository**: isolate persistence when it provides a domain-oriented contract, query reuse, mapping, or a test seam. Avoid generic CRUD repositories that hide useful database features.
- **Factory**: centralize construction when dependencies or variants are non-trivial.
- **Observer/events**: decouple side effects, but define delivery guarantees, ordering, idempotency, and failure handling.
- **Outbox**: coordinate durable database changes with eventual event publication.
- **Saga/process manager**: coordinate multi-step distributed work with explicit compensations.

## Change workflow

1. Map the current request/event path end-to-end.
2. Mark validation, auth, transaction, external I/O, and response boundaries.
3. Identify the invariant being changed.
4. Add or update a regression/contract test where practical.
5. Make the minimum structural change that exposes the behavior cleanly.
6. Verify behavior and operational failure paths.

## Avoid

- framework objects deep in business code
- circular imports or module cycles
- global service locators
- hidden I/O in constructors/getters
- boolean parameters that create ambiguous modes
- giant services with unrelated responsibilities
- premature event-driven decomposition
- generic abstractions with one implementation and no policy
- catching errors only to log and rethrow at every layer
