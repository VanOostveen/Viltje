// Scorelogica: puur, zonder DOM of opslag, zodat alles te testen is.
// Een potje heeft spelers in tafelvolgorde en instellingen { doodBij, armoede, rad }.
// Een streep is { id, potje, speler, delta: +1 | -1, tijdstip }.

export const DOOD_MIN = 5;
export const DOOD_MAX = 30;
export const SPELERS_MIN = 2;
export const SPELERS_MAX = 8;

export function strepenVan(potjeId, strepen) {
  return strepen
    .filter((s) => s.potje === potjeId)
    .sort((a, b) => a.tijdstip - b.tijdstip);
}

/** Stand per speler: som van zijn strepen in dit potje. */
export function standen(potje, strepen) {
  const uit = Object.fromEntries(potje.spelers.map((id) => [id, 0]));
  for (const s of strepen) {
    if (s.potje === potje.id && s.speler in uit) uit[s.speler] += s.delta;
  }
  return uit;
}

/** 'dood', 'arm' (één streep van dood) of 'levend'. */
export function status(stand, doodBij) {
  if (stand >= doodBij) return 'dood';
  if (stand === doodBij - 1) return 'arm';
  return 'levend';
}

export function levenden(potje, st) {
  return potje.spelers.filter((id) => st[id] < potje.instellingen.doodBij);
}

/** Winnaar als er precies één speler over is, anders null. */
export function winnaar(potje, st) {
  const over = levenden(potje, st);
  return over.length === 1 && potje.spelers.length >= SPELERS_MIN ? over[0] : null;
}

/** Spelers die nu arm zijn (alleen als 'armoede tonen' aan staat). */
export function armen(potje, st) {
  if (!potje.instellingen.armoede) return [];
  return potje.spelers.filter((id) => status(st[id], potje.instellingen.doodBij) === 'arm');
}

/** Mag er een streep af? Een stand gaat nooit onder nul. */
export function magMin(stand) {
  return stand > 0;
}

/** De laatste streep van dit potje (die ongedaan maken verwijdert), of null. */
export function laatsteStreep(potjeId, strepen) {
  const eigen = strepenVan(potjeId, strepen);
  return eigen.length ? eigen[eigen.length - 1] : null;
}

/**
 * Volgorde waarin spelers dood gingen, rekening houdend met correcties:
 * wie door een −1 weer leeft, telt niet meer als dood.
 */
export function doodsVolgorde(potje, strepen) {
  const { doodBij } = potje.instellingen;
  const stand = Object.fromEntries(potje.spelers.map((id) => [id, 0]));
  let volgorde = [];
  for (const s of strepenVan(potje.id, strepen)) {
    if (!(s.speler in stand)) continue;
    const was = stand[s.speler] >= doodBij;
    stand[s.speler] += s.delta;
    const is = stand[s.speler] >= doodBij;
    if (!was && is) volgorde.push(s.speler);
    if (was && !is) volgorde = volgorde.filter((id) => id !== s.speler);
  }
  return volgorde;
}

export function eersteDood(potje, strepen) {
  return doodsVolgorde(potje, strepen)[0] ?? null;
}

/** Splitst een aantal strepen in turfblokjes van vijf. */
export function turfblokjes(aantal) {
  const n = Math.max(0, aantal);
  const blokjes = Array(Math.floor(n / 5)).fill(5);
  if (n % 5) blokjes.push(n % 5);
  return blokjes;
}
