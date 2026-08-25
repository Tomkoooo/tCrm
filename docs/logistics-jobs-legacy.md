# Logistics jobs — legacy planning-engine architecture (superseded 2026-08)

**Status: archived.** The `/logistics/jobs` module was rebuilt from scratch on 2026-08-24 into a
much simpler event → parts list → pickup/drop-off employee → check-in flow, documented in
[`logistics.md`](./logistics.md) §"Job plan flow" and [`inventory_and_logistics_flows.md`](./inventory_and_logistics_flows.md) §5.
This page records what the *old* implementation did and why it was replaced, so the reasoning
isn't lost. The exact old source is still recoverable from git history at or before commit
`c648e25` (last commit before the rebuild) if a future project ever needs the same level of
planning sophistication again — this doc is a design summary, not a code dump.

## Why it was replaced

The old system was a demand-first **automatic planning engine**. It solved a much harder problem
than the business actually needed at this stage: splitting one event's parts list into optimal
warehouse pickup rounds with vehicle-capacity fitting, time-window vehicle booking, a 5-role crew
system, and an item-request approval workflow. That's roughly 5,000 lines in `packages/logistics/src`
plus 2,500 lines of UI for a feature used by a small team that, in practice, wanted: *write a
list, tell one person to go get it, tell one person to bring it back, let everyone else see the
list and leave notes.* The complexity was slowing down both development and day-to-day use, so it
was deliberately cut down.

## What the old model looked like

`LogisticsJob` had:

- `demandLines[]` — the requested items, including a job-local ad-hoc BOM override
  (`IDemandKit`) that let logistics substitute what a catalog assembly actually contained *for
  this shipment only*, without touching `Product.components`. **This is the one part of the old
  design that was kept as-is** — it worked well and the new model reuses it verbatim.
- `pickups[]` (`ILogisticsPickup`) — one job could split into multiple "pickup rounds," each with
  its own warehouse, vehicle, crew subset, and an independent 8-state status machine
  (`draft → scheduled → gathered → picked_up → delivered → returning → completed`, or
  `cancelled`). The job's own `status` was a roll-up of all its pickups' statuses.
- `crew[]` (`IJobCrewMember`) — employees with one or more of five roles: `director`, `pickup`,
  `driver`, `builder`, `dropoff`. Role combinations drove both field-access permission checks and
  HR calendar block windows (`logistics-schedule-sync.ts`'s `roleWindow` switch).
- `itemRequests[]` — a request/approve/reject workflow so field crew could ask logistics for
  extra items mid-event, which (if accepted) got appended to `demandLines`.
- `originalDemandLines[]` — a frozen snapshot of demand taken at first plan lock, kept so the UI
  could diff "what was asked for" vs. "what changed after."

## The planning pipeline (`job-plan.ts`, `optimize-pickups.ts`)

1. **`createDemandJob`** — logistics writes the demand list and assigns crew with roles.
2. **`previewPickupPlan` / `proposeJobPlan`** — an optimizer (`proposePickupRounds`) explodes
   demand into physical SKUs (`demand-explode.ts` — kept), checks `StockLevel` availability per
   warehouse, and greedily assigns rounds to warehouses and vehicles by cargo-fit
   (`suggestVehiclesForCargo`/`evaluateVehicleFit`/`computeCargoTotals` in the old `vehicles.ts`,
   comparing summed weight/volume/dimensions against `Vehicle` limits).
3. **`lockJobPlan`** — once logistics approved the proposal, this created a `Reservation` (soft
   stock hold, `sourceType: 'event'`) per pickup line and a `VehicleBooking` (time-window
   record with overlap checking via `isVehicleBooked`) per pickup's vehicle, then flipped
   `planStatus` to `locked` and pickups to `scheduled`.
4. Field crew worked each pickup through its status machine
   (`confirmPickupGathering → …Pickup → …Delivery → updatePickupInstallation → …ReturnDeparture → …CheckIn`),
   each step optionally creating a `pick`/`return` `StockMovement`.
5. **`applyHandoffToJob`** — at check-in, returned stock could be routed either back to a
   warehouse or directly onto *another open job's* pickup (a driver going straight from one event
   to the next without a warehouse stop), tracked via `inboundHandoffQuantity`/`handoffJobId`.

## Notifications and documents

`notifications.ts` + `notification-recipients.ts` queued one of six email kinds per pickup
(`job_scheduled`, `pickup_gathered`, `pickup_ready_for_collection`, `pickup_delivered`,
`pickup_return_reminder`, `pickup_checkin_complete`), resolving recipients from a union of
`pickup.contactEmails`, assigned `User`s, and `Warehouse.assignedUserIds`. `documents.ts` built a
`LogisticsPickupDocumentPayload` JSON structure intended for future PDF rendering, but **no PDF
renderer was ever implemented** — the payload was only ever returned to the client for
browser-side display/printing.

## What the new model keeps vs. drops

| Kept | Dropped |
|---|---|
| Job-local ad-hoc BOM/kit override (`demandLines[].kit`) | Multi-round pickup splitting, optimizer, vehicle-capacity fitting |
| Real `StockMovement` pick/return at check-in | `Reservation`/`VehicleBooking` soft-hold + time-window booking |
| HR calendar sync via generic `ScheduleEntry.sourceRef` | 5-role crew system, per-role calendar windows |
| Per-employee email notification | Item-request approval workflow, job-to-job handoff |
| — | PDF document payload (no renderer ever existed; email now embeds the list as HTML) |

*Archived 2026-08-24.*
