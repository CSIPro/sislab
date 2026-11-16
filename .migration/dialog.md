# dialog

2026-11-15. Transformation engine (legacy `new-york` style), shaped after the base-nova registry wrapper. Migrated; the user's classes and animations stay.

## Changed

- `src/components/ui/dialog.tsx`: imports `Dialog` from `@base-ui/react/dialog`. `Overlay` became `Backdrop` and `Content` became `Popup` (a centered modal, so no Positioner); wrapper names are unchanged. Part types use `DialogPrimitive.<Part>.Props`. `data-[state=open|closed]` became `data-open` / `data-closed`; the `tw-animate-css` classes stay. `DialogFooter`'s close button went from `<DialogPrimitive.Close asChild><Button>` to `<DialogPrimitive.Close render={<Button variant="outline" />}>`. The redundant `data-slot` on `<DialogPortal>` inside `DialogContent` was dropped.
- Dropped `data-[state=open]:bg-accent data-[state=open]:text-muted-foreground` from the corner close button. Radix's Close never had a `data-state` attribute, so those classes never applied.
- `src/components/form-dialog.tsx`: removed the `aria-describedby: undefined` workaround and its comment. It silenced a Radix warning about a missing description; Base UI sets `aria-describedby` only when a `DialogDescription` renders.
- `src/components/ui/command.tsx` (`CommandDialog`): the props type now omits `Dialog`'s `children` and declares `children?: React.ReactNode`, because Base UI's Root also accepts a payload render function there. Nothing else in the cmdk wrapper changed.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/dialog.tsx` is clean.

## Left alone

- The `cmdk` parts of `command.tsx`; cmdk is not radix.
- `onOpenChange={(open) => ...}` call sites in `app.requests.all.tsx`, `app.admin.reports.tsx` and `form-dialog.tsx`. Base UI adds an `eventDetails` argument that they ignore.

## Behavior changes

- Base UI's Portal renders a wrapping `<div>`; Radix's did not. Nothing selects on the portal's position in the DOM.

## Verify by hand

- Open any form dialog (new catalog entry, edit user): focus moves into it, Tab stays inside, Escape closes it and focus returns to the opening button.
- With a form busy (submitting), click outside: the dialog stays open, as `form-dialog.tsx` asks.
- Todas las solicitudes: open the day ticket, then close it with the X.
- Admin > Reportes: open a detail, scroll a long one, close it by clicking the backdrop.
- Watch the open and close animations (fade and zoom).
