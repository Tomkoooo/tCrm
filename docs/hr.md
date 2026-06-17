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

Szerepkörök: `hr` (teljes HR), `employee` (`hr:self`), `builder_manager` (`hr:self`, `hr:read` — csapatvezetői beosztás a csapat adatokból).

## Modellek (`@crm/db`)

- **Company** — `name`, `slug`, `parentCompanyId?`
- **Employee** — `companyId`, opcionális `userId`, `supervisorEmployeeId?`, `teamIds[]?`, …
- **Team** — `companyId`, `name`, `slug`, `leaderEmployeeId`, `memberEmployeeIds[]`, `teamType?` (`builders` | `drivers` | `mixed` | `other`)
- **EmployeeLeaveYear** — éves szabadságkeret (`employeeId`, `year`, `entitlementDays`)
- **HrCompanyScope** — `userId` → `companyIds[]` (ha nincs `hr:scope_all`)
- **ScheduleEntry** — naptár események (`shift`, `off`, `training`, `field_work`, `other`); opcionális `locationLabel`, `locationAddress`, `sourceRef` (logisztika szinkron)
- **HrRequest** — szabadság / beteg / beosztás módosítás, jóváhagyási workflow
- **MonthlyWorkSummary** — havi óra, szabadság, betegnap, táppénz (HUF)

## Több cég / egy személy

Egy CRM felhasználó több **Employee** rekordot kaphat (egy cégenként). Minden rekord saját `ScheduleEntry`, `EmployeeLeaveYear`, `HrRequest`, `MonthlyWorkSummary`. A beosztás oldalon a cég szűrő korlátozza a dolgozó listát. Új céghez adás: `addEmployeeToAnotherCompany()` (`@crm/core`).

## Export oszlopok

`hr-{év}-{hónap}.xlsx`: Cég, Cég slug, Dolgozó, Dolgozói szám, Osztály, Év, Hónap, Éves szabadság keret, Maradék szabadság, Bér típus, Ledolgozott óra, Szabadság nap, Beteg nap, Táppénz (HUF), Bruttó bér (HUF), Megjegyzés.

## Kimutatások számítás

- **Szabadság / betegnap:** jóváhagyott `HrRequest` + beosztás `off` bejegyzések (cím alapján).
- **Ledolgozott óra:** `shift` bejegyzések a hónapban (részmunkaidőnél heti óra plafon).
- **Bruttó:** `hourly` → ledolgozott óra × órabér + táppénz; `monthly` → havi bruttó + táppénz.
- Mentett `MonthlyWorkSummary` felülírja a beosztásból javasolt havi értékeket.

## Repository

HR lekérdezések: `MonthlyWorkSummaryRepository`, `EmployeeLeaveYearRepository` (`packages/db/src/repositories/hr.ts`). Aggregáció: `buildMonthlyKimutatasRows` (`@crm/core`).

## Útvonalak

| Útvonal | Jog |
|---------|-----|
| `/accounting` | accounting / hr olvasás |
| `/accounting/companies` | `hr:write` |
| `/accounting/teams` | `hr:write` |
| `/accounting/employees` | `hr:read` |
| `/accounting/schedule` | `hr:read` |
| `/accounting/my-team/schedule` | Csapatvezető (linked Employee = `Team.leaderEmployeeId`) |
| `/accounting/requests` | `hr:read` |
| `/accounting/reports` | `hr:reports` |
| `/accounting/leave-summary` | `hr:reports` — szabadság összesítő + export |
| `/accounting/onboarding` | Meghívott dolgozó profil kitöltése |
| `/accounting/my` | Bejelentkezés + linked `Employee` (több cég: váltó) |

## Fiók + dolgozó egy lépésben

| Útvonal | Viselkedés |
|---------|------------|
| `/register` | Opcionális „Regisztráció dolgozóként” + cég → `User` + `Employee` (`userId` link) |
| `/admin/users/new` | HR/admin: fiók létrehozása dolgozói profillal (cég kötelező, ha be van pipálva) |
| `/admin/users/[id]` | Dolgozói profil szerkesztése / leválasztása |

Vendég dolgozó (nincs belépés): továbbra is `/accounting/employees` + későbbi **Meghívás**.

**Saját beosztás** (`/accounting/my`): Beállítások → Saját beosztás, ha van `Employee.userId` kapcsolat.

Domain logika: `packages/core/src/hr/`.
