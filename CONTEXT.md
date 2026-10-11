# Sislab

Sislab schedules teaching in laboratories and helps staff prepare for lab exercises.

## Language

**Academic period**:
An interval of teaching identified by a year and term code, including regular and summer terms.
_Avoid_: Semester

**Group**:
A class assigned to one professor and a recurring laboratory slot during an academic period. Its number is unique among that professor's groups in the period.

**Lab exercise**:
A reusable description of work that a group can perform in a laboratory. The Spanish interface calls it a **práctica** ("Prácticas" in the navigation, "Elige la práctica" in the request form). Code, English docs, and the `lab_exercises` table keep "lab exercise".
_Avoid_: Assignment. In the interface, avoid "ejercicio".

**Preparation request**:
A professor's request for laboratory staff to prepare the reagents, equipment, and waste handling needed for a lab exercise. It is fulfilled, not approved.
_Avoid_: Approval request

**Access request**:
A person's request for a SISLAB account. An admin verifies the person's identity and activates the account; it does not ask laboratory staff to prepare an exercise.

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
The printable daily document laboratory staff use to track preparation requests on paper.

**Lab staff**:
People who use preparation requests and daily tickets to prepare laboratory exercises.

**Admin**:
A person who has lab staff privileges and also manages the catalogs, settings, and user access.
