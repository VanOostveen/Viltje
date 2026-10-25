import { describe, it, expect } from 'vitest';
import { statistieken, ranglijst, lafKlassement } from '../src/logic/stats.js';

const spelers = [
  { id: 'a', naam: 'Anna' },
  { id: 'b', naam: 'Bram' },
  { id: 'c', naam: 'Cor' },
];
let t = 0;
const strepen = [];
function potje(id, start, spelerIds, winnaar, doden, laffen = []) {
  // doden: spelers in volgorde van doodgaan (doodBij 2); laffen: wie laf was
  for (const l of laffen) strepen.push({ id: `${id}${++t}`, potje: id, speler: l, soort: 'laf', delta: 1, tijdstip: start + t });
  for (const d of doden) {
    strepen.push({ id: `${id}${++t}`, potje: id, speler: d, delta: 1, tijdstip: start + t });
    strepen.push({ id: `${id}${++t}`, potje: id, speler: d, delta: 1, tijdstip: start + t });
  }
  return {
    id, avond: 'x', spelers: spelerIds, start, einde: start + 100, winnaar, uitkomstRad: null,
    instellingen: { doodBij: 2, armoede: true, rad: false },
  };
}

const potjes = [
  potje('p1', 1000, ['a', 'b', 'c'], 'a', ['b', 'c'], ['c', 'c', 'b']),
  potje('p2', 2000, ['a', 'b', 'c'], 'a', ['c', 'b'], ['c']),
  potje('p3', 3000, ['a', 'b'], 'b', ['a'], ['b']),
  potje('p4', 4000, ['a', 'b', 'c'], 'a', ['b', 'c']),
  // Lopend potje telt niet mee.
  { id: 'p5', avond: 'x', spelers: ['a', 'b'], start: 5000, einde: null, winnaar: null, instellingen: { doodBij: 2 } },
];

describe('statistieken', () => {
  const stats = Object.fromEntries(statistieken({ spelers, potjes, strepen }).map((s) => [s.id, s]));

  it('telt gespeeld en gewonnen, alleen afgeronde potjes', () => {
    expect(stats.a.gespeeld).toBe(4);
    expect(stats.a.gewonnen).toBe(3);
    expect(stats.c.gespeeld).toBe(3);
    expect(stats.c.gewonnen).toBe(0);
  });
  it('berekent winpercentage', () => {
    expect(stats.a.winpct).toBe(75);
    expect(stats.b.winpct).toBe(25);
  });
  it('telt eerste dood', () => {
    expect(stats.b.eersteDood).toBe(2);
    expect(stats.c.eersteDood).toBe(1);
    expect(stats.a.eersteDood).toBe(1);
  });
  it('gemiddeld aantal strepen bij einde', () => {
    expect(stats.a.gemStrepen).toBe(0.5); // 0+0+2+0 / 4
    expect(stats.c.gemStrepen).toBe(2);
  });
  it('langste winstreak', () => {
    expect(stats.a.langsteReeks).toBe(2);
    expect(stats.b.langsteReeks).toBe(1);
    expect(stats.c.langsteReeks).toBe(0);
  });
  it('telt hoe vaak iemand laf was, laf telt niet als streep', () => {
    expect(stats.c.laf).toBe(3);
    expect(stats.b.laf).toBe(2);
    expect(stats.a.laf).toBe(0);
    expect(stats.c.lafPerPotje).toBe(1);
    expect(stats.c.gemStrepen).toBe(2);
  });
});

describe('ranglijst', () => {
  const stats = statistieken({ spelers, potjes, strepen });
  it('sorteert op winpercentage met minimum aantal potjes', () => {
    const { lijst, teWeinig } = ranglijst(stats, 4);
    expect(lijst.map((s) => s.id)).toEqual(['a', 'b']);
    expect(teWeinig.map((s) => s.id)).toEqual(['c']);
  });
});

describe('laffe spelersklassement', () => {
  it('sorteert op aantal keer laf en laat wie nooit laf was weg', () => {
    const stats = statistieken({ spelers, potjes, strepen });
    expect(lafKlassement(stats).map((s) => s.id)).toEqual(['c', 'b']);
  });
});
