---
title: Tömeges módosítás
description: Több termék egyszerre — beszállító, készlet, kategória, aktív státusz.
order: 21
section: Készletkezelés
permissions:
  - inventory:write
---

## Mire való

A jelenlegi lista szűrő alapján kiválasztott termékek tömeges frissítése (pl. beszállító hozzárendelés import után).

## Hol találod

**Készletkezelés → Termékek** → **Tömeges módosítás**

## Szükséges jogosultság

`inventory:write`

## Lépésről lépésre

1. Állítsd be a **lista szűrőket** (raktár, kategória, aktív/inaktív) — csak a látható termékek kerülnek scope-ba.
2. Kattints **Tömeges módosítás**.
3. Opcionálisan szűkítsd **csak beszállító nélküli** termékekre, vagy márka/kategória szerint.
4. Válaszd ki a módosítandó mezőket: beszállító, készlet (egy raktár), aktív/inaktív, kategória, márka.
5. Erősítsd meg a műveletet.

## Gyakori tippek

- Import után gyakori feladat: beszállító hozzárendelése azokhoz a sorokhoz, ahol az Excelben nem volt `crm_supplier_slug`.
- A scope a **URL-ben tárolt DataTable állapot** — ellenőrizd a szűrőket mentés előtt.

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Beszállítók](/help/beszallitok)

*Utolsó frissítés: 2026-06*
