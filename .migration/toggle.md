# toggle

2026-11-15. Transformation engine (legacy `new-york` style). Migrated.

## Changed

- `src/components/ui/toggle.tsx`: the callable `Toggle` from `@base-ui/react/toggle` replaces `Toggle.Root`; props are `TogglePrimitive.Props`. `data-[state=on]:*` became `data-pressed:*` in `toggleVariants`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/toggle.tsx` is clean.

## Left alone

- No app code renders `<Toggle>` directly. `toggleVariants` is shared with toggle-group.

## Behavior changes

- `onPressedChange` receives `(pressed, eventDetails)`. No call site uses it.

## Verify by hand

- See toggle-group: the pressed item shows the accent background and bold text.
