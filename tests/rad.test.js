import { describe, it, expect } from 'vitest';
import { gewichten, kies, hoeken, eindRotatie } from '../src/logic/rad.js';

describe('rad', () => {
  it('geeft iedereen hetzelfde gewicht, tenzij de verliezer zwaarder weegt', () => {
    expect(gewichten(['a', 'b'], 'a', false).map((v) => v.gewicht)).toEqual([1, 1]);
    expect(gewichten(['a', 'b'], 'a', true).map((v) => v.gewicht)).toEqual([2, 1]);
  });
  it('kiest volgens de gewichten', () => {
    const vakken = gewichten(['a', 'b', 'c'], 'b', true); // 1, 2, 1 → totaal 4
    expect(kies(vakken, () => 0)).toBe(0);
    expect(kies(vakken, () => 0.26)).toBe(1);
    expect(kies(vakken, () => 0.74)).toBe(1);
    expect(kies(vakken, () => 0.76)).toBe(2);
    expect(kies(vakken, () => 0.9999)).toBe(2);
  });
  it('verdeelt de hoeken naar gewicht', () => {
    const h = hoeken(gewichten(['a', 'b', 'c'], 'b', true));
    expect(h.map((v) => [v.van, v.tot])).toEqual([[0, 90], [90, 270], [270, 360]]);
  });
  it('laat de wijzer in het gekozen vak landen', () => {
    const vakken = gewichten(['a', 'b', 'c', 'd'], null, false);
    for (const r of [0, 0.5, 0.999]) {
      for (let i = 0; i < 4; i++) {
        const rot = eindRotatie(vakken, i, () => r);
        const onderWijzer = (360 - (rot % 360)) % 360;
        expect(onderWijzer).toBeGreaterThan(i * 90);
        expect(onderWijzer).toBeLessThan((i + 1) * 90);
      }
    }
  });
});
