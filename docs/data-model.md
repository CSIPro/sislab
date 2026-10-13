# Proposed data model

Status: agreed model. The first application slice is professor group registration and lab scheduling; preparation requests follow it.

## Tables

| Table | Core data | Rules |
| --- | --- | --- |
| `users` | Internal ID, optional legacy Clerk ID, email, password credential, name, active state, verification time | Admin activates accounts after checking identity outside Sislab, which sets `verified_at`. An inactive account without `verified_at` is an access request. An inactive account with it was deactivated. Historical Clerk accounts are linked only after that check. |
| `user_roles` | User ID, role (`professor`, `staff`, `admin`) | A user can hold several roles. Admin includes staff privileges. |
| `periods` | Code, optional official start and end dates | Regular codes use `YEAR-1` and `YEAR-2`, and the summer term uses `YEAR-V`, which sorts between them. A period with both dates is current between them; without dates, its code is compared to the current half-year. Group forms suggest the period whose dates include today, or else the current half-year, but allow another period. |
| `labs`, `careers`, `subjects` | Name, active state | Admin-managed catalogs, initially seeded. Retired entries remain available to historical records. |
| `groups` | Professor, period, stable number, lab, career, subject, their historical labels, students, teams, weekday, start and end times, active state | Number unique per professor and period, including inactive groups. Students: 1–60; teams: 1–students. Active lab slots cannot overlap within a period and weekday. A group with a future, non-voided preparation request cannot change lab, weekday, time, or team count, or be deactivated. |
| `lab_exercises` | Number, name, reagent/equipment/waste requirements as structured JSON, active state | Admin-managed, initially seeded from the legacy data in `docs/legacy-data` with `pnpm db:seed`. Exercises are available to every group; exercise number is a label, not a unique key. |
| `preparation_requests` | Group, submitting professor, exercise, session date, lab and time snapshot, material and quantity snapshot, professor note, late decision, void reason and actor | One non-voided request per group and date. Exercise edits do not silently rewrite submitted requests. |
| `settings` | Minimum notice in calendar days | One global admin-managed value, initially 7. Dates use `America/Hermosillo`. |

The authentication implementation may need session tables. It must not use Clerk IDs as domain keys. The first admin is provisioned on the server without a default password; password recovery is admin-assisted until email delivery exists.

## Material shape

Reagents and equipment have a name, an optional amount with its unit, and a quantity basis (`per team` or `per group`). An item has both an amount and a unit or neither, because the legacy catalog lists many reagents and all equipment without a quantity. Expected waste has a treatment and an optional name and container. Requests copy the relevant exercise requirements, apply permitted reagent additions/omissions and equipment/waste additions, and retain calculated quantities. Ticket totals combine matching items and units across groups without changing the legacy ticket grouping by exercise, professor, and group.

## First preparation-request release

- A professor chooses one of their active groups and an active lab exercise. The form offers the next three dates on the group's weekday and a calendar for later ones. The calendar disables every other weekday and every past date. On the session day, submission closes when the group's start time arrives. The server enforces the same rules. Academic-period dates do not restrict requests. The lab and time come from the group and are saved with the submitted materials and calculated quantities.
- The professor may add or omit reagents and add equipment or waste details before submitting. Submitted requests are read-only to professors, lab staff, and admins. Admins manage the exercise catalog and the minimum notice setting, initially seven calendar days.
- A short-notice submission needs a professor's reason. Staff or admins may accept or decline that individual exception. An undecided or declined late request remains visible in the lists but stays off the ticket. A professor may submit a new request for another eligible date after a decline. No decision deadline or mandatory decline reason applies in this release.
- Staff or admins may void a mistaken submission with a reason. The request remains visible as "Anulada" with who voided it and when; its group and date become available for a replacement. General cancellation is deferred.
- Professors see their own requests by date. Staff and admins see all requests by day or week. Staff and admins can generate or reprint a daily PDF ticket. It includes all ordinary and accepted late requests for that day, including open requests, and excludes undecided or declined late requests and voided requests. Ticket rendering and reprinting do not change request state.

## Later possibilities

Review and fulfillment controls, general cancellation, submitted-request edits, staff material corrections, and one-time schedule exceptions are outside the first release. If group schedule changes are later allowed while future requests exist, the affected request snapshots will need an explicit reconciliation rule. The existing request schema has fields for some of these future behaviors but does not yet represent a declined late decision or a void reason.

## Deliberate omissions

Weekdays and times use native date/time values rather than lookup tables. Material lists stay in JSON while there is no stock tracking or cross-request material search. The first release keeps one professor note; a staff note can accompany later staff actions. The historical Mongo IDs for non-user records are translated during the eventual manual migration rather than exposed in the new app.
