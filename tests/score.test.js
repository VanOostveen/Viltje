import { describe, it, expect } from 'vitest';
import {
  standen, status, winnaar, armen, laatsteStreep, doodsVolgorde, eersteDood, turfblokjes, magMin,
} from '../src/logic/score.js';

const potje = (doodBij = 10, armoede = true) => ({
  id: 'p1',
  spelers: ['a', 'b', 'c'],
  instellingen: { doodBij, armoede, rad: false },
});
let t = 0;
const s = (speler, delta = 1, p = 'p1') => ({ id: `s${++t}`, potje: p, speler, delta, tijdstip: t });

describe('standen', () => {
  it('telt strepen per speler op, alleen van dit potje', () => {
    const strepen = [s('a'), s('a'), s('b'), s('a', -1), s('c', 1, 'ander')];
    expect(standen(potje(), strepen)).toEqual({ a: 1, b: 1, c: 0 });
  });
});

describe('status (dood en armoede)', () => {
  it('is dood vanaf de grens', () => {
    expect(status(10, 10)).toBe('dood');
    expect(status(11, 10)).toBe('dood');
  });
  it('is arm op één streep van dood', () => {
    expect(status(9, 10)).toBe('arm');
    expect(status(4, 5)).toBe('arm');
  });
  it('is anders levend', () => {
    expect(status(0, 10)).toBe('levend');
    expect(status(8, 10)).toBe('levend');
  });
  it('armen respecteert de instelling armoede tonen', () => {
    const st = { a: 9, b: 2, c: 9 };
    expect(armen(potje(10, true), st)).toEqual(['a', 'c']);
    expect(armen(potje(10, false), st)).toEqual([]);
  });
});

describe('winnaar', () => {
  it('is er pas als er één speler over is', () => {
    expect(winnaar(potje(5), { a: 5, b: 4, c: 3 })).toBe(null);
    expect(winnaar(potje(5), { a: 5, b: 6, c: 3 })).toBe('c');
  });
  it('geen winnaar als iedereen nog leeft of iedereen dood is', () => {
    expect(winnaar(potje(5), { a: 0, b: 0, c: 0 })).toBe(null);
    expect(winnaar(potje(5), { a: 5, b: 5, c: 5 })).toBe(null);
  });
});

describe('ongedaan maken', () => {
  it('vindt de laatste streep van het potje', () => {
    const strepen = [s('a'), s('b'), s('c', 1, 'ander')];
    expect(laatsteStreep('p1', strepen).speler).toBe('b');
    expect(laatsteStreep('leeg', strepen)).toBe(null);
  });
  it('stand gaat nooit onder nul', () => {
    expect(magMin(0)).toBe(false);
    expect(magMin(1)).toBe(true);
  });
});

describe('doodsvolgorde', () => {
  it('houdt de volgorde bij en vergeet gecorrigeerde doden', () => {
    const p = potje(2);
    const strepen = [s('a'), s('b'), s('b'), s('a'), s('b', -1), s('c'), s('c')];
    // b ging dood, werd gecorrigeerd; daarna a en c.
    expect(doodsVolgorde(p, strepen)).toEqual(['a', 'c']);
    expect(eersteDood(p, strepen)).toBe('a');
  });
  it('geen doden: null', () => {
    expect(eersteDood(potje(), [s('a')])).toBe(null);
  });
});

describe('turfblokjes', () => {
  it('maakt blokjes van vijf', () => {
    expect(turfblokjes(0)).toEqual([]);
    expect(turfblokjes(4)).toEqual([4]);
    expect(turfblokjes(5)).toEqual([5]);
    expect(turfblokjes(12)).toEqual([5, 5, 2]);
  });
});
