# HR (Phase 3+ — job-first + companies + leave balances)

People directory (one Employee row per company), leave/sick + annual entitlement matrix, dual schedule modes, and a shared calendar.

**Package:** `@crm/hr`  
**Models:** `Company`, `Employee`, `TimeOff`, `ScheduleEntry`, `EmployeeLeaveYear`, `ScheduleChangeRequest` in `@crm/db-core`

## Schedule modes

| `Employee.scheduleMode` | Work blocks | HR calendar edits |
|-------------------------|-------------|-------------------|
| `logistics` (default) | `kind=job` from logistics sync | Leave only |
| `roster` | `kind=shift` / `other` in HR | Create/edit/delete shifts; jobs still sync if assigned |

Job rows are never edited in HR. Hours = sum of `job` + `shift` windows in the month.

The HR calendar shows logistics jobs as the **event name**. Multiple crew roles (and pickup rounds) for the same employee on the same job merge into one block. Day view and taller week blocks also show the time window and role labels. Group day view uses one column per person.

## Multi-company (clean)

- `Company`: name, slug, isActive
- `Employee.companyId` required; unique `{ userId, companyId }` when linked
- Active self membership: `User.activeEmployeeId` (no cookie)
- HR filters: explicit `?companyId=`
- “Add to another company” clones contact into a new Employee row

## Permissions

| Key | Use |
|-----|-----|
| `hr:read` | People, calendar, leave, leave-summary, hours |
| `hr:write` | People/companies CRUD, roster shifts, leave approve, import, leave year |
| `hr:approve` | Approve leave / schedule-change (also via write) |
| `hr:self` | Legacy; `/hr/me` is available to any linked employee |

## Routes

| Path | Purpose |
|------|---------|
| `/hr` | Overview |
| `/hr/companies` | Company CRUD |
| `/hr/people` | Directory (company filter) |
| `/hr/people/[id]` | Profile + sibling memberships |
| `/hr/calendar` | react-big-calendar group/individual |
| `/hr/leave` | Requests approve/reject |
| `/hr/leave-summary` | Excel-shaped matrix |
| `/hr/leave-summary/import` | Workbook import |
| `/hr/hours` | Monthly hours |
| `/hr/me` | Self tasks/calendar/leave — no HR permission; linked employee profile only |

## Leave balances

`EmployeeLeaveYear.entitlementDays` − used approved leave days (TimeOff + `off` titled Szabadság) = remaining.

*Last updated: 2026-08.*
