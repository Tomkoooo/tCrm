---
title: Kimutatások
description: Szabadság összesítő és havi bér/óra kimutatások, export könyvelőnek.
order: 34
section: Könyvelés és HR
permissions:
  - hr:reports
---

# Kimutatások

## Hol található

Könyvelés → **Kimutatások** (`/accounting/leave-summary`).

A korábbi külön **Kimutatások** (`/accounting/reports`) útvonal ide irányít.

## Jogosultság

`hr:reports` (vagy `hr:write`)

## Két fül

A lap tetején:

- **Szabadság összesítő**
- **Havi bér és órák**

---

## Szabadság összesítő fül

- **Állandó dolgozók** / **Alkalmi munkavállalók** — váltó gombok a táblázat felett
- Táblázat: keresés, rendezés, oszlopválasztó, lapozás (ugyanaz a táblázat-kezelő, mint más listáknál, pl. termékek)
- **Éves keret** — soronként szerkeszthető (szám + ✓ mentés)
- Havi oszlopok: felhasznált napok **dátumokkal** (jóváhagyott kérelmek + beosztás „szabad” napjai)
- **Felhasznált** / **Maradék** napok
- Alkalmi fülön: TAJ, adóazonosító oszlopok
- Ugyanaz a személy **több cégnél** külön sorban jelenik meg
- **Összes cég** nézetben a táblázat **cégenként külön blokkban** jelenik meg (üres sorokkal elválasztva, mint az Excelben)
- **Nincs keret** figyelmeztetés, ha az éves keret még nincs beállítva — CRM fiók **nem szükséges**, elég a dolgozó rekord
- **Excel import** — `/accounting/leave-summary/import` — feltöltés, munkalap választás, név alapú párosítás

**Szűrők a táblázat felett:** év, export hónap, cég. **Excel import**, **Export hónap (XLSX)** / **Export év (XLSX)**.

Részletes lépések: [Szabadság összesítő](/help/szabadsag-osszesito).

---

## Havi bér és órák fül

- **Kártyás elrendezés** — dolgozónként egy kártya, összecsukható szerkesztővel
- **Éves szabadságkeret** és **maradék** minden kártyán
- **Szabadság / betegnap** — beosztásból és jóváhagyott kérelmekből (dátumokkal)
- **Ledolgozott óra** — műszakokból; **Mentés** után könyvelői értékre írható
- **Bér típus** és **bruttó becslés** — a kártya fejlécében, szerkesztés közben is frissül
- **Táppénz (HUF)** — külön mező
- **Beosztásból** — kitölti az óra / szabadság / betegnap mezőket; ezután **Mentés**
- **Összes cég** nézetben cégenként csoportos kártyák

**Szűrők:** év, hónap, cég. **XLSX export** — keret, maradék, bér típus, bruttó oszlopokkal.

A bér beállítása: [Dolgozók](/help/dolgozok) → adatlap → **Bérezés (kimutatások)**.

---

## Tipikus havi folyamat (könyvelő / HR)

1. **Kimutatások** → **Havi bér és órák**.
2. Év, hónap, cég kiválasztása.
3. Ellenőrizze a beosztásból jövő értékeket; **Beosztásból** gombbal kitöltés.
4. Szükség esetén módosítás → **Mentés** kártyánként.
5. **XLSX export** könyvelőnek.

Szabadság éves ellenőrzéshez: **Szabadság összesítő** fül, év + cég, **Export év**.

## Kapcsolódó

- [Dolgozók](/help/dolgozok)
- [Beosztás és kérelmek](/help/beosztas-es-kerelemek)
- [Szabadság összesítő](/help/szabadsag-osszesito)

*Utolsó frissítés: 2026-06*
