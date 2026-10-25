// App-toestand: alle data in het geheugen. Elke wijziging is een actie die door
// de reducer gaat; daarna gaat precies het verschil in één keer naar de opslag.
import { leegData, migreer, maakExport, leesExport } from './migratie.js';
import { verschil } from './opslag.js';
import { reducer, openAvond, lopendPotje } from '../logic/reducer.js';
import { standen, armen, eersteDood, lafTellers } from '../logic/score.js';

export const KLEUREN = ['#9E2333', '#2F6E8E', '#C7841F', '#3F7D4E', '#6B4C9A', '#B5527B', '#5A6B73', '#8A5A2B'];

function nieuwId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function maakStore(opslag, klok = () => Date.now()) {
  let data = leegData();
  let laatsteTijd = 0;
  let wachtrij = Promise.resolve();
  const luisteraars = new Set();

  // Acties moeten op volgorde blijven, ook bij twee tikken in dezelfde milliseconde.
  const tijd = () => {
    laatsteTijd = Math.max(klok(), laatsteTijd + 1);
    return laatsteTijd;
  };
  const meld = () => luisteraars.forEach((f) => f());

  /** Stuurt een actie door de reducer. Geeft true als er iets veranderde. */
  async function verwerk(actie) {
    const oud = data;
    const nieuw = reducer(oud, actie);
    if (nieuw === oud) return false;
    data = nieuw;
    // Schrijven gebeurt na elkaar, in de volgorde van de acties.
    wachtrij = wachtrij
      .then(() => opslag.pasToe(verschil(oud, nieuw)))
      .catch((e) => console.error('Opslaan mislukt', e));
    meld();
    await wachtrij;
    return true;
  }

  const store = {
    get data() {
      return data;
    },
    get meta() {
      return data.meta;
    },
    verwerk,
    luister(f) {
      luisteraars.add(f);
      return () => luisteraars.delete(f);
    },

    async init() {
      const rauw = await opslag.laad();
      data = migreer(rauw);
      laatsteTijd = data.strepen.reduce((m, s) => Math.max(m, s.tijdstip), 0);
      if (rauw.meta && rauw.meta.schemaversie !== data.meta.schemaversie) {
        await opslag.vervangAlles(data);
      } else {
        await opslag.pasToe({ zet: [['meta', data.meta]], verwijder: [] });
      }
      await store.sluitVerlopenAvonden();
    },

    zetMeta: (patch) => verwerk({ type: 'meta/gezet', patch }),

    // ---- Spelers ----
    speler: (id) => data.spelers.find((s) => s.id === id),
    actieveSpelers: () =>
      data.spelers.filter((s) => !s.gearchiveerd).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
    heeftGespeeld: (id) => data.potjes.some((p) => p.spelers.includes(id)),

    async spelerToevoegen({ naam, kleur, emoji = '' }) {
      if (!naam?.trim()) throw new Error('Geef de speler een naam.');
      const speler = {
        id: nieuwId(),
        naam,
        kleur: kleur ?? KLEUREN[data.spelers.length % KLEUREN.length],
        emoji: emoji.trim(),
        aangemaakt: klok(),
      };
      if (!(await verwerk({ type: 'speler/toegevoegd', speler }))) {
        throw new Error(`${naam.trim()} staat al in de lijst.`);
      }
      return store.speler(speler.id);
    },

    async spelerWijzigen(id, patch) {
      if (!(await verwerk({ type: 'speler/gewijzigd', id, patch }))) {
        throw new Error('Deze naam is leeg of bestaat al.');
      }
    },

    spelerVerwijderen: (id) => verwerk({ type: 'speler/verwijderd', id }),
    spelerTerugzetten: (speler) => verwerk({ type: 'speler/teruggezet', speler }),

    // ---- Avonden ----
    openAvond: () => openAvond(data),
    potjesVan: (avondId) =>
      data.potjes.filter((p) => p.avond === avondId).sort((a, b) => a.start - b.start),
    sluitVerlopenAvonden: () => verwerk({ type: 'avonden/verlopen', nu: klok() }),
    avondKlaar: (avond) => verwerk({ type: 'avond/klaar', avond, nu: klok() }),

    // ---- Potjes ----
    potje: (id) => data.potjes.find((p) => p.id === id),
    lopendPotje: () => lopendPotje(data),
    standen: (potje) => standen(potje, data.strepen),
    lafTellers: (potje) => lafTellers(potje, data.strepen),
    verliezer: (potje) => eersteDood(potje, data.strepen),

    async startPotje(spelers, instellingen) {
      const potjeId = nieuwId();
      const actie = { type: 'potje/gestart', potjeId, avondId: nieuwId(), spelers, instellingen, nu: klok() };
      if (!(await verwerk(actie))) throw new Error('Kies 2 tot 8 spelers.');
      return store.potje(potjeId);
    },

    /**
     * Zet een streep (+1) of haalt er een af (−1).
     * Geeft terug wat er veranderde: { winnaar, nieuwArm, nieuwDood }.
     */
    async streep(potjeId, spelerId, delta) {
      const potje = store.potje(potjeId);
      if (!potje) return {};
      const voor = standen(potje, data.strepen);
      const armVoor = armen(potje, voor);
      const streep = { id: nieuwId(), potje: potjeId, speler: spelerId, delta: delta > 0 ? 1 : -1, tijdstip: tijd() };
      if (!(await verwerk({ type: 'streep/gezet', streep }))) return {};
      const na = standen(potje, data.strepen);
      const { doodBij } = potje.instellingen;
      return {
        winnaar: store.potje(potjeId)?.winnaar ?? null,
        nieuwArm: armen(potje, na).filter((id) => !armVoor.includes(id)),
        nieuwDood: voor[spelerId] < doodBij && na[spelerId] >= doodBij ? spelerId : null,
      };
    },

    lafWeg: (potjeId, spelerId) => verwerk({ type: 'laf/weggehaald', potje: potjeId, speler: spelerId }),
    laf: (potjeId, spelerId) =>
      verwerk({ type: 'laf/gezet', laf: { id: nieuwId(), potje: potjeId, speler: spelerId, tijdstip: tijd() } }),

    /** Haalt de laatste actie (streep of laf) weg en geeft die terug. */
    async ongedaan(potjeId) {
      const voor = data.strepen;
      if (!(await verwerk({ type: 'ongedaan', potje: potjeId }))) return null;
      const over = new Set(data.strepen);
      return voor.find((s) => !over.has(s)) ?? null;
    },

    radUitkomst: (potjeId, opdracht) => verwerk({ type: 'rad/uitkomst', potje: potjeId, opdracht }),
    radOptieToevoegen: (tekst) => verwerk({ type: 'rad/optie-toegevoegd', tekst }),
    radOptieVerwijderen: (tekst) => verwerk({ type: 'rad/optie-verwijderd', tekst }),
    potjeVerwijderen: (id) => verwerk({ type: 'potje/verwijderd', id }),

    // ---- Back-up ----
    exporteer: () => maakExport(data, klok()),

    async importeer(invoer) {
      const nieuw = reducer(data, { type: 'data/vervangen', data: leesExport(invoer), nu: klok() });
      await wachtrij;
      await opslag.vervangAlles(nieuw);
      data = nieuw;
      laatsteTijd = data.strepen.reduce((m, s) => Math.max(m, s.tijdstip), 0);
      meld();
    },
  };
  return store;
}
