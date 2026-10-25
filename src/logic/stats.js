// Statistieken worden telkens uit de opgeslagen data berekend.
import { standen, eersteDood } from './score.js';

/** Alleen afgeronde potjes (met winnaar) tellen mee, op volgorde van start. */
export function afgerondePotjes(potjes) {
  return potjes.filter((p) => p.einde && p.winnaar).sort((a, b) => a.start - b.start);
}

export function statistieken({ spelers, potjes, strepen }) {
  const klaar = afgerondePotjes(potjes);
  const perPotjeStrepen = new Map();
  for (const s of strepen) {
    if (!perPotjeStrepen.has(s.potje)) perPotjeStrepen.set(s.potje, []);
    perPotjeStrepen.get(s.potje).push(s);
  }

  return spelers.map((speler) => {
    let gespeeld = 0;
    let gewonnen = 0;
    let eersteDoodKeer = 0;
    let strepenTotaal = 0;
    let reeks = 0;
    let langsteReeks = 0;
    let rondjes = 0;

    for (const p of klaar) {
      if (p.uitkomstRad === speler.id) rondjes++;
      if (!p.spelers.includes(speler.id)) continue;
      const eigen = perPotjeStrepen.get(p.id) ?? [];
      gespeeld++;
      strepenTotaal += standen(p, eigen)[speler.id];
      if (eersteDood(p, eigen) === speler.id) eersteDoodKeer++;
      if (p.winnaar === speler.id) {
        gewonnen++;
        reeks++;
        langsteReeks = Math.max(langsteReeks, reeks);
      } else {
        reeks = 0;
      }
    }

    return {
      id: speler.id,
      naam: speler.naam,
      gespeeld,
      gewonnen,
      winpct: gespeeld ? (gewonnen / gespeeld) * 100 : 0,
      eersteDood: eersteDoodKeer,
      gemStrepen: gespeeld ? strepenTotaal / gespeeld : 0,
      langsteReeks,
      rondjes,
    };
  });
}

/**
 * Ranglijst op winpercentage. Spelers onder het minimum aantal potjes
 * komen in 'teWeinig'. Gelijke stand: meeste winst, dan naam.
 */
export function ranglijst(stats, minPotjes) {
  const sorteer = (a, b) =>
    b.winpct - a.winpct || b.gewonnen - a.gewonnen || a.naam.localeCompare(b.naam, 'nl');
  return {
    lijst: stats.filter((s) => s.gespeeld >= minPotjes).sort(sorteer),
    teWeinig: stats.filter((s) => s.gespeeld > 0 && s.gespeeld < minPotjes).sort(sorteer),
  };
}
