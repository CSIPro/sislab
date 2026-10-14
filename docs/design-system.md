SISLAB (Sistema de Laboratorios) is CSI PRO's system for teaching laboratories at the Universidad de Sonora. Professors register groups and lab schedules. A planned preparation-request workflow will let professors ask lab staff to prepare reagents and equipment for lab exercises; lab staff will use daily tickets to track that work. Students do not submit requests. This system carries the legacy MUI look into shadcn/ui and Tailwind. Use the shadcn role tokens (`background`, `primary`, `muted`…) in components. The brand tokens (`sislab-green`, `sislab-ink`…) exist so the roles can point at them.

## Content fundamentals

- The product speaks **Spanish (Mexico)**. Address the user as **tú**: "Selecciona el equipo", "Crea tu solicitud", "Cerrar sesión".
- Use sentence case for titles and buttons: "Nueva solicitud", "Mis grupos". Buttons are never uppercase (legacy set `textTransform: none` on every button).
- Labels are short nouns ("Solicitudes creadas", "Usuarios") and actions are infinitive verbs ("Crear", "Eliminar", "Ingresar").
- Brand names: **SISLAB** in caps, **CSI PRO** with a space. "Sistema de Laboratorios" is the tagline.
- A lab exercise is a **práctica** on screen ("Prácticas", "Nueva práctica", "Elige la práctica"). Do not write "ejercicio". Code and English docs keep "lab exercise".
- The professor role is **Docente** wherever the interface shows a role: the sidebar, the role checkboxes and the Roles column. Copy that talks about people keeps **profesor**: "Profesor" column headers, "Solicitudes próximas de todos los profesores" and the like. Code uses `professor`.
- Write **período** with the accent: "Períodos", "Período 2026-2".
- No emoji. Status always comes as a word, never colour alone: "Aprobada", "Pendiente", "Rechazada".

## Color

