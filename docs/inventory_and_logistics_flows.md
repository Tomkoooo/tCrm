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

  subgraph hr [Könyvelés és HR]
    companiesHR[Cégek]
    empHR[Dolgozók + vendég]
    schedHR[Beosztás naptár]
    reqHR[Kérelmek jóváhagyás]
    repHR[Havi kimutatás export]
    companiesHR --> empHR
    empHR --> schedHR
    empHR --> reqHR
    reqHR --> schedHR
    schedHR --> repHR
  end

  subgraph future [Phase 3+]
    offers[Ajánlatok]
    landing[Nyilvános web]
  end

  rbac --> inv
  rbac --> log
  rbac --> phase2done
  rbac --> secrets
  rbac --> hr
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
| Logisztika | `/logistics/*`, `/logistics/jobs`, `/logistics/vehicles` | Phase 2–3 ✓ |
| Termékmenedzsment KPI | `/inventory/dashboard` | Phase 3 ✓ |
| Titoktár | `/secrets`, `/secrets/[id]` | Phase 3 ✓ |
| Könyvelés / HR | `/accounting/*` | Phase 3 ✓ |
| Ajánlatok | `/offers` | Placeholder (Phase 3) |
| Nyilvános web | `apps/landing` | Phase 3 |

---

## 1. Készlet import (Excel)

### Oszlop- és SKU szótár

| Excel oszlop | MongoDB mező | Jelentés |
|--------------|--------------|----------|
| `product_id` | `Product.supplierSku` | Beszállítói / gyártói cikkszám (alap módban kötelező) |
| `product_id_SM` | `Product.sku` (SM mód) | SM import módban kötelező CRM SKU; alap módban opcionális ellenőrzés |
| *(generált vagy SM)* | `Product.sku` | **Alap:** kategória `skuPrefix` + `product_id` · **SM mód:** `product_id_SM` mentve, beszállítói SKU kinyerve |
| `crm_category_slug` | `Product.categoryIds[]` | Létező CRM kategória (`Category.slug`) — Excel nagybetű OK, normalizálás kisbetűre |
| `crm_supplier_slug` | `Product.supplierId` | Beszállító (`Supplier.key`) — **opcionális** első importnál |
| `crm_warehouse_slug` | — | Figyelmen kívül hagyva — raktár jelenlét csak készlet oszlopokból |
| `is_consumable` | `Product.isConsumable` | Üres = tartós; 1/igen = fogyó |
| `cat*Name_*` | `Product.shipperCategoryPath` | Beszállító eredeti kategóriái (nem CRM fa) |
| `warehouse 1.` … `3.` | `StockLevel` + `Product.warehouseIds` | Kispest / Erzsébet / Récsei — üres cella = nincs az adott raktárban |
| `Rent` | `Product.rental.rentFlag` | 1 = bérlehető, 2 = nem bérlehető önállóan |
| `Discont 1.` / `Discont 2.` | `Product.discounts` | Kedvezmény max / tulajdonosi kedvezmény |

Részletes oszlopmagyarázat: [`inventory.md`](./inventory.md) § Excel import glossary.

```mermaid
flowchart TD
  start[Készlet → Importálás] --> upload[Excel feltöltés]
  upload --> inspect[inspectImportFileAction — lapok + fejlécek]
  inspect --> sheet[Lap kiválasztás]
  sheet --> map[Oszlop párosítás]
  map --> skuMode[SKU mód: beszállítói vagy SM]
  skuMode --> defaults[Opcionális beszállító]
  defaults --> preprocess[preprocessImportRows]
  preprocess --> parse[parseInventoryRows]
  parse --> preview[Előnézet]
  preview -->|hiba| fix[Javítás]
  preview -->|OK| commit[commitInventoryImport]
  commit --> stock[StockLevel + syncProductWarehouseIds]
  commit --> match[Egyeztetés sku / supplierSku / ean]
  commit --> merge[Összefűzés kiválasztott mezők]
  commit --> products[Termékek supplierId nélkül is]
  products --> bulk[Tömeges módosítás — beszállító hozzárendelés]
```

