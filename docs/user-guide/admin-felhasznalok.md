---
title: Felhasználók és meghívók
description: Fiókok létrehozása, szerkesztése, meghívás e-mailben.
order: 60
section: Adminisztráció
permissions:
  - users:read
---

## Mire való

CRM felhasználók kezelése: létrehozás, szerepkörök, inaktiválás, e-mail meghívó.

## Hol találod

**Adminisztráció → Felhasználók** (`/admin/users`)

- Új: `/admin/users/new`
- Meghívás: `/admin/users/invite`
- Kiküldött meghívók: `/admin/users/invitations`

## Szükséges jogosultság

- Lista: `users:read`
- Létrehozás / szerkesztés / inaktiválás: `users:write`
- Meghívó e-mail: `mail:send`

## Lépésről lépésre

### Új felhasználó

1. **Új felhasználó** — e-mail, név, jelszó vagy meghívó.
2. Rendeld hozzá a **szerepköröket**.
3. Opcionálisan kösd **dolgozói profilhoz** (HR).

### Meghívó

1. **Felhasználó meghívása** — add meg az e-mailt és szerepköröket.
2. A címzett a `/register/invite?token=...` linken állítja be a jelszót és automatikusan bejelentkezik.

### Inaktiválás

1. Felhasználó szerkesztése → **Inaktív** — nem törlés.
2. Az utolsó admin nem inaktiválható; admin szerepkör nem vehető el teljesen.

## Kapcsolódó fejezetek

- [Szerepkörök](/help/admin-szerepkorok)
- [Fiók és jogosultságok](/help/fiok-es-jogosultsagok)

*Utolsó frissítés: 2026-06*
