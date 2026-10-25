// Eerste-keer-scherm met drie korte tips.
import { h, dialoog } from './dom.js';

const logo = `${import.meta.env.BASE_URL}viltje.svg`;

export function toonTips() {
  return dialoog((sluit) =>
    h('div', { class: 'dialoog-inhoud tips' },
      h('img', { src: logo, alt: '', class: 'tips-logo' }),
      h('h2', null, 'Welkom bij Viltje'),
      h('p', { class: 'klein' }, 'Strepen bijhouden bij toepen'),
      h('ol', null,
        h('li', null, h('strong', null, 'Spelers erbij. '), 'Tik ze aan in tafelvolgorde en start het potje.'),
        h('li', null, h('strong', null, 'Tik + bij wie strepen krijgt. '), 'Foutje? Ongedaan maken zet de laatste streep terug.'),
        h('li', null, h('strong', null, 'Alles blijft op deze telefoon. '), 'Maak af en toe een back-up via het tandwiel.'),
      ),
      h('button', { class: 'knop primair groot', onclick: () => sluit(true) }, 'Aan de slag'),
    ),
  { klasse: 'tips-dialoog' });
}
