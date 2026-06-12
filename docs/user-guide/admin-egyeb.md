---
title: E-mail sablonok, médiatár és arcualat
description: Adminisztrációs kiegészítő modulok.
order: 63
section: Adminisztráció
permissions:
  - admin:access
---

## Mire való

Rendszer szintű beállítások: tranzakciós e-mail sablonok, központi médiatár, alkalmazás arcualat (logo, név).

## Hol találod

| Funkció | Útvonal | Extra jog |
|---------|---------|-----------|
| E-mail sablonok | `/admin/mail-templates` | `mail:manage` |
| Médiatár | `/admin/media` | `media:read` vagy `inventory:read` |
| Arculat | `/admin/branding` | `admin:access` |

## E-mail sablonok

1. Lista → sablon kiválasztása.
2. Szerkeszd a tárgyat és HTML törzset (pl. `user_invitation`, logisztikai értesítések).
3. A logisztika állapotváltáskor automatikusan küld sablon alapján.

## Médiatár (admin)

1. Teljes galéria böngészés, keresés, feltöltés, link regisztráció.
2. Törlés: `media:delete` jog.

## Arculat

1. **Alkalmazásnév**, cégnév, logo, favicon, bejelentkezési háttér és szövegek.
2. A logo a **Médiatár**ból választható.
3. Mentés után az oldalsáv és bejelentkezési oldal frissül.

## Kapcsolódó fejezetek

- [Médiatár használata](/help/mediatar)
- [Felhasználók és meghívók](/help/admin-felhasznalok)

*Utolsó frissítés: 2026-06*
