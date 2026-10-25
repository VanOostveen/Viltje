import { describe, it, expect } from 'vitest';
import { isVerlopen, laatsteActiviteit, STILTE_MS } from '../src/logic/avond.js';

describe('avond', () => {
  const avond = { id: 'a1', start: 1000, einde: null };
  const potjes = [{ id: 'p1', avond: 'a1', start: 2000, einde: 5000 }];
  const strepen = [{ id: 's', potje: 'p1', speler: 'x', delta: 1, tijdstip: 4000 }];

  it('vindt de laatste activiteit', () => {
    expect(laatsteActiviteit(avond, potjes, strepen)).toBe(5000);
  });
  it('verloopt na 12 uur stilte', () => {
    expect(isVerlopen(avond, potjes, strepen, 5000 + STILTE_MS)).toBe(false);
    expect(isVerlopen(avond, potjes, strepen, 5001 + STILTE_MS)).toBe(true);
  });
  it('een gesloten avond verloopt niet', () => {
    expect(isVerlopen({ ...avond, einde: 6000 }, potjes, strepen, 1e12)).toBe(false);
  });
});