### Import varázsló — oszlop mapping

| Lépés | Leírás |
|-------|--------|
| Lap | Több munkalapos fájlnál kiválasztható |
| Oszlop párosítás | Excel fejléc → kanonikus mező; auto-match azonos névnél (kis-/nagybetű mindegy) |
| SKU mód | Alap: `product_id` → CRM SKU · SM: `product_id_SM` mentése, beszállítói SKU kategória szabály szerint |
| Beszállító | Opcionális — később tömegesen hozzárendelhető |
| Raktár jelenlét | `warehouse 1./2./3.` készlet oszlopok — nincs kötelező alapértelmezett raktár |

### Tömeges termék módosítás

| Elem | Leírás |
|------|--------|
| Útvonal | Készlet lista → **Tömeges módosítás** (`inventory:write`) |
| Scope | Jelenlegi lista szűrő (DataTable URL + raktár + aktív/inaktív) |
| Szűkítés | Csak beszállító nélküli; opcionális márka / kategória slug |
| Művelet | Beszállító, készlet (egy raktár), aktív/inaktív, kategória, márka |

### Összefűzés (merge) frissítés

| Beállítás | Jelentés |
|-----------|----------|
| Egyeztetés kulcs | `sku` (CRM SKU), `supplierSku` (`product_id`), vagy `ean` |
| Összefűzés mód | Meglévő termék frissítése az Excelből (új termék továbbra is teljes létrehozás) |
| Mezők | Név/leírás/szín nyelvenként (üres cella nem írja felül); opcionálisan ár, méret, kép, kategória, BOM, készlet |
| `Relatedproduct_*` | 2. pass: CRM SKU alapján; ha nincs a batchben, adatbázisból keresi |

### Terméklista — aktív státusz

| Szerep | Láthatóság |
|--------|------------|
| Raktáros / nem globális | Csak `isActive: true` termékek |
| Logisztikai vezető (`logistics:scope_all`) | `?showAll=true` → inaktív termékek is |
| Szerkesztés | **Aktív** oszlop checkbox a listában (`inventory:write`) |

### Szabályok

| Elem | Kötelező | Megjegyzés |
|------|----------|------------|
| `product_id` | Alap módban igen | Beszállítói SKU — ebből generálódik a CRM SKU |
| `product_id_SM` | SM módban igen | CRM SKU forrás; beszállítói SKU kinyerése (előtag levágás vagy fix számjegyszám) |
| `crm_category_slug` | Igen | Előbb hozza létre: Termékkategóriák — `brand` oszlop is párosítható; nagybetű normalizálódik |
| `crm_supplier_slug` | Opcionális | `Supplier.key` — soronként; vegyes fájlhoz |
| Alapértelmezett beszállító | Modal, opcionális | Ha nincs sorban és modalban sem → import supplierId nélkül |
| `warehouse 1./2./3.` | Opcionális | Üres/missing = nincs készlet az adott raktárban; explicit 0 = van StockLevel, 0 db |
| Beszállító kategóriák | Opcionális | `cat*Name_*` → `shipperCategoryPath` |

\* Legalább az egyik: sor `crm_supplier_slug` **vagy** modal alapértelmezett — mindkettő hiányában is importálható (`allowMissingSupplier`), később tömeges beszállító-hozzárendeléssel.

**Raktár szűrés (UI):** `Product.warehouseIds` szinkronban a `StockLevel` sorokkal — raktáros csak olyan terméket lát, amelynek van készletsora a hozzárendelt raktár(ak)ban.

Sablon: `GET /inventory/template` (letöltés) · Partnerek: `/inventory/suppliers`

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

## 5. Esemény szállítások (`LogisticsJob`)

Logisztikai vezető létrehozza a szállítást alkatrészekkel és összeszerelésekkel; raktáros összeszed, építő átvesz és kiszállít, opcionálisan telepít, visszaszállít, raktáros ellenőriz — hiány esemény/helyszín szerint.

