# button

2026-11-15. Transformation engine (style `new-york` is legacy, so there is no base golden to replay; the base-nova wrapper was used as a shape reference only). Migrated; the wrapper keeps its own variants and classes.

## Changed

- `src/components/ui/button.tsx`: `Slot` from `radix-ui` replaced by `Button` from `@base-ui/react/button`. Props are now `ButtonPrimitive.Props & VariantProps<typeof buttonVariants>`. The `asChild` prop is gone; callers pass `render`. The manual `type="button"` default was removed because Base UI's Button sets `type="button"` on native buttons and lets an explicit `type` win.
- Every `<Button asChild>` call site wrapped a link (TanStack `Link` or `<a>`). Base UI's Button adds `role="button"` to a non-button element, which would make screen readers announce these links as buttons. Each one is now the link itself with `className={buttonVariants({ ... })}`:
  - `src/routes/app.dashboard.tsx` (4 links)
  - `src/routes/app.groups.manage.tsx` (2)
  - `src/routes/index.tsx`, `src/routes/app.requests.mine.tsx`, `src/routes/app.requests.new.tsx`, `src/routes/app.admin.catalogs.$kind.tsx`
  - `src/components/AccessCard.tsx`, `src/components/Header.tsx`, `src/components/pdf-ticket.tsx`
- The links no longer carry `data-slot="button"`, `data-size` or `data-variant`. Nothing in `src` selects on those attributes.
- `package.json` and `pnpm-lock.yaml`: added `@base-ui/react@^1.9.0`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/button.tsx` is clean.

## Left alone

- `<Button>` used as a real button everywhere else. Those call sites need no change.
- Buttons passed as children of `PopoverTrigger asChild` / `TooltipTrigger asChild`. Those are converted in the popover and tooltip migrations.

## Behavior changes

- A disabled Base UI Button keeps focus only when `focusableWhenDisabled` is set; by default it behaves like a disabled native button, same as before.

## Verify by hand

- Click a submit button inside a form (new request, new group) and confirm the form submits; click a plain button inside a form and confirm it does not.
- Tab to "Nueva solicitud" on the dashboard and to the landing page social links. A screen reader should announce them as links, and Enter should navigate.
- Check the link-styled buttons ("Ver todas", "Ver todos") still look the same.
