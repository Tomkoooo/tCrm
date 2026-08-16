---
title: Excel importálás
description: Készlet feltöltése Excel fájlból — lap, oszlop párosítás, előnézet, commit.
order: 20
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

Tömeges termék- és készletadatok betöltése beszállítói Excel fájlból.

## Hol találod

**Készletkezelés → Termékek** → **Importálás** gomb (`inventory:import` jog szükséges a feltöltéshez)

Sablon: **Sablon letöltése** a készlet oldalon vagy `/inventory/template`.

## Szükséges jogosultság

- Import indítása: `inventory:import`
- Lista megtekintés: `inventory:read`

## Előkészület

1. Hozd létre a **termékkategóriákat** — minden sorhoz kell `crm_category_slug`.
2. Opcionálisan vedd fel a **beszállítókat** — `crm_supplier_slug` oszlop vagy alapértelmezett a varázslóban.
3. Töltsd le a **sablon Excelt** és nézd meg az **Útmutató** lapot.

## Lépésről lépésre

1. Kattints **Importálás**.
2. **Fájl feltöltése** — `.xlsx` vagy `.xls`.
3. **Munkalap kiválasztása** — ha több lap van a fájlban.
4. **Oszlop párosítás** — az Excel fejléceket párosítsd a rendszer mezőivel (auto-match azonos névnél).
5. **SKU mód:**
   - **Alap:** `product_id` (beszállítói SKU) → CRM SKU generálás kategória előtaggal
   - **SM:** `product_id_SM` mentődik CRM SKU-ként
6. **Opcionális alapértelmezett beszállító** — ha a fájlban nincs minden sorban slug.
7. **Előnézet** — ellenőrizd a hibákat; javítsd a fájlt vagy a kategóriákat.
8. **Import végrehajtása** — sikeres sorok létrejönnek vagy frissülnek (merge mód).

## Fontos oszlopok

| Oszlop | Kötelező | Jelentés |
|--------|----------|----------|
| `product_id` | Alap módban igen | Beszállítói cikkszám |
| `product_id_SM` | SM módban igen | CRM SKU |
| `crm_category_slug` | Igen | Létező kategória slug |
| `crm_supplier_slug` | Nem | Beszállító kulcs |
| `warehouse 1.` … `3.` | Nem | Kispest / Erzsébet / Récsei készlet |

## Gyakori hibák

- **Ismeretlen kategória** — előbb hozd létre a **Termékkategóriák** oldalon.
- **Beszállító hiányzik** — importálható supplier nélkül is; később a terméklistán tömegesen is hozzárendelhető.
- Üres raktár cella = nincs készlet az adott raktárban; `0` = van StockLevel, nulla darab.

## Kapcsolódó fejezetek

- [Termékkategóriák](/help/kategoriak)
- [Beszállítók](/help/beszallitok)
- [Terméklista és szűrés](/help/termeklista-es-szures)

*Utolsó frissítés: 2026-08*
