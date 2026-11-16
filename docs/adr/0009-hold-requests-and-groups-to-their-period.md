# Hold preparation requests and professor group changes to the academic period

ADR 0008 left out academic-period date validation for the first release. Once Mis grupos could show groups from concluded periods, professors could request preparation for groups whose period was over. The server now accepts a preparation request only when the group's period is current and the session date falls within that period's dates. A professor cannot register, edit, deactivate or reactivate a group in a concluded period, so the group stays as the period left it and reports keep their history. Admins can still change these groups to correct mistakes. The server checks dates when a request is submitted, so changing a period's dates later leaves existing requests alone.

This supersedes the part of ADR 0008 that skips academic-period date validation. The rest of ADR 0008 still applies.
