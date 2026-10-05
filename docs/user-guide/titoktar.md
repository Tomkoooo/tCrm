---
title: Titoktár
description: Titkosított kulcs–érték tárolás projektenként, megosztással.
order: 1
section: Titoktár
permissions:
  - secrets:read
  - secrets:write
  - secrets:delete
  - secrets:manage
---

## Hol találod

**Oldalsáv → Általános → Titoktár** (`/secrets`)

## Mire való

Ügyfél- vagy rendszerenkénti **titkok** (API kulcsok, jelszavak, banki adatok) biztonságos tárolása. Az értékek titkosítva vannak az adatbázisban; megtekintés és másolás csak kérésre történik.

## Lépések

1. Nyisd meg a **Titoktár** listát.
2. **Új projekt** — adj nevet (pl. ügyfél vagy rendszer), opcionális leírással.
3. Nyisd meg a projektet, majd **Új kulcs–érték pár**:
   - **Egysoros** — jelszó, token
   - **Többsoros** — hosszabb blokkok (cég-, bankadatok)
4. A táblázatban **Megjelenítés** / **Másolás** a titkosított értékhez.
5. Opcionálisan **Megosztás kezelése** — szerepkörök vagy konkrét felhasználók.

## Jogosultságok (röviden)

- Olvasás: `secrets:read`
- Létrehozás / szerkesztés: `secrets:write`
- Törlés: `secrets:delete`
- Minden projekt és megosztás: `secrets:manage`

*Utolsó frissítés: 2026-09*
