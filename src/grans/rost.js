// @ts-check
// Datorrösten. Porterad från TURBO-RACE (04_audio.js, Voice): svensk röst, avbrottstoken och maxtid,
// så att inget kan hänga sig (lärdom från TURBO-RACE v16.3). Kedjan inspelat → datorröst → pladder
// byggs i fas 4; gråboxen använder bara datorrösten.

/** Tonhöjd och tempo per rollröst (aventyr.json: talare.rollrost). */
const ROLLER = {
  berattare: { pitch: 1.05, rate: 0.95 },
  gammal: { pitch: 0.8, rate: 0.88 },
  fanig: { pitch: 1.35, rate: 1.05 },
  metall: { pitch: 1.6, rate: 1.15 },
  unge: { pitch: 1.8, rate: 1.1 },
  ljudning: { pitch: 1.05, rate: 1.0 },
};

/**
 * @param {{ logg?: { handelse(t: string, m: string, d?: any): void }, tyst?: () => boolean }} opt
 *   tyst() = true när rösten är avstängd (inställning eller testläge)
 */
export function skapaRost({ logg, tyst = () => false }) {
  const synt = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  /** @type {SpeechSynthesisVoice | null} */
  let rost = null;
  let token = 0;

  function valj() {
    if (!synt) return;
    const sv = synt.getVoices().filter((v) => /^sv/i.test(v.lang));
    rost = sv.find((v) => v.localService && /alva|klara|oskar/i.test(v.name)) || sv.find((v) => v.localService) || sv[0] || null;
  }
  if (synt) { valj(); synt.addEventListener?.('voiceschanged', valj); }

  /** Uppskattad tid för en text när ingen röst finns. @param {string} t */
  const uppskattad = (t) => 500 + t.split(/\s+/).length * 380;

  /**
   * Säg en text. Löser sig när den är uppläst, avbruten eller maxtiden gått.
   * @param {string} text @param {string} [roll] @returns {Promise<'klar' | 'avbruten' | 'tyst'>}
   */
  function saga(text, roll = 'berattare') {
    const min = ++token;
    try { synt?.cancel(); } catch (e) { /* ok */ }
    if (!text) return Promise.resolve('klar');
    if (tyst()) return Promise.resolve('tyst');
    if (!synt || (!rost && (valj(), !rost))) {
      // ingen svensk röst: vänta ungefär så länge som det hade tagit att läsa
      return new Promise((r) => setTimeout(() => r(min === token ? 'klar' : 'avbruten'), uppskattad(text)));
    }
    return new Promise((r) => {
      let klar = false;
      const sluta = (/** @type {'klar' | 'avbruten'} */ hur) => { if (!klar) { klar = true; clearInterval(vakt); clearTimeout(max); r(hur); } };
      const u = new SpeechSynthesisUtterance(text);
      const rr = ROLLER[/** @type {keyof ROLLER} */ (roll)] || ROLLER.berattare;
      u.lang = 'sv-SE'; u.voice = rost; u.pitch = rr.pitch; u.rate = rr.rate;
      u.onend = () => sluta('klar'); u.onerror = () => sluta('avbruten');
      const vakt = setInterval(() => { if (min !== token) sluta('avbruten'); }, 100);
      const max = setTimeout(() => { logg?.handelse('röst', 'maxtid', text.slice(0, 40)); sluta('klar'); }, 2000 + uppskattad(text) * 2.5);
      try { synt.speak(u); } catch (e) { sluta('avbruten'); }
    });
  }

  /**
   * Läs upp delar i tur och ordning (ljudningen). onDel(i) anropas när del i börjar.
   * @param {string[]} delar @param {(i: number) => void} onDel @returns {Promise<'klar' | 'avbruten' | 'tyst'>}
   */
  async function sekvens(delar, onDel) {
    const min = ++token;
    for (let i = 0; i < delar.length; i++) {
      if (min !== token) return 'avbruten';
      onDel(i);
      if (tyst()) { await new Promise((r) => setTimeout(r, 120)); continue; }
      token = min - 1; // saga() räknar upp till min igen, så sekvensen behåller sin token
      await saga(delar[i], 'ljudning');
      if (token !== min) return 'avbruten'; // någon annan har pratat eller tystat
      await new Promise((rr) => setTimeout(rr, 60));
    }
    return min === token ? 'klar' : 'avbruten';
  }

  return {
    saga,
    sekvens,
    /** Avbryt allt som pratar. */
    tyst() { token++; try { synt?.cancel(); } catch (e) { /* ok */ } },
    /** iPad Safari: rösten måste startas av ett tryck. */
    lasUpp() { try { if (synt && !tyst()) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synt.speak(u); } } catch (e) { /* ok */ } },
    get harRost() { return !!rost; },
  };
}
