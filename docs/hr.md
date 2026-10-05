# HR (Phase 3+ — job-first + companies + leave balances)

People directory (one Employee row per company), leave/sick + annual entitlement matrix, dual schedule modes, and a shared calendar.

**Package:** `@crm/hr`  
**Models:** `Company`, `Employee`, `TimeOff`, `ScheduleEntry`, `EmployeeLeaveYear`, `ScheduleChangeRequest`, `SchedulePlan` in `@crm/db-core` (plus `MagicLink` for e-mail sign-in links)

## Schedule modes

| `Employee.scheduleMode` | Work blocks | HR calendar edits |
|-------------------------|-------------|-------------------|
| `logistics` (default) | `kind=job` from logistics sync | Leave only |
| `roster` | `kind=shift` / `other` in HR | Create/edit/delete shifts; jobs still sync if assigned |

Job rows are never edited in HR. Hours = sum of `job` + `shift` windows in the month.

The HR calendar shows logistics jobs as the **event name**. An employee's pickup/dropoff/crew role on a job is a single `ScheduleEntry`, so there's exactly one block per employee per job. Day view and taller week blocks also show the time window and role label. Group day view uses one column per person.

## Beosztás (schedule plans)

Replaces the hand-maintained Excel roster. A `SchedulePlan` owns a rectangle of
**days × employees** for one company.

| Piece | Detail |
|-------|--------|
| Cell | A real `ScheduleEntry` (`kind: 'shift'`) tagged `sourceRef = { module: 'hr', refType: 'plan', refId }` |
| Cell shorthand | `13:00 BOK` (start + location), location only = all-day, `-`/empty = not working |
| Shift length | `plan.defaultShiftMinutes` (default 480), overridable per cell |
| Day notes | `plan.dayNotes` — the Excel's event columns (“Atlétika Épül”) |
| Timezone | Day keys and times are Budapest wall-clock via `@crm/lib` `parseHrDateOnly` / `combineHrDayAndTime` |

Because cells are ordinary `ScheduleEntry` rows, the HR calendar, monthly hours and
leave summary pick plan shifts up with **no extra wiring**, and deleting a plan (or
dropping an employee column) removes its entries by that same `sourceRef` tag.

### Publishing

`publishSchedulePlan` mails each employee **their own column only** as an HTML table,
plus a magic sign-in link, calendar subscription links and a change-request pointer.
Mail failures never roll the publish back — each recipient is reported with a reason
so it can be re-sent. `publishCount` is bumped on every send so a resend is subject-
prefixed “Módosult”.

An employee is skipped when they have no e-mail, or no linked CRM user (no account to
sign in as). `describeUnreachableEmployees` surfaces this in the UI *before* sending.

### Magic links (`MagicLink`)

One-click sign-in from notification e-mails — `@crm/auth/magic-link` mints them and a
`magic-link` Credentials provider consumes them.

- The raw token lives only in the e-mail; the database stores a **SHA-256 hash**.
- **Multi-use until expiry (14 days)**, not single-use: mail clients and link scanners
  routinely pre-fetch URLs, and a strict single use would lock the recipient out of
  their own schedule. Every hit is counted and timestamped, and links are revocable.
- `/auth/magic` submits the token via a **form POST**, never a GET side effect, so a
  pre-fetch cannot silently create a session.
- `redirectTo` is sanitised to in-app relative paths (open-redirect guard).

### Calendar feeds (ICS)

`@crm/hr/ics` is a dependency-free RFC 5545 writer (UTC-only, CRLF, 75-octet folding
that never splits a multi-byte character).

| Route | Auth | Contents |
|-------|------|----------|
| `/api/calendar/[token].ics` | `Employee.calendarFeedToken` | Rolling −60/+365 day personal feed (plan shifts + jobs + leave), `REFRESH-INTERVAL` 60m |
| `/api/calendar/plan/[planId]/[token].ics` | same token, scoped to that plan | One plan's shifts for that employee |
| `/hr/schedules/[id]/export.ics` | `hr:schedule:read` | Whole plan, every employee |

Feeds are token-authenticated rather than session-authenticated because Google,
iCloud and Outlook fetch them without cookies. `SEQUENCE` is derived from
`updatedAt`, so edits update events in place rather than duplicating them.

### Change requests

An employee opens their shift at `/hr/me/schedule/[planId]` and proposes new times.

- Allowed on **plan-owned shifts regardless of `scheduleMode`** (roster-only shifts
  still require `roster` mode).
- Only on your own shift; only **one open request per shift**.
- Approval applies the new times to the `ScheduleEntry` **before** recording the
  decision, so a failure leaves the request pending rather than “approved but not applied”.
- Accept/decline carries a `reviewNote` that is e-mailed back to the employee.

### Mail templates

Seeded by `seedScheduleMailTemplates()` (`/setup`); editable at `/admin/mail-templates`.

| Key | To |
|-----|-----|
| `hr_schedule_plan_published` | Employee — table, magic login, calendar links |
| `hr_schedule_plan_change_requested` | Plan's publisher (falls back to creator) |
| `hr_schedule_plan_change_reviewed` | Employee — decision + feedback |

The legacy `hr_schedule_created/updated/deleted` keys from the pre-rebuild build are
deliberately left alone.

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
| `hr:schedule:read` | Beosztás list + grid (also satisfied by `hr:write`) |
| `hr:schedule:write` | Create/edit/publish beosztás; decide change requests (also satisfied by `hr:write`) |

> After deploying, run **Admin → Szerepkörök → Baseline jogosultságok szinkronizálása**
> once so `hr:schedule:*` lands on `admin`, then grant them to the `hr` role.

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
| `/hr/schedules` | Beosztás list |
| `/hr/schedules/new` | Create a plan (period + employee columns) |
| `/hr/schedules/[id]` | Planner grid + publish + change-request inbox |
| `/hr/me` | Self tasks/calendar/leave — no HR permission; linked employee profile only |
| `/hr/me/schedule/[planId]` | Own column of a plan + “Módosítást kérek” |

## Leave balances

`EmployeeLeaveYear.entitlementDays` − used approved leave days (TimeOff + `off` titled Szabadság) = remaining.

*Last updated: 2026-10 (beosztás manager: plans, magic links, ICS feeds, change requests).*
