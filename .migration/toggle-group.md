# toggle-group

2026-11-15. Transformation engine (legacy `new-york` style). Migrated.

## Changed

- `src/components/ui/toggle-group.tsx`: the group is the callable `ToggleGroup` from `@base-ui/react/toggle-group`; items render the Base UI `Toggle`. `data-[spacing=0]:data-[state=on]:z-10` became `data-[spacing=0]:data-pressed:z-10`.
- Call sites dropped `type="single"`. Base UI groups are single-select unless `multiple` is set, and `value` is always an array, so each call site now passes `value={[x]}` and reads `onValueChange={([value]) => ...}`:
  - `src/routes/app.requests.all.tsx` (day/week view)
  - `src/routes/app.admin.groups.tsx` and `src/routes/app.groups.manage.tsx` (active/all filter)

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/toggle-group.tsx` is clean.

## Left alone

- The `if (value)` guards. Clicking the pressed item still yields an empty selection, and the guards still ignore it.

## Behavior changes

None found.

## Verify by hand

- Todas las solicitudes: switch Día and Semana; click the pressed one again and confirm nothing changes.
- Admin > Grupos and Mis grupos: switch the active/all filter with the mouse and with arrow keys.
