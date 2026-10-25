// Strepen als handgetekende turfblokjes: vier rechtop, de vijfde schuin erdoor.
import { turfblokjes } from '../logic/score.js';
import { svg } from './dom.js';

// Vaste 'willekeur' zodat een streep er altijd hetzelfde uitziet.
const wiebel = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1) * 1.6;

function blokje(aantal, nr) {
  const lijnen = [];
  for (let i = 0; i < Math.min(aantal, 4); i++) {
    const x = 7 + i * 8;
    const n = nr * 5 + i;
    lijnen.push(
      `<path d="M${x + wiebel(n)} ${5 + wiebel(n + 1)} Q${x + wiebel(n + 2) - 0.8} 20 ${x + wiebel(n + 3)} ${35 + wiebel(n + 4)}"/>`,
    );
  }
  if (aantal === 5) {
    lijnen.push(`<path d="M2 ${29 + wiebel(nr)} Q20 ${21 + wiebel(nr + 2)} 38 ${10 + wiebel(nr + 3)}"/>`);
  }
  return `<svg class="blokje" viewBox="0 0 40 40" aria-hidden="true">${lijnen.join('')}</svg>`;
}

export function turf(aantal) {
  const blokjes = turfblokjes(aantal).map(blokje).join('');
  return svg(`<span class="turf" aria-hidden="true">${blokjes}</span>`);
}
