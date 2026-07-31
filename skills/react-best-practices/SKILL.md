---
name: react-best-practices
description: 'Enforce React coding standards when writing or reviewing components, hooks, and utilities. Use when: creating React components, reviewing React code, refactoring components, writing custom hooks, fixing code style violations, checking file size limits, ensuring strict typing. Triggers: React review, component code review, check best practices, refactor component, create component, new hook, fix code style, no logic in JSX, extract hook, custom hook, lodash isEqual, JSON.stringify comparison, 250 lines limit, styled-components, React.FC, interface props, descriptive naming, no short names, no abbreviations, rename ctx, short variable names, destructuring, destructure props, state colocation, moving state down, isolate re-renders, reselect selectors, memoized selector, createSelector, typed store, IStore, no inline useSelector, selectors barrel, async thunk, createAsyncThunk, createAppAsyncThunk, thunk factory, thunk error handling, rejectWithValue.'
argument-hint: 'File path or component name to review/create (optional)'
---

# React Best Practices

Strict rules for writing React components, hooks, and utilities. All new code **must** follow these conventions.

---

## 1. Components — Functional Only, Typed with `React.FC`

Every component must be a functional component typed with `React.FC<IProps>`.

```typescript
import React from 'react';

interface IMyComponentProps {
  title: string;
  onClose: () => void;
  isVisible?: boolean;
}

export const MyComponent: React.FC<IMyComponentProps> = ({ title, onClose, isVisible = true }) => {
  // ...
  return <S.Wrapper>{/* markup */}</S.Wrapper>;
};
```

### Rules

- **Always `React.FC<IProps>`** — not `FC`, not plain functions, not class components
- **Props typed with `interface`** — not `type`. Use `I`-prefix: `IMyComponentProps`
- **Destructure props** in the function signature
- **Default values** in destructuring, not `defaultProps`
- **One component per file** — the file is named after the component: `MyComponent.tsx`

---

## 2. No Logic in JSX

JSX must be declarative markup only. No inline computations, no complex expressions.

### Forbidden

```typescript
// BAD: inline handler logic
<Button
  onClick={() => {
    setIsOpen(false);
    dispatch(actions.reset());
    onClose();
  }}
/>;

// BAD: inline conditional logic
{
  items.length > 0 && isActive && userPermissions.includes('edit') && (
    <ComplexSection items={items.filter(i => i.status === 'active')} />
  );
}

// BAD: inline computation
<Text>{`${user.firstName} ${user.lastName} (${user.role.toLowerCase()})`}</Text>;
```

### Required

```typescript
// GOOD: handler in a named function
const handleClose = (): void => {
  setIsOpen(false);
  dispatch(actions.reset());
  onClose();
};

<Button onClick={handleClose} />;

// GOOD: complex condition extracted to a variable or component
const shouldShowSection = items.length > 0 && isActive && userPermissions.includes('edit');
const activeItems = items.filter(i => i.status === 'active');

{
  shouldShowSection && <ComplexSection items={activeItems} />;
}

// GOOD: computed value extracted
const fullName = `${user.firstName} ${user.lastName} (${user.role.toLowerCase()})`;

<Text>{fullName}</Text>;
```

### Rules

- **Event handlers** — always a separate named function (`handleClick`, `onSubmit`, `handleDismiss`)
- **Conditional rendering** — extract complex conditions to a `const` boolean variable
- **Computed values** — extract to `const` or `useMemo` before the return
- **Ternaries in JSX** — only for simple A/B rendering. If more than 2 branches, extract to a sub-component
- **`.map()` callbacks** — allowed inline only if the body is a single JSX element. Otherwise extract to a named render function or sub-component

---

## 3. Declarative Rendering — Split Complex Markup into Components

If a conditional block renders different markup based on a condition, extract it into a separate component. Keep components compact and focused.

### Forbidden

```typescript
// BAD: complex branching inline
return (
  <div>
    {isLoading ? (
      <Spinner />
    ) : error ? (
      <div>
        <Icon name='error' />
        <Text>{error.message}</Text>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    ) : data?.length === 0 ? (
      <EmptyState message={localization.noItems} />
    ) : (
      <List items={data} onSelect={handleSelect} />
    )}
  </div>
);
```

