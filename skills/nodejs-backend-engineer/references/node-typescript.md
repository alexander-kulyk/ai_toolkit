# Node.js and TypeScript

## Version and package management

- Read `engines`, `packageManager`, lockfile, CI image, Docker base image, `.nvmrc`, `.node-version`, Volta, or mise before selecting syntax or APIs.
- Do not upgrade Node or dependencies incidentally.
- Use the repository's package manager. Never mix npm, pnpm, Yarn, or Bun lockfiles.
- Prefer an actively supported Node release for new production services, but migrations must be explicit and tested.

## ESM and CommonJS

Identify the module system from `package.json`, file extensions, TypeScript compiler options, and existing imports.

- ESM: respect explicit file-extension requirements after compilation and package `exports` rules.
- CommonJS: avoid introducing ESM-only dependencies without a compatibility plan.
- Mixed packages: use a narrow interop boundary and test the built output, not only ts-node/tsx development execution.
- Library packages: define `exports`, types, and supported entry points deliberately; prevent consumers from importing internals.

## TypeScript

- Preserve strict compiler options.
- Use `unknown` at external boundaries; parse/narrow once.
- Prefer discriminated unions for stateful workflows and result variants.
- Avoid duplicated runtime schemas and TypeScript types when the chosen validation library can infer one from the other.
- Do not use interfaces as runtime validation in NestJS; erased types cannot validate input.
- Model nullable/optional fields according to actual transport and database semantics.
- Avoid enums when simple unions or constant objects fit existing conventions, especially across API/database boundaries.
- Type errors, dependencies, and return values at public module boundaries.

## Async and concurrency

- Always await or deliberately detach promises. Detached tasks need explicit error capture and lifecycle ownership.
- Use bounded concurrency for batches. Avoid `Promise.all` over unbounded input.
- Preserve error causes when wrapping errors.
- Use deadlines/timeouts for network and queue operations.
- Pass `AbortSignal` through layers where supported.
- Do not retry non-idempotent work without an idempotency strategy.
- Beware races between read-check-write operations; use constraints, atomic operations, locks, or transactions.
- Avoid holding database transactions open while waiting on remote services.

## Event loop and blocking work

Avoid synchronous APIs on request/event-consumer hot paths for:

- filesystem and child processes
- CPU-heavy crypto/compression/parsing
- huge JSON serialization/deserialization
- image/document processing
- large regular expressions with pathological inputs

For CPU-heavy work, consider worker threads, a job queue, a separate service, streaming, or preprocessing. Measure first.

## Streams

- Prefer `pipeline`/promise-based pipeline utilities to manual pipe chains.
- Handle source, transform, and destination errors.
- Respect backpressure and payload limits.
- Close/destroy resources on cancellation.
- Do not buffer large uploads/downloads unless size is explicitly bounded.

## Process lifecycle

A production service should normally:

1. validate configuration before listening
2. establish required dependencies or expose not-ready state
3. listen for termination signals
4. stop accepting new traffic/work
5. drain in-flight requests/jobs within a deadline
6. close queue consumers, pools, servers, telemetry, and other resources
7. exit non-zero after unrecoverable startup/runtime failure

Do not rely on `uncaughtException` or `unhandledRejection` as a recovery mechanism. Capture context, perform bounded shutdown if safe, and restart under a supervisor/orchestrator.

## Configuration

- Parse and validate environment variables once at startup.
- Distinguish missing, empty, invalid, and defaulted values.
- Avoid reading `process.env` throughout business code; inject typed configuration.
- Never log the full environment.
- Keep `.env.example` descriptive but secret-free.

## Dependency selection

Before adding a package:

- check whether Node or the existing stack already provides the capability
- inspect compatibility with the project's Node/module versions
- evaluate maintenance, security history, transitive weight, types, and license
- prefer a focused dependency over a broad toolkit when the need is narrow
- do not add two libraries for the same concern without a migration plan
