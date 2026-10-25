// Tabblad Spel: potje opzetten, scorebord en de uitslag.
import { status, magMin, magLaf, armen, laatsteStreep, LAF_MAX, DOOD_MIN, DOOD_MAX, SPELERS_MIN, SPELERS_MAX } from '../logic/score.js';
import { h, avatar, bevestig, toast, flits, tijd, meervoud } from './dom.js';
import { turf } from './turf.js';
import { rad } from './rad.js';
import { nieuweSpelerFormulier } from './spelers.js';
import { installeerBlok, isGeinstalleerd } from './installeren.js';

// Blijft bewaard tussen het wisselen van tabbladen.
const staat = {
  geselecteerd: null, // spelers in tafelvolgorde
  instellingen: null,
  uitslag: null, // id van het potje waarvan de uitslag op het scherm staat
};

export function spelScherm(store, app) {
  const potje = store.lopendPotje();
  if (potje) return bord(store, app, potje);
  const klaar = staat.uitslag && store.potje(staat.uitslag);
  if (klaar?.einde) return bord(store, app, klaar);
  staat.uitslag = null;
  return opzet(store, app);
}

/** Welk spelscherm er nu hoort, zonder het te bouwen. */
export function spelSleutel(store) {
  const potje = store.lopendPotje();
  if (potje) return `bord:${potje.id}`;
  const klaar = staat.uitslag && store.potje(staat.uitslag);
  return klaar?.einde ? `uitslag:${klaar.id}` : 'opzet';
}

// ---------- Nieuw potje opzetten ----------

