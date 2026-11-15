# sheet

2026-11-15. Transformation engine (legacy `new-york` style). Migrated; the user's slide animations stay.

## Changed

- `src/components/ui/sheet.tsx`: imports `Dialog` from `@base-ui/react/dialog` as `SheetPrimitive`. `Overlay` became `Backdrop` and `Content` became `Popup`. Part types use `SheetPrimitive.<Part>.Props`. `data-[state=open|closed]` became `data-open` / `data-closed`, including the per-side `slide-in-from-*` / `slide-out-to-*` classes. The dead `data-[state=open]:bg-secondary` on the close button was dropped; Radix's Close never had a `data-state` attribute.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/sheet.tsx` is clean.

## Left alone

- The base registry rewrote the sheet animation with `data-starting-style` / `data-ending-style` transitions. This project keeps its keyframe animations (500ms in, 300ms out). Base UI waits for keyframe animations to finish before unmounting, so they still play.
- `src/components/ui/sidebar.tsx` renders the only `Sheet`. Its `[&>button]:hidden` still hides the close button.

## Behavior changes

None found.

## Verify by hand

- Narrow the window to phone width and open the sidebar: it slides in from the left with a dimmed backdrop. Close it with Escape and with a backdrop click; it slides out.
- Tab inside the open sheet: focus stays inside it.
