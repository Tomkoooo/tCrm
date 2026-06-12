---
title: Beosztás és kérelmek
description: HR naptár, műszakok, szabadság és jóváhagyási workflow.
order: 41
section: Könyvelés és HR
permissions:
  - hr:read
  - hr:write
  - hr:approve
  - hr:reports
  - hr:self
---

## Mire való

Dolgozók műszakbeosztása és HR kérelmek (szabadság, betegszabadság, beosztás módosítás) kezelése és jóváhagyása.

## Hol találod

- **Beosztás:** `/accounting/schedule`
- **Kérelmek:** `/accounting/requests`

## Szükséges jogosultság

- Naptár megtekintés (HR): `hr:read`
- Beosztás szerkesztés: `hr:write`
- Kérelem jóváhagyás: `hr:approve` vagy `hr:write`
- Saját kérelem: `hr:self` — lásd [Saját beosztás](/help/sajat-beosztas)

## Lépésről lépésre — beosztás (HR)

1. Nyisd meg a **Beosztás** naptárat.
2. Válaszd ki a céget (scope szerint).
3. Kattints egy napra vagy húzd az időszakot — új **műszak** vagy **szabad** esemény.
4. Mentsd a változtatásokat.

## Lépésről lépésre — kérelmek

### Dolgozó

1. **Saját beosztás** oldalon vagy a kérelmek felületen indíts új kérelmet.
2. Válaszd a típust (szabadság, beteg, stb.) és az időszakot.
3. Küldd be — **függőben** állapot.

### Jóváhagyó

1. **Kérelmek** lista — szűrd a függő elemekre.
2. Nyisd meg a részleteket → **Jóváhagyás** vagy **Elutasítás**.
3. Jóváhagyáskor a naptár frissül (pl. `off` esemény).

## Gyakori tippek

- **Vendég dolgozó** — nincs belépése; HR rögzíti a `/accounting/employees` oldalon.
- Cég scope: ha nincs `hr:scope_all`, csak a hozzárendelt cégeket látod.

## Kapcsolódó fejezetek

- [Saját beosztás](/help/sajat-beosztas)
- [Havi kimutatások](/help/kimutatasok)

*Utolsó frissítés: 2026-06*
