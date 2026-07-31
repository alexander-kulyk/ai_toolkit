---
name: data-driven-rendering
description: 'Collapse N near-identical UI variants selected by a key into one render driven by a config table (data-driven / config-driven / table-driven rendering). Use when: several modals/dialogs/tabs/panels differ only by data, a component has a boolean-per-variant or a switch that renders, repeated conditional JSX blocks, or you are adding "just one more" variant. Triggers: data-driven rendering, config-driven, table-driven, lookup map, config object, render from config, variant map, Record<Enum, Config>, switch of modals, modal dispatcher, one modal per action, boolean per variant, status to label map, schema-driven form, columns config.'
argument-hint: 'File/component with repeated variant blocks to collapse into a config map (optional)'
---

# Data-Driven Rendering

Drive the UI from **data**, not from branches. When a finite set of variants is selected by one key and each variant renders the **same shape** with only different **data + behavior**, replace the repeated conditional blocks with a single render that reads from a **config table** keyed by that variant. This is the positive counterpart to the modal-dispatcher `switch` called out in the [react-anti-patterns skill §3 (God component)](../react-anti-patterns/SKILL.md).

> A rule of thumb: if you can describe the difference between two rendered branches as "same component, different props," it is data, and data belongs in a table.

---

## When to reach for it — the symptom it cures

Any of these is the signal:

- A **boolean-per-variant**: `isRejectOpen`, `isDeleteOpen`, `isRevokeOpen` — one `useState` per option.
- A **`switch`/ternary chain that renders** a different-but-similar block per case.
- **Repeated conditional JSX** where the blocks differ only in title/label/handler/icon.
- You are adding **"just one more"** variant and it means another state slot + another near-duplicate block.
- The same variant→value mapping (`status → color`, `type → icon`) is re-derived inline in several places.

If the branches render **structurally different markup**, this is *not* your pattern — see "When NOT to use it."

---

## Before — three modals, three states, three near-duplicate blocks

```typescript
const [isRejectOpen, setIsRejectOpen] = useState(false);   // ❌ one boolean per variant
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [isRevokeOpen, setIsRevokeOpen] = useState(false);

return (
  <>
    {isRejectOpen && (
      <ActionReasonModal
        title={localization?.modals?.title?.reject}
        inputLabel={localization?.modals?.fields?.reason}
        onSubmit={onHandleRejectEDIFile}
        onDismiss={() => setIsRejectOpen(false)}
      />
    )}
    {isDeleteOpen && (
      <ActionReasonModal                                  // ❌ same shape, copy-pasted
        title={localization?.buttons?.delete}
        inputLabel={localization?.buttons?.comments}
        onSubmit={onHandleDeleteEDIFile}
        onDismiss={() => setIsDeleteOpen(false)}
      />
    )}
    {isRevokeOpen && (
      <ActionReasonModal
        title={localization?.buttons?.revoke}
        inputLabel={localization?.buttons?.comments}
        onSubmit={onHandleRevokeEDIFile}
        onDismiss={() => setIsRevokeOpen(false)}
      />
    )}
  </>
);
```

Every new action adds a state slot **and** a JSX block. The three blocks drift apart over time.

---

## After — one config table, one state key, one render

**Step 1 — a pure config builder** (`utils/`), typed as an exhaustive `Record<Enum, Config>`:

```typescript
// utils/getActionModalConfigs.ts
import { ModalAction, ILocalization } from '../../../../../types';

interface IActionModalConfig {
  title: string;
  inputLabel: string;
  onSubmit: (reason: string) => void;
}

interface IGetActionModalConfigsParams {
  onHandleRejectEDIFile: (reason: string) => void;
  onHandleDeleteEDIFile: (reason: string) => void;
  onHandleRevokeEDIFile: (reason: string) => void;
  localization?: ILocalization;
}

export const getActionModalConfigs = ({
  onHandleRejectEDIFile,
  onHandleDeleteEDIFile,
  onHandleRevokeEDIFile,
  localization,
}: IGetActionModalConfigsParams): Record<ModalAction, IActionModalConfig> => {
  const commentsLabel = localization?.buttons?.comments;

  return {
    reject: {
      title: localization?.modals?.title?.reject ?? localization?.buttons?.reject,
      inputLabel: localization?.modals?.fields?.pleaseSpecifyTheReasonForRejection ?? commentsLabel,
      onSubmit: onHandleRejectEDIFile,
    },
    delete: { title: localization?.buttons?.delete, inputLabel: commentsLabel, onSubmit: onHandleDeleteEDIFile },
    revoke: { title: localization?.buttons?.revoke, inputLabel: commentsLabel, onSubmit: onHandleRevokeEDIFile },
  };
};
```