```mermaid
stateDiagram-v2
  [*] --> draft: Létrehozás
  draft --> scheduled: Közzététel
  scheduled --> gathered: Raktár összeszedés
  gathered --> picked_up: Építő átvétel
  picked_up --> delivered: Helyszínen
  delivered --> returning: Visszaszállítás indul
  returning --> completed: Raktár bevételezés
  draft --> cancelled: Törlés
  scheduled --> cancelled: Törlés
  completed --> [*]
  cancelled --> [*]
```

| Lépés | Szerepkör | Készlet hatás |
|-------|-----------|---------------|
| Összeszedés megerősítése | Raktár | `pick` mozgás → **− készlet** forrás raktár |
| Átvétel / kiszállítás | Építő | Csak állapot (nincs készletmozgás) |
| Telepítés (opc.) | Építő | `installedQuantity`, `installedLocation` |
| Visszaszállítás | Építő | `returnedQuantity` |
| Bevételezés ellenőrzés | Raktár | `return` mozgás → **+ készlet**; hiány = `gathered − checked` (tartós) |

| Mező / jog | Jelentés |
|------------|----------|
| `LogisticsJob.reference` | `JOB-ÉÉÉÉ-NNNN` (esemény) |
| `LogisticsJob.pickups[]` | Több átvételi kör / eseményenként: raktár, jármű, csapat, tételek |
| `pickup.reference` | `JOB-ÉÉÉÉ-NNNN-P01` — PDF/e-mail hivatkozás |
| `pickup.teamMemberIds[]` | Építőcsapat — kereshető többválasztó, szerepkör szerint csoportosítva |
| `Warehouse.assignedUserIds[]` | Raktári munkatársak (admin raktár szerkesztés); új szállításnál automatikus csapat-javaslat |
| `logistics:scope_all` | Minden raktár szállítása; nélküle csak hozzárendelt raktár(ok) |
| `pickup.contactEmails[]` | Értesítési címek |
| `pickup.notifications.pendingKinds` | Küldésre váró / sikertelen értesítés típusok |
| `pickup.notifications.pendingRecipientEmails` | Feloldott címzettek (raktár staff + csapat + contact) |
| `MailTemplate.key` | Sablon kulcs = értesítés típus (`pickup_ready_for_collection`, stb.) |
| `sendTemplatedEmail` | `@crm/core` — SMTP + sablon + `Reply-To` = műveletet indító user |
| `pickup.documents.*` | PDF meta (csomaglista, visszáru) |
| `buildLogisticsPickupDocument` | Sablon JSON PDF generáláshoz |
| Összeszerelés a listán | Prebuild sor összecsukható alkatrészlista (raktár + építő UI, PDF payload) |
| `Vehicle` | Flotta — mm, max súly/térfogat; `suggestVehiclesForCargo`; cég párosítás, dokumentumok, incidensek |
| `Vehicle.companyId` | Könyvelés cég (`/accounting/companies`) — tulajdonos |
| `Company.companyData` | Kulcs–érték mezők (adószám, székhely, …) |
| `Vehicle.registrationDueDate` / `insuranceDueDate` | Forgalmi / biztosítás lejárat — figyelmeztetés 30 napon belül a `/logistics` dashboardon |
| `Vehicle.allowedUserIds` / `allowedRoleIds` | Jogosult vezetők/karbantartók — incidens bejelentés |
| `VehicleIncident` | Bejelentés leírással + fotókkal; logisztika `logistics:write` lezárja |
| `Product.isConsumable` | Fogyó: nincs `lostQuantity` |
| Útvonalak | `/logistics/jobs`, `/logistics/vehicles`, `/logistics/vehicles/[id]`, KPI: `/logistics` |
| Termék KPI | `/inventory/dashboard` — érték, alacsony készlet, BOM |

### Járműflotta — dokumentumok és incidensek

