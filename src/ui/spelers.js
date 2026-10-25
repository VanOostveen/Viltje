// Tabblad Spelers: vaste spelerslijst met naam en kleur of emoji.
import { KLEUREN } from '../data/store.js';
import { h, avatar, dialoog, bevestig, toast, meervoud } from './dom.js';

const EMOJI = ['🍺', '🃏', '👑', '🎩', '🦊', '🐻', '🐸', '🌶️', '🔥', '🍀', '⚓', '🚜'];

/** Klein invoerveld om snel een speler toe te voegen (ook midden in een avond). */
export function nieuweSpelerFormulier(store, opToegevoegd) {
  const input = h('input', { type: 'text', placeholder: 'Nieuwe speler', maxlength: '20', enterkeyhint: 'done', autocomplete: 'off', 'aria-label': 'Naam nieuwe speler' });
  return h('form', {
    class: 'snel-toevoegen',
    onsubmit: async (e) => {
      e.preventDefault();
      const naam = input.value.trim();
      if (!naam) return input.focus();
      if (bestaat(store, naam)) return toast(`${naam} staat al in de lijst.`);
      const s = await store.spelerToevoegen({ naam });
      opToegevoegd?.(s);
    },
  }, input, h('button', { class: 'knop', type: 'submit' }, 'Toevoegen'));
}

function bestaat(store, naam, behalve) {
  const n = naam.trim().toLocaleLowerCase('nl');
  return store.actieveSpelers().some((s) => s.id !== behalve && s.naam.toLocaleLowerCase('nl') === n);
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
        onclick: async () => {
          const gespeeld = store.heeftGespeeld(speler.id);
          const ok = await bevestig({
            titel: gespeeld ? `${speler.naam} archiveren?` : `${speler.naam} verwijderen?`,
            tekst: gespeeld
              ? 'De speler verdwijnt uit de lijst, maar de gespeelde potjes en statistieken blijven bewaard.'
              : 'De speler heeft nog geen potjes gespeeld en wordt verwijderd.',
            ok: gespeeld ? 'Archiveren' : 'Verwijderen',
            gevaar: true,
          });
          if (ok) {
            await store.spelerVerwijderen(speler.id);
            sluit(true);
          }
        },
      }, store.heeftGespeeld(speler.id) ? 'Archiveren' : 'Verwijderen');

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
        h('li', null,
          h('button', { class: 'lijst-regel', onclick: () => bewerk(store, s) },
            avatar(s),
            h('span', { class: 'naam' }, s.naam),
            h('span', { class: 'klein' }, meervoud(aantalPotjes(s.id), 'potje', 'potjes')),
            h('span', { class: 'pijl', 'aria-hidden': 'true' }, '›'),
          ),
        ),
      ),
    ),
    archief.length > 0 &&
      h('details', { class: 'archief' },
        h('summary', null, `Gearchiveerd (${archief.length})`),
        h('ul', { class: 'lijst' },
          archief.map((s) =>
            h('li', { class: 'lijst-regel' },
              avatar(s),
              h('span', { class: 'naam' }, s.naam),
              h('button', {
                class: 'knop klein',
                onclick: () => {
                  if (bestaat(store, s.naam)) return toast(`Er is al een actieve ${s.naam}.`);
                  store.spelerWijzigen(s.id, { gearchiveerd: false });
                },
              }, 'Terugzetten'),
            ),
          ),
        ),
      ),
  );
  return { el, sleutel: 'spelers' };
}
