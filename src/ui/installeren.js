// Viltje op het beginscherm zetten. Chrome op Android geeft een installatie-
// prompt die we bewaren voor een eigen knop; Safari op iOS kan dat niet, daar
// tonen we de stappen.
import { h } from './dom.js';

let prompt = null;
const luisteraars = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  prompt = e;
  luisteraars.forEach((f) => f());
});
window.addEventListener('appinstalled', () => {
  prompt = null;
  luisteraars.forEach((f) => f());
});

export function opInstallatieWijziging(f) {
  luisteraars.add(f);
}

export function isGeinstalleerd() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Knop of uitleg om te installeren, of null als dat niet kan of al gebeurd is. */
export function installeerBlok() {
  if (isGeinstalleerd()) return null;
  if (prompt) {
    return h('button', {
      class: 'knop primair',
      onclick: async () => {
        const p = prompt;
        prompt = null;
        await p.prompt();
      },
    }, 'Installeer Viltje');
  }
  if (isIos()) {
    return h('p', { class: 'hint' }, 'Open deze pagina in Safari, tik op de deelknop en kies Zet op beginscherm.');
  }
  return h('p', { class: 'hint' }, 'Kies in het menu van je browser App installeren of Toevoegen aan startscherm.');
}