```mermaid
flowchart TD
  hrWrite[HR hr:write] --> company[Cég + companyData kulcs-érték]
  logWrite[Logisztika logistics:write] --> vehicle[Jármű szerkesztés]
  company --> vehicle
  vehicle --> media[Médiatár: képek, jogosítvány, forgalmi, biztosítás]
  vehicle --> dueDates[Lejárat dátumok]
  dueDates --> dashWarn[Logisztika dashboard figyelmeztetés 30 nap]
  vehicle --> staff[Jogosult user/role párosítás]
  staff --> report[Incidens bejelentés + fotó]
  report --> logisticsFix[Logisztika lezárja]
```

| Lépés | Leírás |
|-------|--------|
| Cég adatok | `/accounting/companies/[id]` — egyedi kulcs–érték mezők |
| Jármű részletek | `/logistics/vehicles/[id]` — áttekintés, dokumentumok, incidensek, szerkesztés |
| Dokumentumok | GridFS/Media: jármű képek, jogosítvány, forgalmi, biztosítás |
| Lejárat figyelmeztetés | 30 napon belül (vagy lejárt) — `/logistics` dashboard kártya |
| Incidens | Jogosult user/role → leírás + fotó → logisztika lezárás |

---

## 6. Összeszerelések (BOM)

Összeszerelés = termék `components` listával. UI: **Készletkezelés → Összeszerelések** (`/inventory/builds`).

`calculateBomAvailability` → **canBuild** = hány db építhető/ajánlható a szabad alkatrészkészletből.

**Logisztikai papírok:** `enrichPickupLinesDisplay` rekurzívan felbontja a beágyazott BOM-ot (alkit → alalkitrészek). A csomaglista / átvételi jegy minden szinten listázza a szükséges darabszámot a fő tétel mennyiségéhez viszonyítva.

---

## 7. Médiatár (fájl + link)

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

## 8. Készlet táblázat (DataTable)

- **Oszlopok** panel: minden import mező megjeleníthető (`mongoKey` a beágyazott Mongo mezőkhöz); mentés `localStorage` + `tableId`.
- **Kép előnézet** oszlop: opcionális (alapból rejtett) — első Media (`imageIds`) vagy legacy `bild1` URL.
- **Képek (db)** oszlop: `imageIds` vagy `externalImageHints` száma.
- Fejléc **ⓘ** tooltip: Radix; táblázat ikonok egységesen `size-2.5`.
- **Termék szerkesztés (EntitySheet):** sor kiválasztása → **Szerkesztés** — egy űrlapon: Excel alapadatok, **készlet raktáronként** (abszolút mennyiség), **BOM** (`components`), **összeszerelési útmutató** (szöveg + `assemblyGuideMediaIds` fájlok), **termékképek** (`imageIds`). Jog: `inventory:write`.

---

## 9. Kereső (`SearchAutocomplete`)

| Használat | Action |
|-----------|--------|
| Termék (CRM SKU / név) | `searchProductsAction` |
| Beszállító | `searchSuppliersAction` |
| Kategória | `searchCategoriesAction` |

---

## 10. Felhasználók és fiók

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
  brandingAdmin[Admin → Arculat /admin/branding] --> brandingForm[Alkalmazásnév logó favicon]
  brandingForm --> mediaLib[Médiatár MediaSelector]
  brandingForm --> dbBranding[(Branding dokumentum)]
