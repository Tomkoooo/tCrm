---
title: Terméklista és szűrés
description: Készlet táblázat használata, oszlopok, raktár szűrés és aktív státusz.
order: 11
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

Az összes termék listázása, keresése, szűrése és gyors megtekintése.

## Hol találod

**Készletkezelés → Termékek** (`/inventory`)

## Szükséges jogosultság

`inventory:read` — lista megtekintése; `inventory:write` — aktív oszlop szerkesztése, új termék.

## Lépésről lépésre

### Lista böngészése

1. Nyisd meg a **Termékek** oldalt.
2. A táblázat tetején kereshetsz, szűrhetsz és rendezhetsz.
3. Kattints egy sorra a **részletek panel** (EntitySheet) megnyitásához.

### Raktár szűrés

- Ha csak egy raktárhoz vagy rendelve, automatikusan csak az ott készleten lévő termékek látszanak.
- Logisztikai vezető (`logistics:scope_all`) az **Összes termék** kapcsolóval (`?showAll=true`) inaktív termékeket is láthat.

### Oszlopok testreszabása

1. Kattints az **Oszlopok** gombra a táblázat felett.
2. Pipáld ki a megjelenítendő mezőket (pl. kép előnézet, készlet, beszállító).
3. A beállítás a böngésződben mentődik.

### Új termék

1. Kattints az **Új termék** gombra (`inventory:write`).
2. Töltsd ki az űrlapot, majd mentsd.

### Import és export

- **Importálás** — Excel varázsló (lásd [Excel importálás](/help/excel-import)).
- **Sablon letöltése** — mintafájl az import oszlopokhoz.

## Gyakori tippek

- A fejléc **ⓘ** ikonjai rövid magyarázatot adnak az oszlopról.
- Inaktív termék: csak megfelelő jogosultsággal és szűrővel látható.

## Kapcsolódó fejezetek

- [Termék szerkesztés](/help/termek-szerkesztes)
- [Tömeges módosítás](/help/tomeges-modositas)

*Utolsó frissítés: 2026-06*
