---
title: Esemény szállítások
description: Igénylista, helyi összeállítás, átvételért és leadásért felelős dolgozó, csapat visszajelzés.
order: 33
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Eseményhez (pl. rendezvény) kellő tételek listája. Egy dolgozó felel az **átvételért**
(kiszedi a listát a raktár(ak)ból), egy dolgozó felel a **leadásért** (visszaellenőrzi, ami
megjött) — a kettő lehet ugyanaz a személy. Az egyéb csapattagok látják a listát, az
összeállítási útmutatókat, és írhatnak visszajelzést, de nem ők jelentik be az átvételt/leadást.

## Hol találod

- **Logisztika → Szállítások** (`/logistics/jobs`)
- **Új szállítás:** `/logistics/jobs/new`
- Saját feladat: a szállítás lapja, vagy **Általános → Saját feladataim** (`/hr/me`)

## Szükséges jogosultság

- Létrehozás, tételek szerkesztése, csapat kijelölése, ütemezés, törlés: logisztikai írás.
- Átvétel / leadás bejelentése, lista megtekintése, visszajelzés: az adott szállításhoz kijelölt
  dolgozó — **Saját feladataim**, külön logisztikai jogosultság nélkül.

## Lépésről lépésre

### 1. Új szállítás (három lépés)

1. **Alapadatok** — esemény neve, helyszín, átvétel / helyszíni / leadás időpontja.
2. **Tételek** — keresd ki a terméket, add meg a mennyiséget, jelöld **Kötelező** vagy
   **Opcionális**, és válaszd ki, melyik **raktárból** menjen (soronként eltérő raktár is
   lehet). Ha egy összeállítás (BOM) nem stimmel az eseményre, **Összeállítás szerkesztése
   ennél a szállításnál**: pl. 4 m cső helyett 2×2 m + toldó. Ez **nem** írja felül a
   katalógusban mentett összeállítást. **Új összeállítás a semmiből** — ha nincs kész termék,
   itt állítod össze a listát csak erre a szállításra.
3. **Csapat** — válaszd ki az **átvételért felelős** dolgozót. Ha a leadást más intézi,
   kapcsold ki a "ugyanő felel" jelölőt, és válaszd ki külön. Add hozzá az egyéb
   csapattagokat, és opcionálisan a járművet.

Mentés után a szállítás **Tervezet** állapotban jön létre — még nem kaptak róla e-mailt.

### 2. Ütemezés

A szállítás lapján **Ütemezés és értesítés** gomb — ez elküldi a listát e-mailben az
átvételért és a leadásért felelősnek, és bekerül a HR naptárukba. Ütemezés előtt még
szerkesztheted a listát; utána a lapon az átvétel/leadás bejelentése látszik.

### 3. Átvétel

Az átvételért felelős a saját feladatai közt vagy a szállítás lapján nyitja meg a listát,
raktáranként megjelölve, hova kell mennie. Tételenként beírja, mennyit szedett össze — ha
valamiből mást vagy máshogy vitt, egy megjegyzésben leírhatja, mi történt. Rögzítéskor a
készlet csökken a megadott raktár(ak)ban.

### 4. Leadás

A leadásért felelős (vagy ha nincs külön kijelölve, az átvételért felelős) a helyszín után
rögzíti, mi jött vissza — tételenként a mennyiséget és a cél raktárt (akár másikat is, mint
ahonnan indult). Ami nem jött vissza, azt a rendszer tartós terméknél hiányként számolja el.
Rögzítéskor a készlet visszakerül a megadott raktár(ak)ba, és a szállítás **Lezárva** állapotba
kerül.

### 5. Visszajelzés

Bárki, aki érintett a szállításban (átvétel, leadás, vagy egyéb csapattag), írhat
visszajelzést a lap alján — ez bármikor elérhető, az állapottól függetlenül.

## Tippek

- A jármű a szállításon csak egy egyszerű választás — nincs kapacitás- vagy foglalás-ellenőrzés.
- A lapon látszik, ha helyi összeállítás (BOM) van egy tételen.
- Ütemezés előtt (tervezet állapotban) a logisztikai jog szerkesztheti a tételeket; utána a
  listát csak az átvétel/leadás rögzítésekor lehet finomítani, megjegyzéssel.

## Kapcsolódó fejezetek

- [Járműflotta](/help/jarmuflotta)
- [Saját feladataim](/help/sajat-feladataim)
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Összeszerelések](/help/osszeszerelesek)

*Utolsó frissítés: 2026-08-24*