- **Green is the brand.** `primary` (= `sislab-green`, #00c795) fills primary buttons, the active nav item, checked controls and the logo. The legacy code used **#00c795**, not #00c792.
- Put `primary-foreground` (= `sislab-ink`) on green, **not white**. White on #00c795 is 2.2:1. Ink is 5.6:1.
- For green **text** (links, emphasised words, request titles) use `primary-text`. Raw `sislab-green` text on white fails contrast.
- On hover or press, `primary` becomes `primary-strong`. Hover backgrounds and selected rows use `accent` (the 8% green tint).
- Neutrals: text is `foreground` on `background`/`card`, and secondary text is `muted-foreground`. Filled inputs and neutral buttons use `secondary` (#f5f5f5, as in legacy). Dividers and card outlines use `border`.
- Status colours: `success` (green) means approved or done, `warning` (#ffe066, ink text) means pending, `destructive` (#ff3a20) means rejected or delete, and `info` means help or informational. `destructive` and light `info` are too weak for small white text. Keep their labels bold and 19px+, or use them as icon or border colours next to `foreground` text.
- `csipro-purple` is only for the name "CSI PRO" in running text.
- `csipro-tile` (#7145d6) is the square behind the white CSI PRO mark in the footer. It stays the same in both themes.
- Charts use `chart-1`…`chart-5` in order. The suggested colours #6d9dc5, #ffe066 and #ed217c live here, not in UI states.
- Dark theme: the `primary` green stays the same, while `primary-text` and the focus `ring` lighten to #3dd9ac. Surfaces are neutral greys that step `background` (#121213) → `card` (#1b1b1d) → `muted` (#262628). Only `accent`, `selected-surface`, the status surfaces and their borders carry a tint.
- The theme switch is an icon button in the landing header and a "Tema oscuro" / "Tema claro" row in the sidebar footer. `toggleTheme` in `src/lib/theme.ts` flips the `dark` class on `<html>` and saves the choice under `sislab-theme`. With nothing saved, the system setting decides. Use `ThemeIcon` and `ThemeLabel` from `components/theme-toggle.tsx` for any other switch.

## Typography

- **Nunito** (Google Fonts, 300/400/500/700) for all UI. Load it with `https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;700&display=swap`.
- Headings: `h1` for page titles, `h2` for sections, `h3` for card titles (often bold in `primary-text`), `h5` for dialog titles, `h6` for the app bar.
- Copy: `body` (16/1.5), with `body-sm` for checkbox labels and helper text. Buttons use `button` (19.2px, medium); the compact login button uses `button-sm`.
- **Fira Mono** for table cells that hold data (`table-cell`), with `font-variant-numeric: tabular-nums` on the table. A table of people, such as Usuarios, sets `font-sans` on its cells and keeps Nunito, because names and emails read badly in a monospace face.
- **Fira Mono** also sets the printed 80mm ticket (`ticket-title`, `ticket-body`). The legacy ticket used Inconsolata, which has no subscript or superscript glyphs for formulas such as H₂SO₄.
- Roboto appears only on the old teacher dashboard (MaestroDashBoard.scss). Do not carry it over.

## Shape and layout

- **12px radius is the signature** (`radius-lg`). Use it for buttons, inputs, accordions and menus, and set shadcn `--radius: 12px`. Use `radius-md` (8px) for nested panels, `radius-xl` (16px) for a table container's top corners, `radius-2xl` (32px) for the centred auth card, and `radius-sm` (4px) for chips.
- A short form sits in a column at most 600px wide (legacy `theme.maxWidth`).
- A page that lists items (catalogs, períodos, prácticas, usuarios) puts the table beside a card with the selected item's data. The card never turns into a form. Adding or editing opens a `FormDialog`, and an action that needs no input, such as Desactivar, stays on the card.
- A long form on its own page, such as Registrar grupo, lays its fields out in a two-column grid from `md` up.
- Accordions are outlined (1px `border`, 12px radius) with no shadow. Elevation is light, and borders do most of the separating.
- Focus: a 2px solid `ring` outline, offset 2px.

## Components and styling

Style with Tailwind utilities and nothing else. `src/styles.css` holds the colour tokens, the `@theme` block and a few element defaults in `@layer base`. Do not add component classes to it.

Every primitive is a shadcn/ui component from `src/components/ui`. Do not write a bare `<button>`, `<input>`, `<select>`, `<textarea>` or checkbox, and do not hand-build a sidebar or a scrolling container. To change how a primitive looks everywhere, edit its `cva` variants. To change one use, pass utilities through `className`.

- **Button** (`ui/button.tsx`). `default` is the green primary action, `outline` the neutral one, `destructive` an outlined action with red text, `link` a text action in `primary-text`, and `choice` a selectable card such as a date (pair it with `aria-pressed`). Sizes: `default` is 44px, `lg` is 48px for a form's main actions, `sm` is the bold 14px table action, `icon` is 44px square, `inline` has almost no side padding. A link that looks like a button is `<Button asChild><Link …/></Button>`.
- **Input and Textarea**. `variant="outline"` is the 44px outlined field. `variant="filled"` is the 48px grey field used on the access card and for textareas.
- **ChemicalInput** (`components/chemical-input.tsx`) is the Input for a name that may hold a formula, such as a reagent or a waste item. It turns `H_2O` into H₂O and `Fe^3+` into Fe³⁺ while the person types, and offers the corrected name when they leave the field with `H2SO4`. The name is stored as plain Unicode text.
- **Field** (`ui/field.tsx`). Wrap each control in `Field` with a `FieldLabel` and, when needed, a `FieldDescription`. Group related checkboxes in `FieldSet` with a `FieldLegend`.
- **Checkbox, RadioGroup, ToggleGroup, Tabs**. A two-way switch such as Día/Semana is a `ToggleGroup` with `type="single"` and `variant="outline"`. Sections of one page, such as Usuarios and Solicitudes de acceso on the Usuarios page, are `Tabs` whose `TabsList` has `variant="line"`. The open section is the `tab` search param, so a link can open it.
- **Dates** use `DatePicker` (`ui/date-picker.tsx`), a Popover with the shadcn Calendar in Spanish. It reads and writes `YYYY-MM-DD` text. Pass `isDateDisabled` to block dates, `clearable` for optional dates, and `trigger` to open it from your own Button. `markedDates` puts a dot under the dates you list, `markedLabel` says what the dot means to screen readers, and `onMonthChange` tells you which month to load marks for. Weeks start on Sunday, matching the weekday numbers in `lib/weekdays.ts`.
- **Times** use `TimePicker` (`ui/time-picker.tsx`). shadcn has no clock component, and a native time input shows AM/PM or 24 hours depending on the browser's language, so this is an hour Select and a minute Select that always show 24 hours. It reads and writes `HH:MM` text. Pass `label` (what screen readers announce, such as "Hora de inicio"), `name` to submit the time through `FormData`, and `earliest` and `latest` to limit what it offers. The group form offers 06:00 through 22:00. A saved time outside that range still shows, so editing an old group does not blank it.
- **Lists that come from data** (prácticas, periods, labs, careers, subjects) use `Combobox` (`ui/combobox.tsx`), so the person can type to filter. The search ignores accents and case.
- **Fixed lists** (status, role, weekday, quantity basis) use `OptionSelect` (`components/option-select.tsx`), which wraps the shadcn Select.
- Give a picker `name` when a form reads it through `FormData`, and `fieldVariant="filled"` to match a filled Input.
- **Badge** carries every status: `success`, `warning`, `destructive`, `neutral`, `info`, plus `outline` for role tags and `muted` for small grey tags. `count` is the round yellow counter on a tab or sidebar link. Render it through `CountBadge` (`components/count-badge.tsx`) and pass the singular and plural of what it counts, which screen readers hear after the number.
- **Card** is the outlined white panel. `CardTitle` renders a heading. Pass `asChild` when the card must be a `form` or an `article`.
- **Table** (`ui/table.tsx`) draws the outlined shell and scrolls sideways inside a `ScrollArea`. Use `TableEmpty` for the empty row and `TableCellNote` for a second line in a cell.
- **FormDialog** (`components/form-dialog.tsx`) is the shadcn Dialog holding one form, with Cancelar and the submit button pinned under fields that scroll. Render it only while the form is open, pass a failed save through `notice`, and show the success message on the page after it closes.
- **Alert** shows messages through `Notice` (`components/notice.tsx`), which picks `role="status"` or `role="alert"` from the tone.
- **Sidebar** (`components/app-sidebar.tsx`) is the shadcn Sidebar. The header and footer stay fixed and a `ScrollArea` scrolls the links. On phones it becomes a drawer opened from the top bar.
- Page layout comes from `Page`, `PageHeader`, `Footnote` and `EmptyState` in `components/page.tsx`.
- After `shadcn add`, the CLI imports `cn` from an npm package called `cn`. Point those imports at `#/lib/utils.ts` and run `pnpm remove cn`.

## Iconography

- Legacy UI icons are **Remix Icon 2.5.0** line icons (`ri-information-line`, `ri-add-circle-line`, `ri-group-line`, `ri-logout-box-line`, `ri-checkbox-circle-line`, `ri-error-warning-line`), plus MUI icons. For shadcn, use **Lucide**, line style, 1.5–2px stroke, in `currentColor`.
- Info tooltips put an info icon in `primary-text` after the label.
- `assets/Icons` holds the two legacy SVGs: the green success check (used in confirmations) and the white menu glyph for the green app bar.

## Logos and imagery

- `sislab-logo.png` is the full lockup (leaf mark + "SISLAB" + "Sistema de Laboratorios") in `sislab-green`. Use it on light grounds on the auth card.
- `sislab-mark.svg` (green leaf) is for light grounds. `sislab-mark-white.svg` goes on `primary` or dark grounds, such as the app bar.
- `csipro.svg` is the white CSI PRO mark. The footer puts it on a `csipro-tile` square next to the name "CSI PRO", and the pair is one link to csipro.isi.unison.mx.
- `unison.png` is the Universidad de Sonora logo in the footer, linked to unison.mx. On the dark theme it is inverted to white.
- `owl-blue.png`, `owl-gold.png` and `owl-black.png` are the CSI PRO owls on the landing's credit cards, one per developer. The black owl is inverted to white on the dark theme.
- `lab-background.jpg` is the lab photo behind the login card. Cover the viewport with it and centre the `card` on top.

## Not synced

Read from a local checkout of CSIPro/legacy-sislab at `main@a046f7a`.

- **Added for shadcn** (not in the legacy code): `primary-foreground` → ink instead of white, `primary-text`, `success`, `warning`, `info-foreground`, `chart-*`, all dark-theme values and the dark value of `csipro-purple`.
- **Suggested colours:** #363537 became `sislab-ink`. #6d9dc5 is the dark `info` and `chart-2`. #ffe066 is `warning` and `chart-3`. #ed217c is only `chart-4`, because the code already has its own error red (#ff3a20).
- **Skipped one-off colours:** #39c9b5 (loader), #03a9f4 and #ececec (teacher dashboard), #888888/#666666 (old login form).
- **Fonts:** Nunito and Fira Mono come from Google Fonts, so there are no font files. The PDF also registers Open Sans 600 and an Inconsolata bold from third-party URLs, which were not carried over.
- **Assets not copied:** `microsoft-logo.png` (third-party), `public/logo192.png`/`logo512.png` (Create React App defaults) and `logoLogin.svg` (the same mark as `sislab-mark.svg`).
- **Components:** the legacy MUI library is replaced by the shadcn/ui components in `src/components/ui`, themed to this system. See "Components and styling".