### Required

```typescript
// GOOD: extracted into focused components
const ErrorState: React.FC<IErrorStateProps> = ({ error, onRetry }) => (
  <S.ErrorWrapper>
    <Icon name='error' />
    <Text>{error.message}</Text>
    <Button onClick={onRetry}>Retry</Button>
  </S.ErrorWrapper>
);

// Main component — clean and scannable
return (
  <div>
    {isLoading && <Spinner />}
    {error && <ErrorState error={error} onRetry={handleRetry} />}
    {!isLoading && !error && data?.length === 0 && <EmptyState message={localization.noItems} />}
    {!isLoading && !error && data?.length > 0 && <List items={data} onSelect={handleSelect} />}
  </div>
);
```

> **N similar variants selected by a key?** When several branches render the **same shape** with only different data/handlers (e.g. reject/delete/revoke modals, status badges, tabs), don't extract N components or a `switch` — drive one render from a config table. See the [data-driven-rendering skill](../data-driven-rendering/SKILL.md).

---

## 4. Custom Hooks — Extract State + Logic

When a component has state and related functions (handlers, effects, computations), extract them into a custom hook in a `hooks/` directory at the same level.

### Hook Structure

```typescript
// hooks/useFeatureName.ts
import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

interface IUseFeatureNameParams {
  documentId: string;
  moduleId: string;
}

interface IUseFeatureNameReturn {
  values: {
    data: IFeatureData[] | null;
    isLoading: boolean;
  };
  handlers: {
    handleCreate: (params: ICreateParams) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
  };
}

export const useFeatureName = ({ documentId, moduleId }: IUseFeatureNameParams): IUseFeatureNameReturn => {
  const dispatch = useDispatch();
  const data = useSelector(selectors.feature.getData);
  const isLoading = useSelector(selectors.feature.getIsLoading);

  const handleCreate = useCallback(
    async (params: ICreateParams): Promise<void> => {
      await dispatch(thunks.feature.create({ ...params, documentId }));
    },
    [dispatch, documentId]
  );

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      await dispatch(thunks.feature.delete({ id, moduleId }));
    },
    [dispatch, moduleId]
  );

  return {
    values: { data, isLoading },
    handlers: { handleCreate, handleDelete },
  };
};
```

### Component Using the Hook

```typescript
export const FeaturePanel: React.FC<IFeaturePanelProps> = ({ documentId, moduleId }) => {
  const { values, handlers } = useFeatureName({ documentId, moduleId });

  return (
    <S.Wrapper>
      {values.isLoading ? <Spinner /> : <FeatureList data={values.data} onDelete={handlers.handleDelete} />}
    </S.Wrapper>
  );
};
```

### Rules

- **Hook params** — typed with `interface IUseXxxParams`
- **Hook return** — typed with `interface IUseXxxReturn` or `IUseXxxRes`
- **Return structure** — use `{ values, handlers }` pattern for clarity, or flat object for simple hooks
- **Hook file location** — `hooks/useFeatureName.ts` at the same level as the component using it
- **Barrel export** — `hooks/index.ts` re-exports all hooks
- **One concern per hook** — don't mix unrelated state. Create multiple hooks if needed
- **`useCallback`** for all handler functions to maintain referential stability
- **`useMemo`** for derived/computed values

---

## 5. DRY and Encapsulation

### Rules

- **Never duplicate logic** — if code appears in 2+ places, extract to a shared utility or hook
- **Shared hooks** go in `src/hooks/` (project-wide) or page-level `hooks/` (page-specific)
- **Shared utilities** go in `src/utils/` or component-level `utils/`
- **Encapsulate complexity** — complex data transformations go in `utils/`, not inline in components or hooks
- **Reuse existing utilities** — check `src/utils/` and component `utils/` before creating new ones

### Utility Function Pattern

```typescript
// utils/transformData.ts
export const transformItems = (items: IRawItem[]): IDisplayItem[] =>
  items.map(item => ({
    id: item.Id,
    label: `${item.FirstName} ${item.LastName}`,
    isActive: item.Status === ItemStatus.Active,
  }));
```

---

## 6. No `JSON.stringify` for Comparison

**Forbidden:**

