---
title: Fiók és jogosultságok
description: Saját profil, jelszó és jogosultságok megértése.
order: 2
section: Áttekintés
---

## Mire való

A saját fiókod kezelése és annak megértése, mely modulok és műveletek érhetők el számodra.

## Hol találod

**Beállítások → Fiók** (`/account`)

## Szükséges jogosultság

Minden bejelentkezett felhasználó számára elérhető.

## Lépésről lépésre

### Profil szerkesztése

1. Nyisd meg a **Fiók** oldalt.
2. A **Profil** szekcióban módosíthatod a megjelenített neved.
3. Az e-mail cím **csak olvasható** a saját fiókodon — admin más felhasználó e-mailjét szerkesztheti.

### Jelszó módosítása

1. A **Jelszó** szekcióban add meg a jelenlegi jelszavad.
2. Add meg az új jelszót kétszer, majd kattints a **Jelszó módosítása** gombra.

### Jogosultságok ellenőrzése

1. Görgess le az **Érvényes jogosultságok** szekcióhoz.
2. Itt látod a szerepköreidet és a közvetlenül hozzárendelt jogokat.
3. Ha hiányzik egy modul az oldalsávból, itt ellenőrizheted, van-e meg a szükséges kulcs (pl. `inventory:read`).

## Gyakori tippek

- A menü **csak kényelmi szűrés** — az oldalak szerver oldalon is ellenőrzik a jogot. Közvetlen URL megnyitása jog nélkül hibát ad.
- Szerepkörök kezelése: [Szerepkörök](/help/admin-szerepkorok) (csak `roles:manage` joggal).
- **Saját beosztás** (műszak, kérelmek) a **Fiók** oldaltól külön van: Beállítások → **Saját beosztás**. Ha üres vagy hibát ír, az HR-nek **Fiók összekötése** kell a dolgozói rekordon — lásd [Dolgozók](/help/dolgozok).

## Kapcsolódó fejezetek

- [Áttekintés](/help)
- [Felhasználók és meghívók](/help/admin-felhasznalok)
- [Saját beosztás](/help/sajat-beosztas)

*Utolsó frissítés: 2026-06*
