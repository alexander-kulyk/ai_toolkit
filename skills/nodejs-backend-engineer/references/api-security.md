# API design and security

## Contents

- [Boundary validation](#boundary-validation)
- [Error model](#error-model)
- [Authentication and authorization](#authentication)
- [Passwords, cookies, and proxy behavior](#passwords-and-sensitive-fields)
- [Injection and unsafe input](#injection-and-unsafe-input)
- [Webhooks, REST, and GraphQL](#webhooks)
- [Rate limiting and file handling](#rate-limiting-and-abuse-controls)

## Boundary validation

Validate every externally controlled value:

- path and query parameters
- headers and cookies
- JSON/form/multipart bodies
- filenames, paths, MIME types, and file size
- webhook payload and signature metadata
- queue/event messages
- environment/configuration
- third-party API responses before trusting important fields

Define limits for strings, arrays, nesting, pagination, uploads, and batch operations.

## Error model

Use stable public errors with:

- machine-readable code
- safe human-readable message
- field details only when appropriate
- request/correlation identifier

Keep internal cause, stack, SQL, hostnames, and sensitive values in protected logs—not responses.

Map expected domain/application errors deliberately. Unexpected errors should become a generic server error and be recorded once at the correct boundary.

## Authentication

Use the mechanism already approved by the project: server sessions, OAuth/OIDC, JWT access tokens, API keys, mTLS, or signed webhooks.

- verify issuer, audience, signature/algorithm, expiry, and not-before semantics for tokens
- define key rotation and revocation behavior
- keep access tokens short-lived where architecture supports it
- store session identifiers/tokens securely
- protect account recovery and credential-changing operations
- rate-limit sensitive authentication endpoints

## Authorization

Authentication answers who; authorization answers whether that actor may perform this action on this resource.

- enforce authorization server-side on every protected operation
- avoid role checks scattered across controllers; centralize policies where useful
- include resource ownership/tenant boundaries
- prevent IDOR/BOLA by loading/checking the requested resource under the actor's scope
- default deny
- test negative paths and cross-tenant access
- do not trust client-hidden buttons as authorization

## Passwords and sensitive fields

- Store password hashes, never plaintext passwords.
- Use established password-hashing algorithms/libraries and project-approved parameters.
- Keep auth credentials in a dedicated protected model/collection when separation improves exposure control; otherwise enforce strict projections and serializers.
- Mark secret fields excluded by default where the data layer supports it.
- Never return `passwordHash`, reset tokens, provider secrets, MFA secrets, refresh-token material, or encryption keys from endpoints.
- Avoid logging full user records.

## Cookies and browser APIs

For cookie-based auth, set `HttpOnly`, `Secure`, and an intentional `SameSite` policy. Understand domain/path scope and proxy/TLS termination. Add CSRF protection when browser credentials are sent automatically and the request can change state.

CORS is a browser access policy, not authentication. Use a precise origin policy and do not reflect arbitrary origins with credentials.

## Headers and proxy behavior

Use security headers appropriate to the response type. Configure proxy trust only for known proxies. Ensure client IP logic, secure-cookie detection, redirects, and rate limiting cannot be spoofed through untrusted forwarded headers.

## Injection and unsafe input

- parameterize SQL and database queries
- validate operators and field names used for dynamic filtering/sorting
- prevent NoSQL operator injection
- normalize and constrain filesystem paths; avoid using untrusted filenames directly
- avoid shell execution; when unavoidable, use argument arrays and strict allowlists
- protect outbound URL fetches against SSRF using scheme/host/network restrictions and redirect revalidation
- avoid evaluating user-supplied code, templates, expressions, or schemas

## Webhooks

1. read raw bytes if signature verification requires them
2. verify signature using provider rules
3. verify timestamp/replay window
4. authenticate source using more than IP allowlisting when possible
5. store/deduplicate event ID
6. acknowledge within provider deadline
7. process asynchronously if work is slow
8. make effects idempotent

## REST

- use nouns/resources and predictable status codes
- distinguish create, replace, and partial update semantics
- return `201` and location/identifier for successful creation where appropriate
- use bounded filtering/sorting fields
- define optimistic concurrency using versions/ETags when lost updates matter
- version intentionally; prefer backward-compatible evolution

## GraphQL

- validate auth at resolver/service boundaries; schema visibility is not authorization
- prevent excessive depth/complexity and unbounded lists
- batch/data-load to avoid N+1 queries while respecting tenant/auth boundaries
- avoid leaking internal errors through GraphQL extensions
- define persisted operations or other controls for public high-risk APIs when appropriate

## Rate limiting and abuse controls

Choose keys and limits by risk: IP, account, tenant, API key, operation, or combinations. Handle trusted proxies. Return useful retry metadata without revealing sensitive policy. Add stricter controls to login, recovery, expensive searches, exports, and bulk endpoints.

## File handling

- cap size and count before buffering
- verify content where risk requires it; do not trust extension/MIME alone
- generate server-side storage names
- store outside executable/public paths unless intentionally public
- scan or quarantine according to product requirements
- prevent zip bombs/path traversal during archive extraction
- stream large files and clean up partial writes
