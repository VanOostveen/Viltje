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
    zet: (store, obj) => db.put(store, obj),
    verwijder: (store, id) => db.delete(store, id),
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
    async zet(store, obj) {
      if (store === 'meta') return storage.setItem(sleutel('meta'), JSON.stringify(obj));
      const lijst = lees(store).filter((o) => o.id !== obj.id);
      lijst.push(obj);
      schrijf(store, lijst);
    },
    async verwijder(store, id) {
      schrijf(store, lees(store).filter((o) => o.id !== id));
    },
    async vervangAlles(data) {
      for (const store of STORES) schrijf(store, data[store]);
      storage.setItem(sleutel('meta'), JSON.stringify(data.meta));
    },
  };
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
