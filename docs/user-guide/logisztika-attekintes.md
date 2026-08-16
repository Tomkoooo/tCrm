---
title: Logisztika áttekintés
description: Logisztikai modul menüpontjai és tipikus folyamatok.
order: 30
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Készletmozgások, foglalások, esemény szállítások és járműflotta kezelése.

## Hol találod

**Oldalsáv → Logisztika**

| Menüpont | Útvonal |
|----------|---------|
| Áttekintés | `/logistics` |
| Készletmozgások | `/logistics/movements` |
| Foglalások | `/logistics/reservations` |
| Szállítások | `/logistics/jobs` |
| Járműflotta | `/logistics/vehicles` |

## Szükséges jogosultság

- Olvasás: `logistics:read`
- Műveletek (létrehozás, megerősítés): `logistics:write`
- Minden raktár: `logistics:scope_all` (nélküle csak hozzárendelt raktárak)

## Tipikus folyamat

1. **Foglalás** készítése ajánlat vagy összeszerelés hivatkozással.
2. **Készletmozgás** (bevételezés, kiadás, átadás) draft → megerősítés.
3. **Szállítás** létrehozása eseményre — raktár összeszed → építő átvétel → kiszállítás → visszaszállítás → raktár bevételezés.

## Kapcsolódó fejezetek

- [Készletmozgások](/help/keszletmozgasok)
- [Foglalások](/help/foglalasok)
- [Esemény szállítások](/help/szallitasok)
- [Járműflotta](/help/jarmuflotta)

*Utolsó frissítés: 2026-08*
