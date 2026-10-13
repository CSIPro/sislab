# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Professors register groups, manage their recurring laboratory schedules, and submit preparation requests for lab exercises.
- Lab staff decide short-notice requests, void mistaken submissions, and prepare lab exercises from daily PDF tickets.
- Admins manage user access, academic catalogs, and the minimum notice setting, and have lab staff privileges.

## Product Purpose

SISLAB (Sistema de Laboratorios) supports teaching laboratories at the Universidad de Sonora. Professors register groups, schedule laboratory time, and request preparation of reagents, equipment, and waste handling for each lab exercise. Lab staff work from the requests and print daily tickets. Success means staff and professors can coordinate teaching-lab schedules and preparation through the system.

## Positioning

SISLAB is for university teaching laboratories. It connects recurring group schedules with preparation requests for reagents, equipment, and waste handling.

## Operating Context

Professors create groups for academic periods, assigning each a laboratory, course labels, student and team counts, weekday, and time slot. Professors then submit preparation requests for a group's sessions. Admins activate accounts after checking identity outside SISLAB. Lab staff accept or decline short-notice requests, void mistaken submissions, and prepare from daily tickets. The system does not yet record review or fulfillment of a request.

## Capabilities and Constraints

- The product supports professor group registration and laboratory scheduling, preparation requests, daily PDF tickets, and admin account, period, catalog, group, and notice-setting management.
- A user can hold multiple roles. Admin includes lab staff privileges.
- New accounts require admin activation after an out-of-band identity check. Accounts use passwords; email verification and self-service password recovery are not available, so admins handle resets.
- Group numbers are stable and unique per professor and academic period, including for inactive groups.
- Active laboratory time slots cannot overlap within the same academic period and weekday.
- Preparation requests preserve submitted material, quantity, laboratory, and time details as a snapshot. Later group or exercise edits do not silently rewrite submitted requests.
- Submitted requests are read-only for professors, lab staff, and admins. Staff and admins can only accept or decline a short-notice request and void a mistaken one. Review, fulfillment, and general cancellation are not implemented.
- The interface is in Spanish. Use the domain vocabulary in `CONTEXT.md`; in particular, call a reusable description a “lab exercise” and a staff preparation workflow a “preparation request.” On screen a lab exercise is a “práctica”, never an “ejercicio”.
- Academic dates and times use the `America/Hermosillo` time zone.

## Brand Commitments

The product name is SISLAB (Sistema de Laboratorios). The existing SISLAB name and logo are project assets. The user confirmed the Spanish-language interface as a durable commitment.

## Evidence on Hand

- Existing SISLAB logo assets: `public/images/logo.svg` and `public/images/logowhite.svg`.
- Product terminology and agreed preparation-request model: `CONTEXT.md` and `docs/data-model.md`.
- Review, fulfillment, and general cancellation are later possibilities; do not present them as available. Do not invent operational results, testimonials, or usage metrics.

## Product Principles

- Support the real scheduling work of university teaching laboratories.
- Keep group schedules understandable across academic periods and catalog changes.
- Preserve the details staff were asked to prepare when a request is submitted.
- Keep identity checks and access activation under administrator control until university sign-in and email delivery are available.
