# Viltje

**Strepen bijhouden bij toepen.** Viltje vervangt het bierviltje aan tafel: houd de strepen bij, zie wie arm of dood is en wie het potje wint, en bekijk over meerdere avonden wie de beste toeper is.

Gratis, zonder advertenties, zonder account. Werkt offline op Android en iPhone.

## Installeren op je telefoon

Open `https://vanoostveen.github.io/Viltje/` en kies:

- **Android (Chrome):** menu ⋮ → *Toevoegen aan startscherm* / *App installeren*.
- **iPhone (Safari, iOS 16.4+):** deelknop → *Zet op beginscherm*.

Daarna opent Viltje schermvullend met eigen icoon en werkt hij zonder internet.

## Ontwikkelen

```bash
npm install
npm run dev      # lokale server
npm test         # unit tests (Vitest)
npm run build    # productiebuild in dist/
```

Elke push naar `main` draait de tests, bouwt en publiceert via GitHub Pages (`.github/workflows/deploy.yml`). Eenmalig in de repo-instellingen: **Settings → Pages → Source: GitHub Actions**.

## Privacy

Viltje verzamelt niets. Er is geen account, geen tracking, geen advertenties en er gaan geen gegevens naar een server. Alles wordt alleen in de browser op je toestel bewaard en verlaat het toestel alleen als je zelf een back-up exporteert.
