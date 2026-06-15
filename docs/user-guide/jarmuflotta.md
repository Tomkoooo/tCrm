---
title: Járműflotta
description: Járművek, dokumentumok, lejáratok és incidens bejelentés.
order: 34
section: Logisztika
permissions:
  - logistics:read
  - logistics:vehicles:read
---

## Mire való

Szállításhoz használt járművek nyilvántartása: méretek, dokumentumok, biztosítás/forgalmi lejárat, incidensek.

## Hol találod

- **Logisztika → Járműflotta** (`/logistics/vehicles`)
- Részletek: `/logistics/vehicles/{id}`
- Figyelmeztetések: **Logisztika → Áttekintés** dashboard (30 napon belüli lejárat) — teljes logisztika jog kell

## Szükséges jogosultság

- Flotta megtekintés: `logistics:read` (teljes logisztika) **vagy** `logistics:vehicles:read` (csak járműflotta a menüben)
- Incidens bejelentés (leírás + fotó): `logistics:vehicles:report`
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

1. Nyisd meg a jármű **Incidensek** fülét (flotta megtekintési jog kell).
2. Ha van **Report vehicle incidents** jogosultságod, töltsd ki a **Leírás** mezőt és csatolj **Fotók (opcionális)** elemet a Médiatárból.
3. Kattints a **Bejelentés küldése** gombra.
4. A logisztika `logistics:write` joggal **Lezárva** gombbal zárhatja az incidenst.

## Kapcsolódó fejezetek

- [Esemény szállítások](/help/szallitasok)
- [Könyvelés és HR áttekintés](/help/hr-attekintes)

*Utolsó frissítés: 2026-06*
