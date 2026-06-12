---
title: Szerepkörök és jogosultságok
description: RBAC mátrix — szerepkörök és finomhangolt jogok kezelése.
order: 61
section: Adminisztráció
permissions:
  - roles:manage
---

## Mire való

Szerepkörök létrehozása és jogosultságok hozzárendelése; rendszer jogok szinkronizálása.

## Hol találod

**Adminisztráció → Szerepkörök** (`/admin/permissions`)

## Szükséges jogosultság

`roles:manage`

## Lépésről lépésre

1. Nyisd meg a **Szerepkörök és jogosultságok** oldalt.
2. Bontsd ki a szerepkör kártyát.
3. Pipáld ki a kívánt **jogosultság kulcsokat**.
4. Mentsd a változtatásokat.
5. **Baseline szinkron** — frissíti a rendszer alap jogait és szerepköröket új verzió után.

## Gyakori tippek

- A felhasználók a **Fiók** oldalon látják az érvényes jogokat.
- Modulok (pl. Készlet, Logisztika) egész csoportok jogait egy-egy kulcs zárja (`inventory:read`, `logistics:read`).

## Kapcsolódó fejezetek

- [Felhasználók és meghívók](/help/admin-felhasznalok)

*Utolsó frissítés: 2026-06*
