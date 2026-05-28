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

  subgraph secrets [Titoktár]
    secProj[Titok projektek]
    secEnc[AES titkosított értékek]
    secProj --> secEnc
  end

  subgraph future [Phase 3+]
    offers[Ajánlatok]
    acct[Könyvelés]
    landing[Nyilvános web]
  end

  rbac --> inv
  rbac --> log
  rbac --> phase2done
  rbac --> secrets
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
| Titoktár | `/secrets`, `/secrets/[id]` | Phase 3 ✓ |
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

## 6. Médiatár (fájl + link)

```mermaid
flowchart TD
  picker[Médiatár modal] --> lib[Galéria keresés]
  picker --> upload[Feltöltés vágás/zoom]
  picker --> link[Link hozzáadása]
  upload --> hash[SHA-256 hash]
  hash -->|létezik| reuse[Meglévő Media id]
  hash -->|új| gridfs[GridFS + Media rekord]
  link --> linkMedia[Media type link]
  import[Excel bild1-5] --> linkMedia
  product[Product.imageIds] --> usage[syncMediaUsage]
  linkMedia --> product
  gridfs --> product
  serve["GET /api/inventory/images/id"] --> redirect[302 link URL]
  serve --> stream[GridFS stream]
```

| Elem | Jelentés |
|------|----------|
| `Media` | Központi meta: `type` file/link, `hash` (fájl), `url` (link), `useCount`, `usages[]` |
| `Product.imageIds` | Media dokumentum id-k (nem nyers GridFS id új feltöltéseknél) |
| `externalImageHints` | Excel/export URL lista; import commit link Media-t is létrehoz |
| `POST /api/uploads` | Hash deduplikáció, Media visszaadás |
| `GET/POST /api/media` | Lista/keresés, link regisztráció |
| `DELETE /api/media/[id]` | Törlés (`media:delete`) |
| Admin | **Adminisztráció → Médiatár** (`/admin/media`) — teljes kezelőfelület |

| Jogosultság | Funkció |
|-------------|---------|
| `media:read` | Médiatár böngészés (vagy `inventory:read`) |
| `media:upload` | Feltöltés, link (vagy `inventory:write`) |
| `media:delete` | Média törlése a könyvtárból |

Termék és összeszerelés űrlap: **Médiatár** gomb → többes kiválasztás, sorrend, eltávolítás.

---

## 7. Készlet táblázat (DataTable)

- **Oszlopok** panel: minden import mező megjeleníthető (`mongoKey` a beágyazott Mongo mezőkhöz); mentés `localStorage` + `tableId`.
- **Kép előnézet** oszlop: opcionális (alapból rejtett) — első Media (`imageIds`) vagy legacy `bild1` URL.
- **Képek (db)** oszlop: `imageIds` vagy `externalImageHints` száma.
- Fejléc **ⓘ** tooltip: Radix; táblázat ikonok egységesen `size-2.5`.

---

## 8. Kereső (`SearchAutocomplete`)

| Használat | Action |
|-----------|--------|
| Termék (CRM SKU / név) | `searchProductsAction` |
| Beszállító | `searchSuppliersAction` |
| Kategória | `searchCategoriesAction` |

---

## 9. Felhasználók és fiók

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

## 10. Jogosultságok (összefoglaló)

| Kulcs | Funkció |
|-------|---------|
| `inventory:read` / `write` / `import` | Készlet |
| `suppliers:read` / `manage` | Beszállítók |
| `warehouses:read` / `manage` | Raktárak |
| `logistics:read` / `write` | Mozgások, foglalások |
| `media:read` / `upload` / `delete` | Központi médiatár |

---

## 11. Beszállító felvétel

Sablon: [`docs/excel/supplier.csv`](./excel/supplier.csv) — cégnév, cím, központi elérhetőség, majd kapcsolatok: ügyvezető, értékesítő, technikai, **mérnök**, **iroda**, raktár, pénzügy (név / mobil / e-mail).

1. **Készletkezelés → Beszállítók** (`/inventory/suppliers`) — olvasás: `suppliers:read` vagy import/write jog; **Új beszállító**: `suppliers:manage` vagy `inventory:import` / `inventory:write`
2. **Kulcs (slug)** → Excel `crm_supplier_slug`
3. **Új termék** (`/inventory/new`) — Excel mezők + beszállító/kategória kereső
4. **Új összeszerelés** (`/inventory/builds/new`) — alkatrész kereső, médiatár (fájl/link), útmutató
5. **Import** a készlet oldalon

---

## 12. Titoktár (secret storage)

Projekt alapú kulcs–érték tárolás (jelszavak, API kulcsok, deployment titkok). Értékek **AES-256-GCM** titkosítással a MongoDB-ben; visszafejtés csak szerveren, **kérésre** (Megjelenítés / Másolás).

```mermaid
flowchart LR
  user[Felhasználó secrets:read]
  list[/secrets lista]
  detail[/secrets/id]
  action[revealSecretValueAction]
  db[(SecretProject)]
  user --> list
  list --> detail
  detail -->|Másolás / szem| action
  action -->|decrypt| user
  detail --> db
```

### Jogosultságok

| Kulcs | Jelentés |
|-------|----------|
| `secrets:read` | Projekt lista + kulcsok; érték on-demand |
| `secrets:write` | Projekt / kulcs létrehozás, szerkesztés |
| `secrets:delete` | Projekt vagy kulcs törlés (létrehozó vagy manage) |
| `secrets:manage` | Minden projekt + megosztás beállítása |

### Megosztás

- **Alapértelmezés: privát** — csak `createdBy`, `secrets:manage`, és explicit `allowedRoles` / `allowedUsers`.
- Megosztás: projekt részletein **Megosztás** (létrehozó vagy `secrets:manage`).

### Környezet

- `SECRETS_ENCRYPTION_KEY` (≥32 karakter), vagy tartalék: `AUTH_SECRET`.

---

*Utolsó frissítés: 2026-05 — **Titoktár:** SecretProject modell, AES-256-GCM, privát megosztás, on-demand reveal + vágólap.*
