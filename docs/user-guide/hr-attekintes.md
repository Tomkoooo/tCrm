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

HR és könyvelési törzsadatok: cégek, dolgozók, műszakbeosztás, szabadság/beteg kérelmek, havi kimutatás export.

## Hol találod

**Oldalsáv → Könyvelés és HR**

| Menüpont | Útvonal | Jog |
|----------|---------|-----|
| Áttekintés | `/accounting` | accounting / hr olvasás |
| Cégek | `/accounting/companies` | `hr:write` |
| Dolgozók | `/accounting/employees` | `hr:read` |
| Beosztás | `/accounting/schedule` | `hr:read` |
| Kérelmek | `/accounting/requests` | `hr:read` |
| Kimutatások | `/accounting/reports` | `hr:reports` |

**Saját beosztás:** Beállítások → Saját beosztás (`/accounting/my`)

## Kapcsolódó fejezetek

- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Saját beosztás](/help/sajat-beosztas)
- [Havi kimutatások](/help/kimutatasok)

*Utolsó frissítés: 2026-06*
