# Proposed data model

Status: agreed model. The first application slice is professor group registration and lab scheduling; preparation requests follow it.

## Tables

| Table | Core data | Rules |
| --- | --- | --- |
| `users` | Internal ID, optional legacy Clerk ID, email, password credential, name, active state | Admin activates accounts after checking identity outside Sislab. Historical Clerk accounts are linked only after that check. |
| `user_roles` | User ID, role (`professor`, `staff`, `admin`) | A user can hold several roles. Admin includes staff privileges. |
| `periods` | Code, optional official start and end dates | Regular codes use `YEAR-1` and `YEAR-2`; group forms suggest the current half-year but allow another period. Summer codes can be added when dates are available. |
| `labs`, `careers`, `subjects` | Name, active state | Admin-managed catalogs, initially seeded. Retired entries remain available to historical records. |
| `groups` | Professor, period, stable number, lab, career, subject, their historical labels, students, teams, weekday, start and end times, active state | Number unique per professor and period, including inactive groups. Students: 1–60; teams: 1–students. Active lab slots cannot overlap within a period and weekday. |
| `lab_exercises` | Number, name, reagent/equipment/waste requirements as structured JSON, active state | Admin-managed, initially seeded from reviewed Mongo data. Exercises are available to every group; exercise number is a label, not a unique key. |
| `preparation_requests` | Group, submitting professor, exercise, session date, actual lab and time, material and quantity snapshot, professor note, staff note, lifecycle state, staff action timestamps, exception details | One non-cancelled request per group and date. Group and exercise edits do not silently rewrite requests. |
| `settings` | Minimum notice in calendar days | One global admin-managed value, initially 7. Dates use `America/Hermosillo`. |

The authentication implementation may need session tables. It must not use Clerk IDs as domain keys. The first admin is provisioned on the server without a default password; password recovery is admin-assisted until email delivery exists.

## Material shape

Reagents and equipment have a name, amount, unit, and quantity basis (`per team` or `per group`). Expected waste has a name, container, and treatment. Requests copy the relevant exercise requirements, apply permitted reagent additions/omissions and equipment/waste additions, and retain calculated quantities. Ticket totals combine matching items and units across groups without changing the legacy ticket grouping by exercise, professor, and group.

## Request flow

- Ordinary lifecycle: `open → reviewed → fulfilled`, with cancellation retained as history. Staff explicitly mark a request reviewed; viewing or downloading a ticket does not change its state. Admins can do everything staff can.
- A professor may edit an unfulfilled request. Editing a reviewed request returns it to open and requires a new ticket. Only staff or admins can reopen or cancel a fulfilled request.
- A request or preparation-changing edit within the notice window needs a reason and staff acceptance before review. Staff can accept the individual exception without changing the global setting.
- Staff confirm the actual date, lab, and time for a one-time schedule exception. A group schedule change flags affected future requests for confirmation and preserves their existing snapshots.
- Tickets include accepted, non-cancelled requests in any active lifecycle state. Rendering and reprinting are read-only operations.

## Deliberate omissions

Weekdays and times use native date/time values rather than lookup tables. Material lists stay in JSON while there is no stock tracking or cross-request material search. One professor note and one staff note replace the legacy comment collection. The historical Mongo IDs for non-user records are translated during the eventual manual migration rather than exposed in the new app.