```

### Arculat (branding)

| Mező | Hatás |
|------|--------|
| `appName` | Oldalsáv, böngésző cím |
| `companyName` | Oldalsáv alcím |
| `logoId` | Oldalsáv + bejelentkezés |
| `faviconId` | Böngésző ikon (`/api/uploads/{id}`) |
| `loginBackgroundId` | Bejelentkezési háttér |
| `loginTitle` / `loginSubtitle` | Bejelentkezési kártya |
| `footerText` | Bejelentkezés / regisztráció lábléc |

| Jog | Funkció |
|-----|---------|
| `admin:access` | `/admin/branding` szerkesztés |

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
| `mail:send` | Meghívó e-mail (`/admin/users/invite`), jelszó-visszaállító e-mail |
| `roles:manage` | Szerepkörök és jogosultságok |
| Meghívó | `/register/invite?token=` — jelszó + automatikus bejelentkezés |

---

## 11. Jogosultságok (összefoglaló)

| Kulcs | Funkció |
|-------|---------|
| `inventory:read` / `write` / `import` | Készlet |
| `suppliers:read` / `manage` | Beszállítók |
| `warehouses:read` / `manage` | Raktárak |
| `logistics:read` / `write` | Szállítások, workflow |
| `logistics:scope_all` | Minden raktár (nem csak `assignedUserIds`) |
| `media:read` / `upload` / `delete` | Központi médiatár |

---

## 12. Beszállító felvétel

Sablon: [`docs/excel/supplier.csv`](./excel/supplier.csv) — cégnév, cím, központi elérhetőség, majd kapcsolatok: ügyvezető, értékesítő, technikai, **mérnök**, **iroda**, raktár, pénzügy (név / mobil / e-mail).

1. **Készletkezelés → Beszállítók** (`/inventory/suppliers`) — olvasás: `suppliers:read` vagy import/write jog; **Új beszállító**: `suppliers:manage` vagy `inventory:import` / `inventory:write`
2. **Kulcs (slug)** → Excel `crm_supplier_slug`
3. **Új termék** (`/inventory/new`) — Excel mezők + beszállító/kategória kereső
4. **Új összeszerelés** (`/inventory/builds/new`) — alkatrész kereső, médiatár (fájl/link), útmutató
5. **Import** a készlet oldalon

---

## 13. Titoktár (secret storage)

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

## 14. E-mail és meghívók

```mermaid
sequenceDiagram
  participant Admin as Admin mail:manage
  participant Core as @crm/core mail
  participant SMTP as Nodemailer
  participant User as Címzett

  Admin->>Core: Sablon szerkesztés DB-ben
  Note over Core: logistics állapotváltás
  Core->>Core: enqueueLogisticsNotification
  Core->>Core: sendTemplatedEmail
  Core->>SMTP: Reply-To = actor email
  SMTP->>User: HTML sablon

  Admin->>Core: createAndSendInvitation
  Core->>User: user_invitation sablon
  User->>User: /register/invite token
  User->>User: acceptInvitation + auto login
```

| Kulcs / jog | Jelentés |
|-------------|----------|
| `mail:manage` | Sablonok szerkesztése `/admin/mail-templates` |
| `mail:send` | Meghívó és jelszó-visszaállító e-mail |
| `user_invitation` | Meghívó sablon |
| `password_reset` | Jelszó-visszaállítás sablon |
| `pnpm seed` | Hiányzó sablonok beszúrása (`SEED_OVERWRITE_TEMPLATES=1` felülírás) |

---

## 15. HR — beosztás, kérelmek, kimutatás

```mermaid
sequenceDiagram
  participant HR as HR hr:write
  participant Emp as Dolgozó hr:self
  participant Appr as Jóváhagyó hr:approve
  participant DB as MongoDB

  HR->>DB: Cég + dolgozó vendég rekord
  HR->>Emp: Meghívás User + employee szerep
  HR->>DB: ScheduleEntry műszakok
  Emp->>DB: HrRequest szabadság/beteg
  Appr->>DB: Jóváhagyás
  DB->>DB: off esemény + MonthlyWorkSummary
  HR->>HR: XLSX export hr:reports
```

| Lépés | Leírás |
|-------|--------|
| Cég scope | `HrCompanyScope` vagy `hr:scope_all` |
| Vendég | `employmentType: guest`, nincs `userId` |
| Meghívás | User létrehozás, `hr:self`, `userId` link |
| Naptár | `react-big-calendar`, `/accounting/schedule` |
| Export | `GET /accounting/reports/export?year=&month=` |

Részletek: [`hr.md`](./hr.md).

---

*Utolsó frissítés: 2026-05 — **EntitySheet termék szerkesztő** (készlet, BOM, képek, útmutató fájlok); korábban: SM SKU import mód, kategória slug normalizálás, készlet-alapú raktár jelenlét.*
