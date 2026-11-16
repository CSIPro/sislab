# card

2026-11-15. Transformation engine (legacy `new-york` style). Migrated; classes unchanged.

## Changed

- `src/components/ui/card.tsx`: the `Slot` from `radix-ui` and the `asChild` prop are gone. `Card` now uses `useRender` and `mergeProps` from Base UI, takes `useRender.ComponentProps<"section">`, and accepts a `render` element. It still renders a `<section>` by default.
- Call sites moved from `<Card asChild><X>...</X></Card>` to `<Card render={<X />}>...</Card>`:
  - `src/routes/index.tsx` (3, render `<article>`)
  - `src/routes/app.admin.users.tsx` (`<article>`)
  - `src/routes/app.groups.new.tsx`, `src/routes/app.requests.new.tsx` (`<form>` with its `onSubmit` and `key`)
  - `src/routes/app.admin.catalogs.index.tsx` (TanStack `Link`)
  - `src/routes/app.admin.settings.tsx`, `src/components/group-card.tsx`

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/card.tsx` is clean.

## Left alone

- `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` and `CardFooter` never used radix.

## Behavior changes

None. `mergeProps` merges `className` and event handlers the same way `Slot` did.

## Verify by hand

- Landing page: the step and team cards render as before.
- Admin > Catálogos: each catalog card is still a link; click it and use Enter on it.
- New group and new request forms submit from inside their card.
