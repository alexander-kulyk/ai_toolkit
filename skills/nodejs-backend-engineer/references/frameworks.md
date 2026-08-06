# Frameworks

Read only the section for the repository's framework and installed major version.

## Express

- Preserve middleware order: proxy/tracing → security/body limits → auth context → routes → not-found → error handler.
- Make async errors reach the central error handler according to the installed Express version and repository wrapper pattern.
- Keep route handlers thin; parse/validate before invoking application logic.
- Configure `trust proxy` only for known deployment topology because it affects client IP, secure cookies, and rate limiting.
- Apply explicit request size limits and safe file-upload handling.
- Use a final four-argument error middleware and map known errors to stable public responses.
- Do not return stack traces or raw errors in production.
- Add graceful shutdown around the HTTP server and dependency pools.

## Fastify

- Use plugins for encapsulation and lifecycle ownership.
- Define route schemas for validation and response serialization.
- Keep shared schemas versioned and registered in the correct encapsulation scope.
- Never treat user-provided schemas as trusted executable configuration.
- Use hooks for cross-cutting behavior, but avoid hiding business logic in hooks.
- Decorate server/request/reply intentionally and respect plugin dependency order.
- Prefer `inject` for fast application-level tests.
- Verify plugin compatibility with the installed Fastify major version.

## NestJS

### Responsibilities

- Controllers/resolvers: transport mapping only.
- Providers/services/use cases: application behavior.
- Guards/policies: authentication/authorization decisions.
- Pipes or schema adapters: validation and transformation.
- Exception filters: transport-specific error mapping.
- Interceptors: cross-cutting behavior such as response mapping, timing, caching, or transactions only when lifecycle semantics are clear.
- Middleware: low-level request preprocessing that does not need Nest execution context.

### Modules and dependency injection

- Organize modules around capabilities, not technical file types alone.
- Export the smallest public provider surface.
- Avoid circular module/provider dependencies; refactor boundaries before using `forwardRef` as a default fix.
- Use singleton scope unless request/transient scope is required; scoped providers have performance and lifecycle implications.
- Use dynamic modules for configurable reusable modules, not for ordinary feature wiring.
- Keep bootstrap configuration explicit and testable.

### Validation

- Use concrete runtime DTO classes when using decorator-based validation, or an established schema integration already present in the project.
- Consider whitelist and rejection of unexpected fields for public write endpoints.
- Ensure transforms do not silently coerce unsafe/ambiguous values.
- Validate route params, query data, arrays, nested objects, and files, not only bodies.

### Data and transactions

- Keep ORM entities/models from becoming API DTOs by default.
- Put transaction ownership at the application operation that needs atomicity.
- Avoid hidden transactions in generic interceptors unless all nested behavior and external I/O are understood.

### Testing

- Unit-test providers with focused dependencies.
- Use testing modules when DI behavior matters.
- Add e2e tests for guards, pipes, filters, interceptors, and serialization behavior that unit tests cannot prove.

## Koa

- Understand onion middleware order: code before and after `await next()` has different timing and error behavior.
- Put a top-level error boundary early in the middleware chain.
- Use explicit validation/body size limits and avoid mutating shared global context.
- Keep framework context out of domain/application logic.

## Hapi

- Use route validation, lifecycle extensions, auth strategies, and plugins according to their intended phases.
- Keep plugin registration order and dependencies explicit.
- Map internal errors to safe public responses.

## Other frameworks

For AdonisJS, LoopBack, Feathers, Moleculer, tRPC servers, serverless handlers, or internal frameworks:

1. identify official lifecycle and extension points
2. inspect established project conventions
3. preserve framework-native dependency injection, validation, and error handling
4. verify installed-version behavior from official docs/types/source
5. apply the universal rules from `SKILL.md` without forcing Express/Nest patterns onto a different framework
