---
title: Beosztások
description: Beosztás összeállítása rácsban, kiküldése e-mailben, naptár-feliratkozás és módosítási kérelmek.
order: 41
section: HR
permissions:
  - hr:schedule:read
  - hr:schedule:write
  - hr:write
---

## Hol találod

**Oldalsáv → HR → Beosztások** (`/hr/schedules`)

Ez váltja ki a kézzel vezetett Excel beosztást: itt állítod össze, innen megy ki
e-mailben, és a dolgozók innen kérnek módosítást.

## Új beosztás létrehozása

1. **Új beosztás** gomb.
2. Adj **megnevezést** (pl. „2026. október — Eseménycsapat”), válaszd ki a **céget**
   és az **időszakot** (első és utolsó nap).
3. Pipáld ki a **dolgozókat** — ők lesznek a rács oszlopai.
4. A **műszak alapértelmezett hossza** (perc) határozza meg, meddig tart egy cella;
   alapból 8 óra. Cellánként felülírható.
5. A **megjegyzés** szövege bekerül a kiküldött e-mailbe.

> Ha egy kiválasztott dolgozónál nincs e-mail cím vagy nincs összekapcsolt CRM fiók,
> figyelmeztetést kapsz. Beosztani ettől még lehet — csak értesítést nem kap.

## A rács kitöltése

Sorok = napok, oszlopok = dolgozók. A hétvégék háttérrel elkülönülnek.

| Amit beírsz | Mit jelent |
|-------------|------------|
| `13:00 BOK` | 13:00-kor kezd a BOK-ban |
| `8:00 Kispest` | 8:00-kor kezd Kispesten |
| `9:00` | 9:00-kor kezd, helyszín nincs megadva |
| `Remiz` | egész napos, helyszín Remiz |
| `-` vagy üres | aznap nem dolgozik |

A mentés akkor történik, amikor **kilépsz a cellából** (Tab vagy kattintás máshova).
**Enter** is menti, **Esc** visszaállítja az eredeti értéket.

Az **Esemény** oszlopba a nap közös eseménye megy (pl. „Atlétika Épül”). Több esemény
elválasztása: `·`. Ez minden dolgozó e-mailjében megjelenik.

### Tömeges kitöltés

A **Tömeges kitöltés** gombbal egy értéket viszel fel egy **dolgozó teljes oszlopára**
vagy **egy nap minden dolgozójára**. A *Csak az üres cellákat írja át* pipával a már
kitöltött cellák érintetlenül maradnak.

## Kiküldés

A **Kiküldés e-mailben** gombbal mindenki **a saját oszlopát** kapja meg táblázatként.
A levél tartalmaz:

- a teljes időszakot naponta (a szabadnapokat `—` jelöli), a napi eseményekkel,
- egy **belépési gombot**, amivel jelszó nélkül, egy kattintással belép és egyből a
  beosztásán landol,
- **naptár-feliratkozást** (Google / iCloud / Outlook) és egyszeri **.ics letöltést**,
- linket a **módosítási kérelemhez**.

A kiküldés ablakban kiveheted a címzettek közül, akinek nem akarsz most küldeni, és
beállíthatod, hogy ne menjen levél annak, akinek nincs műszakja az időszakban.
Kiküldés után látod, kinek ment el és ki maradt ki — és miért.

Módosítás után az **Újraküldés** gomb ugyanide küld új levelet, „Módosult beosztás”
tárggyal.

> A belépési link **személyes** és 14 napig érvényes. Kérd meg a dolgozókat, hogy ne
> továbbítsák — aki megkapja, a nevükben lép be.

## Módosítási kérelmek

A dolgozó a saját beosztásán a **Módosítást kérek** gombbal javasol új időpontot,
opcionális indoklással. Egy műszakra egyszerre egy kérelem lehet nyitva.

Te a beosztás **Módosítási kérelmek** fülén látod ezeket (a fülön a függő kérelmek
száma is megjelenik):

- **Elfogadás** — a műszak átáll a javasolt időpontra, és a dolgozó e-mailt kap.
- **Elutasítás** — a műszak marad, a dolgozó e-mailt kap.

Mindkét esetben írhatsz **visszajelzést**, ami bekerül a dolgozónak menő levélbe.

## Naptár

- **Naptár (.ics)** a beosztás fejlécében: a teljes beosztás minden dolgozóval, egy fájlban.
- A dolgozó a saját oldalán **feliratkozhat** — a naptára ezután automatikusan követi a
  módosításokat, külön letöltés nélkül.

## Jogosultságok

| Kulcs | Mit enged |
|-------|-----------|
| `hr:schedule:read` | Beosztások megtekintése |
| `hr:schedule:write` | Létrehozás, szerkesztés, kiküldés, kérelmek elbírálása |

A `hr:write` jogosultság mindkettőt magában foglalja. Új telepítés után futtasd egyszer
az **Adminisztráció → Szerepkörök → Baseline jogosultságok szinkronizálása** gombot.

## Kapcsolódó fejezetek

- [Saját feladataim](/help/sajat-feladataim)
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Dolgozók](/help/dolgozok)

*Utolsó frissítés: 2026-10*
