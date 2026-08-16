---
title: Felhasználók kezelése
description: Munkatársak meghívása, fiókok szerkesztése és jelszó-visszaállítás.
order: 1
section: Adminisztráció
permissions:
  - users:read
---

## Hol találod

**Oldalsáv → Adminisztráció → Felhasználók** (`/admin/users`)

## Mit látsz

Táblázatos lista az összes felhasználóról: név, e-mail, szerepkör(ök), állapot (aktív/inaktív). A táblázat felett kereséssel, szűrőkkel és oszlopválasztóval finomíthatod a listát.

## Új munkatárs felvétele

Két módon adhatsz hozzá felhasználót:

1. **Meghívás e-mailben** (`/admin/users/invite`) — a munkatárs egy regisztrációs linket kap e-mailben, amellyel saját maga állítja be a jelszavát. A függőben lévő meghívásokat az **Meghívások** listában (`/admin/users/invitations`) követheted, és szükség esetén újraküldheted vagy visszavonhatod.
2. **Közvetlen létrehozás** (`/admin/users/new`) — azonnal létrehozod a fiókot és beállítod a kezdeti jelszót.

Mindkettőhöz **Felhasználók kezelése** (`users:write`) jogosultság szükséges.

## Meglévő felhasználó szerkesztése

Kattints egy sorra a részletek megnyitásához (`/admin/users/[id]`). Itt módosíthatod a nevet, a hozzárendelt szerepköröket, és inaktiválhatod a fiókot, ha valaki már nem dolgozik a rendszerben.

## Jelszó-visszaállítás

Egy felhasználó sorában a **Jelszó-visszaállító e-mail küldése** gombbal jelszó-visszaállító linket küldhetsz a felhasználónak — nincs szükség arra, hogy ismerd vagy beállítsd helyette az új jelszót.

## Kapcsolódó fejezetek

- [Szerepkörök és jogosultságok](/help/admin-szerepkorok)
- [E-mail sablonok](/help/admin-email-sablonok)

*Utolsó frissítés: 2026-07*
