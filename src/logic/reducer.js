// Alle wijzigingen aan de data lopen via deze ene pure functie:
// (toestand, actie) → nieuwe toestand. Geen DOM, geen opslag, geen klok of
// toeval: ids en tijdstippen zitten in de actie. Een actie die niet mag,
// geeft de toestand ongewijzigd terug. Objecten worden nooit aangepast,
// alleen vervangen, zodat de opslag precies ziet wat er veranderde.
import { standen, winnaar, lafTellers, magLaf, magMin, laatsteStreep, SPELERS_MIN, SPELERS_MAX, DOOD_MIN, DOOD_MAX } from './score.js';
import { isVerlopen, laatsteActiviteit } from './avond.js';

export const RAD_OPTIE_MAX = 40;

const vervang = (lijst, obj) => lijst.map((o) => (o.id === obj.id ? obj : o));
const vind = (lijst, id) => lijst.find((o) => o.id === id);
const naamSleutel = (naam) => naam.trim().toLocaleLowerCase('nl');

export function openAvond(t) {
  return t.avonden.find((a) => !a.einde) ?? null;
}

export function lopendPotje(t) {
  return t.potjes.find((p) => !p.einde) ?? null;
}

function naamBestaat(t, naam, behalve) {
  const n = naamSleutel(naam);
  return t.spelers.some((s) => !s.gearchiveerd && s.id !== behalve && naamSleutel(s.naam) === n);
}

// ---------- Hulpstappen (zelf ook puur) ----------

function verwijderPotje(t, potjeId) {
  const potje = vind(t.potjes, potjeId);
  if (!potje) return t;
  const potjes = t.potjes.filter((p) => p.id !== potjeId);
  // Een avond zonder potjes bestaat niet.
  const avondLeeg = !potjes.some((p) => p.avond === potje.avond);
  return {
    ...t,
    potjes,
    strepen: t.strepen.filter((s) => s.potje !== potjeId),
    avonden: avondLeeg ? t.avonden.filter((a) => a.id !== potje.avond) : t.avonden,
  };
}

function sluitAvond(t, avondId, einde) {
  // Een potje zonder winnaar aan het eind van de avond telt niet.
  for (const p of t.potjes) {
    if (p.avond === avondId && !p.einde) t = verwijderPotje(t, p.id);
  }
  const avond = vind(t.avonden, avondId);
  if (!avond || avond.einde) return t;
  return { ...t, avonden: vervang(t.avonden, { ...avond, einde }) };
}

function sluitVerlopen(t, nu) {
  for (const avond of t.avonden) {
    if (isVerlopen(avond, t.potjes, t.strepen, nu)) {
      t = sluitAvond(t, avond.id, laatsteActiviteit(avond, t.potjes, t.strepen));
    }
  }
  return t;
}

/** Zet einde en winnaar van een potje gelijk aan wat de strepen zeggen. */
function bepaalUitslag(t, potjeId, tijdstip) {
  const potje = vind(t.potjes, potjeId);
  const w = winnaar(potje, standen(potje, t.strepen));
  if (w && !potje.einde) {
    return { ...t, potjes: vervang(t.potjes, { ...potje, einde: tijdstip, winnaar: w }) };
  }
  if (!w && potje.einde) {
    return { ...t, potjes: vervang(t.potjes, { ...potje, einde: null, winnaar: null, uitkomstRad: null }) };
  }
  return t;
}

/** Een lopend potje waarin deze speler meedoet, of null. */
function lopendMet(t, potjeId, spelerId) {
  const potje = vind(t.potjes, potjeId);
  return potje && !potje.einde && potje.spelers.includes(spelerId) ? potje : null;
}

// ---------- De reducer ----------