function opzet(store, app) {
  const actief = store.actieveSpelers();
  const ids = new Set(actief.map((s) => s.id));
  if (!staat.geselecteerd) {
    const avond = store.openAvond();
    const vorige = avond && store.potjesVan(avond.id).at(-1);
    staat.geselecteerd = vorige ? [...vorige.spelers] : [];
  }
  staat.geselecteerd = staat.geselecteerd.filter((id) => ids.has(id));
  staat.instellingen ??= { ...store.meta.instellingen };
  const inst = staat.instellingen;

  const el = h('div', { class: 'scherm opzet' });
  const teken = () => el.replaceChildren(...inhoud());

  function inhoud() {
    const avond = store.openAvond();
    const aantal = staat.geselecteerd.length;
    const kanStarten = aantal >= SPELERS_MIN && aantal <= SPELERS_MAX;
    const blokken = [];

    if (!isGeinstalleerd() && !store.meta.installTipWeg) {
      blokken.push(
        h('div', { class: 'kaart installeer-kaart' },
          h('strong', null, 'Zet Viltje op je beginscherm'),
          h('p', { class: 'klein' }, 'Dan opent hij als app, werkt hij zonder internet en blijven je gegevens bewaard.'),
          h('div', { class: 'knoppen-rij' },
            installeerBlok(),
            h('button', { class: 'knop tekst', onclick: () => store.zetMeta({ installTipWeg: true }) }, 'Niet nu'),
          ),
        ),
      );
    }

    if (avond) {
      const potjes = store.potjesVan(avond.id);
      blokken.push(
        h('div', { class: 'kaart avond-kaart' },
          h('div', null,
            h('strong', null, 'Avond bezig'),
            h('div', { class: 'klein' }, `Sinds ${tijd(avond.start)}, ${meervoud(potjes.length, 'potje', 'potjes')}`),
          ),
          h('button', {
            class: 'knop',
            onclick: async () => {
              const ok = await bevestig({
                titel: 'Avond klaar?',
                tekst: 'De potjes van vanavond gaan naar de geschiedenis. Het volgende potje begint een nieuwe avond.',
                ok: 'Avond klaar',
              });
              if (ok) {
                await store.avondKlaar();
                staat.geselecteerd = [];
                toast('Avond afgesloten. Proost!');
              }
            },
          }, 'Avond klaar'),
        ),
      );
    }

    blokken.push(
      h('h2', null, 'Wie doen er mee?'),
      h('p', { class: 'hint' }, actief.length ? 'Tik ze aan in tafelvolgorde.' : 'Voeg eerst de spelers toe.'),
      h('div', { class: 'keuze-lijst' },
        actief.map((s) => {
          const plek = staat.geselecteerd.indexOf(s.id);
          return h('button', {
            class: `keuze${plek >= 0 ? ' aan' : ''}`,
            'aria-pressed': plek >= 0 ? 'true' : 'false',
            onclick: () => {
              if (plek >= 0) staat.geselecteerd.splice(plek, 1);
              else if (staat.geselecteerd.length < SPELERS_MAX) staat.geselecteerd.push(s.id);
              else toast(`Maximaal ${SPELERS_MAX} spelers.`);
              teken();
            },
          },
          avatar(s),
          h('span', { class: 'keuze-naam' }, s.naam),
          h('span', { class: 'volgnummer' }, plek >= 0 ? plek + 1 : ''));
        }),
      ),
      nieuweSpelerFormulier(store, (s) => {
        if (staat.geselecteerd.length < SPELERS_MAX) staat.geselecteerd.push(s.id);
        app.ververs();
      }),
      h('h2', null, 'Instellingen'),
      h('div', { class: 'kaart instellingen-lijst' },
        h('div', { class: 'regel' },
          h('span', null, 'Dood bij'),
          h('div', { class: 'stepper' },
            h('button', {
              class: 'knop rond', 'aria-label': 'Minder', disabled: inst.doodBij <= DOOD_MIN,
              onclick: () => { inst.doodBij = Math.max(DOOD_MIN, inst.doodBij - 1); teken(); },
            }, '−'),
            h('output', null, `${inst.doodBij} strepen`),
            h('button', {
              class: 'knop rond', 'aria-label': 'Meer', disabled: inst.doodBij >= DOOD_MAX,
              onclick: () => { inst.doodBij = Math.min(DOOD_MAX, inst.doodBij + 1); teken(); },
            }, '+'),
          ),
        ),
        schakelaar('Armoede tonen', inst.armoede, (v) => (inst.armoede = v)),
        schakelaar('Rad voor de verliezer', inst.rad, (v) => (inst.rad = v)),
      ),
      h('div', { class: 'start-balk' },
        h('button', {
          class: 'knop primair groot',
          disabled: !kanStarten,
          onclick: async () => {
            await store.startPotje(staat.geselecteerd, inst);
          },
        }, kanStarten ? 'Start potje' : `Kies ${SPELERS_MIN} tot ${SPELERS_MAX} spelers`),
      ),
    );
    return blokken;
  }

  teken();
  return { el, sleutel: 'opzet' };
}

export function schakelaar(label, aan, opWijzig) {
  const input = h('input', { type: 'checkbox', role: 'switch', checked: aan });
  input.addEventListener('change', () => opWijzig(input.checked));
  return h('label', { class: 'regel schakel' }, h('span', null, label), input);
}

// ---------- Scorebord ----------

