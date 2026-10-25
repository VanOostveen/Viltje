import './styles.css';
import { maakStore } from './data/store.js';
import { openOpslag } from './data/opslag.js';
import { h } from './ui/dom.js';
import { houdWakker } from './ui/wakelock.js';
import { spelScherm, spelSleutel } from './ui/spel.js';
import { spelersScherm } from './ui/spelers.js';
import { geschiedenisScherm } from './ui/geschiedenis.js';
import { statistiekenScherm } from './ui/statistieken.js';
import { instellingenScherm } from './ui/instellingen.js';
import { toonTips } from './ui/tips.js';
import { startPwa } from './pwa.js';

const SCHERMEN = {
  spel: { titel: 'Viltje', maak: spelScherm },
  spelers: { titel: 'Spelers', maak: spelersScherm },
  geschiedenis: { titel: 'Geschiedenis', maak: geschiedenisScherm },
  statistieken: { titel: 'Statistieken', maak: statistiekenScherm },
  instellingen: { titel: 'Instellingen', maak: instellingenScherm },
};

const inhoud = document.getElementById('inhoud');
const titel = document.querySelector('.kop-titel span');
const terug = document.querySelector('.kop-terug');
const tandwiel = document.querySelector('.kop-tandwiel');

let store;
let huidig = null; // { naam, param, scherm: { el, sleutel, update? } }

function route() {
  const [naam, param] = location.hash.replace(/^#\/?/, '').split('/');
  return SCHERMEN[naam] ? { naam, param } : { naam: 'spel' };
}

const app = {
  opslagSoort: '',
  navigeer(pad) {
    location.hash = `#/${pad}`;
  },
  ververs: () => teken(),
  toonTips,
};

function teken({ wissel = false } = {}) {
  const { naam, param } = route();
  const scherm = SCHERMEN[naam].maak(store, app, param);
  const zelfde = !wissel && huidig?.naam === naam && huidig.scherm.sleutel === scherm.sleutel;
  const scroll = inhoud.scrollTop;
  const focus = document.activeElement?.dataset?.focus;
  inhoud.replaceChildren(scherm.el);
  inhoud.scrollTop = zelfde ? scroll : 0;
  // Een invoerveld dat focus had, houdt die na opnieuw tekenen.
  if (zelfde && focus) scherm.el.querySelector(`[data-focus="${focus}"]`)?.focus();
  huidig = { naam, param, scherm };

  titel.textContent = SCHERMEN[naam].titel;
  document.body.dataset.scherm = naam;
  terug.hidden = naam !== 'instellingen';
  tandwiel.hidden = naam === 'instellingen';
  document.querySelectorAll('.tabs a').forEach((a) => {
    const actief = a.dataset.tab === naam;
    a.classList.toggle('actief', actief);
    if (actief) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/** Bij een wijziging in de data: het scorebord past zichzelf aan, de rest wordt opnieuw getekend. */
function bijWijziging() {
  houdWakker(!!store.lopendPotje());
  if (!huidig) return;
  if (route().naam === 'spel' && huidig.scherm.update && spelSleutel(store) === huidig.scherm.sleutel) {
    return huidig.scherm.update();
  }
  teken();
}

async function start() {
  const opslag = await openOpslag();
  app.opslagSoort = opslag.soort;
  store = maakStore(opslag);
  try {
    await store.init();
  } catch (e) {
    inhoud.replaceChildren(h('p', { class: 'leeg' }, `Viltje kon de gegevens niet laden: ${e.message}`));
    return;
  }
  navigator.storage?.persist?.().catch(() => {});

  store.luister(bijWijziging);
  window.addEventListener('hashchange', () => teken({ wissel: true }));
  terug.addEventListener('click', () => (history.length > 1 ? history.back() : app.navigeer('spel')));
  tandwiel.addEventListener('click', () => app.navigeer('instellingen'));
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await store.sluitVerlopenAvonden();
      houdWakker(!!store.lopendPotje());
    }
  });

  teken({ wissel: true });
  houdWakker(!!store.lopendPotje());

  if (!store.meta.tipsGezien) {
    await toonTips();
    store.zetMeta({ tipsGezien: true });
  }
}

start();
startPwa();
