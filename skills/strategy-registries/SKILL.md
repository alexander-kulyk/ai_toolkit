---
name: strategy-registries
description: 'Design, review, or refactor runtime behavior selection using Strategy, provider, policy, command, and adapter registries. Use across languages and frameworks when nested if/switch branches vary calls, payloads, sequencing, validation, or side effects by operation, provider, integration, tenant, region, document type, or another stable variant key; when adding variants repeatedly modifies an orchestrator; or when variant checks leak across layers. Do not use for loading/error control flow, markup-only differences, simple value lookups, temporary exceptions, or a stable two-case branch. Triggers: strategy pattern, strategy registry, provider registry, policy object, command registry, adapter registry, capability descriptor, replace conditional with polymorphism, open/closed principle, submit branching, per-provider logic, per-tenant logic.'
---

# Strategy Registries

Replace behavior branches with registries only when extension is a real requirement. Preserve behavior first; improve it in a separate change.

Use this distinction:

- Same shape, different data: use a data/config table.
- Same operation, different implementation: use a Strategy or provider registry.
- Different operations selected by a key: use a typed command/dispatcher registry.
- Different questions with no shared selection contract: keep separate modules.

## Apply the gate

Apply a registry only when all applicable conditions hold:

1. Confirm that variants differ in behavior, such as calls, payload construction, ordering, validation, or side effects.
2. Identify a stable, named selection key such as provider, operation, region, tenant, format, or document type.
3. Confirm that extension is expected. Prefer a direct branch for a closed, stable two-case decision.
4. Confirm that the registry removes repeated variant checks from more than one location or creates a deliberate extension boundary owned by an external contract.
5. Evaluate the gate per branch, not per file. Leave unrelated control flow alone.

Do not convert loading, error, empty, valid, retry, or lifecycle state into a registry. Those are control flow, not interchangeable variants.

## Choose the registry kind

| Kind | Use when | Contract rule |
| --- | --- | --- |
| Strategy/provider registry | Implementations answer the same operation differently | Require one substitutable contract |
| Policy registry | Rules vary by tenant, market, region, target, or jurisdiction | Return decisions or build policy-specific inputs |
| Command/dispatcher registry | A key selects a distinct operation | Allow a narrow input contract per literal key |
| Adapter registry | External clients expose incompatible APIs | Normalize them behind the application's contract |
| Capability descriptor | UI, validation, or configuration also varies by the same key | Store descriptive facts, not orchestration |

Do not force command handlers with genuinely different inputs into one union-shaped god context. Use the language's keyed typing mechanism when available, or keep an explicit dispatcher boundary.

## Separate independent axes

Map every branch before designing the registry. Separate independent dimensions instead of building compound keys.

| Axis | Example values | Responsibility |
| --- | --- | --- |
| Operation | create, cancel | Sequence the workflow |
| Provider | provider-a, provider-b | Perform the external operation |
| Policy scope | region-a, default | Enrich, permit, or block the operation |

Compose one small registry per independent axis. Use a compound or interaction-specific strategy only when the combination has irreducible behavior that cannot be expressed by composition. Document and test that decision.

## Refactor safely

1. Record a behavior matrix for every existing branch, including calls, order, payloads, results, errors, and cleanup.
2. Name each independent selection axis and identify its owner: code, configuration, server, vendor, regulator, or user input.
3. Select the registry kind for each axis.
4. Define the smallest honest contract for each registry. Keep provider strategies substitutable; allow command dispatchers to use per-key contexts.
5. Move each existing branch into a cohesive entry without changing its observable behavior.
6. Inject clients, repositories, clocks, stores, and lifecycle callbacks explicitly. Do not resolve framework globals or service locators inside entries.
7. Keep cross-variant orchestration, such as retry, cleanup, and shared ordering, in one orchestrator. Keep variant-specific behavior in the selected entry.
8. Decide unknown-key behavior explicitly. Do not introduce a default merely to avoid an error.
9. Replace the old branch with one registry resolution path and remove the duplicate implementation.
10. Run the verification matrix before making product or cleanup improvements.

## Handle unknown keys safely

Choose one policy and apply it consistently:

- Use an exhaustive registry for a closed set controlled by the application.
- Validate and reject an unknown external key when unsupported behavior must fail explicitly or fail closed. Prefer this for authentication, signing, payments, permissions, compliance, and destructive operations.
- Use a default or Null Object policy only when the domain defines legitimate neutral/default behavior. Test that default as a real supported case.

Never silently route an unknown provider to a different real provider.

## Keep entries honest

- Keep each entry cohesive and independently testable. It may contain its variant's business algorithm; it must not become a second orchestrator.
- Keep shared sequencing outside entries only when it is truly invariant across variants.
- Keep contexts narrow. Pass only the dependencies and values the selected entry consumes.
- Keep capability descriptors factual. Add a capability only for observed variability needed by a current consumer.
- Keep variant checks out of unrelated layers. If UI, validation, and execution branch on the same key, publish one capability source or policy contract they can share.
- Treat a remaining same-axis conditional beside a registry lookup as a review signal, not an automatic defect. Move it into the entry, model an interaction, or document why it must remain.
- Prefer localized extension over the slogan "one new variant equals one new line." Updating a closed enum, contract, registration, and tests can all be legitimate.

## Distinguish new work from refactoring

For new work:

- Start directly with one variant.
- Keep two stable, internally owned variants as a branch unless a third is specified.
- Introduce the registry earlier when the variant set is externally owned or the module exists specifically as an extension host.

For existing work:

- Verify the real variation axis from code and runtime behavior, not only from ticket wording.
- Preserve unreachable branches and quirks during extraction when removing them would change product behavior. Document them for a later change.
- Do not mix registry extraction with endpoint, payload, ordering, validation, or error-policy changes.

## Verify the result

Verify at least:

- Every previous branch maps to one new entry or an explicitly documented removal.
- Calls, ordering, payloads, return values, errors, cleanup, and side effects remain equivalent.
- Every entry has focused contract tests where the project supports them.
- Closed registries are exhaustive according to the language's type system or tests.
- Dynamically assembled or plugin-based registries reject duplicate keys during composition or startup.
- Unknown keys follow the chosen reject/default policy.
- A default policy, when present, has direct tests.
- Adding a representative variant is localized and does not require editing unrelated orchestration.
- No old and new execution paths remain active simultaneously.

## Do not use this pattern

Keep simpler code when the branch represents:

- Loading, error, empty, valid, retry, or lifecycle state.
- Labels, colors, icons, layout, or other data-only/presentation differences.
- A simple key-to-value lookup.
- A closed, stable two-case decision with no repeated leakage.
- A temporary exception already scheduled for removal.
- Operations with unrelated meaning and no useful shared dispatch boundary.

The registry must make extension safer enough to justify the extra lookup and file boundary.

## Load implementation references conditionally

- For TypeScript or React code, read [references/typescript-react.md](references/typescript-react.md).
- If available in the toolkit, use [data-driven-rendering](../data-driven-rendering/SKILL.md) for presentation-only variants and [react-anti-patterns](../react-anti-patterns/SKILL.md) when branching is part of a React god component.
