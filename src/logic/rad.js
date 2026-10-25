// Rad voor het rondje: wie eruit komt haalt het volgende rondje.

export const VERLIEZER_GEWICHT = 2;

/** Gewichten per speler; de verliezer weegt zwaarder als dat aan staat. */
export function gewichten(spelers, verliezer, verliezerZwaarder) {
  return spelers.map((id) => ({
    id,
    gewicht: verliezerZwaarder && id === verliezer ? VERLIEZER_GEWICHT : 1,
  }));
}

/** Kiest een vak; random() geeft een getal in [0, 1). */
export function kies(vakken, random = Math.random) {
  const totaal = vakken.reduce((som, v) => som + v.gewicht, 0);
  let r = random() * totaal;
  for (let i = 0; i < vakken.length; i++) {
    r -= vakken[i].gewicht;
    if (r < 0) return i;
  }
  return vakken.length - 1;
}

/** Begin- en eindhoek (graden, met de klok mee vanaf boven) van elk vak. */
export function hoeken(vakken) {
  const totaal = vakken.reduce((som, v) => som + v.gewicht, 0);
  let hoek = 0;
  return vakken.map((v) => {
    const van = hoek;
    hoek += (v.gewicht / totaal) * 360;
    return { id: v.id, van, tot: hoek };
  });
}

/**
 * Eindrotatie van het rad zodat de wijzer (bovenaan) in vak i landt,
 * op een willekeurige plek binnen het vak en na een paar volle rondes.
 */
export function eindRotatie(vakken, i, random = Math.random, rondes = 5) {
  const { van, tot } = hoeken(vakken)[i];
  const marge = (tot - van) * 0.15;
  const doel = van + marge + random() * (tot - van - 2 * marge);
  return rondes * 360 + (360 - doel);
}
