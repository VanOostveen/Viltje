// Tabblad Geschiedenis: lijst van avonden en per avond de potjes.
import { h, avatar, bevestig, datum, kortDatum, tijd, meervoud, toast } from './dom.js';
import { status } from '../logic/score.js';

export function geschiedenisScherm(store, app, avondId) {
  return avondId ? detail(store, app, avondId) : lijst(store, app);
}

function naam(store, id) {
  return store.speler(id)?.naam ?? '?';
}

function lijst(store, app) {
  const avonden = [...store.data.avonden].sort((a, b) => b.start - a.start);
  const el = h('div', { class: 'scherm geschiedenis' },
    avonden.length === 0 && h('p', { class: 'leeg' }, 'Nog geen avonden gespeeld. De uitslagen komen hier vanzelf.'),
    h('ul', { class: 'lijst avonden' },
      avonden.map((a) => {
        const potjes = store.potjesVan(a.id).filter((p) => p.einde);
        return h('li', null,
          h('button', { class: 'kaart avond', onclick: () => app.navigeer(`geschiedenis/${a.id}`) },
            h('div', { class: 'avond-kop' },
              h('strong', null, kortDatum(a.start)),
              h('span', { class: 'klein' }, a.einde ? `${tijd(a.start)}–${tijd(a.einde)}` : 'bezig'),
            ),
            h('div', { class: 'klein' }, a.spelers.map((id) => naam(store, id)).join(', ')),
            potjes.length > 0 &&
              h('ol', { class: 'winnaars' },
                potjes.map((p) => h('li', null, '🏆 ', naam(store, p.winnaar))),
              ),
          ),
        );
      }),
    ),
  );
  return { el, sleutel: 'geschiedenis' };
}

function detail(store, app, avondId) {
  const avond = store.data.avonden.find((a) => a.id === avondId);
  if (!avond) {
    queueMicrotask(() => app.navigeer('geschiedenis'));
    return { el: h('div'), sleutel: 'leeg' };
  }
  const potjes = store.potjesVan(avondId);
  const winsten = {};
  for (const p of potjes) if (p.winnaar) winsten[p.winnaar] = (winsten[p.winnaar] ?? 0) + 1;
  const ranking = Object.entries(winsten).sort((a, b) => b[1] - a[1]);

  const el = h('div', { class: 'scherm geschiedenis-detail' },
    h('button', { class: 'knop tekst terug', onclick: () => app.navigeer('geschiedenis') }, '‹ Alle avonden'),
    h('h2', null, datum(avond.start)),
    h('p', { class: 'klein' },
      avond.einde ? `${tijd(avond.start)} tot ${tijd(avond.einde)}` : `Bezig sinds ${tijd(avond.start)}`,
      ` · ${meervoud(potjes.filter((p) => p.einde).length, 'potje', 'potjes')}`),
    ranking.length > 0 &&
      h('div', { class: 'kaart' },
        h('h3', null, 'Winst deze avond'),
        h('ul', { class: 'mini-rang' },
          ranking.map(([id, n]) => h('li', null, avatar(store.speler(id)), h('span', { class: 'naam' }, naam(store, id)), h('strong', null, n))),
        ),
      ),
    potjes.map((p, i) => {
      const st = store.standen(p);
      return h('article', { class: 'kaart potje' },
        h('div', { class: 'potje-kop' },
          h('strong', null, `Potje ${i + 1}`),
          h('span', { class: 'klein' }, `${tijd(p.start)} · dood bij ${p.instellingen.doodBij}`),
        ),
        !p.einde && h('p', { class: 'klein' }, 'Loopt nog'),
        h('ul', { class: 'potje-standen' },
          p.spelers.map((id) =>
            h('li', { class: status(st[id], p.instellingen.doodBij) === 'dood' ? 'dood' : '' },
              avatar(store.speler(id)),
              h('span', { class: 'naam' }, naam(store, id)),
              p.winnaar === id && h('span', { 'aria-label': 'winnaar' }, '🏆'),
              p.uitkomstRad === id && h('span', { title: 'haalde het rondje', 'aria-label': 'haalde het rondje' }, '🍺'),
              h('strong', null, st[id]),
            ),
          ),
        ),
        p.einde &&
          h('button', {
            class: 'knop tekst gevaar klein',
            onclick: async () => {
              const ok = await bevestig({
                titel: `Potje ${i + 1} verwijderen?`,
                tekst: 'Het potje telt dan niet meer mee in de statistieken. Dit kan niet ongedaan worden.',
                ok: 'Verwijderen',
                gevaar: true,
              });
              if (ok) {
                await store.potjeVerwijderen(p.id);
                toast('Potje verwijderd');
              }
            },
          }, 'Potje verwijderen'),
      );
    }),
  );
  return { el, sleutel: `avond:${avondId}` };
}
