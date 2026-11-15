# avatar

2026-11-15. Transformation engine (legacy `new-york` style). Migrated; classes unchanged.

## Changed

- `src/components/ui/avatar.tsx`: imports `Avatar` from `@base-ui/react/avatar`. Part types moved to `AvatarPrimitive.Root.Props`, `.Image.Props` and `.Fallback.Props`. Part names are the same in both libraries.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/avatar.tsx` is clean.

## Left alone

- `src/components/person-avatar.tsx`: uses only `Avatar` and `AvatarFallback` with no radix-only props (`delayMs` is not used anywhere).

## Behavior changes

- The Base UI Root renders a `<span>` where radix rendered a `<span>` too; no change. Nothing else.

## Verify by hand

- Sidebar user menu and the admin users list show the initials circle at the same size and color.