function bord(store, app, potje) {
  const speler = (id) => store.speler(id);
  const nummer = store.potjesVan(potje.avond).findIndex((p) => p.id === potje.id) + 1;
  const armoedeBalk = h('div', { class: 'armoede-balk', 'aria-live': 'polite' }, 'Armoede');
  const ongedaanKnop = h('button', { class: 'knop', onclick: () => ongedaan() }, '↶ Ongedaan maken');
  const rijen = new Map();

  for (const id of potje.spelers) {
    const s = speler(id);
    const stand = h('div', { class: 'stand', 'aria-live': 'polite' });
    const label = h('span', { class: 'label' });
    const turfVak = h('div', { class: 'turf-vak' });
    const min = h('button', { class: 'knop-min', 'aria-label': `Streep eraf bij ${s?.naam}`, onclick: () => tik(id, -1) }, '−');
    // Laf: niet meegaan met een toep. Mag twee keer per potje.
    const lafMin = h('button', { class: 'laf-min', 'aria-label': `Laf eraf bij ${s?.naam}`, onclick: () => lafTik(id, -1) }, '−');
    const lafPlus = h('button', { class: 'laf-plus', 'aria-label': `${s?.naam} was laf`, onclick: () => lafTik(id, 1) }, '+');
    const lafTal = h('span', { class: 'laf-tal', 'aria-live': 'polite' });
    const laf = h('div', { class: 'laf', title: `Laf mag ${LAF_MAX} keer per potje` }, lafMin, lafTal, lafPlus);
    const plus = h('button', { class: 'knop-plus', 'aria-label': `Streep erbij voor ${s?.naam}`, onclick: () => tik(id, 1) }, '+');
    const rij = h('div', { class: 'rij', style: `--kleur:${s?.kleur ?? '#777'}` },
      h('div', { class: 'rij-naam' }, avatar(s), h('span', { class: 'naam' }, s?.naam ?? '?'), label, laf),
      turfVak,
      min, stand, plus,
    );
    rijen.set(id, { rij, stand, label, turfVak, min, laf, lafMin, lafPlus, lafTal });
  }

  const bordEl = h('section', { class: `bord${potje.spelers.length > 5 ? ' veel' : ''}` },
    armoedeBalk,
    h('div', { class: 'bord-kop' },
      h('strong', null, `Potje ${nummer || ''}`),
      h('span', { class: 'klein' }, `Dood bij ${potje.instellingen.doodBij}`),
      h('button', { class: 'knop tekst klein', onclick: () => stoppen() }, 'Stoppen'),
    ),
    h('div', { class: 'rijen' }, [...rijen.values()].map((r) => r.rij)),
    h('div', { class: 'bord-voet' }, ongedaanKnop),
  );
  const el = h('div', { class: 'scherm spel' }, bordEl);

  let vorigeStanden = {};
  function update() {
    const p = store.potje(potje.id);
    if (!p) return;
    const st = store.standen(p);
    const arm = armen(p, st);
    const lafs = store.lafTellers(p);
    bordEl.classList.toggle('armoede', arm.length > 0);
    for (const [id, r] of rijen) {
      const st8 = status(st[id], p.instellingen.doodBij);
      const isArm = arm.includes(id);
      r.rij.classList.toggle('dood', st8 === 'dood');
      r.rij.classList.toggle('arm', isArm);
      r.label.textContent = st8 === 'dood' ? '💀 dood' : isArm ? 'arm' : '';
      r.label.classList.toggle('pulseer', isArm);
      r.label.hidden = !r.label.textContent;
      r.stand.textContent = st[id];
      if (vorigeStanden[id] !== st[id]) r.turfVak.replaceChildren(turf(st[id]));
      r.min.disabled = !magMin(st[id]) || !!p.einde;
      r.rij.querySelector('.knop-plus').disabled = !!p.einde;
      r.lafTal.textContent = `Laf ${lafs[id]}`;
      r.laf.classList.toggle('vol', lafs[id] >= LAF_MAX);
      r.lafPlus.disabled = !magLaf(p, st[id], lafs[id]) || !!p.einde;
      r.lafMin.disabled = lafs[id] === 0 || !!p.einde;
    }
    vorigeStanden = st;
    ongedaanKnop.disabled = !laatsteStreep(p.id, store.data.strepen);
  }

  async function tik(id, delta) {
    navigator.vibrate?.(10);
    // Eindigt het potje door deze streep, dan blijft de uitslag ervan in beeld.
    staat.uitslag = potje.id;
    const uit = await store.streep(potje.id, id, delta);
    for (const a of uit.nieuwArm ?? []) {
      flits(bordEl, 'armoede-flits');
      flits(rijen.get(a)?.rij, 'schud');
    }
    if (uit.nieuwDood) flits(rijen.get(uit.nieuwDood)?.rij, 'sterf');
  }

  async function lafTik(id, delta) {
    navigator.vibrate?.(10);
    const gelukt = delta > 0 ? await store.laf(potje.id, id) : await store.lafWeg(potje.id, id);
    if (gelukt) flits(rijen.get(id)?.lafTal, 'tel');
    else if (delta > 0) toast(`${speler(id)?.naam ?? '?'} was al ${LAF_MAX} keer laf. De derde keer mag niet.`, { duur: 2500 });
  }

  async function ongedaan() {
    const weg = await store.ongedaan(potje.id);
    if (!weg) return;
    const wat = weg.soort === 'laf' ? 'Laf' : 'Streep';
    toast(`${wat} van ${speler(weg.speler)?.naam ?? '?'} teruggezet`, { duur: 1800 });
  }

  async function stoppen() {
    const ok = await bevestig({
      titel: 'Potje stoppen?',
      tekst: 'Dit potje heeft nog geen winnaar en wordt niet bewaard.',
      ok: 'Stoppen',
      gevaar: true,
    });
    if (ok) {
      staat.geselecteerd = [...potje.spelers];
      await store.potjeVerwijderen(potje.id);
    }
  }

  update();
  const afgelopen = !!store.potje(potje.id).einde;
  if (afgelopen) el.append(uitslag(store, app, store.potje(potje.id)));
  return {
    el,
    sleutel: `${afgelopen ? 'uitslag' : 'bord'}:${potje.id}`,
    update,
  };
}

