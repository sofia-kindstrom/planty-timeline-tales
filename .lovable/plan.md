
# Min Växtdagbok – plan

En personlig webbapp (fungerar utmärkt på iPhone via Safari, kan läggas till på hemskärmen som ikon) där du loggar dina krukväxter och deras skötsel på en horisontell tidslinje.

## Funktionalitet

1. **Galleri** – startsida med rutnät av alla växter (bild + namn + rum). "+"-knapp för att lägga till ny växt.
2. **Växtsida** – egen sida per växt med stor bild, info (namn, art, rum, vattningsintervall, ljusbehov, anskaffningsdatum, anteckningar) och tidslinje under.
3. **Horisontell tidslinje** – swipe-bar vänster/höger, varje händelse är ett kort med datum, bild (valfritt), och fritext-anteckning. Senaste händelser till höger.
4. **Lägga till händelse** – "+"-knapp på växtsidan öppnar formulär: datum (default idag), kort etikett (t.ex. "Vattnad"), fritext, valfri bild.
5. **Redigera/historik** – tryck på ett tidslinjekort för att redigera datum, text eller bild – även för händelser bakåt i tiden. Radera-knapp finns.

## Design

- Sage & Cream-paletten (mjukt grönt + krämvit), lugn botanisk känsla
- Stora avrundade bildkort, mycket luft, rena typsnitt
- iPhone-optimerad: stora touch-mål, swipe-vänlig tidslinje, bottenfast "+"-knapp
- Kan installeras som "Lägg till på hemskärmen" i Safari för app-känsla

## Teknik (för sammanhang)

- **Lovable Cloud** för databas + bildlagring (synkar mellan enheter, säker backup)
- Ingen inloggning – appen är personlig och öppen direkt. Eftersom det bara är du som använder den låser vi åtkomst genom att hålla URL:en privat och inte publicera ut den brett.
- Två tabeller: `plants` (växtinfo) och `plant_events` (tidslinjehändelser kopplade till en växt)
- En storage-bucket för bilder (växtfoton + händelsefoton)
- React + TanStack Router, två huvudrouter: `/` (galleri) och `/plant/$id` (växtsida med tidslinje)

## Steg vid implementation

1. Aktivera Lovable Cloud, skapa tabeller och bild-bucket
2. Designsystem: lägg in Sage & Cream-tokens i `src/styles.css`
3. Galleri-sida med lista + "Lägg till växt"-dialog
4. Växtsida med info-header + redigerbar info
5. Horisontell scroll-tidslinje
6. Dialog för att lägga till / redigera / radera händelser (inkl. datumväljare för bakåt i tiden)
7. Bilduppladdning från iPhone (kamera eller bibliotek)

## Vad du behöver göra

Inget innan vi börjar. När appen är klar: öppna preview-länken i Safari på iPhone → Dela-knappen → "Lägg till på hemskärmen" så får du en ikon som öppnar appen i fullskärm.

Säg till om jag ska börja bygga.
