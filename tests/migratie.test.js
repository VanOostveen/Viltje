import { describe, it, expect } from 'vitest';
import { leesExport, migreer, SCHEMA_VERSIE } from '../src/data/migratie.js';

const v1 = {
  app: 'viltje',
  schemaversie: 1,
  spelers: [{ id: 'a', naam: 'Anna' }],
  avonden: [{ id: 'x', start: 1, einde: 9, spelers: ['a'] }],
  potjes: [{ id: 'p', avond: 'x', spelers: ['a'], instellingen: { doodBij: 10 }, start: 1, einde: 9, winnaar: 'a', uitkomstRad: 'a' }],
  strepen: [{ id: 's', potje: 'p', speler: 'a', delta: 1, tijdstip: 2 }],
  meta: { schemaversie: 1, verliezerZwaarder: true, minPotjes: 3 },
};

describe('migratie', () => {
  it('zet versie 1 om naar de huidige versie', () => {
    const d = leesExport(JSON.stringify(v1));
    expect(d.meta.schemaversie).toBe(SCHEMA_VERSIE);
    expect(d.strepen[0].soort).toBe('streep');
    expect(d.potjes[0].uitkomstRad).toBe(null);
    expect(d.meta.radOpties).toEqual(['Adtje']);
    expect(d.meta.verliezerZwaarder).toBeUndefined();
    expect(d.meta.minPotjes).toBe(3);
  });

  it('lege opslag krijgt standaardwaarden', () => {
    const d = migreer({ spelers: [], avonden: [], potjes: [], strepen: [] });
    expect(d.meta.radOpties).toEqual(['Adtje']);
    expect(d.meta.instellingen.doodBij).toBe(10);
  });

  it('weigert ongeldige bestanden', () => {
    expect(() => leesExport('geen json')).toThrow(/geen geldig/);
    expect(() => leesExport({ app: 'iets anders' })).toThrow(/geen back-up/);
    expect(() => leesExport({ app: 'viltje', spelers: [] })).toThrow(/onvolledig/);
    expect(() =>
      leesExport({ app: 'viltje', schemaversie: SCHEMA_VERSIE + 1, spelers: [], avonden: [], potjes: [], strepen: [] }),
    ).toThrow(/nieuwere versie/);
  });
});
