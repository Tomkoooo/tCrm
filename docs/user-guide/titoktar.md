---
title: Titoktár
description: Titkosított jelszavak és API kulcsok projektenként.
order: 50
section: Titoktár
permissions:
  - secrets:read
  - secrets:write
  - secrets:delete
  - secrets:manage
---

## Mire való

Bizalmas értékek (jelszavak, API kulcsok, deployment titkok) biztonságos tárolása projekt struktúrában.

## Hol találod

**Beállítások → Titoktár** (`/secrets`)

Projekt részletek: `/secrets/{id}`

## Szükséges jogosultság

| Jog | Mit tehetsz |
|-----|-------------|
| `secrets:read` | Projekt és kulcsok listája; érték **Megjelenítés** / **Másolás** gombbal |
| `secrets:write` | Új projekt / kulcs, szerkesztés |
| `secrets:delete` | Törlés (létrehozó vagy manage) |
| `secrets:manage` | Minden projekt + megosztás |

## Lépésről lépésre

### Új projekt

1. **Titoktár** → **Új projekt**.
2. Add meg a nevet és leírást.
3. Alapértelmezetten **privát** — csak te látod (`secrets:manage` kivétel).

### Kulcs hozzáadása

1. Nyisd meg a projektet.
2. **Új kulcs** — név + érték.
3. Az érték titkosítva tárolódik; a listában csak a kulcs neve látszik.

### Érték megtekintése

1. Kattints **Megjelenítés** vagy **Másolás** — a szerver visszafejti **kérésre**.
2. Ne oszd meg képernyőmegosztáson éles értékeket.

### Megosztás

1. Projekt részletein **Megosztás** (létrehozó vagy `secrets:manage`).
2. Adj hozzá **szerepköröket** vagy **felhasználókat**.

## Gyakori tippek

- Az értékek soha nem jelennek meg automatikusan listanézetben.
- Törlés visszafordíthatatlan — ellenőrizd a projektet előtte.

## Kapcsolódó fejezetek

- [Fiók és jogosultságok](/help/fiok-es-jogosultsagok)

*Utolsó frissítés: 2026-06*
