# Inventory (Phase 1)

This document describes the Phase 1 inventory system: schema, import/export format, and how it is designed to hand off cleanly to Phase 2 Logistics.

## Data model (MongoDB / Mongoose)

- **Product** (`@crm/db` `Product`)
  - **sku** (unique): `product_id_SM` — **CRM SKU** (unique identifier inside tCrm; not the manufacturer SKU)
  - **supplierSku**: `product_id` — supplier/manufacturer article number
  - **names**: `de/en/hu`
  - **descriptions**: `de/en/hu`
  - **colors**: `de/en/hu`
  - **pricing**: EUR/HUF fields matching Excel template columns
  - **isConsumable**: consumable parts are not expected back from event sites (no loss tracking on return check-in); default `false`
  - **components**: BOM (embedded list) of `{ productId, quantity }`
  - **categoryIds**: references `Category`
  - **warehouseIds**: cached catalog scope — auto-synced from `StockLevel` rows via `syncProductWarehouseIds`
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

## Excel import

- **Input sheet**: választható a varázslóban (első lap alapértelmezetten)
- **Column map**: `@crm/core` `INVENTORY_COLUMNS` + UI mapping (`import-config.ts`)
- **Parsing**: `@crm/core` `parseInventoryXlsx(buffer, options?)`
  - **Preprocess**: `preprocessImportRows` — oszlop remap (auto-match azonos névnél)
  - **Commit**: `@crm/core` `commitInventoryImport`
  - Upserts products by **CRM SKU** (alap: kategória `skuPrefix` + `product_id`; SM mód: `product_id_SM` + derived `supplierSku`)
  - **Supplier SKU**: `product_id` → `Product.supplierSku` (alap módban kötelező; SM módban kinyerve)
  - **CRM category**: `crm_category_slug` matching `Category.slug` (case-insensitive; `brand` column mappable)
  - **SKU modes** (`skuMode` in import config): `from_supplier_sku` (default) or `from_sm` with optional prefix strip / digit count
  - **Supplier**: optional at import (`allowMissingSupplier`); assign later via bulk update
  - **Warehouse presence**: stock-only — `warehouse 1./2./3.` create `StockLevel`; empty cell = not in that warehouse; `Product.warehouseIds` synced from stock
  - **`crm_warehouse_slug`**: ignored for catalog (warning if present without stock columns)
  - **Shipper categories**: `cat*Name_*` → `shipperCategoryPath` only (not CRM categories)
  - Stock quantities: `warehouse 1./2./3.` → Kispest (`kispest`), Erzsébet (`erzsebet`), Récsei (`recsei`) per-row on-hand
  - Links BOM components in a **second pass** (forward references + DB lookup)
  - Creates `StockLevel` and logs `StockAdjustment` entries with reason `initial_load`
- **Template**: `GET /inventory/template` — Excel with example row + Útmutató sheet (required columns, stock columns)

### Excel import glossary

Business meanings for standard import columns:

| Column | Meaning (HU) | Business note |
|--------|--------------|---------------|
| `product_id_SM` | CRM SKU (SM mód) | SM import módban kötelező forrás; alap módban opcionális ellenőrzés |
| `product_id` | beszállítói azonosító | Alap módban kötelező — ebből generálódik a CRM SKU |
| `supplierNo` | Beszállító száma | Supplier number field |
| `brand` | márkanév | Product brand |
| `name_de` / `name_en` / `name_hu` | német / angol / magyar megnevezés | Localized product names |
| `ean` | eladási vonalkód | Retail barcode (EAN) |
| `length` / `width` / `height` | hosszúság / szélesség / magasság | Dimensions |
| `weight` | súly | Product weight |
| `Color_de` / `Color_en` / `Color_hu` | szín (de/en/hu) | Color labels |
| `packageweight` / `packagevolume` | csomagsúly / csomag térfogata | Package weight and volume |
| `long_description_*` | hosszú leírás (de/en/hu) | Long descriptions |
| `recommendet_retail_price_with_german_tax` | ajánlott fogyasztói ár német áfával | Recommended retail EUR |
| `recommendet_retail_price_with_tax_HUF` | ajánlott fogyasztói ár magyar áfával | Recommended retail HUF |
| `streetprice_with_german_tax` | fogyasztói ár áfa nélkül | Street price EUR |
| `streetprice_without_HUN_tax_HUF` | fogyasztói ár forint | Street price HUF |
| `merchant_price` / `merchant_price_HUF` | bekerülési ár | Merchant/cost price EUR/HUF |
| `youtubevideo` / `youtubeid` | videó | YouTube link / id |
| `bild1` … `bild5` | kép 1 … 5 | Image hints (filename or URL) |
| `cat1Name` / `cat2Name` / `Cat3Name` | fő / kategória / alkategória (német) | → `Product.shipperCategoryPath` |
| `discontinued` | CEO label: „kedvezmény” | Parser uses as `isDiscontinued` — not the same as `Discont 1.` / `Discont 2.` |
| `Relatedproduct_1` … `4` | kapcsolódó termék 1–4 | BOM component CRM SKU references |
| `Relatedproduct_pc_1` … `4` | kapcs. termék darabszám | Quantity per parent kit |
| `Owner` | tulajdonos | Product owner field |
| `warehouse 1.` | Kispest raktár darab | On-hand qty → warehouse key `kispest` |
| `warehouse 2.` | Erzsébet raktár | → `erzsebet` |
| `warehouse 3.` | Récsei Raktár | → `recsei` |
| `RentFeeDay` / `RentFeeWeekend` / `RentFeeWeek` | napi / hétvégi / heti bérleti díj | Rental pricing HUF |
| `Discont 1.` | kedvezmény max | Max discount → `discounts.discount1Max` |
| `Discont 2.` | tulajdonosi kedvezmény | Owner discount → `discounts.discount2Owner` |
| `Rent` | bérlehetőség | **1** = rentable, **2** = not standalone rentable → `rental.rentFlag` |

**CRM-only columns** (tCrm import template):

| Column | Meaning |
|--------|---------|
| `crm_category_slug` | CRM category (`Category.slug`) — SKU prefix source |
| `crm_supplier_slug` | CRM supplier (`Supplier.key`) — optional at first import |
| `crm_warehouse_slug` | Ignored — use stock columns for warehouse presence |
| `is_consumable` | Consumable flag (tCrm extension) |

### Bulk product update

- UI: **Tömeges módosítás** on `/inventory` (requires `inventory:write`)
- Scope: current table filter from URL + optional narrow filters (`missingSupplierOnly`, brand, category slug)
- Operations (`applyBulkProductOperation` in `@crm/core`):
  - **Beszállító** — assign supplier
  - **Készlet** — set or add on-hand qty for one warehouse (`StockLevel` + sync `warehouseIds`)
  - **Aktív / inaktív**, **CRM kategória**, **márka**

## Excel export

- UI: **Export** opens a dialog (not a blind full dump).
- `GET /inventory/export` query params:
  - `productScope`: `filtered` (current list query) | `selection` (`skus` comma-separated) | `all` (full permission scope)
  - `availability`: `active` | `all` (inactive included; logistics managers)
  - `stockScope`: `all_scoped` (warehouse 1–3 for Kispest/Erzsébet/Récsei) | `current` (only list `warehouseId` filter) | `none`
- Table row checkboxes select SKUs for **selection** export.
- Export includes `crm_category_slug`, `crm_supplier_slug`, BOM SKUs, and per-warehouse on-hand when stock scope is set.

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
- UI: **Médiatár** modal on product/build forms (gallery, multi-file upload with per-image crop, PDF upload, add link).

## Event logistics (Phase 3)

- **`LogisticsJob`**: event shipment workflow (warehouse → site → return) with per-line gathered / installed / returned / checked / lost quantities
- **`Vehicle`**: fleet dimensions and capacity; `suggestVehiclesForCargo` in `@crm/core`
- Excel: `is_consumable` column → `Product.isConsumable` (empty = durable)
- UI: `/logistics/jobs`, `/logistics/vehicles`; KPI on `/logistics`; product dashboard `/inventory/dashboard`

## Phase 3+ notes

- Offers module, public landing fork, accounting integrations
- Optional: warehouse bin locations and batch/serial tracking

