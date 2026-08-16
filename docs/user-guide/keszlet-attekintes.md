---
title: Készletkezelés áttekintése
description: A készlet modul menüpontjai és tipikus munkafolyamatok.
order: 10
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

A készlet modul a termékek, kategóriák, beszállítók és raktári készletszintek központi kezelőfelülete.

## Hol találod

**Oldalsáv → Készletkezelés**

| Menüpont | Útvonal |
|----------|---------|
| Termékmenedzsment | `/inventory/dashboard` |
| Termékek | `/inventory` |
| Termékkategóriák | `/inventory/categories` |
| Beszállítók | `/inventory/suppliers` |

Raktárak: **Oldalsáv → Adminisztráció → Raktárak** (`/admin/warehouses`)

## Szükséges jogosultság

- **Olvasás:** `inventory:read` — lista, részletek, KPI
- **Szerkesztés:** `inventory:write` — új termék, módosítás, tömeges művelet
- **Import:** `inventory:import` — Excel feltöltés

## Tipikus munkafolyamat

1. Hozd létre a **kategóriákat** (import előtt kötelező).
2. Vedd fel a **raktárakat**, ha még nincsenek.
3. **Importáld** vagy manuálisan vedd fel a termékeket.
4. Rendeld hozzá a **beszállítókat** (import sorban vagy tömegesen).
5. Kövesd a készletet a **Termékmenedzsment** dashboardon és a termék adatlapján.

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Terméklista és szűrés](/help/termeklista-es-szures)
- [Termék szerkesztés](/help/termek-szerkesztes)
- [Raktárak](/help/admin-raktarak)

*Utolsó frissítés: 2026-08*
