---
name: state-management
description: >
  State management rules for this React project — choosing where state lives and how it is shared.
  Use whenever adding or moving state, sharing data between pages or features, lifting state,
  passing props through the tree, or creating a React Context provider. Triggers on any mention of
  state, useState, Context API, createContext/useContext, provider, prop drilling, lifting state,
  sharing data across pages/features, or "where should this state live". Enforce the
  Context-vs-local rule, the no-prop-drilling rule (max 3 levels), and the context folder
  placement automatically.
---

# State Management

Pick the lowest-power tool that solves the problem, and keep shared state out of long prop chains.
Two rules decide almost everything:

1. **Local change → `useState`.** State used by one component (and maybe its immediate children) stays local.
2. **Shared across pages or across features → React Context API.** Data that more than one page or
   feature needs lives in a Context provider, not threaded through props.

---

## 1. Where does this state live?

| The state is...                                                         | Use                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| local to one component (input text, toggle, hover, a modal's open flag) | `useState`                                                    |
| needed by several components in one subtree, but only there             | lift to the **lowest common ancestor**, then `useState` there |
| shared **between pages** or **between features**                        | **React Context** (provider + `useContext` hook)              |

Default to `useState`. Reach for Context only when the data genuinely crosses page or feature
boundaries — do not wrap everything in context "just in case".

---

## 2. No prop drilling — max 3 levels deep

Passing data down through props is fine for **short** chains. The hard limit is **3 levels**.

- If a value must travel **more than 3 components deep** to reach its consumer, stop drilling and
  use Context instead.
- Prop drilling through intermediate components that don't use the value is the smell. One or two
  hops is acceptable; a value relayed through 4+ components is not.

```
A → B → C            ✅ allowed (≤ 3 levels)
A → B → C → D → E     ❌ too deep → put the value in a Context, consume it with the hook
```

---

## 3. Context API — pattern and placement

**Placement:** every context lives in a `context/` folder. The provider, its types, and the
consumer hook are colocated there (`context/<Name>/`).

**Pattern:** create the context, expose a provider that assembles the value, and export a
`use<Name>` hook. Group the value into clear buckets (`values`, `handlers`, `instances`) rather
than a flat bag, so consumers read intent at a glance.

```tsx
// context/ProcessesDetails/ProcessesDetailsProvider.tsx
import React, { ReactNode, createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import { IProcessesDetailsContext } from './types';
import { actions, selectors } from '@store';

interface IProps {
  children: ReactNode;
}

export const ProcessesDetailsContext =
  createContext<IProcessesDetailsContext>(null);

export const ProcessesDetailsProvider = ({ children }: IProps) => {
  // derive everything the subtree needs (selectors, hooks, computed flags) here...
  const isUnlockedUI = useSelector(
    selectors.featureFlags.checkIsUnblockedUIMode,
  );

  // group the exposed value by purpose:
  const values = {
    isFetchStatusesDataCompleted,
    isLoadingMetadata,
    isProcessLunched,
  };
  const handlers = { handleClickWithConfirmation };
  const instances = {
    detectionAnomaliesInstance,
    importAnomaliesInstance /* ... */,
  };

  return (
    <ProcessesDetailsContext.Provider value={{ values, handlers, instances }}>
      {children}
    </ProcessesDetailsContext.Provider>
  );
};

export const useProcessesDetails = () => useContext(ProcessesDetailsContext);
```

```tsx
// any descendant — no props threaded through, read straight from the hook
const { values, handlers } = useProcessesDetails();
```

**Rules:**

- Context files go under `context/` — never inline a `createContext` in a component file.
- Always export a `use<Name>` hook; consumers call the hook, never `useContext(TheContext)` directly elsewhere.
- Type the context value with an interface (`IProcessesDetailsContext`); colocate it in `context/<Name>/types`.
- Group the provided value into `values` / `handlers` / `instances` (or similar) — not a flat object.
- Compute the value inside the provider (selectors, hooks, derived flags); keep consumers thin.
- Wrap the smallest subtree that needs the context, not the whole app, unless the data is truly app-wide.

---

## 4. Decision flow

```
Is the state used by only one component (and maybe direct children)?
  → yes: useState (local)
  → no:  Is it shared between pages or between features?
           → yes: React Context (provider in context/, consumed via use<Name> hook)
           → no:  lift to the lowest common ancestor and useState there
Would reaching the consumer require passing props more than 3 levels deep?
  → yes: stop drilling → use Context instead
```

---

## Quick Reference

| Rule                           | Statement                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Local change                   | `useState`                                                                   |
| Shared across pages / features | React Context API                                                            |
| Default                        | lowest-power tool; `useState` first, Context only when it crosses boundaries |
| Prop drilling                  | allowed up to 3 levels; deeper → Context                                     |
| Context placement              | in a `context/` folder (`context/<Name>/`), never inline in a component      |
| Context consumption            | export and use a `use<Name>` hook, not raw `useContext` elsewhere            |
| Context value shape            | grouped (`values` / `handlers` / `instances`), typed with an interface       |
| Provider scope                 | wrap the smallest subtree that needs it                                      |
