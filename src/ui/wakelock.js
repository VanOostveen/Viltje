// Scherm aan houden zolang er een potje loopt (Wake Lock API).
let gewenst = false;
let slot = null;

async function vraag() {
  if (!gewenst || slot || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try {
    slot = await navigator.wakeLock.request('screen');
    slot.addEventListener('release', () => (slot = null));
  } catch {
    slot = null;
  }
}

document.addEventListener('visibilitychange', vraag);

export function houdWakker(aan) {
  gewenst = aan;
  if (aan) vraag();
  else if (slot) {
    slot.release().catch(() => {});
    slot = null;
  }
}