// ---------- Uitslag ----------

function uitslag(store, app, potje) {
  const w = store.speler(potje.winnaar);
  const verliezer = store.verliezer(potje);
  const verliezerNaam = store.speler(verliezer)?.naam ?? '?';
  const confetti = Array.from({ length: 18 }, (_, i) =>
    h('i', { style: `--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.12}s;--r:${(i * 47) % 360}deg` }),
  );

  return h('div', { class: 'uitslag', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Uitslag' },
    h('div', { class: 'uitslag-kaart' },
      h('div', { class: 'confetti', 'aria-hidden': 'true' }, confetti),
      h('div', { class: 'beker', 'aria-hidden': 'true' }, '🏆'),
      avatar(w, true),
      h('h2', null, `${w?.naam ?? '?'} wint!`),
      verliezer && h('p', { class: 'klein' }, `Eerst dood: ${verliezerNaam}`),
      potje.instellingen.rad &&
        rad({
          opties: store.meta.radOpties,
          verliezerNaam,
          geluid: store.meta.radGeluid,
          uitkomst: potje.uitkomstRad,
          opUitkomst: (opdracht) => store.radUitkomst(potje.id, opdracht),
        }),
      h('div', { class: 'uitslag-knoppen' },
        h('button', {
          class: 'knop primair groot',
          onclick: async () => {
            staat.uitslag = null;
            const spelers = potje.spelers.filter((id) => !store.speler(id)?.gearchiveerd);
            if (spelers.length >= SPELERS_MIN) await store.startPotje(spelers, potje.instellingen);
          },
        }, 'Nieuw potje'),
        h('button', {
          class: 'knop',
          onclick: () => {
            staat.uitslag = null;
            staat.geselecteerd = [...potje.spelers];
            staat.instellingen = { ...potje.instellingen };
            app.ververs();
          },
        }, 'Andere spelers of instellingen'),
        h('button', {
          class: 'knop tekst',
          onclick: async () => {
            await store.ongedaan(potje.id);
            staat.uitslag = null;
          },
        }, '↶ Oeps, ongedaan maken'),
      ),
    ),
  );
}

/** Wordt aangeroepen als de opgeslagen instellingen veranderen (bijv. na import). */
export function resetSpelStaat() {
  staat.geselecteerd = null;
  staat.instellingen = null;
  staat.uitslag = null;
}
