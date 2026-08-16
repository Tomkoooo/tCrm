# Logistics (Phase 2)

Stock movements, reservations, event shipments (jobs/pickups), and vehicle fleet.

**Package:** `@crm/logistics`  
**Models:** `Reservation`, `StockMovement`, `LogisticsJob`, `Vehicle`, `VehicleIncident` in `@crm/db-core`

## Permissions

| Key | Use |
|-----|-----|
| `logistics:read` | Overview, movements, reservations, jobs |
| `logistics:write` | Create/confirm movements, reservations, jobs |
| `logistics:scope_all` | All warehouses (not only `Warehouse.assignedUserIds`) |
| `logistics:vehicles:read` | Fleet list/detail without ops access |
| `logistics:vehicles:report` | Incident reports + photos |

Register: `logisticsPermissions` in `apps/crm/src/lib/rbac-bootstrap.ts`. After deploy, run **Baseline jogosultságok szinkronizálása** on `/admin/permissions` so `admin` receives the new keys.

## Routes

| Path | Purpose |
|------|---------|
| `/logistics` | KPI overview |
| `/logistics/movements` | GRN / pick / transfer list |
| `/logistics/movements/new/{grn,pick,transfer}` | Create draft movement |
| `/logistics/movements/[id]` | Confirm / cancel |
| `/logistics/reservations` | Hold stock |
| `/logistics/jobs` | Event shipments |
| `/logistics/jobs/new` | Create job + pickups |
| `/logistics/jobs/[id]` | Pickup workflow |
| `/logistics/vehicles` | Fleet |
| `/logistics/vehicles/[id]` | Vehicle detail, documents, incidents |
| `/inventory/builds` | BOM kits (inventory write) |

## Notes

- Warehouse-scoped users see jobs whose pickups are in assigned warehouses unless they have `logistics:scope_all`.
- Job status emails use `@crm/mail` templates (`job_scheduled`, `pickup_gathered`, …). Seeded at `/setup` and once per process on dashboard load.
- HR schedule sync (`syncLogisticsJobToEmployeeSchedules`) is a no-op until Phase 3 restores Employee/ScheduleEntry.
- Vehicle `companyId` is stored but company picker is empty until HR companies return.
- Offers (`/offers`) are not in this phase.

*Last updated: 2026-08.*
