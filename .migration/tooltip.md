# tooltip

2026-11-15. Transformation engine (legacy `new-york` style), shaped after the base-nova registry wrapper. Migrated.

## Changed

- `src/components/ui/tooltip.tsx`: imports `Tooltip` from `@base-ui/react/tooltip`. `TooltipProvider` takes `delay` (default `0`) instead of `delayDuration`. `TooltipContent` renders `Portal > Positioner > Popup` and forwards `side`, `sideOffset`, `align` and `alignOffset` to the Positioner (defaults: `top`, `4`, `center`, `0`); the Positioner gets `isolate z-50`. Class rewrites: `origin-(--radix-tooltip-content-transform-origin)` became `origin-(--transform-origin)`, and the enter animation moved onto `data-open:*` with the exit on `data-closed:*`. The arrow keeps its look and gains per-side offsets (`data-[side=...]`) because Base UI positions the arrow as a plain div.
- `src/components/materials.tsx:99`: `<TooltipTrigger asChild><span>` became `<TooltipTrigger render={<span ... />}>`.
- `src/components/ui/sidebar.tsx`: `TooltipProvider delayDuration={0}` became `delay={0}`, and `<TooltipTrigger asChild>{button}</TooltipTrigger>` became `<TooltipTrigger render={button} />`. The rest of the sidebar is migrated separately.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/tooltip.tsx` is clean.

## Left alone

- The sidebar's `hidden={state !== "collapsed" || isMobile}` on `TooltipContent`. It now lands on the Popup, same as in the base registry sidebar.

## Behavior changes

- Radix added the arrow height to `sideOffset`; Base UI does not. The default `sideOffset` went from 0 to 4 to keep a similar gap.
- Base UI's Trigger closes the tooltip on click by default (`closeOnClick`).

## Verify by hand

- New request, materials list: hover a dotted amount; the "Total para todo el grupo" tooltip appears above with the arrow pointing at the amount.
- Collapse the sidebar to icons and hover an item: the tooltip appears to the right with no delay. Expand it: no tooltips.
