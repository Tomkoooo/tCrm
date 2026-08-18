---
title: Leltár és gyors felvétel
description: Új termék magyar névvel, készlet a terméklistán raktáranként, naplózott módosítás.
order: 13
section: Készletkezelés
permissions:
  - inventory:read
---

## Mire való

Gyorsan felveszel egy terméket (magyar név + kategória), majd a **Termékek** listán a készletszámra kattintva raktáranként beállítod a darabszámot. Minden változás naplóba kerül, és visszavonható.

## Hol találod

- **Készletkezelés → Termékek** (`/inventory`) → **Új termék**, vagy a **Raktár / készlet** oszlop
- **Készletkezelés → Leltár** (`/inventory/count`) — teljes lista raktáranként

## Szükséges jogosultság

- Megtekintés: `inventory:read`
- Felvétel, készlet mentése, visszavonás: `inventory:write`

## Lépésről lépésre

### Gyors termékfelvétel

1. A **Termékek** oldalon kattints **Új termék**.
2. Add meg a **Név (HU)** mezőt és a **Kategóriát**.
3. Opcionálisan raktár + mennyiség.
4. **Mentés** vagy **Mentés és újabb**. A CRM SKU automatikusan készül.
5. Teljes űrlap (beszállító, árak): **Teljes űrlap**.

### Készlet a listán

1. A **Termékek** táblában kattints a **Raktár / készlet** cellára (pl. `Récsei/20`).
2. A felugró ablakban add meg az **abszolút darabszámot** minden elérhető raktárhoz.
3. **Készlet mentése** — a változás bekerül a naplóba (ki, mikor, mennyivel).
4. Hibás mentésnél a napló **Visszavonás** gombja visszaállítja az előző értéket.

Ugyanez a panel a sor részleteiből is nyílik.

## Gyakori hibák / tippek

- A mennyiség nem plusz/mínusz, hanem a raktárban lévő darabszám.
- A kategóriákat előtte hozd létre: [Termékkategóriák](/help/kategoriak).

## Kapcsolódó fejezetek

- [Terméklista és szűrés](/help/termeklista-es-szures)
- [Készletkezelés áttekintése](/help/keszlet-attekintes)
- [Raktárak](/help/admin-raktarak)

*Utolsó frissítés: 2026-08*
