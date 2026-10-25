// App-toestand: alle data in het geheugen, elke wijziging direct naar de opslag.
import { leegData, migreer, maakExport, leesExport } from './migratie.js';
import { standen, winnaar, laatsteStreep, armen, eersteDood, SPELERS_MIN, SPELERS_MAX } from '../logic/score.js';
import { isVerlopen, laatsteActiviteit } from '../logic/avond.js';

export const KLEUREN = ['#9E2333', '#2F6E8E', '#C7841F', '#3F7D4E', '#6B4C9A', '#B5527B', '#5A6B73', '#8A5A2B'];

function nieuwId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function maakStore(opslag, klok = () => Date.now()) {
  let data = leegData();
  let laatsteTijd = 0;
  const luisteraars = new Set();

  // Strepen moeten op volgorde blijven, ook bij twee tikken in dezelfde milliseconde.
  const tijd = () => {
    laatsteTijd = Math.max(klok(), laatsteTijd + 1);
    return laatsteTijd;
  };
  const meld = () => luisteraars.forEach((f) => f());
  const zet = (store, obj) => opslag.zet(store, obj);

  function zetIn(lijst, obj) {
    const i = lijst.findIndex((o) => o.id === obj.id);
    if (i >= 0) lijst[i] = obj;
    else lijst.push(obj);
  }

  const store = {
    get data() {
      return data;
    },
    get meta() {
      return data.meta;
    },
    luister(f) {
      luisteraars.add(f);
      return () => luisteraars.delete(f);
    },

    async init() {
      data = migreer(await opslag.laad());
      laatsteTijd = data.strepen.reduce((m, s) => Math.max(m, s.tijdstip), 0);
      await zet('meta', data.meta);
      await store.sluitVerlopenAvonden();
    },

    async zetMeta(patch) {
      data.meta = { ...data.meta, ...patch };
      await zet('meta', data.meta);
      meld();
    },

    // ---- Spelers ----
    speler: (id) => data.spelers.find((s) => s.id === id),
    actieveSpelers: () =>
      data.spelers.filter((s) => !s.gearchiveerd).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),

    async spelerToevoegen({ naam, kleur, emoji = '' }) {
      naam = naam.trim();
      if (!naam) throw new Error('Geef de speler een naam.');
      const speler = {
        id: nieuwId(),
        naam,
        kleur: kleur ?? KLEUREN[data.spelers.length % KLEUREN.length],
        emoji: emoji.trim(),
        aangemaakt: klok(),
      };
      data.spelers.push(speler);
      await zet('spelers', speler);
      meld();
      return speler;
    },

    async spelerWijzigen(id, patch) {
      const speler = { ...store.speler(id), ...patch };
      if (patch.naam !== undefined) {
        speler.naam = patch.naam.trim();
        if (!speler.naam) throw new Error('Geef de speler een naam.');
      }
      zetIn(data.spelers, speler);
      await zet('spelers', speler);
      meld();
    },

    heeftGespeeld: (id) => data.potjes.some((p) => p.spelers.includes(id)),

    /** Wie al potjes speelde wordt gearchiveerd, zodat de statistieken kloppen. */
    async spelerVerwijderen(id) {
      if (store.heeftGespeeld(id)) return store.spelerWijzigen(id, { gearchiveerd: true });
      data.spelers = data.spelers.filter((s) => s.id !== id);
      await opslag.verwijder('spelers', id);
      meld();
    },

    // ---- Avonden ----
    openAvond: () => data.avonden.find((a) => !a.einde) ?? null,
    potjesVan: (avondId) =>
      data.potjes.filter((p) => p.avond === avondId).sort((a, b) => a.start - b.start),

    async sluitVerlopenAvonden() {
      for (const avond of data.avonden) {
        if (isVerlopen(avond, data.potjes, data.strepen, klok())) {
          await store.avondKlaar(avond.id, laatsteActiviteit(avond, data.potjes, data.strepen));
        }
      }
    },

    async avondKlaar(avondId = store.openAvond()?.id, einde = klok()) {
      const avond = data.avonden.find((a) => a.id === avondId);
      if (!avond) return;
      // Een potje zonder winnaar aan het eind van de avond telt niet.
      for (const p of store.potjesVan(avondId)) {
        if (!p.einde) await store.potjeVerwijderen(p.id, { stil: true });
      }
      if (!data.avonden.includes(avond)) return meld();
      const klaar = { ...avond, einde };
      zetIn(data.avonden, klaar);
      await zet('avonden', klaar);
      meld();
    },

    // ---- Potjes ----
    potje: (id) => data.potjes.find((p) => p.id === id),
    lopendPotje: () => data.potjes.find((p) => !p.einde) ?? null,
    standen: (potje) => standen(potje, data.strepen),

    async startPotje(spelerIds, instellingen) {
      if (spelerIds.length < SPELERS_MIN || spelerIds.length > SPELERS_MAX) {
        throw new Error(`Kies ${SPELERS_MIN} tot ${SPELERS_MAX} spelers.`);
      }
      await store.sluitVerlopenAvonden();
      const lopend = store.lopendPotje();
      if (lopend) await store.potjeVerwijderen(lopend.id, { stil: true });

      const nu = klok();
      let avond = store.openAvond();
      if (!avond) {
        avond = { id: nieuwId(), start: nu, einde: null, spelers: [] };
        data.avonden.push(avond);
      }
      avond = { ...avond, spelers: [...new Set([...avond.spelers, ...spelerIds])] };
      zetIn(data.avonden, avond);
      await zet('avonden', avond);

      const potje = {
        id: nieuwId(),
        avond: avond.id,
        spelers: [...spelerIds],
        instellingen: { ...instellingen },
        start: nu,
        einde: null,
        winnaar: null,
        uitkomstRad: null,
      };
      data.potjes.push(potje);
      await zet('potjes', potje);
      data.meta = { ...data.meta, instellingen: { ...instellingen } };
      await zet('meta', data.meta);
      meld();
      return potje;
    },

    /**
     * Zet een streep (+1) of haalt er een af (−1).
     * Geeft terug wat er veranderde: { winnaar, nieuwArm, nieuwDood }.
     */
    async streep(potjeId, spelerId, delta) {
      const potje = store.potje(potjeId);
      if (!potje || potje.einde) return {};
      const voor = standen(potje, data.strepen);
      if (delta < 0 && voor[spelerId] <= 0) return {};
      const armVoor = armen(potje, voor);

      const streep = { id: nieuwId(), potje: potjeId, speler: spelerId, delta: delta > 0 ? 1 : -1, tijdstip: tijd() };
      data.strepen.push(streep);
      await zet('strepen', streep);

      const na = standen(potje, data.strepen);
      const nieuwArm = armen(potje, na).filter((id) => !armVoor.includes(id));
      const { doodBij } = potje.instellingen;
      const nieuwDood = voor[spelerId] < doodBij && na[spelerId] >= doodBij ? spelerId : null;
      const w = winnaar(potje, na);
      if (w) {
        const klaar = { ...potje, einde: streep.tijdstip, winnaar: w };
        zetIn(data.potjes, klaar);
        await zet('potjes', klaar);
      }
      meld();
      return { winnaar: w, nieuwArm, nieuwDood };
    },

    /** Verwijdert de laatste streep; een afgelopen potje gaat dan weer verder. */
    async ongedaan(potjeId) {
      const potje = store.potje(potjeId);
      const laatste = potje && laatsteStreep(potjeId, data.strepen);
      if (!laatste) return null;
      data.strepen = data.strepen.filter((s) => s.id !== laatste.id);
      await opslag.verwijder('strepen', laatste.id);
      if (potje.einde && !winnaar(potje, standen(potje, data.strepen))) {
        const weer = { ...potje, einde: null, winnaar: null, uitkomstRad: null };
        zetIn(data.potjes, weer);
        await zet('potjes', weer);
      }
      meld();
      return laatste;
    },

    verliezer: (potje) => eersteDood(potje, data.strepen),

    async radUitkomst(potjeId, spelerId) {
      const potje = { ...store.potje(potjeId), uitkomstRad: spelerId };
      zetIn(data.potjes, potje);
      await zet('potjes', potje);
      meld();
    },

    async potjeVerwijderen(potjeId, { stil = false } = {}) {
      const potje = store.potje(potjeId);
      if (!potje) return;
      for (const s of data.strepen.filter((s) => s.potje === potjeId)) {
        await opslag.verwijder('strepen', s.id);
      }
      data.strepen = data.strepen.filter((s) => s.potje !== potjeId);
      data.potjes = data.potjes.filter((p) => p.id !== potjeId);
      await opslag.verwijder('potjes', potjeId);
      // Een avond zonder potjes bestaat niet.
      if (!data.potjes.some((p) => p.avond === potje.avond)) {
        data.avonden = data.avonden.filter((a) => a.id !== potje.avond);
        await opslag.verwijder('avonden', potje.avond);
      }
      if (!stil) meld();
    },

    // ---- Back-up ----
    exporteer: () => maakExport(data, klok()),

    async importeer(invoer) {
      const nieuw = leesExport(invoer);
      await opslag.vervangAlles(nieuw);
      data = nieuw;
      laatsteTijd = data.strepen.reduce((m, s) => Math.max(m, s.tijdstip), 0);
      await store.sluitVerlopenAvonden();
      meld();
    },
  };
  return store;
}
