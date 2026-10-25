# Viltje – afspraken voor Claude Code

Viltje is een PWA die bij toepen de strepen bijhoudt (vervangt het bierviltje). Eén telefoon aan tafel houdt de score bij. Gratis, geen advertenties, geen account, geen server, geen tracking, geen externe scripts. Alles in het Nederlands.

## Kern uit de PRD

- Avond = reeks potjes; begint bij het eerste potje, sluit met "Avond klaar" of automatisch na 12 uur stilte. Een onafgemaakt potje telt niet.
- Potje: 2–8 spelers in tafelvolgorde. Instellingen per potje (laatst gebruikte = standaard): dood bij 5–30 (std 10), armoede tonen (std aan), rad voor het rondje (std uit).
- Stand = som van de strepen (+1/−1) van een speler in dat potje; nooit onder nul. Dood bij stand ≥ dood-bij. Arm bij stand = dood-bij − 1 (alleen tonen als de instelling aan staat). Eén speler over = winnaar, potje wordt automatisch opgeslagen.
- Laf: een speler die niet meegaat met een toep krijgt een laf-tik. Twee keer per potje mag, de derde keer niet. Alleen een teller; telt niet als streep. Statistieken tonen het laffe spelersklassement.
- Ongedaan maken verwijdert de laatste actie (streep of laf); een afgelopen potje gaat dan weer verder.
- De app bewaakt de spelregels niet: de tafel beslist wie strepen krijgt. Geen vuile was.
- Rad voor de verliezer: na het potje draait de verliezer (wie als eerste dood ging) een opdracht. Standaard alleen "Adtje"; eigen opdrachten toevoegen in Instellingen (bewaard in meta en in de back-up). Altijd minstens één opdracht. Geluid standaard uit.
- Statistieken worden altijd uit de opgeslagen data berekend, nooit apart bewaard.
- Buiten scope: online spelen, accounts, sync, vuile was, advertenties.

## Techniek

- Vite + gewoon JavaScript (geen framework), Vitest, `vite-plugin-pwa` (registerType `prompt`: nooit automatisch herladen, toast "Nieuwe versie, tik om te herladen"), `idb` voor IndexedDB met localStorage als terugval.
- `base` komt uit `BASE_PATH` (workflow zet `/<reponaam>/`), lokaal standaard `/viltje/`.
- Deploy: `.github/workflows/deploy.yml` → bij push naar `main`: `npm ci`, tests, build, `actions/deploy-pages`. Falen de tests, dan gaat er niets live.

## Reducer

Alle wijzigingen aan de data gaan via `reducer(toestand, actie)` in `src/logic/reducer.js`. De reducer is puur: geen DOM, opslag, klok of toeval (ids en tijdstippen zitten in de actie). Een actie die niet mag (streep in een afgelopen potje, derde keer laf, min onder nul, ongeldige instellingen) geeft dezelfde toestand terug. Objecten worden vervangen, nooit aangepast. `store.js` maakt acties, stuurt ze door de reducer en schrijft met `verschil()` precies de gewijzigde objecten in één transactie naar de opslag. Nieuwe functionaliteit = nieuwe actie in de reducer, met test in `tests/reducer.test.js`.

Acties: `meta/gezet`, `speler/toegevoegd`, `speler/gewijzigd`, `speler/verwijderd`, `potje/gestart`, `streep/gezet`, `laf/gezet`, `ongedaan`, `rad/uitkomst`, `rad/optie-toegevoegd`, `rad/optie-verwijderd`, `potje/verwijderd`, `avond/klaar`, `avonden/verlopen`, `data/vervangen`.

## Mappen

- `src/logic/` – pure logica zonder DOM of opslag (reducer, score, statistieken, rad, avond). Alles hier heeft unit tests.
- `src/data/` – `migratie.js` (schemaversie, export/import), `opslag.js` (IndexedDB/localStorage/geheugen, `verschil`), `store.js` (toestand, acties maken, opslaan).
- `src/ui/` – één bestand per scherm (`spel`, `spelers`, `geschiedenis`, `statistieken`, `instellingen`) plus hulpjes (`dom`, `turf`, `rad`, `tips`, `wakelock`).
- `public/` – iconen en logo. PNG-iconen opnieuw maken met `npm run icons` (Playwright) uit `public/icon.svg` en `scripts/icon-maskable.svg`.
- `tests/` – Vitest; `store.test.js` gebruikt `fake-indexeddb`.

## Datamodel (schemaversie 2)

| Object | Velden |
| --- | --- |
| Speler | id, naam, kleur, emoji, aangemaakt, gearchiveerd? |
| Avond | id, start, einde, spelers |
| Potje | id, avond, spelers (tafelvolgorde), instellingen { doodBij, armoede, rad }, start, einde, winnaar, uitkomstRad |
| Streep | id, potje, speler, soort ('streep' of 'laf'), delta (+1/−1; laf altijd +1), tijdstip |
| Meta | sleutel 'meta', schemaversie, instellingen, radOpties, radGeluid, minPotjes, tipsGezien |

Potje.uitkomstRad is de gedraaide opdracht (tekst).

Wijzig je het datamodel: verhoog `SCHEMA_VERSIE` in `src/data/migratie.js` en voeg een stap toe in `migreer()`, met test.

## Afspraken

- Code, namen en teksten in het Nederlands; houd de stijl van de bestaande code aan.
- Logica in `src/logic/` houden en testen; UI-bestanden dun.
- Knoppen op het scorebord minimaal 56 px; alles met één hand bedienbaar.
- Kleuren: rood `#9E2333`, karton `#E8D4B0`, bruin `#2B1A14`. Licht/donker volgt de telefoon.
- Design: geen woorden in hoofdletters (geen `text-transform: uppercase`), geen eyebrows (kleine labels boven koppen), geen middenhoge punten (·) als scheidingsteken; gebruik komma's of aparte elementen.
- Geen externe scripts, fonts of trackers toevoegen.
- Voor elke push: `npm test` en `npm run build` moeten slagen.
