---
title: Termékkategóriák
description: CRM kategória fa, slug és SKU előtag — import előfeltétel.
order: 22
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

A belső termékkategória fa kezelése. Minden importált termékhez kötelező `crm_category_slug`.

## Hol találod

**Készletkezelés → Termékkategóriák** (`/inventory/categories`)

## Szükséges jogosultság

- Megtekintés: `inventory:read`
- Létrehozás/szerkesztés: `inventory:write`

## Lépésről lépésre

### Új kategória

1. Nyisd meg a **Termékkategóriák** oldalt.
2. Töltsd ki az űrlapot: név, **slug** (kisbetűs azonosító), opcionális szülő, **SKU előtag**.
3. Mentsd — a slug lesz az Excel `crm_category_slug` értéke.

### Fa struktúra

- Akár három szintű hierarchia támogatott.
- A slug egyedi — nagybetű az Excelben is normalizálódik.

## Gyakori tippek

- **Import előtt** mindig hozd létre a szükséges kategóriákat.
- A beszállítói `cat*Name_*` oszlopok külön tárolódnak (`shipperCategoryPath`) — nem helyettesítik a CRM kategóriát.

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Leltár és gyors felvétel](/help/leltar)

*Utolsó frissítés: 2026-08*
