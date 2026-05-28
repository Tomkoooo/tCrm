# Inventory (Phase 1)

This document describes the Phase 1 inventory system: schema, import/export format, and how it is designed to hand off cleanly to Phase 2 Logistics.

## Data model (MongoDB / Mongoose)

- **Product** (`@crm/db` `Product`)
  - **sku** (unique): `product_id_SM`
  - **names**: `de/en/hu`
  - **descriptions**: `de/en/hu`
  - **colors**: `de/en/hu`
  - **pricing**: EUR/HUF fields matching Alutent columns
  - **components**: BOM (embedded list) of `{ productId, quantity }`
  - **categoryIds**: references `Category`
  - **imageIds**: GridFS ids
- **Warehouse**: baseline keys `kispest`, `erzsebet`, `recsei`
- **StockLevel**: unique compound index `(productId, warehouseId)`
- **StockAdjustment**: audit log for changes (reason, delta, user, timestamp)
- **Category**: 3-level tree using `(level, parentId, slug)`

## Permissions

Seeded permissions (group `inventory`):

- `inventory:read`
- `inventory:write`
- `inventory:import`
- `inventory:delete`
- `warehouses:read`
- `warehouses:manage`

## Excel import (Alutent.xlsx)

- **Input sheet**: `Munka1`
- **Column map**: `@crm/core` `ALUTENT_COLUMNS`
- **Parsing**: `@crm/core` `parseInventoryXlsx`
- **Commit**: `@crm/core` `commitInventoryImport`
  - Upserts products by `sku`
  - Auto-upserts categories (3-tier) by localized names
  - Auto-upserts warehouses based on `warehouse 1./2./3.` columns
  - Links BOM components in a **second pass** (to allow forward references)
  - Creates `StockLevel` and logs `StockAdjustment` entries with reason `initial_load`

## Excel export

- `GET /inventory/export` streams an `.xlsx` file.
- Export uses `@crm/core` `exportInventoryXlsx` and preserves the Alutent column order.

## BOM / Composites (logistics-ready)

Phase 1 stores BOM as embedded component refs on `Product`. Phase 2 can add:

- availability calculations from component stock
- pick/pack instructions
- reservations and allocations

without changing the existing schema shape.

## Phase 2 logistics handoff notes

Planned extensions (no schema breaks):

- reservations (`reserved`) enforced by logistic actions
- stock movements and documents (GRN, pick list, transfer)
- warehouse bin locations and batch/serial tracking (optional)

