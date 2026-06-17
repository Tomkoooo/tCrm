---
title: Csapatok és vezetői beosztás
description: HR csapatok, építőcsapat-vezetők és csapattagok beosztása.
order: 42
section: Könyvelés és HR
permissions:
  - hr:write
  - hr:read
  - hr:self
---

# Csapatok és vezetői beosztás

## Mire való

Építő- vagy szállítócsapatok rögzítése cégenként, **csapatvezető** (builder manager) kijelölése, és a vezető által kezelt **csapattagok beosztása** — teljes HR jog (`hr:write`) nélkül.

## Hol találod

| Menü / útvonal | Ki |
|----------------|-----|
| **Csapatok** → `/accounting/teams` | HR (`hr:write`) |
| **Csapatom beosztása** → `/accounting/my-team/schedule` | Csapatvezető (Beállítások alatt) |
| Dolgozó adatlap → Csapatok szekció | HR olvasás |

## Szükséges jogosultság

| Tevékenység | Jog / feltétel |
|-------------|----------------|
| Csapat létrehozás, szerkesztés | `hr:write` |
| Csapattagok beosztása | Csapat **vezetője** (CRM fiók összekötve a vezető dolgozói rekorddal) |
| Szabadság / beteg kérelem jóváhagyása | továbbra is `hr:approve` — **nem** a csapatvezető |

---

## Csapat létrehozása (HR)

1. **Könyvelés és HR → Csapatok**
2. **Új csapat**
3. Válassza a **céget**, adja meg a **nevet** és **slug**-ot
4. Jelölje ki a **csapatvezetőt** (dolgozói rekord)
5. Pipálja be a **csapattagokat**
6. Opcionális **típus**: Építőcsapat, Sofőrök, Vegyes
7. **Létrehozás**

## Csapatvezetői beosztás

1. A vezetőnek legyen **CRM fiókja**, összekötve a megfelelő dolgozói rekorddal
2. **Beállítások → Csapatom beosztása**
3. Ugyanaz a naptár, mint a HR beosztásnál — csak a **saját csapat tagjai** szerkeszthetők
4. **Új bejegyzés** vagy **Tömeges műszak** — opcionális **helyszín címke** és **cím**

## Logisztika és helyszíni munka

Ha egy szállítási feladat **ütemezve** van és van **tervezett időpont** (összeszedés / helyszín), a rendszer a csapattagok **Saját beosztás** naptárába **Helyszíni munka** (`field_work`) bejegyzést hoz létre — ha a felhasználóhoz tartozik dolgozói rekord.

## E-mail értesítések

- Dolgozó kap e-mailt új / módosított / törölt beosztásról (ha van e-mail cím)
- HR kap értesítést új kérelem beküldésekor

---

*Utolsó frissítés: 2026-06*
