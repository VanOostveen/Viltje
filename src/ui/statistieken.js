// Tabblad Statistieken: ranglijst en cijfers per speler over alle avonden.
import { statistieken, ranglijst, lafKlassement } from '../logic/stats.js';
import { h, avatar, getal, meervoud } from './dom.js';

export function statistiekenScherm(store, app) {
  const stats = statistieken(store.data);
  const min = store.meta.minPotjes;
  const { lijst, teWeinig } = ranglijst(stats, min);
  const laf = lafKlassement(stats);
  const speler = (id) => store.speler(id);

  if (lijst.length === 0 && teWeinig.length === 0) {
    return {
      el: h('div', { class: 'scherm statistieken' }, h('p', { class: 'leeg' }, 'Nog geen potjes uitgespeeld. Na het eerste potje staan hier de cijfers.')),
      sleutel: 'stats',
    };
  }

  const kaart = (s) =>
    h('details', { class: 'kaart speler-stats' },
      h('summary', null,
        avatar(speler(s.id)),
        h('span', { class: 'naam' }, s.naam),
        h('strong', { class: 'pct' }, `${getal(s.winpct, 0)}%`),
      ),
      h('dl', { class: 'cijfers' },
        cijfer('Gespeeld', s.gespeeld),
        cijfer('Gewonnen', s.gewonnen),
        cijfer('Winpercentage', `${getal(s.winpct)}%`),
        cijfer('Eerste dood', s.eersteDood),
        cijfer('Gem. strepen bij einde', getal(s.gemStrepen)),
        cijfer('Langste winstreak', s.langsteReeks),
        cijfer('Keer laf', s.laf),
      ),
    );

  const el = h('div', { class: 'scherm statistieken' },
    h('h2', null, 'Ranglijst'),
    lijst.length === 0
      ? h('p', { class: 'hint' }, `Nog niemand heeft ${min} potjes gespeeld.`)
      : h('ol', { class: 'ranglijst' },
          lijst.map((s, i) =>
            h('li', { class: i < 3 ? `podium p${i + 1}` : '' },
              h('span', { class: 'plek' }, i + 1),
              avatar(speler(s.id)),
              h('span', { class: 'naam' }, s.naam),
              h('span', { class: 'klein' }, `${s.gewonnen}/${s.gespeeld}`),
              h('strong', { class: 'pct' }, `${getal(s.winpct, 0)}%`),
            ),
          ),
        ),
    h('p', { class: 'hint' },
      `Op winpercentage, vanaf ${meervoud(min, 'potje', 'potjes')}. `,
      h('button', { class: 'link', onclick: () => app.navigeer('instellingen') }, 'Aanpassen')),
    h('h2', null, 'Laffe spelers'),
    laf.length === 0
      ? h('p', { class: 'hint' }, 'Nog niemand is laf geweest. Knap.')
      : h('ol', { class: 'ranglijst laf' },
          laf.map((s, i) =>
            h('li', null,
              h('span', { class: 'plek' }, i + 1),
              avatar(speler(s.id)),
              h('span', { class: 'naam' }, s.naam),
              h('span', { class: 'klein' }, `${getal(s.lafPerPotje)} per potje`),
              h('strong', { class: 'pct' }, `${s.laf}×`),
            ),
          ),
        ),
    h('p', { class: 'hint' }, 'Hoe vaak iemand niet meeging met een toep, over alle potjes.'),
    h('h2', null, 'Per speler'),
    [...lijst, ...teWeinig].map(kaart),
  );
  return { el, sleutel: 'stats' };
}

function cijfer(label, waarde) {
  return h('div', null, h('dt', null, label), h('dd', null, waarde));
}
