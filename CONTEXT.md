# Sislab

Sislab schedules teaching in laboratories and helps staff prepare for lab exercises.

## Language

**Academic period**:
An interval of teaching identified by a year and term code, including regular and summer terms. The regular terms are `YEAR-1` and `YEAR-2`, and the summer term is `YEAR-V` ("Verano"), which falls between them. A period has default dates for its term: `YEAR-1` runs January 1 to May 31, `YEAR-V` runs June 1 to July 31, and `YEAR-2` runs August 1 to December 31. It uses its official dates when an admin has set them and its default dates otherwise. A period is current between those dates. Mis grupos opens on the current period or, when none is current, on the most recent period that has started. When no period has started, it opens on the newest period where the professor has groups.
_Avoid_: Semester

**Concluded period**:
An academic period whose end date has passed. Its last day still belongs to the period. A professor's groups in a concluded period are frozen as the period left them, and no new groups or preparation requests go into it.
_Avoid_: Past period, closed period

**Professor**:
A person who registers groups and submits preparation requests. The interface labels the role **Docente**, while running copy says "profesor". Code and the `user_roles` table use `professor`.

**Group**:
A class assigned to one professor and a recurring laboratory slot during an academic period. Its number is unique among that professor's groups in the period. The slot lasts two hours by default, and the professor can set a different end time. The form leaves the suggested end time empty when two hours would end after 22:00.

**Lab exercise**:
A reusable description of work that a group can perform in a laboratory. The Spanish interface calls it a **práctica** ("Prácticas" in the navigation, "Elige la práctica" in the request form). Code, English docs, and the `lab_exercises` table keep "lab exercise".
_Avoid_: Assignment. In the interface, avoid "ejercicio".

**Preparation request**:
A professor's request for laboratory staff to prepare the reagents, equipment, and waste handling needed for a lab exercise. It is fulfilled, not approved.
_Avoid_: Approval request

**Access request**:
A person's request for a SISLAB account. An admin verifies the person's identity and activates the account; it does not ask laboratory staff to prepare an exercise. Once accepted, the account is a user and never becomes an access request again, even if an admin deactivates it.

**Reviewed**:
A preparation request whose materials and waste plan have been checked by laboratory staff.

**Fulfilled**:
A preparation request for which laboratory staff have completed the preparation.

**Cancelled**:
A preparation request that will no longer be prepared, retained as part of the request history.

**Voided**:
A preparation request that lab staff or an admin marked as a mistaken submission. It remains in the request history and releases its group and date for a replacement.

**Late exception**:
A preparation request submitted with less than the configured notice period. The professor provides a reason, and laboratory staff decide whether to accept the short notice.

**Ticket**:
The printable daily document laboratory staff use to track preparation requests on paper. It lists a day's preparation requests except voided ones and late exceptions that staff have not accepted. A ticket printed from a report follows the same rule.

**Report**:
An admin's view of the preparation requests in one or more academic periods, with totals and exports. It reads request history and changes nothing.
_Avoid_: Statistics, analytics

**Lab staff**:
People who use preparation requests and daily tickets to prepare laboratory exercises. The interface labels the role **Personal de laboratorio**. Code and the `user_roles` table use `staff`.

**Admin**:
A person who has lab staff privileges and also manages the catalogs, settings, and user access. The interface labels the role **Administración**. Code and the `user_roles` table use `admin`.