**Step 2 — one state key + one memoized table + one render** in the component:

```typescript
const [activeModal, setActiveModal] = useState<ModalAction | null>(null); // ✅ one key, not N booleans

const modalConfigs = useMemo(                                            // ✅ memoized (see best-practices §11)
  () => getActionModalConfigs({ onHandleRejectEDIFile, onHandleDeleteEDIFile, onHandleRevokeEDIFile, localization }),
  [onHandleRejectEDIFile, onHandleDeleteEDIFile, onHandleRevokeEDIFile, localization]
);

return (
  <>
    {/* a button/menu sets the key: onOpenActionModal={setActiveModal} */}
    {activeModal && (                                                    // ✅ one render, driven by the table
      <ActionReasonModal
        title={modalConfigs[activeModal].title}
        inputLabel={modalConfigs[activeModal].inputLabel}
        onSubmit={modalConfigs[activeModal].onSubmit}
        onDismiss={() => setActiveModal(null)}
      />
    )}
  </>
);
```

Adding a fourth action is now **one entry** in the table — no new state, no new JSX. Because the table is typed `Record<ModalAction, IActionModalConfig>`, TypeScript **forces** an entry for every action: forget one and it will not compile.

---

## The recipe (mechanical steps)

1. **Find the varying axis** — a finite set of variants chosen by one key (a union/enum).
2. **Write a pure builder** in `utils/` returning `Record<Key, Config>`; each entry holds the variant's **data** (title, label, icon, color) and **behavior** (`onSubmit`), sourced from typed params.
3. **Replace the booleans** with a single `const [activeKey, setActiveKey] = useState<Key | null>(null)`.
4. **Render once**, reading every prop from `configs[activeKey]`.
5. **Memoize** the table with `useMemo` (deps = the builder's inputs).
6. **Type it `Record<Enum, Config>`** so completeness is checked at compile time.

---

## Do it well — rules

- **Config is data, not logic.** Entries hold values and stable handler references — no `if`/loops/JSX-with-branches inside a config entry. If an entry needs branching markup, it is a component, not data.
- **Exhaustive `Record<Enum, Config>`.** Prefer it over `Partial<...>` / a plain object so TypeScript guarantees every variant is handled.
- **Memoize the table** (best-practices §11) — it is rebuilt otherwise on every render; keep handler references stable (`useCallback`) so the memo actually holds.
- **Builder is a pure util** (best-practices §5) with typed params and return — testable in isolation, no hooks, no side effects.
- **One state key, one render site.** The whole point is to collapse N of each into one.
- **Reuse real types.** Type `localization`, data shapes, etc. from the project's real interfaces — don't re-declare partial look-alike shapes next to the builder.

---

## Other shapes this pattern takes

The modal map is the flagship, but the same idea drives:

- **Tabs / wizard steps** — `Record<TabId, { label; component; isEnabled }>`.
- **Table columns** — an array of column configs (`{ key; header; render; width }`) mapped to `<Column>`s.
- **Schema-driven forms** — a field-descriptor list rendered by one `<Field>` switchboard.
- **Status / type maps** — `Record<Status, { label; color; icon }>` instead of inline ternaries.
- **Action / command registry** — `Record<ActionKey, { title; icon; run }>` for toolbars and menus.

---

## When NOT to use it

- **Only two trivial variants** — a single ternary is clearer than a table and its indirection.
- **Structurally different markup** — if the branches are genuinely different components, keep them as components (compose them); data-driven rendering applies only when the **shape is the same and only the data differs**.
- **Config growing branches** — the moment entries sprout `if`/conditionals or per-entry JSX logic, you are encoding behavior as data; extract components or a Strategy instead.
- **One-off** — a variant used in exactly one place with no sibling variants doesn't need a registry.

The tell: data-driven rendering trades **duplicated markup** for **a data table + one render**. If it instead adds indirection without removing duplication, don't.

---

## Related

- [react-best-practices §2 No Logic in JSX](../react-best-practices/SKILL.md), [§3 Declarative Rendering](../react-best-practices/SKILL.md), [§5 DRY](../react-best-practices/SKILL.md), [§11 Memoization](../react-best-practices/SKILL.md).
- [react-anti-patterns §3 God component](../react-anti-patterns/SKILL.md) — the modal-dispatcher `switch` this pattern replaces.
