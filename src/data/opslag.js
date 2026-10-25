// Opslag in de browser: IndexedDB (via idb), met localStorage als terugval
// en een geheugenvariant voor tests.
import { openDB } from 'idb';
import { STORES } from './migratie.js';

const DB_NAAM = 'viltje';
const DB_VERSIE = 1;

export async function idbOpslag(idb = globalThis.indexedDB) {
  if (!idb) throw new Error('Geen IndexedDB');
  const db = await openDB(DB_NAAM, DB_VERSIE, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'sleutel' });
    },
  });
  return {
    soort: 'indexeddb',
    async laad() {
      const uit = {};
      for (const store of STORES) uit[store] = await db.getAll(store);
      uit.meta = await db.get('meta', 'meta');
      return uit;
    },
    /** Alle wijzigingen van één actie in één transactie: alles of niets. */
    async pasToe({ zet, verwijder }) {
      const stores = [...new Set([...zet, ...verwijder].map(([store]) => store))];
      if (!stores.length) return;
      const tx = db.transaction(stores, 'readwrite');
      for (const [store, obj] of zet) tx.objectStore(store).put(obj);
      for (const [store, id] of verwijder) tx.objectStore(store).delete(id);
      await tx.done;
    },
    async vervangAlles(data) {
      const tx = db.transaction([...STORES, 'meta'], 'readwrite');
      for (const store of STORES) {
        await tx.objectStore(store).clear();
        for (const obj of data[store]) tx.objectStore(store).put(obj);
      }
      tx.objectStore('meta').put(data.meta);
      await tx.done;
    },
  };
}

/** Bewaart alles als JSON per store; storage is localStorage of iets met dezelfde vorm. */
export function sleutelOpslag(storage, soort = 'localstorage') {
  const sleutel = (store) => `viltje:${store}`;
  const lees = (store) => JSON.parse(storage.getItem(sleutel(store)) ?? '[]');
  const schrijf = (store, lijst) => storage.setItem(sleutel(store), JSON.stringify(lijst));
  return {
    soort,
    async laad() {
      const uit = {};
      for (const store of STORES) uit[store] = lees(store);
      uit.meta = JSON.parse(storage.getItem(sleutel('meta')) ?? 'null') ?? undefined;
      return uit;
    },
    async pasToe({ zet, verwijder }) {
      const lijsten = {};
      const lijst = (store) => (lijsten[store] ??= new Map(lees(store).map((o) => [o.id, o])));
      for (const [store, obj] of zet) {
        if (store === 'meta') storage.setItem(sleutel('meta'), JSON.stringify(obj));
        else lijst(store).set(obj.id, obj);
      }
      for (const [store, id] of verwijder) lijst(store).delete(id);
      for (const [store, kaart] of Object.entries(lijsten)) schrijf(store, [...kaart.values()]);
    },
    async vervangAlles(data) {
      for (const store of STORES) schrijf(store, data[store]);
      storage.setItem(sleutel('meta'), JSON.stringify(data.meta));
    },
  };
}

/**
 * Wat er tussen twee toestanden veranderde. De reducer vervangt objecten in
 * plaats van ze aan te passen, dus een ander object betekent een wijziging.
 */
export function verschil(oud, nieuw) {
  const zet = [];
  const verwijder = [];
  for (const store of STORES) {
    if (oud[store] === nieuw[store]) continue;
    const weg = new Map(oud[store].map((o) => [o.id, o]));
    for (const obj of nieuw[store]) {
      if (weg.get(obj.id) !== obj) zet.push([store, obj]);
      weg.delete(obj.id);
    }
    for (const id of weg.keys()) verwijder.push([store, id]);
  }
  if (oud.meta !== nieuw.meta) zet.push(['meta', nieuw.meta]);
  return { zet, verwijder };
}

export function geheugenOpslag() {
  const kaart = new Map();
  return sleutelOpslag(
    {
      getItem: (k) => (kaart.has(k) ? kaart.get(k) : null),
      setItem: (k, v) => kaart.set(k, String(v)),
    },
    'geheugen',
  );
}

export async function openOpslag() {
  try {
    return await idbOpslag();
  } catch {
    try {
      localStorage.setItem('viltje:test', '1');
      localStorage.removeItem('viltje:test');
      return sleutelOpslag(localStorage);
    } catch {
      return geheugenOpslag();
    }
  }
}
