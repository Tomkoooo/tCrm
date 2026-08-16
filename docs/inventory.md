# Inventory (Phase 1)

Product catalog, categories, suppliers, warehouses, stock levels, and Excel import/export.

**Package:** `@crm/inventory`  
**Models:** `Product`, `Category`, `Supplier`, `Warehouse`, `StockLevel`, `StockAdjustment` in `@crm/db-core`

## Permissions

| Key | Use |
|-----|-----|
| `inventory:read` | Product list, detail, dashboard, categories |
| `inventory:write` | Create/edit products, stock, bulk update |
| `inventory:import` | Excel import wizard |
| `inventory:delete` | Permanent product delete |
| `warehouses:read` / `warehouses:manage` | Admin raktárak |
| `suppliers:read` / `suppliers:manage` | Beszállítók (write/import also grant access) |

Register: `inventoryPermissions` in `apps/crm/src/lib/rbac-bootstrap.ts`. After deploy, run **Baseline jogosultságok szinkronizálása** on `/admin/permissions` (or restart) so `admin` receives the new keys.

## Routes

| Path | Purpose |
|------|---------|
| `/inventory/dashboard` | KPI overlay |
| `/inventory` | Product DataTable, import/export/bulk |
| `/inventory/new` | Create product |
| `/inventory/[sku]` | Detail + inline edit (`?edit=1`) |
| `/inventory/categories` | Category tree |
| `/inventory/suppliers` | Supplier partners |
| `/inventory/template` | Excel template download |
| `/inventory/export` | Excel export |
| `/admin/warehouses` | Warehouse master data |

## Excel

Canonical columns: `packages/inventory/src/excel-columns.ts`. Import commit: `commitInventoryImport`. Stock columns `warehouse 1./2./3.` map to warehouse keys `kispest` / `erzsebet` / `recsei`.

CRM SKU (`product_id_SM`) is generated from category prefix + supplier SKU (`generateInternalSku`). Always show localized name with SKU in UI (`ProductSkuLabel`).

## Out of scope

Offers (`/offers`). HR schedule sync from logistics jobs (Phase 3).

*Last updated: 2026-08.*
