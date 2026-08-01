---
name: feature-sliced-design
description: >
  Feature-Sliced Design (FSD) architecture rules for CRM-test-task's four-layer
  frontend setup: app, pages, features, shared. Use whenever creating, placing,
  reviewing, or refactoring frontend code that follows FSD: deciding which layer
  a module belongs to, creating slices and segments, wiring public API barrels,
  or checking layer import direction. Triggers on any mention of FSD, layers,
  slices, segments, app/pages/features/shared, ui/api/model/lib/config segments,
  public API (index.ts), or "where should this code live". Enforce the layer
  order, slice isolation, and public-API rules automatically.
---

# Feature-Sliced Design (FSD) - CRM-test-task setup

This project uses FSD with four active layers:

```
app -> pages -> features -> shared
```

`widgets` and `entities` are not in use yet. Add them only when a real need
appears, following the full FSD order:

```
app -> pages -> widgets -> features -> entities -> shared
```

FSD organizes code as a strict hierarchy: layers -> slices -> segments. Apply
all three core rules: import direction, slice isolation, and public API.

Reference: https://fsd.how

---

## 1. The hierarchy

```
src/
├── app/                    layer (segments directly, no slices)
│   ├── providers/          segment
│   ├── router/             segment
│   └── styles/             segment
├── pages/                  layer
│   ├── HomePage/           slice
│   │   ├── ui/             segment
│   │   ├── config/         segment
│   │   └── index.ts        public API
│   └── CalendarPage/       slice
│       ├── ui/             segment
│       └── index.ts        public API
├── features/               layer
│   ├── lead-form/          slice
│   │   ├── ui/             segment
│   │   ├── model/          segment
│   │   ├── config/         segment
│   │   └── index.ts        public API
│   └── calendar/           slice
│       ├── ui/             segment
│       ├── model/          segment
│       ├── config/         segment
│       ├── lib/            segment
│       └── index.ts        public API
└── shared/                 layer (segments directly, no slices)
    ├── components/         segment
    ├── context/            segment
    └── lib/                segment, when needed
```

Rules:

1. Layer names are standardized top-level folders.
2. `pages` and `features` have slices.
3. `app` and `shared` have segments directly, not slices.
4. Code inside a slice is grouped by technical-purpose segments.

---

## 2. Layers and responsibilities

| Layer | Purpose | Has slices? |
| --- | --- | --- |
| `app` | App-wide infrastructure: providers, routing, global styles, entry wiring | No |
| `pages` | Route targets and page-level composition | Yes |
| `features` | Reusable business features that own UI, model, and feature logic | Yes |
| `shared` | Project-agnostic reusable UI, context, utilities, clients, primitives | No |

## 3. Import direction

The import-direction rule is non-negotiable:

```
app -> pages -> features -> shared
```

- `app` may import from `pages`, `features`, and `shared`.
- `pages` may import from `features` and `shared`.
- `features` may import from `shared`.
- `shared` must not import from `app`, `pages`, or `features`.

Same-layer cross-slice imports are forbidden:

- A page slice must not import another page slice.
- A feature slice must not import another feature slice.
- If two slices need the same code, move that code down to `shared` or introduce
  the proper FSD layer when justified.

Imports within the same slice are allowed only for that slice's own internals.

---

## 4. Slices

Slices exist only inside `pages` and `features`.

Page slices:

- Represent full route targets or nested-route page areas.
- Stay thin: compose features and shared UI, avoid deep business logic.
- Are exported through `pages/<slice>/index.ts`.

Feature slices:

- Represent reusable business capabilities such as `calendar` or `lead-form`.
- Own their UI, model, config, and feature-specific helpers.
- Are exported through `features/<slice>/index.ts`.
- Must not depend on pages or other feature slices.

---

## 5. Segments

Segments group code by technical purpose. Prefer these names:

| Segment | Contains |
| --- | --- |
| `ui` | Components, co-located styled-components files, view helpers |
| `model` | Data model, schemas, stores, hooks, repositories, business logic |
| `api` | Backend/client interactions, request functions, mappers |
| `lib` | Slice-local helper code and utilities |
| `config` | Constants, configuration, feature flags |

`app` commonly uses `providers`, `router`, and `styles`.
`shared` commonly uses `components`, `context`, `lib`, and `api`.
Custom segment names in `app` and `shared` are acceptable when they describe a
technical purpose clearly.

---

## 6. Public API

Every slice and consumed shared segment exposes its public surface through an
`index.ts` barrel.

Consumers import from the public API, not from internals:

```ts
// Good
import { CalendarView, useInitDatabase } from '../../features/calendar';
import { ErrorMessage, PageStack } from '../../shared/components';

// Bad: bypasses the slice public API
import { CalendarView } from '../../features/calendar/ui/CalendarView/CalendarView';
import { PageStack } from '../../shared/components/Page/styled';
```

Keep public API barrels minimal. Export only what other layers or slices are
allowed to consume. Private helpers stay private.

Inside a slice, importing from the slice's own segments is allowed.

---

## 7. Placement guide

Ask in order:

1. Is it app-wide infrastructure? Put it in `app/<segment>`.
2. Is it a full route target? Put it in `pages/<page-slice>/<segment>`.
3. Is it a reusable business capability? Put it in `features/<feature-slice>/<segment>`.
4. Is it project-agnostic reusable code? Put it in `shared/<segment>`.

If code does not fit cleanly, do not force it into an existing layer. Introduce
the proper FSD layer (`widgets` or `entities`) only when the need is real.

---

## 8. Common FSD smells

- Cross-imports between page slices or feature slices.
- Upward imports from `shared` to `features/pages/app`, or from `features` to
  `pages/app`.
- Bypassing public APIs with deep imports from outside a slice or shared segment.
- Files dumped directly in page/feature slice roots instead of `ui`, `model`,
  `lib`, `config`, or `api`.
- Slices inside `app` or `shared`.
- Business-domain code placed in `shared`.

---

## Quick Reference

| Rule | Statement |
| --- | --- |
| Layers in use | `app`, `pages`, `features`, `shared` |
| Direction | `app -> pages -> features -> shared` |
| Page slices | In `pages`, isolated from each other |
| Feature slices | In `features`, isolated from each other |
| App/shared | Segments directly, no slices |
| Public API | Consume slices and shared segments through `index.ts` |
| Segments | `ui`, `model`, `api`, `lib`, `config` |
