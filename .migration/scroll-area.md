# scroll-area

2026-11-15. Transformation engine (legacy `new-york` style). Migrated; classes unchanged.

## Changed

- `src/components/ui/scroll-area.tsx`: imports `ScrollArea` from `@base-ui/react/scroll-area`. `ScrollAreaScrollbar` and `ScrollAreaThumb` became `Scrollbar` and `Thumb`. Props are `ScrollAreaPrimitive.Root.Props` and `ScrollAreaPrimitive.Scrollbar.Props`.
- `src/components/page.tsx:111` (`DetailPanel`): removed `[&>[data-slot=scroll-area-viewport]>div]:block!`. It overrode the `display: table` div that the radix Viewport inserted around its children. Base UI inserts no such div, so the selector would have forced the panel's own first child to `display: block`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/scroll-area.tsx` is clean.

## Left alone

- `src/components/ui/table.tsx`, `form-dialog.tsx`, `app-sidebar.tsx`, `combobox.tsx`, `multi-combobox.tsx`: they use `ScrollArea`, `ScrollBar orientation="horizontal"` and the `[data-slot=scroll-area-viewport]` hook, which Base UI keeps. No call site passes `type`.

## Behavior changes

- Radix defaulted to `type="hover"`, which showed scrollbars only while the pointer was over the area. Base UI shows a scrollbar whenever the content overflows. It still unmounts a scrollbar with nothing to scroll.
- Radix wrapped the children in a `display: table; min-width: 100%` div. Without it, wide content sizes from its own classes; the tables already set `min-w-[...]`, so they still scroll sideways.

## Verify by hand

- Dashboard and Todas las solicitudes on a narrow window: the table scrolls sideways and the horizontal bar works with drag and trackpad.
- Open a form dialog with a long form: the body scrolls and the footer stays put.
- Sidebar with many items: it scrolls; check that always-visible scrollbars look acceptable.
- A request detail panel (`DetailPanel`) at xl width: it stays sticky and scrolls inside the viewport height.
