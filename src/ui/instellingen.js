// Instellingen achter het tandwiel: rad, ranglijst, back-up, tips en privacy.
import { h, bevestig, toast, meervoud } from './dom.js';
import { schakelaar, resetSpelStaat } from './spel.js';
import { RAD_OPTIE_MAX } from '../logic/reducer.js';

export function instellingenScherm(store, app) {
  const m = store.meta;

  const bestand = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  bestand.addEventListener('change', async () => {
    const f = bestand.files?.[0];
    bestand.value = '';
    if (!f) return;
    try {
      const tekst = await f.text();
      const ok = await bevestig({
        titel: 'Back-up terugzetten?',
        tekst: 'Alle spelers, avonden en potjes op deze telefoon worden vervangen door die uit het bestand.',
        ok: 'Terugzetten',
        gevaar: true,
      });
      if (!ok) return;
      await store.importeer(tekst);
      resetSpelStaat();
      toast('Back-up teruggezet');
    } catch (e) {
      toast(e.message || 'Importeren mislukt', { duur: 5000 });
    }
  });

  const el = h('div', { class: 'scherm instellingen' },
    h('h2', null, 'Rad voor de verliezer'),
    h('p', { class: 'hint' }, 'Na het potje draait wie als eerste dood ging aan het rad. Zet het rad per potje aan bij het starten.'),
    h('div', { class: 'kaart instellingen-lijst' },
      m.radOpties.map((optie) =>
        h('div', { class: 'regel' },
          h('span', null, optie),
          h('button', {
            class: 'knop tekst klein',
            'aria-label': `${optie} verwijderen`,
            disabled: m.radOpties.length <= 1,
            onclick: () => store.radOptieVerwijderen(optie),
          }, 'Verwijderen'),
        ),
      ),
      schakelaar('Geluid bij het rad', m.radGeluid, (v) => store.zetMeta({ radGeluid: v })),
    ),
    radOptieFormulier(store),

    h('h2', null, 'Ranglijst'),
    h('div', { class: 'kaart instellingen-lijst' },
      h('div', { class: 'regel' },
        h('span', null, 'Minimaal aantal potjes'),
        h('div', { class: 'stepper' },
          h('button', { class: 'knop rond', 'aria-label': 'Minder', disabled: m.minPotjes <= 1, onclick: () => store.zetMeta({ minPotjes: m.minPotjes - 1 }) }, '−'),
          h('output', null, m.minPotjes),
          h('button', { class: 'knop rond', 'aria-label': 'Meer', disabled: m.minPotjes >= 50, onclick: () => store.zetMeta({ minPotjes: m.minPotjes + 1 }) }, '+'),
        ),
      ),
    ),

    h('h2', null, 'Back-up'),
    h('p', { class: 'hint' }, `Alles staat alleen op deze telefoon: ${meervoud(store.data.spelers.length, 'speler', 'spelers')}, ${meervoud(store.data.avonden.length, 'avond', 'avonden')}, ${meervoud(store.data.potjes.length, 'potje', 'potjes')}. Met een back-up zet je het over naar een andere telefoon.`),
    h('div', { class: 'knoppen-rij' },
      h('button', { class: 'knop', onclick: () => exporteer(store) }, 'Exporteren'),
      h('button', { class: 'knop', onclick: () => bestand.click() }, 'Importeren'),
      bestand,
    ),

    h('h2', null, 'Overig'),
    h('div', { class: 'knoppen-rij' },
      h('button', { class: 'knop', onclick: () => app.toonTips() }, 'Tips opnieuw bekijken'),
    ),

    h('h2', null, 'Privacy'),
    h('p', { class: 'privacy' },
      'Viltje verzamelt niets. Er is geen account, geen tracking, geen advertenties en er gaan geen gegevens naar een server. ',
      'Spelers, potjes en strepen worden alleen in de browser op dit toestel bewaard en verlaten het toestel alleen als jij zelf een back-up exporteert.'),
    h('p', { class: 'klein versie' }, `Viltje ${__VERSIE__}, opslag in ${app.opslagSoort}`),
  );
  return { el, sleutel: 'instellingen' };
}

function radOptieFormulier(store) {
  const input = h('input', { type: 'text', placeholder: 'Nieuwe opdracht', maxlength: String(RAD_OPTIE_MAX), enterkeyhint: 'done', autocomplete: 'off', 'aria-label': 'Nieuwe opdracht voor het rad', 'data-focus': 'rad-optie' });
  return h('form', {
    class: 'snel-toevoegen',
    onsubmit: async (e) => {
      e.preventDefault();
      const tekst = input.value.trim();
      if (!tekst) return input.focus();
      if (!(await store.radOptieToevoegen(tekst))) toast(`${tekst} staat al op het rad.`);
    },
  }, input, h('button', { class: 'knop', type: 'submit' }, 'Toevoegen'));
}

function exporteer(store) {
  const json = JSON.stringify(store.exporteer(), null, 2);
  const naam = `viltje-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: naam });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast(`Back-up opgeslagen als ${naam}`);
}