```typescript
// BAD
if (JSON.stringify(currentFilters) !== JSON.stringify(newFilters)) { ... }

// BAD — in dependency arrays
useEffect(() => { ... }, [JSON.stringify(filters)]);

// BAD — in useMemo deps
const data = useMemo(() => ..., [JSON.stringify(params)]);
```

**Required:**

```typescript
import isEqual from 'lodash/isEqual';

// GOOD — object comparison
if (!isEqual(currentFilters, newFilters)) { ... }

// GOOD — in useEffect with useRef for previous value
const prevFiltersRef = useRef(filters);

useEffect(() => {
  if (!isEqual(prevFiltersRef.current, filters)) {
    prevFiltersRef.current = filters;
    loadData(filters);
  }
}, [filters, loadData]);
```

Use `import isEqual from 'lodash/isEqual'` — not `import _ from 'lodash'`.

---

## 7. Strict Typing — Everything Typed via Interfaces

### Rules

- **All props** — `interface IComponentProps`
- **All hook params** — `interface IUseHookParams`
- **All hook returns** — `interface IUseHookReturn`
- **All state** — explicitly typed: `useState<IMyData | null>(null)`
- **All event handlers** — typed parameters and return: `const handleClick = (id: string): void => { ... }`
- **All utility functions** — typed input and output
- **Use `interface`** for object shapes — not `type` (unless union/intersection is required)
- **Use `I`-prefix** for interfaces: `IDocumentCard`, `IUserFilterStore`
- **No `any`** — use `unknown` if type is truly unknown, then narrow
- **Selectors** — never inline; always memoized `reselect` selectors read through the typed `selectors` barrel (see §15): `useSelector(selectors.feature.selectData)`

### Naming Conventions

```
IComponentNameProps    — component props
IUseHookNameParams    — hook input
IUseHookNameReturn    — hook output
IFeatureNameData      — data shapes
IFeatureNameStore     — store slice state
```

---

## 8. File Size Limit — 250 Lines Maximum

No file may exceed 250 lines. If it does, split:

- **Business logic** → custom hook (`hooks/useFeatureName.ts`)
- **Data transformation** → utility (`utils/transformData.ts`)
- **Sub-sections of markup** → sub-components (`components/SubSection.tsx`)
- **Constants** → constants file (`constants/settings.ts`)
- **Types** → types file (`types/interfaces/IFeature.ts`)

---

## 9. Folder Structure

Every component feature follows this structure:

```
FeatureName/
  FeatureName.tsx       -- Main component (React.FC<IProps>)
  styled.ts             -- Styled-components
  index.ts              -- Barrel: export * from './FeatureName'
  components/           -- Sub-components (optional)
    SubComponent/
      SubComponent.tsx
      styled.ts
      index.ts
  hooks/                -- Custom hooks (optional)
    useFeatureLogic.ts
    index.ts
  types/                -- TypeScript interfaces (optional)
    interfaces/
      IFeatureProps.ts
    index.ts
  utils/                -- Helper functions (optional)
    transformData.ts
    index.ts
  constants/            -- Constants (optional)
    settings.ts
    index.ts
```

### Barrel Export Pattern

Every folder has an `index.ts`:

```typescript
// FeatureName/index.ts
export * from './FeatureName';

// hooks/index.ts
export * from './useFeatureLogic';

// types/index.ts
export * from './interfaces';
```

---

## 10. Styled-Components

### Rules

- **One `styled.ts` per component folder** — not inline, not in a shared file
- **Type dynamic props** with generics
- **Use `spTheme`** tokens for colors, spacing — not hardcoded values
- **Import as `S`** in components: `import * as S from './styled'`

### Example

```typescript
// styled.ts
import styled, { css } from 'styled-components';
import { spTheme } from '@smartpoint/library-components/build';
import { IScreenOrientation } from '../../../types';

export const Wrapper = styled.div<{ isActive: boolean }>`
  padding: 8px 16px;
  background-color: ${spTheme.white};
  border: 1px solid ${props => (props.isActive ? spTheme.themePrimary : spTheme.neutralLight)};
`;

export const Content = styled.div<{ screenOrientation?: IScreenOrientation }>`
  display: flex;
  flex-direction: column;

  ${props =>
    props?.screenOrientation?.isMobile &&
    css`
      max-height: 60vh;
      overflow-y: auto;
    `}
