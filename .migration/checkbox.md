# checkbox

2026-11-15. Transformation engine (legacy `new-york` style). Migrated.

## Changed

- `src/components/ui/checkbox.tsx`: imports `Checkbox` from `@base-ui/react/checkbox`; props are `CheckboxPrimitive.Root.Props`. Class rewrites: `data-[state=checked]:*` became `data-checked:*`. Base UI renders the Root as a `<span>` with a hidden `<input>` beside it, so `disabled:*` classes never matched; they became `data-disabled:*`.
- `src/components/ui/field.tsx:120`: `has-data-[state=checked]:*` became `has-data-checked:*` in the choice-card field variant (applies to checkboxes and radios).

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/checkbox.tsx` is clean.

## Left alone

- Call sites in `role-checkboxes.tsx`, `app.admin.users.tsx` and `app.requests.new.tsx`. They pass a boolean `checked` and an `onCheckedChange` that compares with `=== true`, which still type-checks. No call site uses `checked="indeterminate"`.

## Behavior changes

- `onCheckedChange` now receives `(checked: boolean, eventDetails)`. Existing handlers ignore the second argument.

- Base UI renders a hidden `<input type="checkbox" aria-hidden="true">` next to the visible `<span role="checkbox">`. Both sit inside the wrapping `<label>`, so Playwright's `getByLabel` matched two elements. `test/browser/sislab.spec.ts:465` now uses `getByRole('checkbox', { name })`. Screen readers only see the span, which Base UI names from the label through `aria-labelledby`.

## Verify by hand

- Admin > Usuarios: tick "Verifiqué su identidad" and the role boxes; the green fill and check mark appear, and disabled boxes look dimmed.
- New request: untick and retick a reagent; the row label click toggles the box.
- Keyboard: Tab to a checkbox and press Space.
