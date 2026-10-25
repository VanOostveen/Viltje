import { describe, it, expect } from 'vitest';
import { vakken as maakVakken, kies, hoeken, eindRotatie } from '../src/logic/rad.js';

const gewogen = (ws) => ws.map((gewicht, i) => ({ id: `v${i}`, gewicht }));

describe('rad', () => {
  it('geeft elke opdracht een even groot vak', () => {
    expect(maakVakken(['Adtje', 'Rondje geven'])).toEqual([
      { id: 'Adtje', gewicht: 1 },
      { id: 'Rondje geven', gewicht: 1 },
    ]);
  });
  it('werkt ook met één opdracht', () => {
    const v = maakVakken(['Adtje']);
    expect(kies(v, () => 0.7)).toBe(0);
    expect(hoeken(v)).toEqual([{ id: 'Adtje', van: 0, tot: 360 }]);
  });
  it('kiest volgens de gewichten', () => {
    const vakken = gewogen([1, 2, 1]); // totaal 4
    expect(kies(vakken, () => 0)).toBe(0);
    expect(kies(vakken, () => 0.26)).toBe(1);
    expect(kies(vakken, () => 0.74)).toBe(1);
    expect(kies(vakken, () => 0.76)).toBe(2);
    expect(kies(vakken, () => 0.9999)).toBe(2);
  });
  it('verdeelt de hoeken naar gewicht', () => {
    const h = hoeken(gewogen([1, 2, 1]));
    expect(h.map((v) => [v.van, v.tot])).toEqual([[0, 90], [90, 270], [270, 360]]);
  });
  it('laat de wijzer in het gekozen vak landen', () => {
    const vakken = maakVakken(['a', 'b', 'c', 'd']);
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