`;
```

```typescript
// Component usage
import * as S from './styled';

export const MyComponent: React.FC<IMyComponentProps> = ({ isActive, children }) => (
  <S.Wrapper isActive={isActive}>
    <S.Content>{children}</S.Content>
  </S.Wrapper>
);
```

---

## 11. Memoization

### Rules

- **`useCallback`** — for all handler functions passed as props or used in dependency arrays
- **`useMemo`** — for derived/computed values, filtered/mapped arrays, formatted data
- **Dependencies must be correct** — include all referenced values, never suppress ESLint warnings

```typescript
const activeItems = useMemo(() => items.filter(item => item.status === Status.Active), [items]);

const handleSelect = useCallback(
  (id: string): void => {
    dispatch(thunks.feature.select({ id }));
  },
  [dispatch]
);
```

---

## 12. Descriptive Naming — No Short Names

Props, params, variables, functions and types must have full, descriptive names. Abbreviations and one/two-letter names are forbidden — the reader must never have to expand a name in their head.

**The only permitted short name is `e`, and only for a caught error** (`catch (e)`). Everything else is spelled out.

### Forbidden

```typescript
// BAD: abbreviated params / variables
const submit = async (ctx: ISubmitContext) => { ... };   // ctx
const rule = rules[ts?.[0]?.fieldType];                   // ts
items.forEach((el, idx) => { ... });                      // el, idx
const res = await api.getData();                          // res
const cb = () => onClose();                               // cb
const btn = <Button />;                                   // btn
const usr = useSelector(selectors.user.getCurrent);       // usr
```

### Required

```typescript
// GOOD: full descriptive names
const submit = async (context: ISubmitContext) => { ... };
const rule = rules[targetSystem?.[0]?.fieldType];
items.forEach((item, index) => { ... });
const response = await api.getData();
const handleClose = () => onClose();
const button = <Button />;
const currentUser = useSelector(selectors.user.getCurrent);

// GOOD: the ONE allowed short name — a caught error
try {
  await save();
} catch (e) {
  dispatch(actions.errors.setError(e));
}
```

### Rules

- **No abbreviations** — write `context` not `ctx`, `index` not `idx`, `event` not `ev`/`evt`, `response` not `res`, `request` not `req`, `element` not `el`, `callback` not `cb`, `value` not `val`, `array` not `arr`, `object` not `obj`, `button` not `btn`, `message` not `msg`, `config` not `cfg`, `temp` not `tmp`
- **No single letters** for props, params or variables — including loop variables (`item`/`index`, not `i`)
- **Only exception:** `e` for a caught error in a `catch (e)` block. Prefer `error` even here when it reads clearer; never use `e` for anything that is not an error
- **Type params** get meaningful names when their role matters (`TFormValues`, not just `T`, when a bare `T` would be ambiguous)

---

## 13. Prefer Destructuring

Destructure props, params and objects instead of repeated dotted access. It shortens code, surfaces exactly which fields are used, and avoids a noisy prefix on every line.

### Forbidden

```typescript
// BAD: repeated dotted access
const sendStrategy = async (context: ISendSubmitContext): Promise<void> => {
  const params = getSendParameters({
    selectedFiles: context.selectedFiles,
    documentId: context.documentId,
    recipients: context.recipients,
    values: context.values,
  });

  await context.send({ webSettings: context.webSettings, aadClient: context.aadClient, params });
};
```

### Required

```typescript
// GOOD: destructure once, use the fields directly
const sendStrategy = async (context: ISendSubmitContext): Promise<void> => {
  const { selectedFiles, documentId, recipients, values, send, webSettings, aadClient } = context;

  const params = getSendParameters({ selectedFiles, documentId, recipients, values });

  await send({ webSettings, aadClient, params });
};
```

### Rules

- **Props** — destructure in the component signature (see §1); **hook params** — destructure in the hook signature (see §4)
- **Objects used more than once** — destructure the fields at the top of the function rather than repeating `object.field`
- **Object shorthand** — when a variable feeds a same-named property, use `{ field }` not `{ field: object.field }`
- **Keep the whole object only when you must pass it through** — e.g. `provider.signSingle(context)` needs the full object, so keep `context` named and also destructure the leaf fields you read locally
- **Don't over-destructure** — if a field is used exactly once and destructuring adds no clarity, a single `object.field` read is fine; don't destructure a value only to pass it straight on unchanged

