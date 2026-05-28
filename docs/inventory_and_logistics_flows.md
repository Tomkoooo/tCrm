# tCrm — működési folyamatok

> **Karbantartás:** Ezt a fájlt a viselkedést érintő változtatásokkal együtt kell frissíteni (fáziszárás, import, logisztika, navigáció). Részletek: [`ARCHITECTURE.md`](./ARCHITECTURE.md) §9, [`.cursor/rules/flows-documentation.mdc`](../.cursor/rules/flows-documentation.mdc).

## 0. CRM áttekintés (egész rendszer)

```mermaid
flowchart TB
  subgraph auth [Belépés és jogosultság]
    login[Bejelentkezés] --> session[JWT session + permissions]
    session --> rbac[requirePermission útvonalakon]
    account[Fiók /account]
    usersAdmin[Felhasználók /admin/users]
    rolesAdmin[Szerepkörök /admin/permissions]
    session --> account
    rbac --> usersAdmin
    rbac --> rolesAdmin
  end

  subgraph master [Törzsadatok]
    cat[Termékkategóriák slug]
    sup[Beszállítók key]
    wh[Raktárak key]
  end

  subgraph inv [Készletkezelés]
    products[Termékek CRM SKU]
    import[Excel import]
    import --> products
    cat --> import
    sup --> import
  end

  subgraph log [Logisztika]
    mov[Készletmozgások draft → confirmed]
    res[Foglalások sourceRef csoport]
    products --> mov
    products --> res
    wh --> mov
    wh --> res
  end

  subgraph phase2done [Phase 2 kész]
    builds[Összeszerelések BOM]
  end

  subgraph future [Phase 3+]
    offers[Ajánlatok]
    acct[Könyvelés]
    landing[Nyilvános web]
  end

  rbac --> inv
  rbac --> log
  rbac --> phase2done
  rbac --> future
  products -.-> offers
  res -.-> mov
```

| Modul | Útvonalak | Állapot |
|-------|-----------|---------|
| Auth + RBAC | `/login`, `/account`, `/admin/users`, `/admin/permissions` | Phase 0–2 ✓ |
| Készlet | `/inventory`, `/inventory/categories`, `/inventory/builds` | Phase 1–2 ✓ |
| Beszállítók | `/inventory/suppliers` | Phase 2 ✓ |
| Raktárak | `/admin/warehouses` | Phase 2 ✓ |
| Logisztika | `/logistics/*` | Phase 2 ✓ |
| Ajánlatok | `/offers` | Placeholder (Phase 3) |
| Nyilvános web | `apps/landing` | Phase 3 |

---

## 1. Készlet import (Excel)

### Oszlop- és SKU szótár

| Excel oszlop | MongoDB mező | Jelentés |
|--------------|--------------|----------|
| `product_id` | `Product.supplierSku` | Beszállítói / gyártói cikkszám (Excel kötelező) |
| *(generált)* | `Product.sku` | **CRM SKU** = kategória `skuPrefix` + `product_id` számjegyei |
| `product_id_SM` | *(opcionális)* | Ellenőrzés: ha eltér a generált CRM SKU-tól → figyelmeztetés |
| `crm_category_slug` | `Product.categoryIds[]` | Létező CRM kategória (`Category.slug`) |
| `crm_supplier_slug` | `Product.supplierId` | Beszállító (`Supplier.key`) — soronként; vegyes fájlhoz |
| `cat*Name_*` | `Product.shipperCategoryPath` | Beszállító eredeti kategóriái (nem CRM fa) |
| `warehouse 1.` … | `StockLevel` | Kezdeti készlet |

```mermaid
flowchart TD
  start[Készlet → Importálás] --> template[Sablon opcionális]
  start --> defaultSup[Alapértelmezett beszállító opcionális]
  start --> upload[Excel feltöltés]
  upload --> parse[parseInventoryXlsx]
  parse --> valCat[validateImportCategorySlugs]
  parse --> valSup[validateImportSupplierSlugs]
  valCat --> preview[Előnézet]
  valSup --> preview
  preview -->|hiba| fix[Javítás]
  preview -->|OK| commit[commitInventoryImport]
  commit --> rowSup[Soronkénti supplier + category]
  commit --> shipper[shipperCategoryPath mentés]
  commit --> stock[Raktár készlet]
  commit --> bom[BOM 2. pass]
```

### Szabályok

| Elem | Kötelező | Megjegyzés |
|------|----------|------------|
| `product_id_SM` | Igen | CRM SKU — egyedi a tCrm-ben |
| `product_id` | Ajánlott | Beszállítói SKU |
| `crm_category_slug` | Igen | Előbb hozza létre: Termékkategóriák |
| `crm_supplier_slug` | Soronként* | `Supplier.key` — vegyes beszállítós fájlhoz |
| Alapértelmezett beszállító | Modal* | Ha a sorban nincs `crm_supplier_slug` |
| Beszállító kategóriák | Opcionális | `cat*Name_*` → `shipperCategoryPath` |

