# Issue tracker: GitHub

Specs and implementation tickets for this repo live in GitHub Issues at `CSIPro/sislab`. Use the `gh` CLI with `--repo CSIPro/sislab` when the repository cannot be inferred from the checkout.

## Issue operations

- Create an issue with `gh issue create`. For a multiline body, write the exact text to a temporary file and pass `--body-file`.
- Read an issue and its comments with `gh issue view <number> --json number,title,body,labels,comments`.
- List open issues with `gh issue list --state open --json number,title,labels` and apply filters as needed.
- Apply the `ready-for-agent` label to approved specs and implementation tickets.
- Leave source or parent issues open when creating child tickets.

## Dependencies

Create tickets in blocker-first order. Use GitHub's native issue dependencies when available. The dependency endpoint needs the blocker's numeric database ID, not its issue number. When native dependencies are unavailable, put `Blocked by: #<number>` near the top of the dependent ticket's body. A ticket is ready to start when all of its blockers are closed.

## Pull requests as a triage surface

PRs as a request surface: no. If this repo starts treating external PRs as feature requests, change this setting here before triaging them.

## Wayfinding

For `/wayfinder`, keep one map issue with child decision issues. Label the map `wayfinder:map` and children `wayfinder:<type>`. Link child issues as sub-issues when GitHub supports them; otherwise list them in the map issue. Claim an unblocked child before working on it, record the answer in a comment, then close it and update the map's decisions.
