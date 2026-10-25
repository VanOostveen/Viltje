import { describe, it, expect } from 'vitest';
import { reducer, lopendPotje, openAvond } from '../src/logic/reducer.js';
import { leegData } from '../src/data/migratie.js';
import { standen, lafTellers } from '../src/logic/score.js';
import { STILTE_MS } from '../src/logic/avond.js';

const INST = { doodBij: 5, armoede: true, rad: true };
let n = 0;
const id = () => `id${++n}`;
let tijd = 1000;

/** Past acties na elkaar toe. */
const speel = (t, ...acties) => acties.reduce(reducer, t);

const speler = (naam) => ({ type: 'speler/toegevoegd', speler: { id: naam, naam, kleur: '#000', emoji: '', aangemaakt: 0 } });
const start = (spelers, inst = INST, nu = ++tijd) => ({ type: 'potje/gestart', potjeId: id(), avondId: id(), spelers, instellingen: inst, nu });
const streep = (potje, speler, delta = 1) => ({ type: 'streep/gezet', streep: { id: id(), potje, speler, delta, tijdstip: ++tijd } });
const laf = (potje, speler) => ({ type: 'laf/gezet', laf: { id: id(), potje, speler, tijdstip: ++tijd } });
const keer = (k, maak) => Array.from({ length: k }, maak);

function metPotje(spelers = ['a', 'b', 'c'], inst = INST) {
  const t = speel(leegData(), ...spelers.map(speler), start(spelers, inst));
  return [t, lopendPotje(t).id];
}

