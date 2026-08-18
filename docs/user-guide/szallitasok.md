---
title: Esemény szállítások
description: Igénylista, helyi összeállítás, automatikus átvételi körök, építőcsapat szerepek, helyszíni checklist.
order: 33
section: Logisztika
permissions:
  - logistics:read
---

## Mire való

Eseményhez (pl. rendezvény) kellő tételek listája, majd a rendszer által javasolt raktári körök. Az átvétel és a leadás az **építőcsapat** feladata — nincs külön raktáros szerep.

## Hol találod

- **Logisztika → Szállítások** (`/logistics/jobs`)
- **Új szállítás:** `/logistics/jobs/new`
- Helyszíni checklist: a feladat lapja, vagy **Általános → Saját feladataim** (`/hr/me`)

## Szükséges jogosultság

- Terv készítése, körök javaslata, zárolás: logisztikai írás
- Checklist (átvétel / sofőr / építés / leadás): a csapatba kinevezett dolgozó, CRM fiókkal — **Saját feladataim**, külön HR jogosultság nélkül.

## Lépésről lépésre

### 1. Új szállítás (négy lépés)

1. **Alapadatok** — esemény neve, helyszín, összeszedés / helyszín / visszaérkezés ideje.
2. **Tételek** — keresd ki a terméket; a kiválasztott név a keresőmezőben marad. Add meg a mennyiséget, jelöld **Kötelező** vagy **Opcionális**, majd **Hozzáadás a listához**. A sorokon látszik, van-e elég készlet, vagy mi hiányzik.
3. Ha egy készlet (BOM) nem stimmel az eseményre, **Összeállítás szerkesztése ennél a szállításnál**: pl. 4 m cső helyett 2×2 m + toldó. Írd be a **Csere / megjegyzés a csapatnak** mezőt. Ez **nem** írja felül a katalógusban mentett összeállítást.
4. **Új összeállítás a semmiből** — ha nincs kész termék, itt állítod össze a listát csak erre a szállításra.
5. **Csapat** — válaszd ki az építőcsapatot, és jelöld a szerepeket. Pontosan egy **építésvezető** kell. Ugyanaz a személy viselhet több sapkát (pl. sofőr + átvétel).
6. **Átvételi körök** — a rendszer raktáranként összerakja a köröket. Raktár, jármű és mennyiség még itt módosítható. A készletjelzés a **kiválasztott raktár** szerint frissül (ha másik raktárban nincs készlet, azonnal látszik). **Újrajavaslat**, ha a lista változott.
7. **Mentés tervezetként.**

### 2. Zárolás (ha a körök a lapon készültek)

1. Ha mentéskor még nem volt kör, a lapon **Körök javaslata**.
2. Ha a javasolt jármű foglalt, cseréld. A figyelmeztetés nem blokkolja a tervet.
3. **Terv zárolása** — készletfoglalás, járműfoglalás, naptár. Ettől kezdve a csapat látja a checklistet.

### 3. Helyszínen (pipák)

| Szerep | Mit pipál |
|--------|-----------|
| Átvétel | Raktárban: mi került a kocsira (készlet csökken). Ami előző eseményről jött, az már a kocsin van |
| Sofőr | Felrakva / elindultunk, majd megérkeztünk |
| Építő | Telepítés (opcionális mennyiség + hely) |
| Leadás | Visszaérkezett tételek: cél **raktár** (akár másik, mint ahonnan indult) vagy **következő esemény**; tartós hiánynál különbözet |
| Építésvezető | Több tétel kérése, esemény-visszajelzés |

A **Cserék a csapatnak** szöveg a lapon és a munkafolyamatnál is megjelenik, ha a logisztika helyi összeállítást adott meg.

Bontáskor a leadásnál tételenként megadható, hova kerül a darab:

- **Raktár** — a kiindulási raktártól eltérő raktár is lehet (a készlet oda nő).
- **Következő esemény** — a tétel nem megy raktárba, hanem a kiválasztott szállításra kerül (a következő körben nem szedik újra a raktárból).

### 4. Következő alkalom

A lapon látszik az **eredeti lista**, a **változások** (elfogadott kérések) és a **visszajelzés**.

## Tippek

- A járműnek nincs GPS-e: a foglalás időablak, a „hol van” csak raktár / helyszín / ismeretlen.
- Zárolás után a tételkérést az építésvezető küldi, a logisztika fogadja el vagy utasítja el.
- Az **opcionális** tételek a checklisten külön csoportban vannak, alapból nincs pipálva.
- A lapon és a listán látszik, ha helyi összeállítás (BOM) van, és ha a kiválasztott raktárban hiány van.

## Kapcsolódó fejezetek

- [Járműflotta](/help/jarmuflotta)
- [Saját feladataim](/help/sajat-feladataim)
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Összeszerelések](/help/osszeszerelesek)

*Utolsó frissítés: 2026-08*
