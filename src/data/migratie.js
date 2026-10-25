// Schemaversie, export/import en omzetten van oudere data.

export const SCHEMA_VERSIE = 2;
export const STORES = ['spelers', 'avonden', 'potjes', 'strepen'];

export const STANDAARD_INSTELLINGEN = { doodBij: 10, armoede: true, rad: false };
export const STANDAARD_RAD_OPTIES = ['Adtje'];

export function standaardMeta() {
  return {
    sleutel: 'meta',
    schemaversie: SCHEMA_VERSIE,
    instellingen: { ...STANDAARD_INSTELLINGEN },
    radOpties: [...STANDAARD_RAD_OPTIES],
    radGeluid: false,
    minPotjes: 5,
    tipsGezien: false,
    installTipWeg: false,
  };
}

export function leegData() {
  return { spelers: [], avonden: [], potjes: [], strepen: [], meta: standaardMeta() };
}

/**
 * Zet data van een oudere schemaversie om naar de huidige.
 * Nieuwe versies krijgen hier een stap: if (v < 2) { ...; v = 2; }
 */
export function migreer(data) {
  const uit = { ...leegData(), ...data };
  uit.meta = { ...standaardMeta(), ...(data.meta ?? {}) };
  uit.meta.instellingen = { ...STANDAARD_INSTELLINGEN, ...(uit.meta.instellingen ?? {}) };
  let v = uit.meta.schemaversie ?? 1;
  if (v > SCHEMA_VERSIE) {
    throw new Error('Deze gegevens komen uit een nieuwere versie van Viltje. Werk de app eerst bij.');
  }
  if (v < 2) {
    // v2: laf-tellers naast strepen, en het rad kiest een opdracht voor de verliezer
    // in plaats van een speler die het rondje haalt.
    uit.strepen = uit.strepen.map((s) => ({ soort: 'streep', ...s }));
    uit.potjes = uit.potjes.map((p) => ({ ...p, uitkomstRad: null }));
    delete uit.meta.verliezerZwaarder;
    v = 2;
  }
  if (!Array.isArray(uit.meta.radOpties) || uit.meta.radOpties.length === 0) {
    uit.meta.radOpties = [...STANDAARD_RAD_OPTIES];
  }
  uit.meta.schemaversie = SCHEMA_VERSIE;
  return uit;
}

export function maakExport(data, nu = Date.now()) {
  return {
    app: 'viltje',
    schemaversie: SCHEMA_VERSIE,
    geexporteerd: new Date(nu).toISOString(),
    spelers: data.spelers,
    avonden: data.avonden,
    potjes: data.potjes,
    strepen: data.strepen,
    meta: data.meta,
  };
}

/** Leest een exportbestand (tekst of object) in en geeft gemigreerde data terug. */
export function leesExport(invoer) {
  let json = invoer;
  if (typeof invoer === 'string') {
    try {
      json = JSON.parse(invoer);
    } catch {
      throw new Error('Dit is geen geldig back-upbestand (geen JSON).');
    }
  }
  if (!json || json.app !== 'viltje') {
    throw new Error('Dit is geen back-up van Viltje.');
  }
  for (const store of STORES) {
    if (!Array.isArray(json[store])) throw new Error(`Back-up is onvolledig: ${store} ontbreekt.`);
    if (json[store].some((o) => !o || typeof o.id !== 'string')) {
      throw new Error(`Back-up is beschadigd: ongeldige ${store}.`);
    }
  }
  const meta = { ...(json.meta ?? {}), schemaversie: json.schemaversie ?? json.meta?.schemaversie ?? 1 };
  return migreer({
    spelers: json.spelers,
    avonden: json.avonden,
    potjes: json.potjes,
    strepen: json.strepen,
    meta,
  });
}