\* Legalább az egyik: sor `crm_supplier_slug` **vagy** modal alapértelmezett minden olyan sorra, ahol üres az oszlop.

Sablon: `GET /api/inventory/template` · Partnerek: `/inventory/suppliers`

---

## 2. Termékkategóriák és raktárak

```mermaid
flowchart LR
  subgraph categories [CRM kategóriák]
    L1[Szint 1 slug] --> L2[Szint 2]
    L2 --> L3[Szint 3]
  end
  subgraph warehouses [Raktárak]
    WH[Raktár kulcs] --> SL[StockLevel]
  end
  categories --> internal[Belső SKU prefix]
  products[Termék CRM SKU] --> categories
  products --> SL
```

---

## 3. Készletmozgások (logisztika)

```mermaid
stateDiagram-v2
  [*] --> draft: Létrehozás
  draft --> confirmed: Megerősítés
  draft --> cancelled: Visszavonás
  confirmed --> [*]
  cancelled --> [*]
```

| Típus | Magyar | Hatás |
|-------|--------|-------|
| `grn` | Bevételezés | + készlet cél raktár |
| `pick` | Kiadás | − készlet forrás |
| `transfer` | Raktárközi | − forrás, + cél |

---

## 4. Foglalások (többsoros)

```mermaid
flowchart TD
  form[Új foglalás] --> search[CRM SKU keresés]
  form --> ref[Hivatkozás OFFER/BUILD]
  search --> lines[Tételek]
  ref --> lines
  lines --> batch[createReservationsBatch]
  batch --> reserved[StockLevel.reserved +]
  group[sourceRef csoport] --> release[Teljesítés / Törlés]
```

---

## 5. Összeszerelések (BOM)

Összeszerelés = termék `components` listával. UI: **Készletkezelés → Összeszerelések** (`/inventory/builds`).

`calculateBomAvailability` → **canBuild** = hány db építhető/ajánlható a szabad alkatrészkészletből.

---

## 6. Készlet táblázat (DataTable)

- **Oszlopok** panel: minden import mező megjeleníthető (`mongoKey` a beágyazott Mongo mezőkhöz); mentés `localStorage` + `tableId`.
- **Kép előnézet** oszlop: opcionális (alapból rejtett) — első GridFS vagy `bild1` URL.
- **Képek (db)** oszlop: Excel `bild1`–`bild5` / `externalImageHints` és feltöltött `imageIds` száma (max érték).
- Fejléc **ⓘ** tooltip: Radix; táblázat ikonok egységesen `size-2.5`.

---

## 7. Kereső (`SearchAutocomplete`)

| Használat | Action |
|-----------|--------|
| Termék (CRM SKU / név) | `searchProductsAction` |
| Beszállító | `searchSuppliersAction` |
| Kategória | `searchCategoriesAction` |

---

## 8. Felhasználók és fiók

```mermaid
flowchart TD
  account[Fiók /account] --> profile[Név szerkesztés]
  account --> pwd[Jelszó csere]
  account --> viewPerm[Érvényes jogok olvasása]
  adminUsers[Admin → Felhasználók] --> list[Lista DataTable]
  adminUsers --> create[Új /admin/users/new]
  adminUsers --> edit[Szerkesztés /admin/users/id]
  edit --> roles[Szerepkörök]
  edit --> direct[Közvetlen jogok]
  edit --> deactivate[Inaktiválás — nem törlés]
  rolesAdmin[Szerepkörök /admin/permissions] --> collapsible[Összecsukható szerepkör kártyák]
```

| Szabály | Részlet |
|---------|---------|
| E-mail | Saját fiókon csak olvasható; admin más felhasználó e-mailjét szerkesztheti |
| Törlés | Nincs — csak `isActive: false` (admin jog) |
| Utolsó admin | Nem inaktiválható, admin szerepkör nem vehető el |
| Saját fiók | Admin nem inaktiválhatja magát |

| Kulcs | Funkció |
|-------|---------|
| `users:read` | Felhasználó lista |
| `users:write` | Létrehozás, szerkesztés, inaktiválás |
| `roles:manage` | Szerepkörök és jogosultságok |

---

## 9. Jogosultságok (összefoglaló)

| Kulcs | Funkció |
|-------|---------|
| `inventory:read` / `write` / `import` | Készlet |
| `suppliers:read` / `manage` | Beszállítók |
| `warehouses:read` / `manage` | Raktárak |
| `logistics:read` / `write` | Mozgások, foglalások |

---

## 10. Beszállító felvétel

1. **Készletkezelés → Beszállítók** (`/inventory/suppliers`) — `suppliers:read`, `suppliers:manage`, `inventory:import` vagy `inventory:write`
2. **Kulcs (slug)** → Excel `crm_supplier_slug`
3. **Termékkategóriák** → Excel `crm_category_slug`
4. **Import** a készlet oldalon

---

*Utolsó frissítés: 2026-05 — **Phase 2 zárás:** logisztika, felhasználók/fiók, DataTable oszlopkezelés + opcionális kép oszlopok, beszállítók, raktárak.*
