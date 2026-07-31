---
name: react-anti-patterns
description: 'Catalog of React anti-patterns to detect and fix in React/TypeScript code. Use when: reviewing or refactoring components/hooks, spotting unnecessary useEffect, fixing derived/computed state, removing redundant useState, simplifying data-sync effects, untangling prop drilling, breaking up god components. Triggers: anti-pattern, derived state, state synced with useEffect, redundant state, useEffect to compute, you might not need an effect, setState inside useEffect, recompute in effect, useMemo instead of useEffect, mirror props in state, prop drilling, pass-through props, transit props, forwarding props, threading props, children composition instead of Context, too many props, god component, god object, too many useState, component does too much, single responsibility, split component, modal dispatcher switch, fat interface, 700 line component.'
argument-hint: 'File path or hook/component to scan for anti-patterns (optional)'
---

# React Anti-Patterns

A catalog of recurring anti-patterns in this codebase, each with **why it's wrong**, **how to recognize it**, and a **before → after** fix. This complements the [react-best-practices skill](../react-best-practices/SKILL.md): that one says what to do, this one says what to stop doing.

> This is a living catalog. When you find a new recurring mistake, add it here as a numbered section using the same shape (Symptom → Why it's wrong → Before → After → Exceptions).

---

## 1. Derived state stored in `useState` and synced with `useEffect`

**The single most common one.** A value that can be **computed from existing props, context, selectors, or state** is instead kept in its own `useState` and kept up to date by a `useEffect` that calls `setState`. This is the pattern React's docs call out under *"You Might Not Need an Effect."*

### Symptom — how to recognize it

Look for this shape:

```typescript
const [thing, setThing] = useState(initial);

useEffect(() => {
  const next = /* compute from props / selectors / other state */;
  setThing(next);
}, [/* the inputs to that computation */]);
```

Red flags, any of which alone is enough:

- A `useEffect` whose **only** job is to call a `setState`.
- The effect's dependency array is exactly "the inputs of a calculation."
- The state is **never set from an event/async callback** — only from that effect.
- State initialized to `null`/`[]` purely so there's something to show on the first render.

### Why it's wrong

- **Double render every change.** Inputs change → render (with stale value) → effect runs → `setState` → render again. The user briefly sees the old value, and you pay two render passes.
- **Stale-value traps.** Guarded commits like `next && setThing(next)` silently keep the *previous* value when the source is momentarily empty/undefined, so the UI and the data drift apart.
- **Lying initial type.** `useState<IOption[]>(null)` isn't actually `IOption[]`; every consumer now has to null-guard a value that was never meant to be null.
- **Harder to reason about.** The value's source of truth is split across a state slot and an effect, instead of being one expression.

### Before — the real `useButtonSelectOptions` (derived state via effect)

```typescript
export const useButtonSelectOptions = (
  selectedFilterButton: EDIFilterType,
  localization: ILocalization,
  selectedRows: ISelectedRow[],
  selectedTabId: string
): IUseButtonSelectOptions => {
  const [options, setOptions] = useState<IOption[]>(null); // ❌ lying initial type

  const availableButtons = useSelector(selectors.table.selectAvailableButtons);

  useEffect(() => {                                          // ❌ effect only computes + setState
    let filteredOptions = availableButtons?.map(button => ({
      value: button.Key,
      label:
        button.Key === ButtonSelectOptionId.Hide && selectedFilterButton === EDIFilterType.Hidden
          ? localization?.buttons?.unhide
          : button.Title,
    }));

    if (selectedTabId === TAB_IDS.INCOMING) {
      if (selectedFilterButton === EDIFilterType.Hidden) {
        filteredOptions = filteredOptions?.filter(option => option.value === ButtonSelectOptionId.Hide);
      }
    } else {
      if (selectedRows.every(item => !item.IsDeletionAvailable)) {
        filteredOptions = filteredOptions.filter(item => item.value !== ButtonSelectOptionId.Delete);
      }
      if (selectedRows.every(item => !item.IsRevocationAvailable)) {
        filteredOptions = filteredOptions.filter(item => item.value !== ButtonSelectOptionId.Revoke);
      }
    }

    filteredOptions && setOptions(filteredOptions);          // ❌ stale-value trap on empty source
  }, [availableButtons, selectedFilterButton, localization, selectedRows, selectedTabId]);

  return { options };
};
```

### After — derive during render with `useMemo`

The `useState` + `useEffect` pair collapses into a single `useMemo`. No extra render, no stale-value trap, honest return type. (Pure helpers — `getOptionLabel`, `isActionAvailable` — are extracted to `./utils` per the best-practices skill; shown abbreviated here.)

```typescript
export const useButtonSelectOptions = (
  selectedFilterButton: EDIFilterType,
  localization: ILocalization,
  selectedRows: ISelectedRow[],
  selectedTabId: string
): IUseButtonSelectOptions => {
  const availableButtons = useSelector(selectors.table.selectAvailableButtons);

  const options = useMemo<IOption[]>(() => {              // ✅ computed during render
    if (!availableButtons?.length) {
      return [];                                           // ✅ honest empty value, no null
    }

    return availableButtons
      .map<IOption>(button => ({
        value: button.Key,
        label: getOptionLabel(button, selectedFilterButton, localization),
      }))
      .filter(option => {
        const shouldShowOnlyUnhideAction =
          selectedTabId === TAB_IDS.INCOMING && selectedFilterButton === EDIFilterType.Hidden;

        if (shouldShowOnlyUnhideAction) {
          return option.value === ButtonSelectOptionId.Hide;
        }

        return isActionAvailable(option.value, selectedRows, selectedTabId);
      });
  }, [availableButtons, selectedFilterButton, localization, selectedRows, selectedTabId]);

  return { options };
};
```

### The mechanical fix

1. Delete the `useState`.
2. Replace `useEffect(() => { ...; setX(result) }, deps)` with `const x = useMemo(() => { ...; return result }, deps)`.
3. Return a real empty value (`[]`, `{}`) from the early path instead of initializing state to `null`.
4. Remove the `result && setX(result)` guard — just `return` the computed value.
5. Keep the **same dependency array**; it was already correct.

### When an effect IS the right tool (not this anti-pattern)

`useEffect` is correct for **synchronizing with something outside React**, not for computing values:

- Fetching/subscribing (data requests, SignalR, event listeners, timers).
- Imperative DOM work (focus, scroll, measuring).
- Resetting local state in response to a prop change where you truly need a state machine (and even then, prefer a `key` or computing during render first).

Rule of thumb: **if the effect's body ends in `setState(somethingComputedFromDeps)` and nothing else, it should be `useMemo` (for values) or plain render code.**

---

## 2. Prop drilling — threading props through components that don't use them

Passing data from an ancestor to a deep descendant by forwarding it through every component in between, where those middle components neither read nor care about the prop — they only pass it along. **Judge it by symptoms, not by depth:** two levels can already be prop drilling, and a prop forwarded through several components untouched almost always is.

### Symptom — how to recognize it

Any one of these is enough of a smell:

- Intermediate components accept props they never use — they only forward them.
- Changing the tree structure forces you to edit many components just to re-thread a prop.
- A component's prop list keeps growing over time.
- The same data is needed in several distant parts of the tree.
- A component "knows about" data that has nothing to do with its own responsibility.
- TypeScript prop interfaces fill up with pass-through (transit) props.

Rule of thumb: **a prop forwarded through 3+ components that don't read it is prop drilling.**

### Why it's wrong

- **Coupled to structure.** Every layer on the path is coupled to a prop it doesn't care about; refactoring the tree means touching all of them.
- **Noisy interfaces.** Middle components carry props (and types) that aren't part of their contract, so their `IProps` stops describing what they actually do.
- **Fragile & verbose.** One new field needed deep down means editing every component on the path, plus each interface.
- **Obscured data flow.** It's hard to see where a value really comes from or who actually consumes it.

### Before — `user` threaded through layers that ignore it

```typescript
// user is read only by UserPanel, but every layer in between must forward it
<Layout user={user}>
  <Sidebar user={user}>          {/* ❌ Sidebar doesn't use user */}
    <Navigation user={user}>     {/* ❌ Navigation doesn't use user */}
      <UserPanel user={user} />  {/* ✅ the only real consumer */}
    </Navigation>
  </Sidebar>
</Layout>
```

`Sidebar` and `Navigation` gain a `user` prop (and an `IProps` field) purely to pass it along.

### After — compose with `children` / slots so the data skips the middle

**Composition is the most underrated fix, and React's docs recommend trying it before Context.** Build the consumer where the data already lives and hand it down as `children` or a named slot. The intermediate components render `{children}` / `{sidebar}` and never learn about `user`.

```typescript
// The owner of `user` builds UserPanel and passes it as a ready-made slot
<Layout sidebar={<UserPanel user={user} />}>
  <Content />
</Layout>

// Layout / Sidebar / Navigation just render slots — no `user` prop anywhere
const Layout: React.FC<ILayoutProps> = ({ sidebar, children }) => (
  <S.Layout>
    <S.Aside>{sidebar}</S.Aside>
    <S.Main>{children}</S.Main>
  </S.Layout>
);
```

### The four ways to avoid it (in order of preference)

1. **State colocation** — if only one branch needs the data, move the state down into it so it never has to be passed at all. See the [react-best-practices skill §14](../react-best-practices/SKILL.md).
2. **Composition (`children` / slots)** — the underrated default. Pass ready-made JSX down as `children` or named slots; the middle layers forward opaque nodes instead of typed data. Try this **before** reaching for Context.
3. **React Context** — for genuinely cross-cutting, tree-wide data (current user, theme, localization) read by many distant components. Not a tool for skipping one or two levels of passing.
4. **Custom hook** — when the data comes from a store/selector or a service, let the consumer read it directly (`useSelector`, `useFeatureData()`) instead of receiving it through props.

### When passing props down is NOT drilling

- The intermediate component **actually uses** the prop — it's part of its job.
- It's **one level** of ordinary parent → child data flow.
- You're handing a value to a **direct child** that renders it — that's props working as intended.

Prop drilling is specifically about **middle components carrying props that aren't theirs**, not about passing props at all.

---

## 3. God component — one component that owns everything

A single component that concentrates the state, business logic, side effects, and markup of many unrelated concerns. It keeps growing because "it's easier to add one more `useState` here" until it becomes the one file every change has to touch. This is the structural sibling of prop drilling: the drilled props usually originate from — or pile up in — a god component.

### Symptom — how to recognize it

Judge by **responsibilities**, not just line count — but any one of these is a strong signal:

- **File far over the size limit** — the [react-best-practices skill §8](../react-best-practices/SKILL.md) caps files at 250 lines; a god component is routinely 500–1000+.
- **A wall of `useState`** — 10+ independent state slots in one component (the best-practices Quick Reference calls this out explicitly).
- **Unrelated concerns in one body** — e.g. tabs, form validation, save/delete/copy lifecycle, access control, notifications, and URL/clipboard tricks all living side by side.
- **A modal/dialog dispatcher** — one or two enum states (`isOpenModalType`, `isOpenConfirmModal`) plus a big `switch` that knows about every dialog and every action in the feature.
- **Fat prop-objects assembled inline** — a `renderHeaderProps` / `renderFooterProps` object with 20+ fields, built in the body just to hand down to a child (see [§2 Prop drilling](#2-prop-drilling--threading-props-through-components-that-dont-use-them)).
- **Handlers reference half the component** — every `onClick` closes over many `setX`, thunks, and locals, so nothing can be extracted without dragging the rest along.
- **It's the merge-conflict magnet** — unrelated features keep editing the same file.

### Why it's wrong

- **No single responsibility.** The component has many reasons to change, so every feature — save flow, access list, a new modal — edits the same file, and interactions between them become impossible to reason about.
- **Everything re-renders together.** State that only one small widget needs (a copied-link toast, a dropdown flag) re-renders the entire tree on every toggle — the opposite of [state colocation (§14)](../react-best-practices/SKILL.md).
- **Untestable in isolation.** You can't test the save logic without mounting the modals, the tabs, the access grid, and mocking a dozen contexts and selectors.
- **Fat interfaces.** The `IRenderHeaderContent`-style objects mix concerns and violate ISP/SRP — a child now depends on 20+ fields it mostly ignores.
- **Cognitive overload.** No one can hold 700 lines and 17 state slots in their head; changes are made by guesswork and copy-paste.

### Before — one component owning nine concerns (abbreviated)

```typescript
export const DocumentCard: React.FC<IDocumentCard> = ({ openDocument, handleDismiss }) => {
  // ❌ 17 unrelated state slots
  const [isEditable, setIsEditable] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isOpenModalType, setIsOpenModalType] = useState<false | AdditionalModalType>(false);
  const [isOpenConfirmModal, setIsOpenConfirmModal] = useState<ConfirmModalType | false>(false);
  const [selectedAccessUsers, setSelectedAccessUsers] = useState<RowSelectionState>({});
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [isOpenAddRegistrationModal, setIsOpenAddRegistrationModal] = useState(false);
  // …ten more

  // ❌ save / register / delete / copy / annulment / approval lifecycle inlined
  // ❌ shared-access logic, EDI sessions, protocol generation, comments, teams chat…

  // ❌ a 26-field prop object assembled inline just to hand to the header
  const renderHeaderProps: IRenderHeaderContent = {
    tabs, onSelectTab, screenOrientation, isEditable, openDocument, selectedTabId,
    setIsOpenConfirmModal, setIsOpenModalType, comments, setShowDropdownOption,
    onLinkClick: () => copyCurrentUrlToClipboard(() => setShowCopiedMessage(true)),
    /* …16 more fields… */
  };

  // ❌ a dispatcher switch that knows about every dialog and every action
  const onConfirm = async (option?: IOption) => {
    switch (isOpenConfirmModal) {
      case ConfirmModalType.DELETE_DOCUMENT:  /* … */ break;
      case ConfirmModalType.OPEN_EDIT_MODE:   /* … */ break;
      case ConfirmModalType.EXPORT_FORM:      /* … */ break;
      // …five more cases
    }
  };

  return (/* modal + 8 conditionally-rendered dialogs, 766 lines total */);
};
```

### After — split by concern into hooks, self-contained modals, and slot components

The god component becomes a thin **composition root**: it wires pieces together and renders them, but owns almost no state itself.

```typescript
export const DocumentCard: React.FC<IDocumentCard> = ({ openDocument, handleDismiss }) => {
  // ✅ each concern is its own hook — testable and readable in isolation
  const save = useDocumentSave({ openDocument, handleDismiss });
  const access = useSharedAccess();
  const modals = useDocumentModals();            // useReducer, not two enum useStates + a switch
  const confirm = useConfirmStrategies({ ... }); // the Strategy the TODO asked for

  return (
    <DocumentModalShell>
      <DocumentHeader />   {/* reads context/store itself — no 26-field prop object */}
      <DocumentBody />
      <DocumentFooter />
      <DocumentModals state={modals} />          {/* each modal owns its own open/close state */}
    </DocumentModalShell>
  );
};
```

### The mechanical fix — how to break it up

1. **Group the state slots by concern**, then move each group into a **custom hook** (`useDocumentSave`, `useSharedAccess`) per [best-practices §4](../react-best-practices/SKILL.md).
2. **Collapse the modal enums + `switch` into a `useReducer`** (or a Strategy map), and give **each dialog its own component that owns its `isOpen` state** — state colocation, so a dialog toggle no longer re-renders the shell. Where several dialogs share the **same shape** and differ only by data/handler, drive them from a config table instead of a `switch` — see the [data-driven-rendering skill](../data-driven-rendering/SKILL.md).
3. **Delete the fat `renderXProps` objects.** Turn the header/footer into real components that read context/selectors directly instead of receiving 20+ props (kills the [prop drilling, §2](#2-prop-drilling--threading-props-through-components-that-dont-use-them)).
4. **Colocate one-widget state** (copied-link toast, dropdown flags) into the widget that uses it.
5. **Repeat until every file is under the 250-line limit** and each component/hook has one reason to change.

### When a big component is NOT a god component

- **A genuine composition root / page shell** that only wires children together and holds little or no state — length there is layout, not responsibility.
- **A long but single-concern component** — e.g. a large but purely presentational form whose fields all belong to one entity. Prefer to split for readability, but it isn't the god-component anti-pattern.
- **Generated or table-schema code** where the length is declarative configuration, not branching logic.

The tell isn't size alone — it's **how many unrelated reasons the file has to change.**

---

## Quick reference: Do / Don't

| Don't                                                   | Do                                                        |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `useState` + `useEffect` to compute a value             | `useMemo` (or plain `const`) computed during render      |
| `useState<T[]>(null)` just for an initial placeholder   | Return `[]` / real empty value from the calculation      |
| `result && setState(result)` to "skip" empty updates    | `return result` — let the value reflect the source       |
| Effect dep array that lists "inputs of a calculation"   | Same deps, but on the `useMemo`                           |
| Mirror a prop/selector into state, then sync it         | Read the prop/selector directly; derive what you need     |
| Thread a prop through components that don't use it       | Compose with `children`/slots, or read it at the consumer |
| Add a pass-through field to `IProps` just to forward it  | Colocate state, use Context (tree-wide), or a selector hook |
| One component owning many concerns + 10+ `useState`      | Split by concern into hooks, self-contained modals, slots |
| A `switch` dispatcher that knows every dialog and action | `useReducer` / Strategy map; each dialog owns its state    |
