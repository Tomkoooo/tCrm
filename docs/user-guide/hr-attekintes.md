---
title: Könyvelés és HR áttekintés
description: Cégek, dolgozók, beosztás, kérelmek és kimutatások moduljai.
order: 40
section: Könyvelés és HR
permissions:
  - accounting:read
  - accounting:write
  - hr:read
  - hr:write
  - hr:approve
  - hr:reports
  - hr:self
---

## Mire való

HR és könyvelési törzsadatok: cégek, dolgozók (cégenkénti rekordok), műszakbeosztás, szabadság/beteg kérelmek, szabadság- és bérkimutatások exporttal.

## Hol találod

**Oldalsáv → Könyvelés és HR**

| Menüpont | Útvonal | Jog |
|----------|---------|-----|
| Áttekintés | `/accounting` | accounting / hr olvasás |
| Cégek | `/accounting/companies` | `hr:write` |
| Dolgozók | `/accounting/employees` | `hr:read` |
| Beosztás | `/accounting/schedule` | `hr:read` |
| Kérelmek | `/accounting/requests` | `hr:read` |
| Kimutatások | `/accounting/leave-summary` | `hr:reports` |

**Dolgozói önkiszolgálás:** Beállítások → **Saját beosztás** (`/accounting/my`) — nem a **Fiók** oldal (`/account`).

A régi külön „Kimutatások” és „Szabadság összesítő” menüpontok egy helyen vannak: **Kimutatások**, két füllel (szabadság / havi bér és órák).

## Fontos fogalmak

- **Dolgozói rekord** = egy személy **egy cégnél** (külön beosztás, szabadságkeret, kimutatás).
- **CRM fiók** = belépés; egy fiók **több céghez** is tartozhat (több dolgozói rekord, ugyanaz a bejelentkezés).
- **Külsős** = HR rögzíti, nincs (még) összekötött belépés; **Alkalmazott** = belső dolgozó (mindkettő csak címke, nem ad automatikus hozzáférést).

## Tipikus HR folyamat

1. **Cég** létrehozása (ha kell).
2. **Dolgozó** felvétele a céghez — e-mail cím megadása ajánlott.
3. **Fiók összekötése** vagy **Meghívó / új fiók** — hogy a dolgozó lássa a **Saját beosztás** oldalt.
4. **Beosztás** rögzítése (cég szűrővel).
5. **Kimutatások** — éves szabadság, havi óra/bér ellenőrzés, export.

Több cég ugyanannál a személynél: [Dolgozók](/help/dolgozok) → **Másik céghez adás** vagy ugyanazon fiók összekötése mindkét rekordnál.

## Kapcsolódó fejezetek

- [Dolgozók](/help/dolgozok) — fiók összekötés, több cég, bérezés
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Kimutatások](/help/kimutatasok)
- [Saját beosztás](/help/sajat-beosztas) — dolgozói nézet

*Utolsó frissítés: 2026-06*
