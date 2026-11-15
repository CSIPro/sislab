# radio-group

2026-11-15. Transformation engine (legacy `new-york` style). Migrated.

## Changed

- `src/components/ui/radio-group.tsx`: the group is the callable `RadioGroup` from `@base-ui/react/radio-group`; items are `Radio.Root` and `Radio.Indicator` from `@base-ui/react/radio`. Class rewrites: `data-[state=checked]` became `data-checked`, and the dead `disabled:*` classes (the Root is now a `<span>`) became `data-disabled:*`.
- `src/routes/app.requests.new.tsx`: the group choice card used `has-[[data-state=checked]]:*`; it now uses `has-data-checked:*`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/radio-group.tsx` is clean.

## Left alone

- The `onValueChange` handler in `app.requests.new.tsx`. Base UI infers the value type from `value={groupId}`, so `setGroupId(value)` still type-checks.

## Behavior changes

- `onValueChange` receives `(value, eventDetails)`; the handler ignores the second argument.

## Verify by hand

- New request, step 1: click a group card; it gets the green border and tint. Arrow keys move between groups.
