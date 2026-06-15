---
title: Beosztás és kérelmek
description: HR naptár, műszakok, tömeges beosztás, szabadság és jóváhagyás.
order: 41
section: Könyvelés és HR
permissions:
  - hr:read
  - hr:write
  - hr:approve
  - hr:reports
  - hr:self
---

# Beosztás és kérelmek

## Mire való

Dolgozók műszakbeosztása és HR kérelmek (szabadság, betegszabadság, beosztás módosítás) kezelése és jóváhagyása. A beosztás adatai beleszámítanak a **Kimutatások** számításába is.

## Hol találod

- **Beosztás:** `/accounting/schedule`
- **Kérelmek:** `/accounting/requests`

## Szükséges jogosultság

| Tevékenység | Jog |
|-------------|-----|
| Naptár megtekintés | `hr:read` |
| Műszak rögzítés, tömeges beosztás | `hr:write` |
| Kérelem jóváhagyás / elutasítás | `hr:approve` vagy `hr:write` |
| Saját kérelem, saját naptár | `hr:self` — [Saját beosztás](/help/sajat-beosztas) |

---

## Beosztás (HR) — lépésről lépésre

1. Nyissa meg a **Beosztás** oldalt.
2. Válassza ki a **céget** — a **Dolgozó** lista csak az adott cég rekordjait mutatja.
3. Válasszon **dolgozót** — csak az ő eseményei jelennek meg, és a **Tömeges műszak** gomb aktiválódik.
4. Új egyedi esemény: **Új beosztás** — műszak vagy szabad nap.
5. Naptárban kattintás / húzás az időszakra — szerkesztés.

A naptár **Outlook-szerű**: átfedő műszakok oszlopokban, szöveg a blokkokban (cím, dolgozó, idő). Dolgozónként **Naptár szín** állítható a dolgozó adatlapon; alapból automatikus szín.

### Tömeges műszak

**Tömeges műszak** gomb (`hr:write`) — akkor aktív, ha egy **dolgozót** kiválasztott:

1. Válassza ki a **dolgozót** a legördülőből (előbb válasszon céget).
2. Kattintson **Tömeges műszak** — a panel mutatja a kiválasztott dolgozó nevét.
3. Állítsa be az **időszakot** (dátumtól–dátumig), **műszak kezdete** és **vége**.
4. **Mely napokra?** — minden munkanap (H–P, ünnep nélkül) vagy **Csak megadott napok** (vesszővel, pl. `2026-06-01, 2026-06-05`).
5. **Már rögzített napok kihagyása** — bejelölve nem írja felül a már létező beosztást.
6. **Műszakok létrehozása**.

---

## Kérelmek

### Dolgozó (Saját beosztás)

1. **Saját beosztás** → **Új kérelem**.
2. Típus (szabadság, beteg, …), dátumok, beküldés.
3. Több cégnél: előbb **Aktív cég** választás — a kérelem a kiválasztott cég rekordjához tartozik.

### HR jóváhagyó

1. **Kérelmek** lista — szűrés státusz / típus szerint.
2. Sor megnyitása → **Jóváhagyás** vagy **Elutasítás**.
3. Jóváhagyáskor a beosztás naptár frissül (pl. szabad nap).

---

## Gyakori tippek

- **Külsős dolgozó** — nincs belépés, amíg nincs **Fiók összekötése** ([Dolgozók](/help/dolgozok)).
- **Cég scope:** `hr:scope_all` nélkül csak a hozzárendelt cégek látszanak.
- Kimutatások **ledolgozott óra** és **szabadság** számítása ehhez a naptárhoz és a jóváhagyott kérelmekhez kapcsolódik.

## Kapcsolódó fejezetek

- [Dolgozók](/help/dolgozok)
- [Saját beosztás](/help/sajat-beosztas)
- [Kimutatások](/help/kimutatasok)

*Utolsó frissítés: 2026-06*
