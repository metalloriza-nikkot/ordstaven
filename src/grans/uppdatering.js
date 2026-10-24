// @ts-check
// Service worker och uppdateringar. En ny version hämtas i bakgrunden men tas i bruk
// bara i startläget, aldrig mitt i spelet. Fas 1 har ingen startskärm, så startläget är
// de första sekunderna efter start. Från fas 2 anropas tillampa() från startskärmen.
import { registerSW } from 'virtual:pwa-register';

/**
 * @param {{ logg: { handelse(t: string, m: string, d?: any): void }, arStartlage: () => boolean }} opt
 */
export function startaUppdatering({ logg, arStartlage }) {
  let finnsNy = false;
  /** @type {(reload?: boolean) => Promise<void>} */
  let uppdatera = async () => {};
  if (!('serviceWorker' in navigator)) {
    logg.handelse('pwa', 'service worker stöds inte');
  } else {
    uppdatera = registerSW({
      immediate: true,
      onNeedRefresh() {
        finnsNy = true;
        logg.handelse('pwa', 'ny version finns');
        if (arStartlage()) { logg.handelse('pwa', 'tar ny version i bruk'); uppdatera(true); }
      },
      onOfflineReady() { logg.handelse('pwa', 'klar för offline'); },
      onRegisteredSW(_url, reg) {
        logg.handelse('pwa', 'service worker registrerad');
        // Leta efter ny version en gång i timmen medan spelet är öppet.
        if (reg) setInterval(() => { reg.update().catch(() => {}); }, 60 * 60 * 1000);
      },
      onRegisterError(e) { logg.handelse('FEL', 'service worker: ' + String(e)); },
    });
  }
  return {
    get finnsNy() { return finnsNy; },
    /** Anropas från startskärmen. */
    tillampa() { if (finnsNy) uppdatera(true); },
  };
}
