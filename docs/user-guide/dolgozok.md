---
title: Dolgozók
description: Dolgozói rekordok, CRM fiók összekötése, több cég, bérezés.
order: 32
section: Könyvelés és HR
permissions:
  - hr:read
---

# Dolgozók

## Hol található

Könyvelés → **Dolgozók** (`/accounting/employees`).

## Jogosultság

| Művelet | Jog |
|---------|-----|
| Lista, részletek | `hr:read` |
| Új dolgozó, szerkesztés, fiók összekötés, másik céghez adás | `hr:write` |

## Új dolgozó

1. A listán: **Új dolgozó**.
2. Kötelező: **Cég**, **Név**. Ajánlott: **E-mail** (fiók összekötéshez / meghívóhoz).
3. **Mentés** — kezdetben a lista **CRM fiók** oszlopában „Nincs fiók" látszik.

## Státusz ≠ CRM fiók

Az adatlap **Státusz** mezője (Külsős / Alkalmazott) **csak címkézés** — HR nyilvántartáshoz, nem ad belépést.

A dolgozó csak akkor látja a **Saját beosztás** oldalt, ha a dolgozó részleteknél a **CRM belépés** szekcióban **„Fiók összekötve"** látszik — ehhez **Fiók összekötése** vagy **Meghívó / új fiók** szükséges.

---

## Meglévő dolgozó + meglévő CRM fiók összekötése

**Cél:** a személy bejelentkezés után lássa a műszakjait a **Saját beosztás** oldalon.

**Szükséges:** `hr:write`, a dolgozónál még **nincs** összekötött fiók.

1. Nyissa meg a dolgozó **részleteit** (kattintás a sorra) — a **megfelelő cég** rekordját, ha több cégnél is dolgozik.
2. Ellenőrizze a **CRM belépés** szekciót: **„Nincs CRM fiók"** látszik.
3. Kattintson **Fiók összekötése**.

**A) Gyors összekötés e-mail alapján**

- A dolgozó **E-mail** mezője legyen kitöltve, és **ugyanaz** legyen, mint a CRM felhasználó e-mailje.
- A panelen: **Összekötés e-mail alapján**.

**B) Keresés név vagy e-mail alapján**

1. Írjon be **nevet vagy e-mailt** (legalább 2 karakter) → **Keresés**.
2. Válassza ki a listából a felhasználót.
3. **Összekötés**.

Siker után: a **CRM belépés** szekció **„Fiók összekötve"**-ra vált, a listán **CRM fiók** oszlopban **„Összekötve"**. A felhasználó az **employee** szerepkört kapja (saját beosztás, kérelmek).

### Tömeges összekötés

A dolgozók listán: **E-mail egyezés összekötése** — minden fiók nélküli dolgozót megpróbál összekötni, ahol az e-mail megegyezik egy CRM felhasználóval.

### Új CRM felhasználó (még nincs fiók)

**Meghívó / új fiók** — e-mail meghívó vagy jelszavas létrehozás. Ez **új** belépést hoz létre; ne használja, ha a személy **már** be tud lépni a CRM-be.

### Fiók leválasztása

Ha már össze van kötve: a **CRM belépés** szekcióban **Fiók leválasztása** gomb. A dolgozói rekord megmarad, de a belépés nem látja többé ezt a rekordot.

---

## Több cég — egy személy

Egy személy **cégenként külön dolgozói rekord**. Mindegyiknek saját beosztása, éves szabadságkerete és kimutatása van. **Egy CRM fiók** mindegyikhez tartozhat.

### Új cég hozzáadása (ajánlott)

1. Nyissa meg a dolgozó rekordját az **első cégben** (ideálisan már **összekötött fiókkal**).
2. **Másik céghez adás** → válassza a céget → **Hozzáadás a céghez**.
3. Létrejön egy **új rekord** a másik cégben; ha az első már össze volt kötve, az **új rekord automatikusan ugyanazt a fiókot** kapja.
4. A **Más cégek** blokkban linkkel ugrhat a többi rekordra.

### Már két külön rekord van (mindkét cégben)

**Ne törölje** a rekordokat — elveszne a beosztás és kimutatás.

1. **Fiók összekötése** az **első** rekordon (e-mail vagy keresés).
2. **Fiók összekötése** a **második** rekordon is — **ugyanazt a felhasználót** válassza ki.

Ha csak az egyik rekordon van fiók, a dolgozó a **Saját beosztás** oldalon csak azt a céget látja, amíg a másik rekordot is össze nem kötik.

### Mit ne csináljon

| Helyzet | Teendő |
|---------|--------|
| Két rekord, két különböző cég | Megtartani mindkettőt; fiókot mindkettőhöz kötni |
| Két rekord **ugyanabban** a cégben (duplikátum) | HR egyeztetés után az egyik inaktiválása/törlése |
| „Újra felvenni" másik céghez adás helyett | Felesleges — használja **Másik céghez adás** |

---

## Bérezés (kimutatásokhoz)

A dolgozó adatlap **Bérezés (kimutatások)** szekciójában:

- **Bér típus:** havi bruttó vagy órabér
- **Havi bruttó (HUF)** / **Órabér (HUF)**

Ezek a **Kimutatások → Havi bér és órák** fül bruttó oszlopához kellenek. Részletek: [Kimutatások](/help/kimutatasok).

## Lista oszlopok

- **CRM fiók:** „Összekötve" vagy „Nincs fiók"
- **Státusz:** „Alkalmazott" vagy „Külsős"
- **Cég:** melyik céghez tartozik a rekord

## Kapcsolódó

- [Saját beosztás](/help/sajat-beosztas) — mit lát a dolgozó összekötés után
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Kimutatások](/help/kimutatasok)

*Utolsó frissítés: 2026-06*
