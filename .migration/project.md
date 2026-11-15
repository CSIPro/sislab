# project

2026-11-15. Whole-project migration from Radix UI to Base UI (`@base-ui/react@1.9.0`), on branch `migrate-radix-to-base-ui`, one commit per component. Strategy: transformation engine. `components.json` uses the legacy `new-york` style, which has no Base UI variant, so the radix registry files were not replayed; each wrapper was rewired in place and keeps its own classes. The base-nova registry wrappers served as a shape reference.

## Dependencies

- Added `@base-ui/react@^1.9.0`. Removed `radix-ui@1.6.7`.
- `@radix-ui/*` packages remain in `pnpm-lock.yaml` only as dependencies of `cmdk@1.1.1`.
- Lockfile drift: several dependencies in `package.json` use `latest` (the TanStack packages), and pnpm re-resolves them on any install. The install also moved `@tanstack/devtools-vite` from 0.8.5 to 0.8.6 and a few of their transitive packages. Running `pnpm install` on `main` would do the same.

## Wrappers migrated (17)

avatar, button, card, checkbox, dialog, label, popover, radio-group, scroll-area, select, separator, sheet, sidebar, tabs, toggle, toggle-group, tooltip. Each has its own report in this folder.

## Left alone

- Not radix: `command.tsx` (cmdk; only `CommandDialog`'s children type changed, see `dialog.md`), `calendar.tsx` (react-day-picker).
- No radix inside: `alert.tsx`, `badge.tsx`, `field.tsx` (one class rename, see `checkbox.md`), `input.tsx`, `pagination.tsx`, `skeleton.tsx`, `table.tsx`, `textarea.tsx`, and the composed `combobox.tsx`, `multi-combobox.tsx`, `date-picker.tsx`, `picker-trigger.tsx`, `time-picker.tsx` (call sites updated, see `popover.md` and `select.md`).

## App-code sweep

- `asChild`: 31 call sites. 13 `<Button asChild>` links became links styled with `buttonVariants` (see `button.md`); 9 `<Card asChild>`, 2 `<SidebarMenuButton asChild>`, 4 `<PopoverTrigger asChild>` / `<TooltipTrigger asChild>` and the `DialogFooter` close button moved to `render`.
- Class hooks: `data-[state=checked]`, `data-[state=active]`, `data-[state=on]` and `data-[state=open|closed]` became `data-checked`, `data-active`, `data-pressed` and `data-open` / `data-closed` / `data-popup-open`. `--radix-*` variables became `--transform-origin`, `--available-height` and `--anchor-width`.
- Props: ToggleGroup `type="single"` with string values became array values (3 call sites). Select `position="popper"` became `alignItemWithTrigger={false}` (3). TooltipProvider `delayDuration` became `delay` (1). Select `onValueChange` handlers now drop `null` (3).
- Not found in app code: `onOpenAutoFocus`, `onCloseAutoFocus`, `onEscapeKeyDown`, `onPointerDownOutside`, `onInteractOutside`, `forceMount`, `delayMs`, `decorative`, `checked="indeterminate"`, `activationMode`, Accordion, Menu, Slider.

## Final verification

- `pnpm exec tsc --noEmit`: 0 errors, same as the baseline.
- `pnpm build`: passes, same as the baseline. The `"use client"` directive warnings from `@tanstack/react-query` and the chunk-size warning appear on `main` too.
- `pnpm test:unit`: 58 of 58 pass.
- `pnpm exec biome lint` on the changed files: clean.
- Playwright browser suite (`test/browser/sislab.spec.ts`), against the test database on port 4174: 9 of 9 pass with `--timeout=60000`. Three assertions were updated for Base UI markup (see `toggle-group.md` and `checkbox.md`). The professor test needs about 31s against a cold dev server, and 36.9s on `main`, so the default 30s timeout fails it on both branches.
- `grep -rln "radix-ui\|@radix-ui" src` returns nothing.

## Flagged, not fixed

- `components.json` still says `"style": "new-york"`. The shadcn CLI will keep delivering radix variants on `shadcn add`. There is no `base-new-york` style; switching to a `base-*` style would restyle any component added later. Add new components by hand or pick a base style.
- Behavior changes worth a decision, each detailed in its report: tabs no longer activate on arrow-key focus (`tabs.md`); toggle-group items are announced as pressed buttons instead of radios (`toggle-group.md`); scrollbars show whenever content overflows, not only on hover (`scroll-area.md`); separators are no longer decorative (`separator.md`); `PopoverAnchor` is inert (`popover.md`).
