---
title: Szerepkörök és jogosultságok
description: Dinamikus jogosultságkezelés — szerepkörök létrehozása és jogok hozzárendelése kódmódosítás nélkül.
order: 2
section: Adminisztráció
permissions:
  - roles:manage
---

## Hol találod

**Oldalsáv → Adminisztráció → Szerepkörök** (`/admin/permissions`)

## Hogyan működik

A rendszerben a jogosultságok **jogkulcsokból** (pl. `users:read`, `mail:manage`) és **szerepkörökből** épülnek fel. Egy felhasználó tényleges (effektív) jogköre a hozzá rendelt szerepkörök jogainak uniója, plusz az esetleges egyedi jogkulcsai.

## Baseline jogosultságok szinkronizálása

A lap tetején lévő **Baseline jogosultságok szinkronizálása** gomb frissíti az összes rendszer jogkulcsot és a rendszer szerepkörök (pl. `admin`) jogait a jelenlegi verzió szerint. Egyedi (nem rendszer) szerepkörök érintetlenek maradnak. Ezt érdemes lefuttatni, ha:

- frissítés után új jogkulcsok jelentek meg a rendszerben,
- egy rendszer szerepkör (pl. `admin`) hiányos jogokkal rendelkezik.

A szinkron után frissítsd az oldalt — a jogosultságok azonnal érvénybe lépnek, nem szükséges új bejelentkezés.

## Szerepkör jogainak módosítása

Nyisd meg a szerepkör kártyáját, és a jelölőnégyzetekkel kapcsold ki/be az egyes jogokat. A **rendszer `admin` szerepkör jogai zárolva vannak** — ez mindig minden jelenleg regisztrált jogkulcsot tartalmaz, és nem szerkeszthető soronként (a szinkron gombbal frissül).

## Új szerepkör létrehozása

A **Új szerepkör** panelben adj meg egy kulcsot (pl. `sales_rep`) és egy megjelenítendő nevet, majd hozd létre. Utána a szerepkör kártyáján kapcsold be a szükséges jogokat.

## Kapcsolódó fejezetek

- [Felhasználók kezelése](/help/admin-felhasznalok)
- [Fiókod és jogosultságaid](/help/fiok)

*Utolsó frissítés: 2026-07*
