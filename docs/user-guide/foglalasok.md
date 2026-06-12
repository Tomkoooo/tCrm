---
title: Foglalások
description: Készlet lefoglalása ajánlat vagy összeszerelés hivatkozással.
order: 32
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Készlet **lefoglalása** (reserved) konkrét ügyhöz — több tétel egy `sourceRef` csoportban.

## Hol találod

**Logisztika → Foglalások** (`/logistics/reservations`)

## Szükséges jogosultság

- Megtekintés: `logistics:read`
- Létrehozás / teljesítés / törlés: `logistics:write`

## Lépésről lépésre

1. Kattints **Új foglalás**.
2. Keresd meg a **CRM SKU**-kat és add meg a mennyiséget.
3. Opcionálisan adj **hivatkozást** (pl. ajánlat vagy összeszerelés azonosító).
4. Mentsd — a `StockLevel.reserved` növekszik.
5. **Teljesítés** vagy **Törlés** a csoport szinten, ha már nem kell a foglalás.

## Gyakori tippek

- A foglalt mennyiség csökkenti a **szabad** készletet, de nem mozgatja a fizikai készletet — arra készletmozgás vagy szállítás kell.

## Kapcsolódó fejezetek

- [Készletmozgások](/help/keszletmozgasok)
- [Esemény szállítások](/help/szallitasok)

*Utolsó frissítés: 2026-06*
