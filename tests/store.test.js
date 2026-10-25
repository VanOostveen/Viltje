import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { maakStore } from '../src/data/store.js';
import { geheugenOpslag, idbOpslag } from '../src/data/opslag.js';
import { STILTE_MS } from '../src/logic/avond.js';

let nu;
const klok = () => nu;
const INST = { doodBij: 5, armoede: true, rad: false };

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

async function strepen(store, potjeId, spelerId, n) {
  let uit;
  for (let i = 0; i < n; i++) uit = await store.streep(potjeId, spelerId, 1);
  return uit;
}

beforeEach(() => {
  nu = 1_000_000;
});

describe('store: een potje spelen', () => {
  it('start een avond met het eerste potje en wijst een winnaar aan', async () => {
    const store = await nieuweStore();
    const [a, b, c] = await drieSpelers(store);
    const p = await store.startPotje([a, b, c], INST);
    expect(store.openAvond().spelers).toEqual([a, b, c]);

    const r1 = await strepen(store, p.id, a, 4);
    expect(r1.nieuwArm).toEqual([a]);
    expect((await store.streep(p.id, a, 1)).nieuwDood).toBe(a);
    const r = await strepen(store, p.id, b, 5);
    expect(r.winnaar).toBe(c);
    expect(store.potje(p.id).winnaar).toBe(c);
    expect(store.lopendPotje()).toBe(null);
    expect(store.verliezer(store.potje(p.id))).toBe(a);
  });

  it('ongedaan maken heropent een afgelopen potje', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], INST);
    await strepen(store, p.id, a, 5);
    expect(store.potje(p.id).winnaar).toBe(b);
    const weg = await store.ongedaan(p.id);
    expect(weg.speler).toBe(a);
    expect(store.potje(p.id).winnaar).toBe(null);
    expect(store.potje(p.id).einde).toBe(null);
    expect(store.standen(store.potje(p.id))[a]).toBe(4);
  });

  it('houdt laf bij, maximaal twee keer, en ongedaan maken haalt het weg', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], INST);
    expect(await store.laf(p.id, a)).toBe(true);
    expect(await store.laf(p.id, a)).toBe(true);
    expect(await store.laf(p.id, a)).toBe(false);
    expect(store.lafTellers(store.potje(p.id))[a]).toBe(2);
    expect(store.standen(store.potje(p.id))[a]).toBe(0);
    expect((await store.ongedaan(p.id)).soort).toBe('laf');
    expect(store.lafTellers(store.potje(p.id))[a]).toBe(1);
  });

  it('min-knop gaat niet onder nul', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], INST);
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
    await expect(store.startPotje([a], INST)).rejects.toThrow();
    await expect(store.startPotje(Array(9).fill(a), INST)).rejects.toThrow();
  });

  it('bewaart de uitkomst van het rad', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], { ...INST, rad: true });
    await strepen(store, p.id, a, 5);
    await store.radUitkomst(p.id, 'Adtje');
    expect(store.potje(p.id).uitkomstRad).toBe('Adtje');
  });
});

describe('store: avonden', () => {
  it('sluit een avond na 12 uur stilte en begint dan een nieuwe', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p1 = await store.startPotje([a, b], INST);
    await strepen(store, p1.id, a, 5);
    const eersteAvond = store.openAvond().id;
    nu += STILTE_MS + 100; // de strepen liggen een paar ms na de start
    await store.startPotje([a, b], INST);
    expect(store.openAvond().id).not.toBe(eersteAvond);
    expect(store.data.avonden.find((x) => x.id === eersteAvond).einde).toBe(store.potje(p1.id).einde);
  });

  it('avond klaar gooit een onafgemaakt potje weg', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p1 = await store.startPotje([a, b], INST);
    await strepen(store, p1.id, a, 5);
    await store.startPotje([a, b], INST);
    await store.avondKlaar();
    expect(store.data.potjes).toHaveLength(1);
    expect(store.openAvond()).toBe(null);
  });

  it('verwijderen van het laatste potje verwijdert ook de avond', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], INST);
    await strepen(store, p.id, a, 5);
    await store.potjeVerwijderen(p.id);
    expect(store.data.avonden).toHaveLength(0);
    expect(store.data.strepen).toHaveLength(0);
  });
});

describe('store: spelers', () => {
  it('archiveert wie al speelde, verwijdert wie nooit speelde', async () => {
    const store = await nieuweStore();
    const [a, b, c] = await drieSpelers(store);
    await store.startPotje([a, b], INST);
    await store.spelerVerwijderen(a);
    await store.spelerVerwijderen(c);
    expect(store.speler(a).gearchiveerd).toBe(true);
    expect(store.speler(c)).toBeUndefined();
    expect(store.actieveSpelers().map((s) => s.naam)).toEqual(['Bram']);
  });

  it('weigert een dubbele naam', async () => {
    const store = await nieuweStore();
    await drieSpelers(store);
    await expect(store.spelerToevoegen({ naam: ' anna ' })).rejects.toThrow(/al in de lijst/);
  });
});

describe('opslag', () => {
  it('alles wat de reducer doet staat na herladen ook in IndexedDB', async () => {
    const store = await nieuweStore(await idbOpslag());
    const [a, b, c] = await drieSpelers(store);
    const p = await store.startPotje([a, b, c], { ...INST, rad: true });
    await store.laf(p.id, c);
    await strepen(store, p.id, a, 5);
    await store.ongedaan(p.id);
    await store.streep(p.id, a, 1);
    await strepen(store, p.id, b, 5);
    await store.radUitkomst(p.id, 'Adtje');
    await store.radOptieToevoegen('Rondje geven');
    await store.spelerVerwijderen(c);

    const herladen = await nieuweStore(await idbOpslag());
    // IndexedDB geeft alles terug op volgorde van id.
    const opId = (lijst) => [...lijst].sort((x, y) => x.id.localeCompare(y.id));
    for (const naam of ['spelers', 'avonden', 'potjes', 'strepen']) {
      expect(opId(herladen.data[naam])).toEqual(opId(store.data[naam]));
    }
    expect(herladen.meta).toEqual(store.meta);
  });
});

describe('back-up', () => {
  it('export en import geven dezelfde data terug', async () => {
    const store = await nieuweStore();
    const [a, b] = await drieSpelers(store);
    const p = await store.startPotje([a, b], INST);
    await store.laf(p.id, a);
    await strepen(store, p.id, b, 5);
    const json = JSON.stringify(store.exporteer());

    const tweede = await nieuweStore(geheugenOpslag());
    await tweede.importeer(json);
    expect(tweede.data.spelers).toEqual(store.data.spelers);
    expect(tweede.data.potjes).toEqual(store.data.potjes);
    expect(tweede.data.strepen).toEqual(store.data.strepen);
  });
});