---

## 14. State Colocation — Move State Down to Isolate Re-renders

Keep state as close as possible to where it is actually used. When a piece of state (and the markup that depends on it) lives in a parent, **every change re-renders the whole parent subtree** — even the parts that don't care about that state. Move the state *and* its markup into a dedicated child so the change re-renders only that child.

This is the **"moving state down" / state colocation** pattern. The extracted child becomes a **re-render boundary**.

### Why it matters

- A `setState` re-renders the component that owns the state **and its entire subtree**.
- If that state only drives one small widget (a menu, a tooltip, an input), keeping it in the parent forces expensive siblings (lists, cards, personas) to re-render on every toggle/keystroke.
- Colocating the state isolates the re-render to that widget, leaving the heavy siblings untouched — **no `React.memo` needed**.

### Forbidden — state in the parent re-renders the whole card

```typescript
// BAD: menu-only state lives in the parent
export const CardFlow: React.FC<ICardFlowProps> = ({ task, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // ❌ state that only the menu needs

  return (
    <S.Card>
      <EmployeeCard persona={task.persona} /> {/* re-renders on every menu toggle */}
      <StatusBlock status={task.status} />     {/* re-renders on every menu toggle */}

      <MenuButton isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(prev => !prev)} />
      {isMenuOpen && <Menu options={options} onClose={() => setIsMenuOpen(false)} />}
    </S.Card>
  );
};
```

Toggling `isMenuOpen` re-renders `CardFlow`, and therefore `EmployeeCard` and `StatusBlock`, even though neither depends on the menu.

### Required — state colocated in a dedicated child

```typescript
// GOOD: CardFlowMenuButton owns the menu state and its markup
export const CardFlowMenuButton: React.FC<ICardFlowMenuButtonProps> = ({ task, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // ✅ state lives where it is used

  const options = useMemo(() => getMenuOptions({ task, onDelete }), [task, onDelete]);

  return (
    <>
      <S.MenuButton onClick={() => setIsMenuOpen(prev => !prev)} isActive={isMenuOpen} />
      {isMenuOpen && <Menu options={options} onClose={() => setIsMenuOpen(false)} />}
    </>
  );
};

// GOOD: CardFlow holds no menu state — heavy siblings never re-render on toggle
export const CardFlow: React.FC<ICardFlowProps> = ({ task, onDelete }) => (
  <S.Card>
    <EmployeeCard persona={task.persona} /> {/* untouched when the menu toggles */}
    <StatusBlock status={task.status} />     {/* untouched when the menu toggles */}
    <CardFlowMenuButton task={task} onDelete={onDelete} />
  </S.Card>
);
```

Now toggling the menu re-renders only `CardFlowMenuButton`; `CardFlow`, `EmployeeCard` and `StatusBlock` are left alone.

### When you can't move state down — lift content up instead

If the state must stay in the parent (siblings read it), don't give up the optimization — extract the heavy markup and pass it through as `children` (composition). A parent's re-render does **not** re-render `children` it received as props, because those elements keep the same reference.

```typescript
// GOOD: expensive subtree passed as children — stable across the parent's own state changes
export const Expandable: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <S.Wrapper>
      <S.Toggle onClick={() => setIsExpanded(prev => !prev)} />
      {isExpanded && children} {/* `children` reference is stable across isExpanded changes */}
    </S.Wrapper>
  );
};

<Expandable>
  <ExpensiveTree /> {/* created by the parent above, so it doesn't re-render on toggle */}
</Expandable>;
```

### Rules

- **Colocate state** — declare `useState` in the smallest component that reads it, not in a shared ancestor
- **Move state down** — if state and its markup only serve one branch of the tree, extract that branch into its own component and put the state there
- **The extracted child is a re-render boundary** — heavy siblings above it stop re-rendering on that state change, with no `React.memo`
- **Can't move it down? Lift content up** — pass the expensive subtree as `children`/props so the stateful parent's re-render skips it
- **Prefer this over `React.memo`** — colocation and composition remove the re-render at the source; reach for `memo` only when neither fits

