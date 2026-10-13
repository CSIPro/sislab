# Coding standards

Review a diff against these rules. Styling, component and copy rules are in `docs/design-system.md`.

## File names

Name every file in kebab-case, such as `access-card.tsx`, `use-mobile.ts` and `owl-blue.png`. A React component's file is kebab-case and its export is PascalCase, so `person-avatar.tsx` exports `PersonAvatar`.

Dotted suffixes come after the kebab-case name, as in `auth.server.ts` and `catalogs.integration.test.ts`.

Three kinds of file follow another convention:

- Route files in `src/routes` use TanStack Router's file naming, such as `app.admin.catalogs.$kind.tsx` and `__root.tsx`.
- Generated files keep the name their tool gives them, such as `src/routeTree.gen.ts`.
- Documents at the repo root are upper-case, such as `AGENTS.md` and `CONTEXT.md`.

`AccessCard.tsx`, `Footer.tsx` and `Header.tsx` in `src/components` predate this rule. Editing one of them complies. Adding a file named like them is a violation.
