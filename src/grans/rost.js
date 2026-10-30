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
  /**
   * Yttranden som pågår. Chrome släpper annars yttrandet när funktionen har returnerat, och då kommer aldrig
   * onend: spelet väntade ut maxtiden efter varje replik (loggen från 2026-10-27, Chrome 156 på Mac).
   * @type {Set<SpeechSynthesisUtterance>}
   */
  const pagaende = new Set();
  let utanSlut = 0;

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
   * vidOrd(teckenIndex) anropas när rösten börjar på ett nytt ord, om webbläsaren säger det (onboundary).
   * Alla webbläsare och röster gör inte det, så den som visar texten ord för ord måste klara sig utan.
   * @param {string} text @param {string} [roll] @param {(teckenIndex: number) => void} [vidOrd]
   * @returns {Promise<'klar' | 'avbruten' | 'tyst'>}
   */
  function saga(text, roll = 'berattare', vidOrd) {
    const min = ++token;
    // pratade talsyntesen nyss: Chrome på Mac kan fastna med "speaking" om nästa yttrande läggs direkt efter
    // cancel() (loggen 2026-10-30 22:41: maxtid på namn och nosord). Då väntar vi 80 ms innan nästa läggs.
    const avbrot = !!(synt && (synt.speaking || synt.pending));
    try { synt?.cancel(); } catch (e) { /* ok */ }
    if (!text) return Promise.resolve('klar');
    if (tyst()) return Promise.resolve('tyst');
    if (!synt || (!rost && (valj(), !rost))) {
      // ingen svensk röst: vänta ungefär så länge som det hade tagit att läsa
      return new Promise((r) => setTimeout(() => r(min === token ? 'klar' : 'avbruten'), uppskattad(text)));
    }
    return new Promise((r) => {
      let klar = false;
      const sluta = (/** @type {'klar' | 'avbruten'} */ hur) => { if (!klar) { klar = true; pagaende.delete(u); clearInterval(vakt); clearTimeout(max); r(hur); } };
      const rr = ROLLER[/** @type {keyof ROLLER} */ (roll)] || ROLLER.berattare;
      // talet har börjat: onstart, eller att talsyntesen pratar en stund efter att vi bad den
      let t0 = Date.now();
      let startad = false, tyst = 0;
      /** Ett yttrande med texten. Ett nytt görs om det första inte startar. */
      const nytt = () => {
        const x = new SpeechSynthesisUtterance(text);
        x.lang = 'sv-SE'; x.voice = rost; x.pitch = rr.pitch; x.rate = rr.rate;
        x.onstart = () => { startad = true; };
        x.onend = () => sluta('klar'); x.onerror = () => sluta('avbruten');
        if (vidOrd) x.onboundary = (e) => { if (!klar && min === token && (!e.name || e.name === 'word')) { startad = true; try { vidOrd(e.charIndex); } catch (fel) { /* får inte stoppa rösten */ } } };
        pagaende.add(x);
        return x;
      };
      let u = nytt();
      let forsok = 1;
      const vakt = setInterval(() => {
        if (min !== token) { sluta('avbruten'); return; }
        if (!startad && synt.speaking && Date.now() - t0 > 300) startad = true;
        // Chrome på Mac tappar ibland ett yttrande som läggs direkt efter cancel(): inget onstart, och talsyntesen
        // pratar inte. Då väntade spelet ut maxtiden (loggen 2026-10-30, korta repliker som "Här!" och namnen).
        // Har talet inte börjat efter 1,2 s läggs det en gång till. Börjar det inte då heller ges det upp efter 2,5 s.
        if (!startad && !synt.speaking && !synt.pending) {
          const gatt = Date.now() - t0;
          if (forsok === 1 && gatt > 1200) {
            forsok = 2; logg?.handelse('röst', 'startade inte, en gång till', text.slice(0, 40));
            // det gamla yttrandet får inte avsluta det nya (cancel kan ge onerror)
            u.onend = null; u.onerror = null; u.onstart = null; u.onboundary = null; pagaende.delete(u);
            u = nytt();
            try { synt.cancel(); synt.speak(u); } catch (e) { sluta('avbruten'); }
          }
          else if (forsok === 2 && gatt > 2500) { logg?.handelse('röst', 'startade inte', text.slice(0, 40)); sluta('klar'); }
        }
        // reserv om onend ändå uteblir: talet har börjat och talsyntesen har varit tyst i ca 0,3 s
        if (startad && !synt.speaking && !synt.pending) {
          if (++tyst >= 3) {
            if (utanSlut++ < 3) logg?.handelse('röst', 'slut utan onend', text.slice(0, 40));
            sluta('klar');
          }
        } else tyst = 0;
      }, 100);
      const max = setTimeout(() => { logg?.handelse('röst', 'maxtid', text.slice(0, 40)); sluta('klar'); }, 2000 + uppskattad(text) * 2.5);
      const tala = () => { if (klar || min !== token) return; t0 = Date.now(); try { synt.speak(u); } catch (e) { sluta('avbruten'); } };
      if (avbrot) setTimeout(tala, 80); else tala();
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
