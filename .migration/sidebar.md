# sidebar

2026-11-15. Transformation engine (legacy `new-york` style), shaped after the base-nova registry sidebar. Migrated; the sidebar's classes stay, apart from two dead trigger hooks.

## Changed

- `src/components/ui/sidebar.tsx`: the five parts that used `Slot` from `radix-ui` with an `asChild` prop now use `useRender` and `mergeProps` from Base UI and accept a `render` element: `SidebarGroupLabel` (div), `SidebarGroupAction` (button), `SidebarMenuButton` (button), `SidebarMenuAction` (button) and `SidebarMenuSubButton` (a). Their `data-slot`, `data-sidebar`, `data-size` and `data-active` attributes go through `mergeProps` unchanged, so `data-[active=true]` and the `peer-data-[size=...]` classes still match.
- `SidebarMenuButton` with a `tooltip` renders `<TooltipTrigger render={button} />`; the tooltip migration set this up.
- `data-[state=open]:hover:*` on the menu button and `data-[state=open]:opacity-100` on the menu action became `data-popup-open:*`. Those hooks styled the parts when they triggered an open menu; Base UI marks an open trigger with `data-popup-open`.
- `src/components/app-sidebar.tsx`: both `<SidebarMenuButton asChild><Link>...` call sites became `<SidebarMenuButton render={<Link ... />}>...`. `useRender` adds no `role`, so the items stay links with `aria-current`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/sidebar.tsx` is clean.

## Left alone

- `data-state="expanded" | "collapsed"` and `peer-data-[state=collapsed]` classes. That attribute belongs to the sidebar itself, not to Radix.
- The mobile `Sheet`, `TooltipProvider`, `Separator`, `Input` and `Skeleton` usages. They were handled in their own migrations or never used Radix.

## Behavior changes

None found. No menu opens from the sidebar today, so the `data-popup-open` hooks have nothing to style yet.

## Verify by hand

- Desktop: click each sidebar item. The current page gets the accent background, and a screen reader announces "link, current page".
- Collapse the sidebar to icons (Ctrl+B or the trigger) and hover an item: the tooltip shows. Expand it again.
- Phone width: open the sidebar sheet, tap an item. The sheet closes and the page changes.
- "Página de inicio" in the footer goes to the landing page.
