---
title: Járműflotta
description: Járművek, dokumentumok, lejáratok és incidens bejelentés.
order: 34
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Szállításhoz használt járművek nyilvántartása: méretek, dokumentumok, biztosítás/forgalmi lejárat, incidensek.

## Hol találod

- **Logisztika → Járműflotta** (`/logistics/vehicles`)
- Részletek: `/logistics/vehicles/{id}`
- Figyelmeztetések: **Logisztika → Áttekintés** dashboard (30 napon belüli lejárat)

## Szükséges jogosultság

- Megtekintés: `logistics:read`
- Szerkesztés, incidens lezárás: `logistics:write`
- Cég párosítás: `hr:write` (cég adatok)

## Lépésről lépésre

### Jármű felvétele

1. Nyisd meg a **Járműflotta** listát → **Új jármű**.
2. Add meg az azonosítót, méreteket, max súly/térfogatot.
3. Rendeld hozzá a **tulajdonos céget** (könyvelés modulból).
4. Töltsd fel a dokumentumokat (forgalmi, biztosítás, jogosítvány) a **Médiatár** segítségével.
5. Állítsd be a **lejárati dátumokat** — ezek jelennek meg figyelmeztetésként.

### Incidens bejelentés

1. Ha jogosult vagy (user vagy szerepkör párosítás), nyisd meg a jármű **Incidensek** fülét.
2. **Új incidens** — leírás + fotók.
3. Logisztika `logistics:write` joggal **lezárhatja** az incidenst.

## Kapcsolódó fejezetek

- [Esemény szállítások](/help/szallitasok)
- [Könyvelés és HR áttekintés](/help/hr-attekintes)

*Utolsó frissítés: 2026-06*
