# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Professors register groups and manage their recurring laboratory schedules.
- Lab staff use preparation requests and daily tickets to prepare lab exercises; the preparation-request workflow is planned, not part of the current application slice.
- Admins manage user access and academic catalogs, and have lab staff privileges.

## Product Purpose

SISLAB (Sistema de Laboratorios) supports teaching laboratories at the Universidad de Sonora. Its current application slice lets professors register groups and schedule laboratory time. The planned next workflow lets professors request preparation for lab exercises and lets lab staff work from daily tickets. Success means staff and professors can coordinate teaching-lab schedules and preparation through the system.

## Positioning

SISLAB is for university teaching laboratories. It connects recurring group schedules with a planned preparation-request workflow for reagents, equipment, and waste handling.

## Operating Context

Professors create groups for academic periods, assigning each a laboratory, course labels, student and team counts, weekday, and time slot. Admins activate accounts after checking identity outside SISLAB. In the planned request release, lab staff decide short-notice exceptions and prepare from daily tickets; recorded review and fulfillment can follow later.

## Capabilities and Constraints

- The current product supports professor group registration and laboratory scheduling, plus admin account, period, catalog, and group management.
- A user can hold multiple roles. Admin includes lab staff privileges.
- New accounts require admin activation after an out-of-band identity check. Accounts use passwords; email verification and self-service password recovery are not available, so admins handle resets.
- Group numbers are stable and unique per professor and academic period, including for inactive groups.
- Active laboratory time slots cannot overlap within the same academic period and weekday.
- The planned preparation-request workflow preserves submitted material, quantity, laboratory, and time details as a snapshot. Later group or exercise edits do not silently rewrite submitted requests.
- The interface is in Spanish. Use the domain vocabulary in `CONTEXT.md`; in particular, call a reusable description a “lab exercise” and a staff preparation workflow a “preparation request.”
- Academic dates and times use the `America/Hermosillo` time zone.

## Brand Commitments

The product name is SISLAB (Sistema de Laboratorios). The existing SISLAB name and logo are project assets. The user confirmed the Spanish-language interface as a durable commitment.

## Evidence on Hand

- Existing SISLAB logo assets: `public/images/logo.svg` and `public/images/logowhite.svg`.
- Product terminology and agreed preparation-request model: `CONTEXT.md` and `docs/data-model.md`.
- The repository describes preparation requests as planned; do not present them as currently available or invent operational results, testimonials, or usage metrics.

## Product Principles

- Support the real scheduling work of university teaching laboratories.
- Keep group schedules understandable across academic periods and catalog changes.
- Preserve the details staff were asked to prepare when a request is submitted.
- Keep identity checks and access activation under administrator control until university sign-in and email delivery are available.
