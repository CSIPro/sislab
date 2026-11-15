# separator

2026-11-15. Transformation engine. Migrated.

## Changed

- `src/components/ui/separator.tsx`: `Separator.Root` from `radix-ui` became the callable `Separator` from `@base-ui/react/separator`. Props are `SeparatorPrimitive.Props`. The `decorative` prop is gone; Base UI always renders `role="separator"` with `aria-orientation`. Base UI still sets `data-orientation`, so the `data-[orientation=...]` classes stay.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/separator.tsx` is clean.

## Left alone

- Call sites (`sidebar.tsx` and others). None passed `decorative`.

## Behavior changes

- The radix wrapper defaulted to `decorative`, which rendered `role="none"`. Base UI separators are always exposed to assistive tech as separators.

## Verify by hand

- Sidebar separators still draw a 1px line in both orientations.
