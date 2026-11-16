# label

2026-11-15. Transformation engine. Base UI has no Label part, so the wrapper renders a native `<label>`.

## Changed

- `src/components/ui/label.tsx`: dropped `Label` from `radix-ui`; the wrapper now renders `<label>` with the same classes and `data-slot`. Props are `React.ComponentProps<"label">`, which matches what the radix part accepted. A `biome-ignore` comment covers `noLabelWithoutControl`, since callers either pass `htmlFor` or wrap the control.

Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/label.tsx` is clean.

## Left alone

- All `<Label>` call sites. No call site used radix-only props.

## Behavior changes

- Radix Label blocked text selection on a double click. A native label lets the browser select the text.

## Verify by hand

- Click the text of a role checkbox (`role-checkboxes.tsx`) and a radio label in the new request form; each click should toggle the control.
- Double-click a label and check the text selection does not bother you.
