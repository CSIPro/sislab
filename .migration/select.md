# select

2026-11-15. Transformation engine (legacy `new-york` style), shaped after the base-nova registry wrapper. Migrated; the user's trigger, item and content classes stay.

## Changed

- `src/components/ui/select.tsx`:
  - `Select.List` is the scroll container (`overflow-y-auto`, `scroll-py-6`) and the Popup is a flex column with `overflow-hidden`. Base UI scrolls the List when one is present and hides its native scrollbar while the scroll arrows are shown, as Radix did. With the Popup scrolling instead, the native scrollbar showed next to the arrows.
  - The Positioner carries `isolate z-50`. Base UI positions it with a transform, which makes it its own stacking context, so without a z-index the list opened behind dialogs even though the Popup had `z-50`.
  - `Select` is now a bare re-export of `SelectPrimitive.Root` from `@base-ui/react/select`, because the Root is generic over its value type. It no longer carries `data-slot="select"`.
  - `SelectContent` renders `Portal > Positioner > Popup > List`. The radix `position` prop is gone; `alignItemWithTrigger` (default `true`, like radix's `item-aligned` default) plus `side`, `sideOffset`, `align` and `alignOffset` are picked from the Positioner props, destructured and forwarded to it. The popper-only radix classes became `!alignItemWithTrigger && "min-w-(--anchor-width)"`. Vars: `--radix-select-content-available-height` became `--available-height`, `--radix-select-content-transform-origin` became `--transform-origin`. `data-[state=open|closed]` became `data-open` / `data-closed`, and `data-[align-trigger=true]:animate-none` skips the zoom when the list opens over the trigger.
  - `Viewport` became `List`; `ScrollUpButton` / `ScrollDownButton` became `ScrollUpArrow` / `ScrollDownArrow` (wrapper names unchanged), with `top-0` / `bottom-0`, `w-full`, `z-10` and `bg-popover` so they overlay the list.
  - `SelectLabel` wraps `GroupLabel`. `SelectTrigger`'s chevron is now a child of `SelectPrimitive.Icon` (with `className="flex"`). Base UI's Icon renders a "▼" text node unless it gets children, and with `render={<ChevronDownIcon />}` that text landed inside the trigger. The browser suite caught it: the hour trigger read "12▼".
  - `SelectItem`: `ItemIndicator` uses `render={<span ... />}` in place of the outer span. `ItemText` renders a `<span>` (Base UI defaults to a `<div>`) so the existing `*:[span]` classes keep matching. `data-[disabled]` became `data-disabled`, and `data-highlighted:*` joins the `focus:*` highlight classes.
- `src/components/option-select.tsx`: `position="popper"` became `alignItemWithTrigger={false}`. The Root now gets `items` built from `options`; without it, Base UI's `SelectValue` shows the raw value ("pending") where radix showed the item text ("Pendiente"). `onValueChange` drops `null`, which Base UI may pass, before calling the `(value: string) => void` callback.
- `src/components/ui/time-picker.tsx`: both selects use `alignItemWithTrigger={false}` and drop `null` in `onValueChange`. Hour and minute labels equal their values, so no `items` are needed.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/select.tsx` is clean.

## Left alone

- The five `OptionSelect` call sites. Their props did not change.

## Behavior changes

- `onValueChange` receives `(value | null, eventDetails)`. Both wrappers above guard `null`.
- An empty string still counts as "no value", so the `--` placeholder in the time picker behaves as before.

## Verify by hand

- Every `OptionSelect` (for example the role filter in Admin > Usuarios and the lab and status filters in Todas las solicitudes): the closed trigger shows the label, not the raw value.
- Time picker (Admin > Periodos, new group): pick an hour, then a minute. The list opens below the trigger, at least as wide as it, and scrolls inside `max-h-64`.
- Keyboard: focus a select, press Enter or the arrow keys, type a letter to jump, press Enter to choose and Escape to close.
- Submit a form that has a named `OptionSelect` and check the value reaches the server.
