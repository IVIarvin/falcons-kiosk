# Service Tickets Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin-only service tickets from kiosk products with independent reconciliation.
**Architecture:** Separate service_tickets table and authenticated dispatch actions. Client product dialog uses durableAction; admin report reads period aggregates on demand.
**Tech Stack:** Existing Next.js, React, TypeScript, PostgreSQL/PGlite, Vitest and Playwright.
**Spec:** docs/superpowers/specs/2026-11-11-service-tickets-design.md

## Global Constraints

French UI, CHF, Europe/Zurich; no new dependencies. No automatic billing or rankings from tickets. Admin-only reads and writes. Preserve personal cart actions.

## Review Focus

- Replayed responses, retries after a product/member switch, and cancelled tickets must never create new services.
- Self-removals, reversed purchases, renamed or inactive products must produce correct quantities.
- Swiss midnight and daylight saving boundaries must select the right dates.
- Members must neither see controls nor retrieve report data through forged API calls.
- Backups and reset must not omit the new business table.

### Task 1: Persistent tickets and reconciliation

Files: db/migrations/009_service_tickets.sql; src/features/service-tickets/{service,period}.ts; src/lib/{application,backup}.ts; src/features/admin-data/tables.ts; tests/integration/service-tickets.test.ts; tests/domain/service-period.test.ts.
Interfaces: recordServiceTicket(db, actor, input) -> {id,memberId,memberName,productId,productName}; voidServiceTicket(db,actor,input) -> {id}; getServicePeople(db,actor) -> {members,visitors,recent}; createServiceVisitor(db,actor,{name,idempotencyKey}); mergeServiceVisitor(db,actor,{visitorId,memberId}); getServiceBoard(db,actor,{from,to}) -> {from,to,rows,tickets}; serviceDay(date?) -> YYYY-MM-DD.

- [x] Write and run failing integration and period tests: authorization, no billing, idempotency/concurrency, cancellation audit, net reconciliation, timezone range, backup roundtrip and reset.
- [x] Implement schema, services, dispatch, backup and reset support.
- [x] Run targeted tests until green, then full suite.

### Task 2: Kiosk entry and control UI

Files: src/features/service-tickets/{view,control}.tsx; view.module.css; src/features/checkout/view.tsx; src/features/admin/view.tsx; src/components/app.tsx; tests/e2e/service-tickets.spec.ts.
Interfaces: ServiceTicketDialog({product,onClose}); ServiceControlView(); use existing AppContext and durableAction.

- [x] Add browser tests (execution blocked by sandbox Unix sockets) and rendered-role checks for member isolation and admin kiosk product -> member -> ticket -> report -> undo; lost-response recovery and narrow viewport.
- [x] Implement controls and report using existing components/styles. Recovery visible on kiosk even after closing dialog.
- [ ] Run browser tests, inspect mobile/desktop screenshots once and fix findings together.

### Task 3: Delivery

- [x] Full unit/integration suite, typecheck and production build; focused existing kiosk/admin browser regressions.
- [x] Review complete diff for role protection, quantities and persistence; record material limitations.
- [x] Update README/deployment notes; commit and push verified changes to the repository as authorized, checking remote head first.

Verification adaptation: browser launch is blocked by the managed Unix socket policy. Added rendered-kiosk role tests and ran a real authenticated HTTP scenario with server and client in the same process namespace. Browser and visual verification remain explicit limitations in docs/service-tickets.md.

Final verification: `pnpm test` 34 files / 128 tests passed; `pnpm typecheck` passed; `pnpm build` passed. Authenticated HTTP smoke passed. Playwright browser execution and visual checks remain blocked as described above.
