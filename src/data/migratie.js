// Schemaversie, export/import en omzetten van oudere data.

export const SCHEMA_VERSIE = 1;
export const STORES = ['spelers', 'avonden', 'potjes', 'strepen'];

export const STANDAARD_INSTELLINGEN = { doodBij: 10, armoede: true, rad: false };

export function standaardMeta() {
  return {
    sleutel: 'meta',
    schemaversie: SCHEMA_VERSIE,
    instellingen: { ...STANDAARD_INSTELLINGEN },
    verliezerZwaarder: false,
    radGeluid: false,
    minPotjes: 5,
    tipsGezien: false,
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
  const v = uit.meta.schemaversie ?? 1;
  if (v > SCHEMA_VERSIE) {
    throw new Error('Deze gegevens komen uit een nieuwere versie van Viltje. Werk de app eerst bij.');
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
