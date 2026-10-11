## Visual assets

- Never use image generation for this repository. Use existing project assets or create graphics directly in code when needed.

<!-- intent-skills:start -->
## Styling

- Style with Tailwind utilities only. Do not add component classes to `src/styles.css`.
- Use the shadcn/ui components in `src/components/ui` for every primitive, including buttons, inputs, checkboxes, selects, the sidebar and scrolling containers. See "Components and styling" in `docs/design-system.md`.

## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Agent skills

### Issue tracker

Specs and implementation tickets live in GitHub Issues for CSIPro/sislab. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five configured triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. Read `CONTEXT.md` and relevant ADRs before changing domain behavior. See `docs/agents/domain.md`.
