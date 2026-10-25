// Een avond sluit automatisch na 12 uur stilte.
export const STILTE_MS = 12 * 60 * 60 * 1000;

export function laatsteActiviteit(avond, potjes, strepen) {
  const ids = new Set(potjes.filter((p) => p.avond === avond.id).map((p) => p.id));
  let laatst = avond.start;
  for (const p of potjes) {
    if (!ids.has(p.id)) continue;
    laatst = Math.max(laatst, p.start, p.einde ?? 0);
  }
  for (const s of strepen) {
    if (ids.has(s.potje)) laatst = Math.max(laatst, s.tijdstip);
  }
  return laatst;
}

export function isVerlopen(avond, potjes, strepen, nu = Date.now()) {
  if (avond.einde) return false;
  return nu - laatsteActiviteit(avond, potjes, strepen) > STILTE_MS;
}
