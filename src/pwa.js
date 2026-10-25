// Service worker: alles vooraf in de cache, nieuwe versie alleen na een tik.
import { registerSW } from 'virtual:pwa-register';
import { toast } from './ui/dom.js';

export function startPwa() {
  const bijwerken = registerSW({
    onNeedRefresh() {
      // Nooit automatisch herladen: misschien loopt er net een potje.
      toast('Nieuwe versie, tik om te herladen', { duur: 0, opKlik: () => bijwerken(true) });
    },
  });
}
