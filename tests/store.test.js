import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { maakStore } from '../src/data/store.js';
import { geheugenOpslag, idbOpslag } from '../src/data/opslag.js';
import { leesExport, SCHEMA_VERSIE } from '../src/data/migratie.js';
import { STILTE_MS } from '../src/logic/avond.js';

let nu;
const klok = () => nu;

async function nieuweStore(opslag = geheugenOpslag()) {
  const store = maakStore(opslag, klok);
  await store.init();
  return store;
}

async function drieSpelers(store) {
  const a = await store.spelerToevoegen({ naam: 'Anna' });
  const b = await store.spelerToevoegen({ naam: 'Bram' });
  const c = await store.spelerToevoegen({ naam: 'Cor' });
  return [a.id, b.id, c.id];
}

beforeEach(() => {
  nu = 1_000_000;
});

describe('store: een potje spelen', () => {
  it('start een avond met het eerste potje en wijst een winnaar aan', async () => {
    const store = await nieuweStore();
    const [a, b, c] = await drieSpelers(store);
    const p = await store.startPotje([a, b, c], { doodBij: 2, armoede: true, rad: false });
    expect(store.openAvond().spelers).toEqual([a, b, c]);

    const r1 = await store.streep(p.id, a, 1);
    expect(r1.nieuwArm).toEqual([a]);
    await store.streep(p.id, a, 1);
    await store.streep(p.id, b, 1);
    const r = await store.streep(p.id, b, 1);
    expect(r.winnaar).toBe(c);
    expect(store.potje(p.id).winnaar).toBe(c);
    expect(store.lopendPotje()).toBe(null);
    expect(store.verliezer(store.potje(p.id))).toBe(a);
  });

  it('ongedaan maken heropent een afgelopen potje', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], { doodBij: 1, armoede: false, rad: false });
    await store.streep(p.id, a, 1);
    expect(store.potje(p.id).winnaar).toBe(b);
    await store.ongedaan(p.id);
    expect(store.potje(p.id).winnaar).toBe(null);
    expect(store.potje(p.id).einde).toBe(null);
    expect(store.standen(store.potje(p.id))[a]).toBe(0);
  });

  it('min-knop gaat niet onder nul', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], { doodBij: 5, armoede: true, rad: false });
    await store.streep(p.id, a, -1);
    expect(store.data.strepen).toHaveLength(0);
  });

  it('onthoudt de laatst gebruikte instellingen', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    await store.startPotje([a, b], { doodBij: 15, armoede: false, rad: true });
    expect(store.meta.instellingen).toEqual({ doodBij: 15, armoede: false, rad: true });
  });

  it('weigert te weinig of te veel spelers', async () => {
    const store = await nieuweStore();
    const [a] = await drieSpelers(store);
    await expect(store.startPotje([a], { doodBij: 10 })).rejects.toThrow();
    await expect(store.startPotje(Array(9).fill(a), { doodBij: 10 })).rejects.toThrow();
  });
});

describe('store: avonden', () => {
  it('sluit een avond na 12 uur stilte en begint dan een nieuwe', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p1 = await store.startPotje([a, b], { doodBij: 1, armoede: true, rad: false });
    await store.streep(p1.id, a, 1);
    const eersteAvond = store.openAvond().id;
    nu += STILTE_MS + 1;
    await store.startPotje([a, b], { doodBij: 1, armoede: true, rad: false });
    expect(store.openAvond().id).not.toBe(eersteAvond);
    expect(store.data.avonden.find((x) => x.id === eersteAvond).einde).toBe(store.potje(p1.id).einde);
  });

  it('avond klaar gooit een onafgemaakt potje weg', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p1 = await store.startPotje([a, b], { doodBij: 1, armoede: true, rad: false });
    await store.streep(p1.id, a, 1);
    await store.startPotje([a, b], { doodBij: 3, armoede: true, rad: false });
    await store.avondKlaar();
    expect(store.data.potjes).toHaveLength(1);
    expect(store.openAvond()).toBe(null);
  });

  it('verwijderen van het laatste potje verwijdert ook de avond', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], { doodBij: 1, armoede: true, rad: false });
    await store.streep(p.id, a, 1);
    await store.potjeVerwijderen(p.id);
    expect(store.data.avonden).toHaveLength(0);
    expect(store.data.strepen).toHaveLength(0);
  });
});

describe('store: spelers', () => {
  it('archiveert wie al speelde, verwijdert wie nooit speelde', async () => {
    const store = await nieuweStore();
    const [a, b, c] = await drieSpelers(store);
    await store.startPotje([a, b], { doodBij: 5, armoede: true, rad: false });
    await store.spelerVerwijderen(a);
    await store.spelerVerwijderen(c);
    expect(store.speler(a).gearchiveerd).toBe(true);
    expect(store.speler(c)).toBeUndefined();
    expect(store.actieveSpelers().map((s) => s.naam)).toEqual(['Bram']);
  });
});

describe('back-up', () => {
  it('export en import geven dezelfde data terug (IndexedDB)', async () => {
    const store = await nieuweStore(await idbOpslag());
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], { doodBij: 1, armoede: true, rad: false });
    await store.streep(p.id, b, 1);
    const json = JSON.stringify(store.exporteer());

    const tweede = await nieuweStore(geheugenOpslag());
    await tweede.importeer(json);
    expect(tweede.data.spelers).toEqual(store.data.spelers);
    expect(tweede.data.potjes).toEqual(store.data.potjes);
    expect(tweede.data.strepen).toEqual(store.data.strepen);

    // En het overleeft opnieuw laden.
    const herladen = await nieuweStore(await idbOpslag());
    expect(herladen.data.potjes[0].winnaar).toBe(a);
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
