# HR és könyvelés modul

## Jogosultságok

| Kulcs | Leírás |
|-------|--------|
| `accounting:read` | Modul áttekintés |
| `accounting:write` | Könyvelési beállítások (későbbi bővítés) |
| `hr:read` | Dolgozók, beosztás, kérelmek megtekintése (cég scope) |
| `hr:write` | Cégek, dolgozók, beosztás kezelése |
| `hr:approve` | Kérelmek jóváhagyása / elutasítása |
| `hr:reports` | Havi kimutatások, XLSX export |
| `hr:scope_all` | Minden cég (scope nélkül) |
| `hr:self` | Saját naptár és kérelmek |

Szerepkörök: `hr` (teljes HR), `employee` (`hr:self`).

## Modellek (`@crm/db`)

- **Company** — `name`, `slug`, `parentCompanyId?`
- **Employee** — `companyId`, opcionális `userId`, `employmentType` (`guest` | `employee`)
- **HrCompanyScope** — `userId` → `companyIds[]` (ha nincs `hr:scope_all`)
- **ScheduleEntry** — naptár események (`shift`, `off`, …)
- **HrRequest** — szabadság / beteg / beosztás módosítás, jóváhagyási workflow
- **MonthlyWorkSummary** — havi óra, szabadság, betegnap, táppénz (HUF)

## Export oszlopok

`hr-{év}-{hónap}.xlsx`: Cég, Cég slug, Dolgozó, Dolgozói szám, Osztály, Év, Hónap, Ledolgozott óra, Szabadság nap, Beteg nap, Táppénz (HUF), Megjegyzés.

## Útvonalak

| Útvonal | Jog |
|---------|-----|
| `/accounting` | accounting / hr olvasás |
| `/accounting/companies` | `hr:write` |
| `/accounting/employees` | `hr:read` |
| `/accounting/schedule` | `hr:read` |
| `/accounting/requests` | `hr:read` |
| `/accounting/reports` | `hr:reports` |
| `/accounting/my` | Bejelentkezés + linked `Employee.userId` (nincs külön jog kell) |

## Fiók + dolgozó egy lépésben

| Útvonal | Viselkedés |
|---------|------------|
| `/register` | Opcionális „Regisztráció dolgozóként” + cég → `User` + `Employee` (`userId` link) |
| `/admin/users/new` | HR/admin: fiók létrehozása dolgozói profillal (cég kötelező, ha be van pipálva) |
| `/admin/users/[id]` | Dolgozói profil szerkesztése / leválasztása |

Vendég dolgozó (nincs belépés): továbbra is `/accounting/employees` + későbbi **Meghívás**.

**Saját beosztás** (`/accounting/my`): Beállítások → Saját beosztás, ha van `Employee.userId` kapcsolat.

Domain logika: `packages/core/src/hr/`.
