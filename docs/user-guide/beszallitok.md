---
title: Beszállítók
description: Beszállító partnerek felvétele és Excel slug párosítás.
order: 23
section: Készletkezelés
permissions:
  - suppliers:read
  - suppliers:manage
  - inventory:import
  - inventory:write
---

## Mire való

Beszállító cégek és kapcsolattartók nyilvántartása; az Excel `crm_supplier_slug` ehhez a **kulcs** (key) mezőhöz kapcsolódik.

## Hol találod

**Készletkezelés → Beszállítók** (`/inventory/suppliers`)

## Szükséges jogosultság

- Lista: bármelyik — `suppliers:read`, `suppliers:manage`, `inventory:import`, `inventory:write`
- Új beszállító: `suppliers:manage` vagy `inventory:import` / `inventory:write`

## Lépésről lépésre

1. Nyisd meg a **Beszállítók** listát.
2. **Új beszállító** — add meg a cég adatait és a **kulcsot (slug)**; ez lesz az Excel `crm_supplier_slug`.
3. Részleteknél szerkesztheted a kapcsolattartókat és címet.
4. Importnál használd ugyanazt a kulcsot soronként, vagy állíts be alapértelmezett beszállítót a varázslóban.

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Tömeges módosítás](/help/tomeges-modositas)

*Utolsó frissítés: 2026-06*
