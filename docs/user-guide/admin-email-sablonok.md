---
title: E-mail sablonok
description: Rendszerüzenetek (meghívó, jelszó-visszaállítás) szövegének testreszabása.
order: 3
section: Adminisztráció
permissions:
  - mail:manage
---

## Hol találod

**Oldalsáv → Adminisztráció → E-mail sablonok** (`/admin/mail-templates`)

## Mit tehetsz itt

A rendszer minden automatikus e-mailje (meghívó, jelszó-visszaállítás) egy adatbázisban tárolt sablonból épül fel. Itt szerkesztheted a sablonok tárgyát és szövegét kódmódosítás nélkül.

Egy sablon megnyitásakor (`/admin/mail-templates/[id]`) módosíthatod:

- a tárgyat és a HTML tartalmat,
- opcionálisan, hogy mely szerepkörök vagy felhasználók kapjanak értesítést, ha a sablon egy belső értesítés (nem közvetlenül a végfelhasználónak szóló e-mail).

## Válasz-cím (Reply-To)

A kimenő e-mailek válasz-címe mindig azé a felhasználóé, aki a műveletet kiváltotta (pl. aki a meghívást elküldte) — így a válasz közvetlenül hozzá érkezik.

## Kapcsolódó fejezetek

- [Felhasználók kezelése](/help/admin-felhasznalok)

*Utolsó frissítés: 2026-07*