---

## 15. Selectors — Memoized via `reselect`, Read Through the Typed Store

Redux state is read **only** through named, memoized selectors created with `reselect` (`createSelector` from `@reduxjs/toolkit`), and consumed through the typed `selectors` barrel. Inline `useSelector` arrows that reach into the store are forbidden, and the store root **must** be typed (`IStore`) — never an implicit `any`.

### Forbidden

```typescript
// BAD: inline selector reaching into the store
const isLoading = useSelector((state: IStore) => state.modal.general.flow.isLoading);

// BAD: inline arrow that derives — returns a NEW reference every dispatch, breaks memoization
const activeTemplates = useSelector((state: IStore) =>
  state.modal.general.flow.templates.filter(template => template.isActive)
);

// BAD: untyped self-selector — store is implicit `any`, drifts silently when the shape changes
const selectSelf = state => state?.flow;
```

### Required

```typescript
// store/modal/general/flow/selectors.ts — memoized, typed against the store root
import { createSelector } from '@reduxjs/toolkit';
import { IStore } from '../../../../../types';

const selectSelf = (state: IStore) => state.modal.general.flow; // ✅ typed store, single source

export const selectIsLoading = createSelector(selectSelf, flow => flow.isLoading);
export const selectCurrentTemplate = createSelector(selectSelf, flow => flow.currentTemplate);
export const selectActiveTemplates = createSelector(selectSelf, flow =>
  flow.templates.filter(template => template.isActive)
); // ✅ derivation memoized inside the selector, not in the component
```

```typescript
// component / hook — consume through the typed selectors barrel
const isLoading = useSelector(selectors.modal.general.flow.selectIsLoading);
const activeTemplates = useSelector(selectors.modal.general.flow.selectActiveTemplates);
```

### Why

- **Memoization / re-renders.** An inline arrow that derives (`.filter`, `.map`, `{ ... }`, `[ ... ]`) returns a new reference on every dispatch, so `useSelector` re-renders the component every time **any** action fires. `createSelector` caches and returns the same reference until its inputs change.
- **Typed store.** `(state: IStore) => …` gives full type-checking and autocomplete down the path; an untyped `state => state?.flow` is implicit `any` and silently rots when the slice shape changes.
- **Reuse & testing.** A named selector is defined once, reused everywhere, and unit-testable in isolation; inline selectors are copy-pasted logic scattered across components.
- **Single source of truth.** Derivation lives in the selector, so every consumer sees the same computed value — no drift between components that each re-derive it.

### Rules

