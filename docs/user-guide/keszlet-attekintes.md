---
title: Készletkezelés áttekintése
description: A készlet modul menüpontjai és tipikus munkafolyamatok.
order: 10
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

A készlet modul a termékek, kategóriák, beszállítók és összeszerelések (BOM) központi kezelőfelülete.

## Hol találod

**Oldalsáv → Készletkezelés**

| Menüpont | Útvonal |
|----------|---------|
| Termékmenedzsment | `/inventory/dashboard` |
| Termékek | `/inventory` |
| Összeszerelések | `/inventory/builds` |
| Termékkategóriák | `/inventory/categories` |
| Beszállítók | `/inventory/suppliers` |

## Szükséges jogosultság

- **Olvasás:** `inventory:read` — lista, részletek, KPI
- **Szerkesztés:** `inventory:write` — új termék, módosítás, tömeges művelet
- **Import:** `inventory:import` — Excel feltöltés

## Tipikus munkafolyamat

1. Hozd létre a **kategóriákat** (import előtt kötelező).
2. **Importáld** vagy manuálisan vedd fel a termékeket.
3. Rendeld hozzá a **beszállítókat** (import sorban vagy tömegesen).
4. Állítsd össze az **összeszereléseket** (BOM) alkatrész termékekből.
5. Kövesd a készletet a **Termékmenedzsment** dashboardon és a logisztika modulban.

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Terméklista és szűrés](/help/termeklista-es-szures)
- [Termék szerkesztés](/help/termek-szerkesztes)
- [Összeszerelések](/help/osszeszerelesek)

*Utolsó frissítés: 2026-06*
