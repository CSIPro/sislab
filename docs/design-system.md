SISLAB (Sistema de Laboratorios) is CSI PRO's system for teaching laboratories at the Universidad de Sonora. Professors register groups and lab schedules. A planned preparation-request workflow will let professors ask lab staff to prepare reagents and equipment for lab exercises; lab staff will use daily tickets to track that work. Students do not submit requests. This system carries the legacy MUI look into shadcn/ui and Tailwind. Use the shadcn role tokens (`background`, `primary`, `muted`…) in components. The brand tokens (`sislab-green`, `sislab-ink`…) exist so the roles can point at them.

## Content fundamentals

- The product speaks **Spanish (Mexico)**. Address the user as **tú**: "Selecciona el equipo", "Crea tu solicitud", "Cerrar sesión".
- Use sentence case for titles and buttons: "Nueva solicitud", "Mis grupos". Buttons are never uppercase (legacy set `textTransform: none` on every button).
- Labels are short nouns ("Solicitudes creadas", "Usuarios") and actions are infinitive verbs ("Crear", "Eliminar", "Ingresar").
- Brand names: **SISLAB** in caps, **CSI PRO** with a space. "Sistema de Laboratorios" is the tagline.
- No emoji. Status always comes as a word, never colour alone: "Aprobada", "Pendiente", "Rechazada".

## Color

- **Green is the brand.** `primary` (= `sislab-green`, #00c795) fills primary buttons, the active nav item, checked controls and the logo. The legacy code used **#00c795**, not #00c792.
- Put `primary-foreground` (= `sislab-ink`) on green, **not white**. White on #00c795 is 2.2:1. Ink is 5.6:1.
- For green **text** (links, emphasised words, request titles) use `primary-text`. Raw `sislab-green` text on white fails contrast.
- On hover or press, `primary` becomes `primary-strong`. Hover backgrounds and selected rows use `accent` (the 8% green tint).
- Neutrals: text is `foreground` on `background`/`card`, and secondary text is `muted-foreground`. Filled inputs and neutral buttons use `secondary` (#f5f5f5, as in legacy). Dividers and card outlines use `border`.
- Status colours: `success` (green) means approved or done, `warning` (#ffe066, ink text) means pending, `destructive` (#ff3a20) means rejected or delete, and `info` means help or informational. `destructive` and light `info` are too weak for small white text. Keep their labels bold and 19px+, or use them as icon or border colours next to `foreground` text.
- `csipro-purple` is only for the name "CSI PRO" in running text.
- Charts use `chart-1`…`chart-5` in order. The suggested colours #6d9dc5, #ffe066 and #ed217c live here, not in UI states.
- Dark theme: the green stays the same, and surfaces step `background` → `card` → `muted`.

## Typography

- **Nunito** (Google Fonts, 300/400/500/700) for all UI. Load it with `https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;700&display=swap`.
- Headings: `h1` for page titles, `h2` for sections, `h3` for card titles (often bold in `primary-text`), `h5` for dialog titles, `h6` for the app bar.
- Copy: `body` (16/1.5), with `body-sm` for checkbox labels and helper text. Buttons use `button` (19.2px, medium); the compact login button uses `button-sm`.
- **Fira Mono** for every table cell (`table-cell`), with `font-variant-numeric: tabular-nums` on the table.
- **Inconsolata** only for the printed 80mm ticket (`ticket-title`, `ticket-body`).
- Roboto appears only on the old teacher dashboard (MaestroDashBoard.scss). Do not carry it over.

## Shape and layout

- **12px radius is the signature** (`radius-lg`). Use it for buttons, inputs, accordions and menus, and set shadcn `--radius: 12px`. Use `radius-md` (8px) for nested panels, `radius-xl` (16px) for a table container's top corners, `radius-2xl` (32px) for the centred auth card, and `radius-sm` (4px) for chips.
- Forms sit in a column at most 600px wide (legacy `theme.maxWidth`).
- Accordions are outlined (1px `border`, 12px radius) with no shadow. Elevation is light, and borders do most of the separating.
- Focus: a 2px solid `ring` outline, offset 2px.

## Iconography

- Legacy UI icons are **Remix Icon 2.5.0** line icons (`ri-information-line`, `ri-add-circle-line`, `ri-group-line`, `ri-logout-box-line`, `ri-checkbox-circle-line`, `ri-error-warning-line`), plus MUI icons. For shadcn, use **Lucide**, line style, 1.5–2px stroke, in `currentColor`.
- Info tooltips put an info icon in `primary-text` after the label.
- `assets/Icons` holds the two legacy SVGs: the green success check (used in confirmations) and the white menu glyph for the green app bar.

## Logos and imagery

- `sislab-logo.png` is the full lockup (leaf mark + "SISLAB" + "Sistema de Laboratorios") in `sislab-green`. Use it on light grounds on the auth card.
- `sislab-mark.svg` (green leaf) is for light grounds. `sislab-mark-white.svg` goes on `primary` or dark grounds, such as the app bar.
- `csipro-logo.png` is the grey CSI PRO mark for "developed by" footers. Keep it small.
- `lab-background.jpg` is the lab photo behind the login card. Cover the viewport with it and centre the `card` on top.

## Not synced

Read from a local checkout of CSIPro/legacy-sislab at `main@a046f7a`.

- **Added for shadcn** (not in the legacy code): `primary-foreground` → ink instead of white, `primary-text`, `success`, `warning`, `info-foreground`, `chart-*`, all dark-theme values and the dark value of `csipro-purple`.
- **Suggested colours:** #363537 became `sislab-ink`. #6d9dc5 is the dark `info` and `chart-2`. #ffe066 is `warning` and `chart-3`. #ed217c is only `chart-4`, because the code already has its own error red (#ff3a20).
- **Skipped one-off colours:** #39c9b5 (loader), #03a9f4 and #ececec (teacher dashboard), #888888/#666666 (old login form).
- **Fonts:** Nunito, Fira Mono and Inconsolata come from Google Fonts, so there are no font files. The PDF also registers Open Sans 600 and an Inconsolata bold from third-party URLs, which were not carried over.
- **Assets not copied:** `microsoft-logo.png` (third-party), `public/logo192.png`/`logo512.png` (Create React App defaults) and `logoLogin.svg` (the same mark as `sislab-mark.svg`).
- **Components:** none built. The legacy library is MUI and will be replaced by shadcn/ui.
