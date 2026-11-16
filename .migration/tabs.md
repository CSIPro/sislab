# tabs

2026-11-15. Transformation engine (legacy `new-york` style). Migrated.

## Changed

- `src/components/ui/tabs.tsx`: imports `Tabs` from `@base-ui/react/tabs`. `Trigger` became `Tab` and `Content` became `Panel`; the wrapper names `TabsTrigger` and `TabsContent` stay. `data-[state=active]` became `data-active` throughout, and the trigger gained `aria-disabled:pointer-events-none aria-disabled:opacity-50` next to the `disabled:` classes. The `data-[orientation=...]` classes stay because Base UI still sets `data-orientation`.
- `src/routes/app.admin.users.tsx:91` and `src/components/AccessCard.tsx:20`: the tab class strings used `data-[state=active]:*`; they now use `data-active:*`.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/tabs.tsx` is clean.

## Left alone

- `onValueChange={showTab}` in `app.admin.users.tsx`. Base UI passes `(value, eventDetails)`; `showTab` takes the first argument only.

## Behavior changes

- Activation mode. Radix activated a tab as soon as arrow keys focused it. Base UI moves focus with the arrow keys and activates on Enter or Space. To get the old behavior back, pass `activateOnFocus` to `TabsList`. Not changed here.

## Verify by hand

- Login card: switch "Ingresar" and "Crear cuenta" with the mouse; the active tab gets the card background and bold text.
- Admin > Usuarios: switch tabs; the URL `tab` search param updates and the underline moves.
- Keyboard: focus a tab, press the arrow keys, then Enter. Decide whether manual activation is acceptable.
