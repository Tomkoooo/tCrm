# Inventory (Phase 1)

This document describes the Phase 1 inventory system: schema, import/export format, and how it is designed to hand off cleanly to Phase 2 Logistics.

## Data model (MongoDB / Mongoose)

- **Product** (`@crm/db` `Product`)
  - **sku** (unique): `product_id_SM` — **CRM SKU** (unique identifier inside tCrm; not the manufacturer SKU)
  - **supplierSku**: `product_id` — supplier/manufacturer article number
  - **names**: `de/en/hu`
  - **descriptions**: `de/en/hu`
  - **colors**: `de/en/hu`
  - **pricing**: EUR/HUF fields matching Alutent columns
  - **isConsumable**: consumable parts are not expected back from event sites (no loss tracking on return check-in); default `false`
  - **components**: BOM (embedded list) of `{ productId, quantity }`
  - **categoryIds**: references `Category`
  - **warehouseIds**: catalog warehouses (`Warehouse` refs) — scopes product list, builds, and import
  - **imageIds**: GridFS ids
- **Warehouse**: baseline keys `kispest`, `erzsebet`, `recsei`; `assignedUserIds` for staff scope
- **StockLevel**: unique compound index `(productId, warehouseId)`
- **StockAdjustment**: audit log for changes (reason, delta, user, timestamp)
- **Category**: 3-level tree using `(level, parentId, slug)`

## Suppliers (beszállítók)

- **Model**: `Supplier` with unique `key` (slug, e.g. `steinigke`)
- **UI**: `/inventory/suppliers` — create/edit partners used during Excel import
- **Permissions**: `suppliers:read`, `suppliers:manage`

## Permissions

Seeded permissions (group `inventory`):

- `inventory:read`
- `inventory:write`
- `inventory:import`
- `inventory:delete`
- `warehouses:read`
- `warehouses:manage`
- `suppliers:read`
- `suppliers:manage`

## Excel import (Alutent.xlsx)

- **Input sheet**: `Munka1`
- **Column map**: `@crm/core` `ALUTENT_COLUMNS`
- **Parsing**: `@crm/core` `parseInventoryXlsx`
  - **Commit**: `@crm/core` `commitInventoryImport`
  - Upserts products by **CRM SKU** (`product_id_SM` → `Product.sku`)
  - **Supplier SKU**: `product_id` → `Product.supplierSku`
  - **CRM category**: each row must include `crm_category_slug` matching an existing `Category.slug`
  - **Supplier**: `crm_supplier_slug` per row (`Supplier.key`), or optional default supplier in the import modal for rows without that column (mixed-supplier workbooks)
  - **Warehouse catalog**: `crm_warehouse_slug` per row (`Warehouse.key`, comma-separated for multiple), or default warehouse in the import modal — sets `Product.warehouseIds`
  - **Shipper categories**: `cat*Name_*` → `shipperCategoryPath` only (not CRM categories)
  - Stock quantities: `warehouse 1./2./3.` columns (also adds warehouse to `warehouseIds` on commit)
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

## Phase 2 (complete in CRM)

Implemented on top of Phase 1 schema:

- Logistics: reservations, stock movements (GRN / pick / transfer), warehouse stock levels
- Suppliers (`/inventory/suppliers`), warehouses (`/admin/warehouses`)
- Builds list + BOM availability (`/inventory/builds`)
- User admin (`/admin/users`), account settings (`/account`), collapsible role permissions

### Images (Media manager)

- **`Media` collection:** `file` (SHA-256 dedup + GridFS) or `link` (external URL); `usages[]` + `useCount`.
- **`Product.imageIds`:** Media document ids; served via `GET /api/inventory/images/[id]` (redirect for links, stream for files; legacy GridFS id fallback).
- Import resolves `bild1`–`bild5` into link Media on commit; manual uploads keep file Media on re-import merge.
- UI: **Médiatár** modal on product/build forms (gallery, crop upload, add link).

## Event logistics (Phase 3)

- **`LogisticsJob`**: event shipment workflow (warehouse → site → return) with per-line gathered / installed / returned / checked / lost quantities
- **`Vehicle`**: fleet dimensions and capacity; `suggestVehiclesForCargo` in `@crm/core`
- Excel: `is_consumable` column → `Product.isConsumable` (empty = durable)
- UI: `/logistics/jobs`, `/logistics/vehicles`; KPI on `/logistics`; product dashboard `/inventory/dashboard`

## Phase 3+ notes

- Offers module, public landing fork, accounting integrations
- Optional: warehouse bin locations and batch/serial tracking

