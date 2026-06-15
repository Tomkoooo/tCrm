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
2. Válassza ki a **céget** — **kötelező ajánlott**: a **Dolgozó** lista csak az adott cég rekordjait mutatja. Egy személy több cégnél **külön dolgozói rekord**; a név mellett a cég is látszik, ha nincs cég szűrő.
3. Opcionálisan válasszon **egy dolgozót** — csak az ő eseményei.
4. Új esemény: **Új beosztás** — műszak vagy szabad nap (pl. szabadság).
5. Naptárban kattintás / húzás az időszakra — szerkesztés.

### Tömeges beosztás

**Tömeges beosztás** gomb (`hr:write`) — panel a naptár felett:

1. **Dolgozók** — több kijelölés (Cmd/Ctrl + kattintás); csak a kiválasztott **cég** dolgozói érhetők el.
2. **Dátumtól** / **Dátumig**, **Műszak kezdete** / **Műszak vége**.
3. **Alkalmazás módja:** minden munkanap (hétköznap, ünnepnélkül), vagy **Kiválasztott napok** (vesszővel felsorolva).
4. **Meglévő műszak / szabadság napok kihagyása** — bejelölve nem írja felül a már rögzített napokat.
5. **Tömeges beosztás alkalmazása**.

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

- **Vendég dolgozó** — nincs belépés, amíg nincs **Fiók összekötése** ([Dolgozók](/help/dolgozok)).
- **Cég scope:** `hr:scope_all` nélkül csak a hozzárendelt cégek látszanak.
- Kimutatások **ledolgozott óra** és **szabadság** számítása ehhez a naptárhoz és a jóváhagyott kérelmekhez kapcsolódik.

## Kapcsolódó fejezetek

- [Dolgozók](/help/dolgozok)
- [Saját beosztás](/help/sajat-beosztas)
- [Kimutatások](/help/kimutatasok)

*Utolsó frissítés: 2026-06*
