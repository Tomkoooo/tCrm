---
title: Termék megtekintés és szerkesztés
description: Termék részletek, inline szerkesztés és accordion szekciók.
order: 12
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

Egy termék teljes adatainak megtekintése és módosítása: azonosítók, készlet, BOM, képek, útmutató.

## Hol találod

- **Termékek** lista → sor kiválasztása → **Részletek** vagy közvetlen URL: `/inventory/{CRM-SKU}`
- **Szerkesztés:** **Szerkesztés** gomb vagy `/inventory/{CRM-SKU}?edit=1`

## Szükséges jogosultság

- Megtekintés: `inventory:read`
- Szerkesztés: `inventory:write`

## Lépésről lépésre

### Részletek megtekintése

1. Nyisd meg a terméket a listából vagy közvetlen linkkel.
2. Látod: SKU, nevek, kategóriák, készlet raktáronként, BOM, összeszerelési útmutató, képek.

### Szerkesztés indítása

1. Kattints a **Szerkesztés** gombra (`inventory:write`).
2. Az űrlap **accordion szekciókban** jelenik meg: Azonosítók, Készlet, Alkatrészek, Útmutató, Képek stb.
3. A nyitott/zárt szekciók állapota megmarad a böngésződben.

### Készlet módosítása

1. Nyisd ki a **Készlet** szekciót.
2. Raktáronként add meg az **abszolút mennyiséget** (nem relatív delta).
3. Mentsd a **Mentés** gombra kattintva.

### Lista panelből szerkesztés

1. A táblázatban válaszd ki a sort.
2. A jobb oldali panelen kattints **Szerkesztés** — ugyanaz az űrlap jelenik meg a panelben.

## Gyakori hibák / tippek

- Összecsukott szekció mezői is elküldődnek mentéskor — a rendszer a meglévő értékeket megtartja.
- BOM szerkesztés: lásd [Összeszerelések](/help/osszeszerelesek).
- Képek: [Médiatár használata](/help/mediatar).

## Kapcsolódó fejezetek

- [Excel importálás](/help/excel-import)
- [Összeszerelések](/help/osszeszerelesek)

*Utolsó frissítés: 2026-06*
