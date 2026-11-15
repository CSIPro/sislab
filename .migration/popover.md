# popover

2026-11-15. Transformation engine (legacy `new-york` style), shaped after the base-nova registry wrapper. Migrated; the user's classes and animations stay.

## Changed

- `src/components/ui/popover.tsx`: imports `Popover` from `@base-ui/react/popover`. `PopoverContent` now renders `Portal > Positioner > Popup`. It takes `PopoverPrimitive.Popup.Props` plus `align`, `alignOffset`, `side` and `sideOffset` picked from the Positioner, destructures all four and forwards them to the Positioner (defaults: `center`, `0`, `bottom`, `4`). The Positioner gets `isolate z-50`. Class rewrites on the Popup: `origin-(--radix-popover-content-transform-origin)` became `origin-(--transform-origin)`, and `data-[state=open|closed]` became `data-open` / `data-closed`. The `tw-animate-css` enter and exit classes stay; Base UI waits for the exit animation before unmounting.
- `PopoverAnchor` (`popover.tsx`): Base UI has no Anchor part. It is now an inert `<div data-slot="popover-anchor">` and does not affect positioning. No code uses it.
- `src/components/ui/combobox.tsx` and `multi-combobox.tsx`: `<PopoverTrigger asChild><PickerTrigger>...` became `<PopoverTrigger render={<PickerTrigger ... />}>...`, and `w-(--radix-popover-trigger-width)` became `w-(--anchor-width)`.
- `src/components/ui/date-picker.tsx`: the trigger is now `<PopoverTrigger render={trigger ?? <PickerTrigger>...</PickerTrigger>} />`. Base UI clones the `render` element and keeps its children, so the custom `trigger` element from `app.requests.new.tsx` still works.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/popover.tsx` is clean.

## Left alone

- `src/components/ui/command.tsx` (cmdk) and `src/components/ui/calendar.tsx` (react-day-picker) are not radix.
- `onOpenChange={setOpen}` and `onOpenChange={changeOpen}`. Base UI passes `(open, eventDetails)`; both handlers read only `open`.

## Behavior changes

- `PopoverAnchor` no longer anchors anything (unused today).
- Base UI's default `collisionPadding` is 5px where radix used 0, so a popover near the window edge sits a few pixels further in.

## Verify by hand

- Open a Combobox (new request: subject, lab) and a MultiCombobox (filters): the list is as wide as the trigger, typing filters, Escape closes and focus returns to the trigger.
- Open a DatePicker field, pick a date: the popover closes and the field shows the date.
- New request, step 2: open "Elegir otra fecha" (custom trigger), pick a date, and check the choice button shows it.
- Open a popover near the bottom of the window: it flips above the trigger.