export function reducer(t, actie) {
  switch (actie.type) {
    case 'meta/gezet':
      return { ...t, meta: { ...t.meta, ...actie.patch } };

    case 'speler/toegevoegd': {
      const { speler } = actie;
      const naam = speler.naam?.trim();
      if (!naam || naamBestaat(t, naam) || vind(t.spelers, speler.id)) return t;
      return { ...t, spelers: [...t.spelers, { ...speler, naam }] };
    }

    case 'speler/gewijzigd': {
      const speler = vind(t.spelers, actie.id);
      if (!speler) return t;
      const nieuw = { ...speler, ...actie.patch, id: speler.id };
      nieuw.naam = nieuw.naam.trim();
      if (!nieuw.naam) return t;
      if (!nieuw.gearchiveerd && naamBestaat(t, nieuw.naam, speler.id)) return t;
      return { ...t, spelers: vervang(t.spelers, nieuw) };
    }

    case 'speler/verwijderd': {
      const speler = vind(t.spelers, actie.id);
      if (!speler) return t;
      // Wie al potjes speelde wordt gearchiveerd, zodat de statistieken kloppen.
      if (t.potjes.some((p) => p.spelers.includes(speler.id))) {
        return { ...t, spelers: vervang(t.spelers, { ...speler, gearchiveerd: true }) };
      }
      return { ...t, spelers: t.spelers.filter((s) => s.id !== speler.id) };
    }

    case 'potje/gestart': {
      const { potjeId, avondId, spelers, instellingen, nu } = actie;
      const uniek = [...new Set(spelers)];
      const bekend = uniek.every((id) => vind(t.spelers, id) && !vind(t.spelers, id).gearchiveerd);
      const { doodBij } = instellingen;
      if (uniek.length !== spelers.length || !bekend) return t;
      if (spelers.length < SPELERS_MIN || spelers.length > SPELERS_MAX) return t;
      if (!Number.isInteger(doodBij) || doodBij < DOOD_MIN || doodBij > DOOD_MAX) return t;

      t = sluitVerlopen(t, nu);
      const lopend = lopendPotje(t);
      if (lopend) t = verwijderPotje(t, lopend.id);

      let avond = openAvond(t);
      const avonden = avond ? t.avonden : [...t.avonden, (avond = { id: avondId, start: nu, einde: null, spelers: [] })];
      const bijgewerkt = { ...avond, spelers: [...new Set([...avond.spelers, ...spelers])] };
      const inst = { doodBij, armoede: !!instellingen.armoede, rad: !!instellingen.rad };
      return {
        ...t,
        avonden: vervang(avonden, bijgewerkt),
        potjes: [
          ...t.potjes,
          { id: potjeId, avond: avond.id, spelers: [...spelers], instellingen: inst, start: nu, einde: null, winnaar: null, uitkomstRad: null },
        ],
        meta: { ...t.meta, instellingen: inst },
      };
    }

    case 'streep/gezet': {
      const { streep } = actie;
      const potje = lopendMet(t, streep.potje, streep.speler);
      if (!potje || (streep.delta !== 1 && streep.delta !== -1)) return t;
      if (streep.delta < 0 && !magMin(standen(potje, t.strepen)[streep.speler])) return t;
      t = { ...t, strepen: [...t.strepen, { ...streep, soort: 'streep' }] };
      return bepaalUitslag(t, potje.id, streep.tijdstip);
    }

    case 'laf/gezet': {
      const { laf } = actie;
      const potje = lopendMet(t, laf.potje, laf.speler);
      if (!potje) return t;
      const stand = standen(potje, t.strepen)[laf.speler];
      if (!magLaf(potje, stand, lafTellers(potje, t.strepen)[laf.speler])) return t;
      return { ...t, strepen: [...t.strepen, { ...laf, soort: 'laf', delta: 1 }] };
    }

    case 'ongedaan': {
      const potje = vind(t.potjes, actie.potje);
      const laatste = potje && laatsteStreep(potje.id, t.strepen);
      if (!laatste) return t;
      t = { ...t, strepen: t.strepen.filter((s) => s.id !== laatste.id) };
      return bepaalUitslag(t, potje.id, potje.einde);
    }

    case 'rad/uitkomst': {
      const potje = vind(t.potjes, actie.potje);
      if (!potje?.einde || !potje.instellingen.rad || typeof actie.opdracht !== 'string') return t;
      return { ...t, potjes: vervang(t.potjes, { ...potje, uitkomstRad: actie.opdracht }) };
    }

    case 'rad/optie-toegevoegd': {
      const tekst = actie.tekst?.trim().slice(0, RAD_OPTIE_MAX);
      const opties = t.meta.radOpties;
      if (!tekst || opties.some((o) => naamSleutel(o) === naamSleutel(tekst))) return t;
      return { ...t, meta: { ...t.meta, radOpties: [...opties, tekst] } };
    }

    case 'rad/optie-verwijderd': {
      const opties = t.meta.radOpties.filter((o) => o !== actie.tekst);
      // Het rad houdt altijd minstens één opdracht.
      if (opties.length === t.meta.radOpties.length || opties.length === 0) return t;
      return { ...t, meta: { ...t.meta, radOpties: opties } };
    }

    case 'potje/verwijderd':
      return verwijderPotje(t, actie.id);

    case 'avond/klaar': {
      const avond = actie.avond ? vind(t.avonden, actie.avond) : openAvond(t);
      return avond ? sluitAvond(t, avond.id, actie.nu) : t;
    }

    case 'avonden/verlopen':
      return sluitVerlopen(t, actie.nu);

    case 'data/vervangen':
      return sluitVerlopen(actie.data, actie.nu);

    default:
      return t;
  }
}
