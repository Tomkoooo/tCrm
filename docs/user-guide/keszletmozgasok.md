---
title: Készletmozgások
description: Bevételezés, kiadás, raktárközi átadás — draft és megerősítés.
order: 31
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Készlet növelése, csökkentése vagy raktárak közötti áthelyezése hivatalos mozgás bizonylattal.

## Hol találod

**Logisztika → Készletmozgások** (`/logistics/movements`)

Új mozgás típusok:

- **Bevételezés (GRN):** `/logistics/movements/new/grn`
- **Kiadás (PICK):** `/logistics/movements/new/pick`
- **Raktárközi átadás:** `/logistics/movements/new/transfer`

## Szükséges jogosultság

- Megtekintés: `logistics:read`
- Létrehozás / megerősítés: `logistics:write`

## Állapotok

| Állapot | Jelentés |
|---------|----------|
| Piszkozat (draft) | Még nem érinti a készletet |
| Megerősítve (confirmed) | Készlet frissül |
| Visszavonva (cancelled) | Nem kerül végrehajtásra |

## Lépésről lépésre

1. Kattints **Új mozgás** és válaszd a típust.
2. Add meg a raktár(aka)t és a **tételeket** (CRM SKU + mennyiség).
3. Mentsd piszkozatként.
4. Ellenőrizd a részleteket, majd kattints **Megerősítés** — ekkor változik a készlet.

## Mozgás típusok hatása

| Típus | Hatás |
|-------|-------|
| Bevételezés | + készlet a cél raktárban |
| Kiadás | − készlet a forrás raktárban |
| Raktárközi | − forrás, + cél raktár |

## Kapcsolódó fejezetek

- [Foglalások](/help/foglalasok)
- [Esemény szállítások](/help/szallitasok)

*Utolsó frissítés: 2026-08*
