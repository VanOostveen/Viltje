// Het rad voor de verliezer: draait een opdracht.
import { vakken as maakVakken, kies, hoeken, eindRotatie } from '../logic/rad.js';
import { h, svg } from './dom.js';

const DRAAITIJD = 4500;
const KLEUREN = ['#9E2333', '#C7841F', '#2F6E8E', '#3F7D4E', '#6B4C9A', '#B5527B', '#8A5A2B', '#5A6B73'];

function vakPad(van, tot, r = 100) {
  const punt = (hoek) => {
    const rad = ((hoek - 90) * Math.PI) / 180;
    return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
  };
  if (tot - van >= 359.99) return `M0 -${r} A${r} ${r} 0 1 1 0 ${r} A${r} ${r} 0 1 1 0 -${r} Z`;
  return `M0 0 L${punt(van)} A${r} ${r} 0 ${tot - van > 180 ? 1 : 0} 1 ${punt(tot)} Z`;
}

const kort = (tekst, max = 16) => (tekst.length > max ? `${tekst.slice(0, max - 1)}…` : tekst);
const veilig = (tekst) => tekst.replace(/[<&>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function radSvg(vakken) {
  const enkel = vakken.length === 1;
  const delen = hoeken(vakken).map(({ id, van, tot }, i) => {
    // Bij een even aantal vakken zou de laatste kleur naast de eerste komen.
    const kleur = KLEUREN[(i + (i > 0 && i === vakken.length - 1 && i % KLEUREN.length === 0 ? 1 : 0)) % KLEUREN.length];
    const midden = (van + tot) / 2;
    const tekst = kort(id);
    // Tekst op de linkerhelft omdraaien, zodat hij niet op zijn kop staat.
    const draai = enkel
      ? 'translate(0 -48)'
      : midden > 180 ? `rotate(${midden + 90}) translate(-56 0)` : `rotate(${midden - 90}) translate(56 0)`;
    const grootte = tekst.length > 11 ? 9 : tekst.length > 7 ? 11 : 13;
    return `<g>
      <path d="${vakPad(van, tot)}" fill="${kleur}" stroke="#E8D4B0" stroke-width="1.5"/>
      <text transform="${draai}" text-anchor="middle" dominant-baseline="middle"
        fill="#fff" font-size="${grootte}" font-weight="700">${veilig(tekst)}</text>
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
 * Bouwt het rad. opties: { opties, verliezerNaam, geluid, uitkomst, opUitkomst }
 */
export function rad({ opties, verliezerNaam, geluid, uitkomst, opUitkomst }) {
  const vakken = maakVakken(opties);
  const schijf = radSvg(vakken);
  const uitslag = h('p', { class: 'rad-uitslag', 'aria-live': 'polite' });
  const knop = h('button', { class: 'knop primair' }, `${verliezerNaam}, draai het rad`);

  const toonUitkomst = (opdracht) => {
    uitslag.replaceChildren(`Opdracht voor ${verliezerNaam}: `, h('strong', null, opdracht));
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
