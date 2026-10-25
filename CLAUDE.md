# Viltje – afspraken voor Claude Code

Viltje is een PWA die bij toepen de strepen bijhoudt (vervangt het bierviltje). Eén telefoon aan tafel houdt de score bij. Gratis, geen advertenties, geen account, geen server, geen tracking, geen externe scripts. Alles in het Nederlands.

## Kern uit de PRD

- Avond = reeks potjes; begint bij het eerste potje, sluit met "Avond klaar" of automatisch na 12 uur stilte. Een onafgemaakt potje telt niet.
- Potje: 2–8 spelers in tafelvolgorde. Instellingen per potje (laatst gebruikte = standaard): dood bij 5–30 (std 10), armoede tonen (std aan), rad voor het rondje (std uit).
- Stand = som van de strepen (+1/−1) van een speler in dat potje; nooit onder nul. Dood bij stand ≥ dood-bij. Arm bij stand = dood-bij − 1 (alleen tonen als de instelling aan staat). Eén speler over = winnaar, potje wordt automatisch opgeslagen.
- Ongedaan maken verwijdert de laatste streep; een afgelopen potje gaat dan weer verder.
- De app bewaakt de spelregels niet: de tafel beslist wie strepen krijgt. Geen vuile was.
- Rad: na het potje, wie eruit komt haalt het rondje. Gelijke kansen; optioneel weegt de verliezer (eerst dood) twee keer zo zwaar. Geluid standaard uit.
- Statistieken worden altijd uit de opgeslagen data berekend, nooit apart bewaard.
- Buiten scope: online spelen, accounts, sync, vuile was, advertenties.

## Techniek

- Vite + gewoon JavaScript (geen framework), Vitest, `vite-plugin-pwa` (registerType `prompt`: nooit automatisch herladen, toast "Nieuwe versie, tik om te herladen"), `idb` voor IndexedDB met localStorage als terugval.
- `base` komt uit `BASE_PATH` (workflow zet `/<reponaam>/`), lokaal standaard `/viltje/`.
- Deploy: `.github/workflows/deploy.yml` → bij push naar `main`: `npm ci`, tests, build, `actions/deploy-pages`. Falen de tests, dan gaat er niets live.

## Mappen

- `src/logic/` – pure logica zonder DOM of opslag (score, statistieken, rad, avond). Alles hier heeft unit tests.
- `src/data/` – `migratie.js` (schemaversie, export/import), `opslag.js` (IndexedDB/localStorage/geheugen), `store.js` (app-toestand en acties).
- `src/ui/` – één bestand per scherm (`spel`, `spelers`, `geschiedenis`, `statistieken`, `instellingen`) plus hulpjes (`dom`, `turf`, `rad`, `tips`, `wakelock`).
- `public/` – iconen en logo. PNG-iconen opnieuw maken met `npm run icons` (Playwright) uit `public/icon.svg` en `scripts/icon-maskable.svg`.
- `tests/` – Vitest; `store.test.js` gebruikt `fake-indexeddb`.

## Datamodel (schemaversie 1)

| Object | Velden |
| --- | --- |
| Speler | id, naam, kleur, emoji, aangemaakt, gearchiveerd? |
| Avond | id, start, einde, spelers |
| Potje | id, avond, spelers (tafelvolgorde), instellingen { doodBij, armoede, rad }, start, einde, winnaar, uitkomstRad |
| Streep | id, potje, speler, delta (+1/−1), tijdstip |
| Meta | sleutel 'meta', schemaversie, instellingen, verliezerZwaarder, radGeluid, minPotjes, tipsGezien |

Wijzig je het datamodel: verhoog `SCHEMA_VERSIE` in `src/data/migratie.js` en voeg een stap toe in `migreer()`, met test.

## Afspraken

- Code, namen en teksten in het Nederlands; houd de stijl van de bestaande code aan.
- Logica in `src/logic/` houden en testen; UI-bestanden dun.
- Knoppen op het scorebord minimaal 56 px; alles met één hand bedienbaar.
- Kleuren: rood `#9E2333`, karton `#E8D4B0`, bruin `#2B1A14`. Licht/donker volgt de telefoon.
- Geen externe scripts, fonts of trackers toevoegen.
- Voor elke push: `npm test` en `npm run build` moeten slagen.
