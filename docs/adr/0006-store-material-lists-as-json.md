# Store material lists as structured JSON

Staff need exercise requirements, request snapshots, and daily tickets, but do not track stock or search across requests by material. Store exercise material lists and each request's submitted snapshot as structured PostgreSQL JSON. This keeps variable reagent, equipment, and waste details together without adding item tables before a cross-request query requires them.