describe('reducer', () => {
  it('verandert nooit de oude toestand', () => {
    const [t, p] = metPotje();
    const kopie = structuredClone(t);
    speel(t, streep(p, 'a'), laf(p, 'b'), { type: 'ongedaan', potje: p }, { type: 'potje/verwijderd', id: p });
    expect(t).toEqual(kopie);
  });

  it('negeert onbekende en ongeldige acties door dezelfde toestand terug te geven', () => {
    const [t, p] = metPotje();
    expect(reducer(t, { type: 'bestaat/niet' })).toBe(t);
    expect(reducer(t, streep('ander-potje', 'a'))).toBe(t);
    expect(reducer(t, streep(p, 'onbekend'))).toBe(t);
    expect(reducer(t, streep(p, 'a', 2))).toBe(t);
    expect(reducer(t, streep(p, 'a', -1))).toBe(t);
    expect(reducer(t, speler(''))).toBe(t);
    expect(reducer(t, speler('a'))).toBe(t);
  });

  it('weigert een potje met ongeldige spelers of instellingen', () => {
    const t = speel(leegData(), speler('a'), speler('b'));
    expect(reducer(t, start(['a']))).toBe(t);
    expect(reducer(t, start(['a', 'a']))).toBe(t);
    expect(reducer(t, start(['a', 'x']))).toBe(t);
    expect(reducer(t, start(['a', 'b'], { doodBij: 4 }))).toBe(t);
    expect(reducer(t, start(['a', 'b'], { doodBij: 31 }))).toBe(t);
  });

  it('wijst de winnaar aan en accepteert daarna niets meer in dat potje', () => {
    let [t, p] = metPotje();
    t = speel(t, ...keer(5, () => streep(p, 'a')), ...keer(5, () => streep(p, 'b')));
    const potje = t.potjes.find((x) => x.id === p);
    expect(potje.winnaar).toBe('c');
    expect(potje.einde).toBe(tijd);
    expect(reducer(t, streep(p, 'c'))).toBe(t);
    expect(reducer(t, laf(p, 'c'))).toBe(t);
  });

  it('ongedaan maken heropent het potje en wist de uitkomst van het rad', () => {
    let [t, p] = metPotje(['a', 'b']);
    t = speel(t, ...keer(5, () => streep(p, 'a')), { type: 'rad/uitkomst', potje: p, opdracht: 'Adtje' });
    expect(t.potjes[0].uitkomstRad).toBe('Adtje');
    t = reducer(t, { type: 'ongedaan', potje: p });
    expect(t.potjes[0]).toMatchObject({ einde: null, winnaar: null, uitkomstRad: null });
  });

  it('laf: twee keer mag, de derde keer niet, en niet als je dood bent', () => {
    let [t, p] = metPotje();
    t = speel(t, laf(p, 'a'), laf(p, 'a'));
    expect(reducer(t, laf(p, 'a'))).toBe(t);
    const potje = t.potjes[0];
    expect(lafTellers(potje, t.strepen)).toEqual({ a: 2, b: 0, c: 0 });
    expect(standen(potje, t.strepen)).toEqual({ a: 0, b: 0, c: 0 });
    t = speel(t, ...keer(5, () => streep(p, 'b')));
    expect(reducer(t, laf(p, 'b'))).toBe(t);
  });

  it('ongedaan maken haalt de laatste actie weg, ook als dat laf was', () => {
    let [t, p] = metPotje();
    t = speel(t, streep(p, 'a'), laf(p, 'b'), { type: 'ongedaan', potje: p });
    expect(lafTellers(t.potjes[0], t.strepen).b).toBe(0);
    expect(standen(t.potjes[0], t.strepen).a).toBe(1);
  });

  it('een nieuw potje gooit een onafgemaakt potje weg', () => {
    let [t, p] = metPotje();
    t = speel(t, streep(p, 'a'), start(['a', 'b']));
    expect(t.potjes).toHaveLength(1);
    expect(t.strepen).toHaveLength(0);
    expect(t.avonden).toHaveLength(1);
  });

  it('volgende potjes horen bij dezelfde avond', () => {
    let [t, p] = metPotje();
    t = speel(t, ...keer(5, () => streep(p, 'a')), ...keer(5, () => streep(p, 'b')), start(['b', 'c']));
    expect(t.avonden).toHaveLength(1);
    expect(t.potjes.map((x) => x.avond)).toEqual([t.avonden[0].id, t.avonden[0].id]);
  });

  it('na 12 uur stilte begint een nieuw potje een nieuwe avond', () => {
    let [t, p] = metPotje(['a', 'b']);
    t = speel(t, ...keer(5, () => streep(p, 'a')));
    const eerste = openAvond(t);
    t = reducer(t, start(['a', 'b'], INST, tijd + STILTE_MS + 1));
    expect(t.avonden).toHaveLength(2);
    expect(t.avonden.find((a) => a.id === eerste.id).einde).toBe(t.potjes[0].einde);
    expect(openAvond(t).id).not.toBe(eerste.id);
  });

  it('rad-opties: toevoegen zonder dubbelen, altijd minstens één', () => {
    let t = leegData();
    t = speel(t, { type: 'rad/optie-toegevoegd', tekst: ' Rondje geven ' }, { type: 'rad/optie-toegevoegd', tekst: 'adtje' });
    expect(t.meta.radOpties).toEqual(['Adtje', 'Rondje geven']);
    t = speel(t, { type: 'rad/optie-verwijderd', tekst: 'Adtje' });
    expect(t.meta.radOpties).toEqual(['Rondje geven']);
    expect(reducer(t, { type: 'rad/optie-verwijderd', tekst: 'Rondje geven' })).toBe(t);
  });

  it('rad-uitkomst alleen voor een afgelopen potje met het rad aan', () => {
    const [t, p] = metPotje();
    expect(reducer(t, { type: 'rad/uitkomst', potje: p, opdracht: 'Adtje' })).toBe(t);
  });

  it('archiveert een speler die al speelde in plaats van te verwijderen', () => {
    const [t] = metPotje(['a', 'b']);
    const na = speel(t, speler('c'), { type: 'speler/verwijderd', id: 'a' }, { type: 'speler/verwijderd', id: 'c' });
    expect(na.spelers.map((s) => [s.id, !!s.gearchiveerd])).toEqual([['a', true], ['b', false]]);
  });
});
