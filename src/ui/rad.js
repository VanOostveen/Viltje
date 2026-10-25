// Het rad voor het rondje.
import { gewichten, kies, hoeken, eindRotatie } from '../logic/rad.js';
import { h, svg } from './dom.js';

const DRAAITIJD = 4500;

function vakPad(van, tot, r = 100) {
  const punt = (hoek) => {
    const rad = ((hoek - 90) * Math.PI) / 180;
    return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
  };
  if (tot - van >= 359.99) return `M0 -${r} A${r} ${r} 0 1 1 0 ${r} A${r} ${r} 0 1 1 0 -${r} Z`;
  return `M0 0 L${punt(van)} A${r} ${r} 0 ${tot - van > 180 ? 1 : 0} 1 ${punt(tot)} Z`;
}

function radSvg(vakken, spelerVan) {
  const delen = hoeken(vakken).map(({ id, van, tot }) => {
    const s = spelerVan(id);
    const midden = (van + tot) / 2;
    const naam = (s?.naam ?? '?').slice(0, 10);
    // Tekst op de linkerhelft omdraaien, zodat hij niet op zijn kop staat.
    const draai = midden > 180 ? `rotate(${midden + 90}) translate(-58 0)` : `rotate(${midden - 90}) translate(58 0)`;
    return `<g>
      <path d="${vakPad(van, tot)}" fill="${s?.kleur ?? '#777'}" stroke="#E8D4B0" stroke-width="1.5"/>
      <text transform="${draai}" text-anchor="middle" dominant-baseline="middle"
        fill="#fff" font-size="${naam.length > 7 ? 10 : 12}" font-weight="700">${naam.replace(/[<&>]/g, '')}</text>
    </g>`;
  });
  return svg(`<svg class="rad-schijf" viewBox="-104 -104 208 208" aria-hidden="true">
    <circle r="103" fill="#E8D4B0"/>${delen.join('')}<circle r="14" fill="#2B1A14"/></svg>`);
}

// Tikgeluid met Web Audio, alleen als geluid aan staat.
let audio;
function tik() {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 1400;
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.04);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.05);
  } catch {
    /* geen geluid, geen probleem */
  }
}

function hoekNu(el) {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
}

/**
 * Bouwt het rad. opties: { spelers, verliezer, verliezerZwaarder, geluid, uitkomst, spelerVan, opUitkomst }
 */
export function rad({ spelers, verliezer, verliezerZwaarder, geluid, uitkomst, spelerVan, opUitkomst }) {
  const vakken = gewichten(spelers, verliezer, verliezerZwaarder);
  const schijf = radSvg(vakken, spelerVan);
  const uitslag = h('p', { class: 'rad-uitslag', 'aria-live': 'polite' });
  const knop = h('button', { class: 'knop primair' }, 'Draai het rad');

  const toonUitkomst = (id) => {
    uitslag.textContent = `🍺 ${spelerVan(id)?.naam ?? '?'} haalt het rondje!`;
    knop.remove();
  };

  if (uitkomst) {
    const i = vakken.findIndex((v) => v.id === uitkomst);
    if (i >= 0) schijf.style.transform = `rotate(${eindRotatie(vakken, i, () => 0.5, 0)}deg)`;
    toonUitkomst(uitkomst);
  }

  knop.addEventListener('click', () => {
    knop.disabled = true;
    const i = kies(vakken);
    const rotatie = eindRotatie(vakken, i);
    schijf.style.transition = `transform ${DRAAITIJD}ms cubic-bezier(0.15, 0.85, 0.2, 1)`;
    requestAnimationFrame(() => (schijf.style.transform = `rotate(${rotatie}deg)`));

    if (geluid) {
      const grenzen = hoeken(vakken).map((v) => v.van);
      let vorigVak = -1;
      const start = performance.now();
      const stap = () => {
        const onderWijzer = (360 - hoekNu(schijf)) % 360;
        const vak = grenzen.filter((g) => g <= onderWijzer).length;
        if (vak !== vorigVak) {
          if (vorigVak !== -1) tik();
          vorigVak = vak;
        }
        if (performance.now() - start < DRAAITIJD) requestAnimationFrame(stap);
      };
      requestAnimationFrame(stap);
    }

    setTimeout(() => {
      toonUitkomst(vakken[i].id);
      opUitkomst(vakken[i].id);
    }, DRAAITIJD + 100);
  });

  return h('div', { class: 'rad' },
    h('div', { class: 'rad-houder' }, h('div', { class: 'rad-wijzer', 'aria-hidden': 'true' }), schijf),
    uitslag,
    knop,
  );
}