- **Never inline** — no `useSelector((state) => …)`. Always `useSelector(selectors.<slice>.selectXxx)`.
- **Always `reselect`** — every selector is a `createSelector`, even simple reads, so the boundary is uniform and refactor-safe.
- **Typed store** — the self/input selector is typed `(state: IStore) => …`; no implicit `any`.
- **Colocate** — selectors live in `selectors.ts` next to their slice and are exposed via the `selectors` barrel.
- **Name `selectXxx`** — memoized selectors are prefixed `select`.
- **Derive inside the selector** — filtering/mapping/formatting belongs in `createSelector`, not recomputed in the component (this is also where [§11 Memoization](#11-memoization) derived-value work moves for store data).

---

## 16. Async Thunks — Wrap `createAsyncThunk` in a Shared App Factory

Async thunks are created through **one app-level thunk factory** — a higher-order function around `createAsyncThunk` that centralizes error handling, the reject contract, and typing — never raw `createAsyncThunk` copy-pasted per slice with ad-hoc (or missing) try/catch.

> **Portability.** The pattern is universal; the concrete factory is per-project. In this codebase family it is `createAppAsyncThunk`. **If your project provides such a factory, all thunks go through it. If it does not, introduce the pattern rather than scattering raw `createAsyncThunk` — and until then, raw `createAsyncThunk` with explicit, consistent error handling is the fallback.**

### Forbidden

```typescript
// BAD: raw createAsyncThunk with hand-rolled (or forgotten) error handling, repeated in every slice
export const fetchDocument = createAsyncThunk(
  'document/fetch',
  async (id: string, { dispatch, rejectWithValue }) => {
    try {
      return await api.getDocument(id);
    } catch (e) {
      dispatch(actions.setError(e.data));   // ❌ copy-pasted everywhere, easy to forget or let drift
      return rejectWithValue(e);
    }
  }
);
```

### Required

```typescript
// GOOD: the shared factory owns the try/catch, error dispatch, reject contract, and generics
export const fetchDocument = createAppAsyncThunk<IDocument, string>({
  typePrefix: 'document/fetch',
  callBack: (id, appThunkConfig) => api.getDocument(id),   // callback is the happy path only
  actions,                                                 // slice actions providing setError
});
```

Reference implementation of the factory (the piece each project provides once):

```typescript
export const createAppAsyncThunk = <Returned, Params = void, RejectedValue = string>({
  typePrefix,
  callBack,
  actions,
}: IThunkCreatorParams<Returned, Params, RejectedValue>): AsyncThunk<Returned, Params, IAppThunkConfig<RejectedValue>> => {
  const payload: AsyncThunkPayloadCreator<Returned, Params, IAppThunkConfig<RejectedValue>> = async (
    params,
    appThunkConfig
  ) => {
    try {
      return (await callBack(params, appThunkConfig)) as Returned;
    } catch (e) {
      appThunkConfig.dispatch(actions.setError(e.data));   // ✅ one error contract, defined once
      return appThunkConfig.rejectWithValue(e as RejectedValue);
    }
  };

  return createAsyncThunk(typePrefix, payload);
};
```

### Why

- **One error contract.** Every thunk dispatches the same error action and returns `rejectWithValue` — no thunk silently swallows or forgets failure handling.
- **No boilerplate.** Slice thunks contain only the request; the try/catch lives once in the factory.
- **Typed end to end.** The `Returned / Params / RejectedValue` generics and the app thunk config are fixed in one place, so call sites stay type-safe.
- **Refactor-safe.** Change the global error policy once in the factory and every thunk inherits it.

### Rules

- **Never raw `createAsyncThunk` in a slice** when the project has a shared factory — always the factory.
- **Callback = happy path only** — return the data and let the factory handle failures; don't add a second try/catch unless a thunk needs bespoke recovery.
- **Type the generics** — `createAppAsyncThunk<Returned, Params>`; don't rely on inference that widens to `unknown`.
- **Colocate** — thunks live in the slice's `thunks.ts`, next to its `selectors.ts` (see §15).

### Exception

- A thunk that must **deliberately bypass** the global error handling (handles a specific failure locally and must not dispatch the global error) may use raw `createAsyncThunk` — but comment why.

---

## Quick Reference: Do / Don't

| Do                                       | Don't                                          |
| ---------------------------------------- | ---------------------------------------------- |
| `React.FC<IProps>`                       | `FC<Props>`, plain functions, class components |
| `interface IXxxProps`                    | `type XxxProps` for props                      |
| Named handler: `handleClick`             | Inline: `onClick={() => { ... }}`              |
| `isEqual(a, b)` from lodash              | `JSON.stringify(a) === JSON.stringify(b)`      |
| Extract hook: `useFeature()`             | 10+ useState in one component                  |
| Sub-component for complex branch         | Nested ternaries in JSX                        |
| `import * as S from './styled'`          | Inline styles, CSS modules                     |
| Max 250 lines per file                   | 700-line monolith components                   |
| `useMemo`/`useCallback` for optimization | Recreating objects/functions every render      |
| `interface` with `I`-prefix              | `type`, no prefix                              |
| Full names: `context`, `index`, `response` | Short names: `ctx`, `idx`, `res` (`e` OK only for a caught error) |
| `const { title, onClose } = props`       | Repeated `props.title`, `props.onClose`        |
| Colocate state in the child that uses it | One `useState` in a parent re-rendering its whole subtree |
| `useSelector(selectors.x.selectData)` (memoized, typed) | `useSelector((s: IStore) => s.x.data)` inline selector |
| Config table for N same-shape variants   | Boolean-per-variant + copy-pasted JSX / render `switch` |
| Shared thunk factory (`createAppAsyncThunk`) | Raw `createAsyncThunk` + per-slice try/catch |
