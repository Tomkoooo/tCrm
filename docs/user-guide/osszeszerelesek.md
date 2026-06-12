---
title: Összeszerelések (BOM)
description: Alkatrészlistás termékek — lista, új összeszerelés, szerkesztés.
order: 24
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

Összeszerelések (build kit) kezelése: egy termék, amely más termékekből (alkatrészekből) áll. A logisztika és szállítás ezeket BOM-ként bontja szét.

## Hol találod

- **Készletkezelés → Összeszerelések** (`/inventory/builds`)
- **Új:** `/inventory/builds/new`
- **Szerkesztés:** termék részletek → **Szerkesztés** vagy `/inventory/{sku}?edit=1`

## Szükséges jogosultság

- Megtekintés: `inventory:read`
- Létrehozás/szerkesztés: `inventory:write`

## Lépésről lépésre

### Lista

1. Az **Összeszerelések** táblázat a BOM-mal rendelkező termékeket listázza.
2. Kattints egy sorra a részletekért.

### Új összeszerelés

1. Kattints **Új összeszerelés**.
2. Keresd meg az **alkatrész termékeket** (CRM SKU / név).
3. Add meg a mennyiségeket, neveket, képeket és **összeszerelési útmutatót**.
4. Mentsd.

### Szerkesztés meglévő BOM-on

1. Nyisd meg a termék részleteit.
2. **Szerkesztés** → **Alkatrészek** szekció.
3. Adj hozzá vagy távolíts el sorokat; minden sor mutatja a nevet és CRM SKU-t.

## Gyakori tippek

- Excel import `Relatedproduct_*` oszlopokból is automatikusan BOM készül.
- A **Termékmenedzsment** dashboard mutatja, hány db építhető a szabad alkatrészkészletből.

## Kapcsolódó fejezetek

- [Termék szerkesztés](/help/termek-szerkesztes)
- [Esemény szállítások](/help/szallitasok)

*Utolsó frissítés: 2026-06*
