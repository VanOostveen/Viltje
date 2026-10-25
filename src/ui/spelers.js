// Tabblad Spelers: vaste spelerslijst met naam en kleur of emoji.
import { KLEUREN } from '../data/store.js';
import { h, avatar, dialoog, toast, meervoud } from './dom.js';

const EMOJI = ['🍺', '🃏', '👑', '🎩', '🦊', '🐻', '🐸', '🌶️', '🔥', '🍀', '⚓', '🚜'];

// Wat er getypt is blijft bewaard als het scherm opnieuw getekend wordt.
let concept = '';

/** Klein invoerveld om snel een speler toe te voegen (ook midden in een avond). */
export function nieuweSpelerFormulier(store, opToegevoegd) {
  const input = h('input', { type: 'text', value: concept, placeholder: 'Nieuwe speler', maxlength: '20', enterkeyhint: 'done', autocomplete: 'off', 'aria-label': 'Naam nieuwe speler', 'data-focus': 'nieuwe-speler' });
  input.addEventListener('input', () => (concept = input.value));
  return h('form', {
    class: 'snel-toevoegen',
    onsubmit: async (e) => {
      e.preventDefault();
      const naam = input.value.trim();
      if (!naam) return input.focus();
      if (bestaat(store, naam)) return toast(`${naam} staat al in de lijst.`);
      concept = '';
      input.value = '';
      const s = await store.spelerToevoegen({ naam });
      opToegevoegd?.(s);
    },
  }, input, h('button', { class: 'knop', type: 'submit' }, 'Toevoegen'));
}

function bestaat(store, naam, behalve) {
  const n = naam.trim().toLocaleLowerCase('nl');
  return store.actieveSpelers().some((s) => s.id !== behalve && s.naam.toLocaleLowerCase('nl') === n);
}

/**
 * Haalt een speler direct weg, met terugzetten via de melding. Wie al potjes
 * speelde blijft in de geschiedenis en statistieken staan.
 */
export async function weghalen(store, speler) {
  await store.spelerVerwijderen(speler.id);
  toast(`${speler.naam} weggehaald. Tik om terug te zetten.`, {
    duur: 5000,
    opKlik: async () => {
      document.querySelector('.toast')?.remove();
      if (!(await store.spelerTerugzetten(speler))) toast(`Er is al een ${speler.naam}.`);
    },
  });
}

function bewerk(store, speler) {
  const nieuw = !speler;
  const keuze = { kleur: speler?.kleur ?? KLEUREN[store.data.spelers.length % KLEUREN.length], emoji: speler?.emoji ?? '' };

  return dialoog((sluit) => {
    const naam = h('input', { type: 'text', value: speler?.naam ?? '', maxlength: '20', required: true, autocomplete: 'off', 'aria-label': 'Naam' });
    const emoji = h('input', { type: 'text', value: keuze.emoji, maxlength: '4', placeholder: 'Emoji (mag leeg)', 'aria-label': 'Emoji' });
    const voorbeeld = h('div', { class: 'voorbeeld' });
    const tekenVoorbeeld = () =>
      voorbeeld.replaceChildren(avatar({ naam: naam.value || '?', kleur: keuze.kleur, emoji: emoji.value.trim() }, true));
    naam.addEventListener('input', tekenVoorbeeld);
    emoji.addEventListener('input', tekenVoorbeeld);

    const kleuren = h('div', { class: 'kleuren', role: 'radiogroup', 'aria-label': 'Kleur' },
      KLEUREN.map((k) => {
        const knop = h('button', {
          type: 'button', class: 'kleur', style: `--kleur:${k}`, role: 'radio', 'aria-label': k,
          'aria-checked': String(k === keuze.kleur),
          onclick: () => {
            keuze.kleur = k;
            kleuren.querySelectorAll('.kleur').forEach((b) => b.setAttribute('aria-checked', String(b === knop)));
            tekenVoorbeeld();
          },
        });
        return knop;
      }),
    );
    const emojis = h('div', { class: 'emojis' },
      EMOJI.map((e) => h('button', { type: 'button', class: 'emoji-knop', onclick: () => { emoji.value = e; tekenVoorbeeld(); } }, e)),
    );
    tekenVoorbeeld();

    const verwijder = !nieuw &&
      h('button', {
        type: 'button', class: 'knop gevaar tekst',
        onclick: () => {
          sluit(true);
          weghalen(store, speler);
        },
      }, 'Weghalen');

    return h('form', {
      class: 'dialoog-inhoud',
      onsubmit: async (e) => {
        e.preventDefault();
        if (!naam.value.trim()) return naam.focus();
        if (bestaat(store, naam.value, speler?.id)) return toast(`${naam.value.trim()} staat al in de lijst.`);
        const gegevens = { naam: naam.value, kleur: keuze.kleur, emoji: emoji.value.trim() };
        if (nieuw) await store.spelerToevoegen(gegevens);
        else await store.spelerWijzigen(speler.id, gegevens);
        sluit(true);
      },
    },
    h('h2', null, nieuw ? 'Nieuwe speler' : 'Speler bewerken'),
    voorbeeld,
    h('label', { class: 'veld' }, h('span', null, 'Naam'), naam),
    h('div', { class: 'veld' }, h('span', null, 'Kleur'), kleuren),
    h('label', { class: 'veld' }, h('span', null, 'Emoji'), emoji),
    emojis,
    h('div', { class: 'knoppen' },
      verwijder,
      h('span', { class: 'vul' }),
      h('button', { type: 'button', class: 'knop tekst', onclick: () => sluit(false) }, 'Annuleren'),
      h('button', { type: 'submit', class: 'knop primair' }, 'Bewaren'),
    ));
  });
}

export function spelersScherm(store) {
  const actief = store.actieveSpelers();
  const archief = store.data.spelers.filter((s) => s.gearchiveerd);
  const aantalPotjes = (id) => store.data.potjes.filter((p) => p.einde && p.spelers.includes(id)).length;

  const el = h('div', { class: 'scherm spelers' },
    h('button', { class: 'knop primair groot', onclick: () => bewerk(store) }, '+ Nieuwe speler'),
    actief.length === 0 && h('p', { class: 'leeg' }, 'Nog geen spelers. Voeg je vaste toepers toe.'),
    h('ul', { class: 'lijst' },
      actief.map((s) =>
        h('li', { class: 'speler-regel' },
          h('button', { class: 'lijst-regel', onclick: () => bewerk(store, s) },
            avatar(s),
            h('span', { class: 'naam' }, s.naam),
            h('span', { class: 'klein' }, meervoud(aantalPotjes(s.id), 'potje', 'potjes')),
          ),
          h('button', { class: 'weg-knop', 'aria-label': `${s.naam} weghalen`, onclick: () => weghalen(store, s) }, '✕'),
        ),
      ),
    ),
    archief.length > 0 &&
      h('details', { class: 'archief' },
        h('summary', null, `Weggehaald (${archief.length})`),
        h('ul', { class: 'lijst' },
          archief.map((s) =>
            h('li', { class: 'lijst-regel' },
              avatar(s),
              h('span', { class: 'naam' }, s.naam),
              h('button', {
                class: 'knop klein',
                onclick: () => {
                  if (bestaat(store, s.naam)) return toast(`Er is al een actieve ${s.naam}.`);
                  store.spelerTerugzetten(s);
                },
              }, 'Terugzetten'),
            ),
          ),
        ),
      ),
  );
  return { el, sleutel: 'spelers' };
}
