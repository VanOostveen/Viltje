// Kleine DOM-hulpjes, zodat er geen framework nodig is.

export function h(tag, props, ...kinderen) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  voegToe(el, kinderen);
  return el;
}

function voegToe(el, kinderen) {
  for (const k of kinderen.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : String(k));
  }
}

export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function avatar(speler, groot = false) {
  const tekst = speler?.emoji || (speler?.naam ?? '?').trim().charAt(0).toUpperCase();
  return h(
    'span',
    { class: `avatar${groot ? ' groot' : ''}${speler?.emoji ? ' emoji' : ''}`, style: `--kleur:${speler?.kleur ?? '#777'}`, 'aria-hidden': 'true' },
    tekst,
  );
}

/** Opent een modale dialoog; inhoud(sluit) bouwt de inhoud. */
export function dialoog(inhoud, { klasse = '' } = {}) {
  return new Promise((klaar) => {
    const d = h('dialog', { class: `dialoog ${klasse}` });
    let uitkomst;
    const sluit = (waarde) => {
      uitkomst = waarde;
      d.close();
    };
    d.addEventListener('close', () => {
      d.remove();
      klaar(uitkomst);
    });
    d.addEventListener('click', (e) => {
      if (e.target === d) sluit(undefined);
    });
    voegToe(d, [inhoud(sluit)]);
    document.body.append(d);
    d.showModal();
  });
}

export function bevestig({ titel, tekst, ok = 'OK', annuleer = 'Annuleren', gevaar = false }) {
  return dialoog((sluit) =>
    h('div', { class: 'dialoog-inhoud' },
      h('h2', null, titel),
      tekst && h('p', null, tekst),
      h('div', { class: 'knoppen' },
        h('button', { class: 'knop tekst', onclick: () => sluit(false) }, annuleer),
        h('button', { class: `knop ${gevaar ? 'gevaar' : 'primair'}`, onclick: () => sluit(true) }, ok),
      ),
    ),
  ).then(Boolean);
}

let toastEl;
export function toast(tekst, { duur = 3000, opKlik } = {}) {
  toastEl?.remove();
  const el = h('button', { class: 'toast', role: 'status', onclick: () => (opKlik ? opKlik() : el.remove()) }, tekst);
  toastEl = el;
  // Boven een open dialoog tonen, anders valt hij erachter.
  (document.querySelector('dialog[open]') ?? document.body).append(el);
  if (duur) setTimeout(() => el.remove(), duur);
  return el;
}

/** Speelt een CSS-animatie één keer af door een klasse tijdelijk te zetten. */
export function flits(el, klasse) {
  if (!el) return;
  el.classList.remove(klasse);
  void el.offsetWidth;
  el.classList.add(klasse);
  const klaar = (e) => {
    if (e.target !== el) return;
    el.classList.remove(klasse);
    el.removeEventListener('animationend', klaar);
  };
  el.addEventListener('animationend', klaar);
}

const datumFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const kortFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
const tijdFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });

export const datum = (ms) => datumFmt.format(ms);
export const kortDatum = (ms) => kortFmt.format(ms);
export const tijd = (ms) => tijdFmt.format(ms);
export const getal = (n, dec = 1) => n.toLocaleString('nl-NL', { maximumFractionDigits: dec });
export const meervoud = (n, een, meer) => `${n} ${n === 1 ? een : meer}`;
