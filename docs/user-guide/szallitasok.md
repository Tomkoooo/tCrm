---
title: Esemény szállítások
description: Szállítási feladat életciklusa — összeszedés, átvétel, kiszállítás, visszaszállítás.
order: 33
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Eseményhez (pl. rendezvény) kapcsolódó szállítási feladat: alkatrészek és összeszerelések összeszedése, építői átvétel, helyszíni kiszállítás, visszaszállítás és raktári ellenőrzés.

## Hol találod

- **Logisztika → Szállítások** (`/logistics/jobs`)
- **Új szállítás:** `/logistics/jobs/new`
- Részletek: `/logistics/jobs/{id}`

## Szükséges jogosultság

- Megtekintés: `logistics:read`
- Létrehozás és állapotváltás: `logistics:write`

## Állapotok (életciklus)

1. **Piszkozat** — tervezés
2. **Ütemezve** — közzétéve
3. **Összeszedve** — raktár összerakta (készlet −)
4. **Átvéve** — építő átvette
5. **Kiszállítva** — helyszínen
6. **Visszaszállítás alatt**
7. **Befejezve** — raktár bevételezte a visszárut
8. **Törölve** — piszkozat/ütemezett állapotból

## Lépésről lépésre

### Szállítás létrehozása (logisztikai vezető)

1. **Új szállítás** — add meg az esemény adatait és hivatkozást (`JOB-ÉÉÉÉ-NNNN`).
2. Adj hozzá **átvételi köröket** (pickup): raktár, jármű, csapat, tételek (termék vagy összeszerelés).
3. Állítsd be az **értesítési e-mail címeket** — sablon alapú értesítések mennek állapotváltáskor.
4. **Közzététel** — ütemezett állapot.

### Raktáros — összeszedés

1. Nyisd meg a szállítás részleteit.
2. Ellenőrizd a tételeket (összeszerelés sorok kibonthatók alkatrészekre).
3. **Összeszedés megerősítése** — létrejön a kiadás (PICK) mozgás, csökken a készlet.

### Építő — átvétel és kiszállítás

1. **Átvétel megerősítése** — csak állapotváltás.
2. **Kiszállítás megerősítése** a helyszínen.
3. Opcionálisan rögzítsd a **telepített mennyiséget** és helyet.
4. **Visszaszállítás indul** — visszafelé úton.

### Raktáros — bevételezés

1. **Bevételezés ellenőrzése** — a visszaérkezett mennyiség bekerül a készletbe.
2. **Hiány** = összeszedett − ellenőrzött (tartós terméknél); fogyóesetén nincs „elveszett” mező.

## Kapcsolódó fejezetek

- [Járműflotta](/help/jarmuflotta)
- [Összeszerelések](/help/osszeszerelesek)

*Utolsó frissítés: 2026-06*
