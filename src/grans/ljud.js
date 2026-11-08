// @ts-check
// Ljudeffekter för gråboxen, syntetiserade som i TURBO-RACE (04_audio.js, Snd) men med mjukare klanger
// (triangel och sinus, stilguiden). Riktiga ljud och musik kommer i fas 4. Ljudet startas av första trycket (iPad).
// De inspelade lätena (assets/ljud, bearbetade så att rösten inte går att känna igen) ersätter syntesen för
// Herr Skata och ungen. Tills de är avkodade, eller om de inte går att avkoda, spelas syntesen.
import skrattUrl from '../../assets/ljud/herr_skata_skratt.wav?url';
import unge1Url from '../../assets/ljud/unge_late_01.wav?url';
import unge2Url from '../../assets/ljud/unge_late_02.wav?url';
import unge3Url from '../../assets/ljud/unge_late_03.wav?url';
import menyM4a from '../../assets/ljud/musik/meny.m4a?url';
import menyOgg from '../../assets/ljud/musik/meny.ogg?url';
import spelM4a from '../../assets/ljud/musik/spel.m4a?url';
import spelOgg from '../../assets/ljud/musik/spel.ogg?url';

/**
 * Musiken (F5, Stils två slingor, 10c och rapporten 8/11 12:40): varje fil har en halv sekund av slingans slut före
 * och en halv sekund av början efter, och spelas med WebAudio mellan looppunkterna, så att skarven inte hörs
 * (ett <audio loop> ger en skarv). Lägger avkodaren till tystnad i början flyttas båda punkterna lika mycket.
 * Slutpunkten räknas exakt ur takten (16 takter à 8 åttondelar), inte ur tabellens avrundade tal.
 * meny: introt, startskärmen, pausmenyn och INSTÄLLNINGAR. spel: inne i spelet, den mjukare klangen.
 */
export const MUSIK = /** @type {Record<string, { m4a: string, ogg: string, loopStart: number, loopEnd: number }>} */ ({
  // menyns slinga är 16 takter i 92 BPM, 41,73913 s: tabellens 42,239 är avrundat, och 6 prover fel ger ett klick
  meny: { m4a: menyM4a, ogg: menyOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 8 * 30) / 92 },
  spel: { m4a: spelM4a, ogg: spelOgg, loopStart: 0.5, loopEnd: 48.5 },
});
/** Musikens nivå, och hur mycket den sänks när något läses (ca 12 dB, 62.10). */
export const MUSIK_NIVA = 0.5;
export const MUSIK_SANKT_DB = -12;

/** De inspelade ljuden. */
const INSPELADE = { herr_skata_skratt: skrattUrl, unge_late_01: unge1Url, unge_late_02: unge2Url, unge_late_03: unge3Url };
/** Ljud-id i innehållet och effekter → inspelat ljud. 'unge' (ungen reagerar) tar ett av de tre lätena. */
const INSPELAT_FOR = /** @type {Record<string, string | string[]>} */ ({
  fagel_late: 'herr_skata_skratt', skata: 'herr_skata_skratt',
  unge_forsta_late: 'unge_late_01', unge_langtan: 'unge_late_02', unge_svarar: 'unge_late_03',
  unge: ['unge_late_01', 'unge_late_02', 'unge_late_03'],
});

/** @param {{ tyst?: () => boolean }} [opt] */
export function skapaLjud({ tyst = () => false } = {}) {
  /** @type {AudioContext | null} */
  let ac = null;
  /** @type {GainNode | null} */
  let ut = null;

  function starta() {
    if (ac) { if (ac.state !== 'running' && !(typeof document !== 'undefined' && document.hidden)) ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ac = new AC(); ut = ac.createGain(); ut.gain.value = 0.35; ut.connect(ac.destination);
    avkoda();
    if (onskad) musik(onskad);
  }
  // en dold flik är tyst (musiken står still och fortsätter där den var)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {});
  });

  // ---------------------------------------------------------------- musiken (F5)
  /** @type {string | null} slingan som ska spela (också innan ljudet har startats) */
  let onskad = null;
  /** @type {{ namn: string, kalla: AudioBufferSourceNode, g: GainNode } | null} */
  let spelar = null;
  /** @type {GainNode | null} */
  let musikUt = null;
  let sankt = false;
  /** @type {Map<string, Promise<AudioBuffer | null>>} */
  const musikBuf = new Map();
  /** AAC (m4a) där webbläsaren kan det (Safari och Chrome på Mac och iPad), annars Ogg Vorbis. */
  const format = () => {
    try { return new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"') ? ['m4a', 'ogg'] : ['ogg', 'm4a']; } catch (e) { return ['m4a', 'ogg']; }
  };
  /** @param {ArrayBuffer} data @returns {Promise<AudioBuffer>} */
  const avkodaData = (data) => new Promise((klar, fel) => { const p = ac?.decodeAudioData(data, klar, fel); if (p && p.catch) p.catch(fel); });
  /** @param {string} namn @returns {Promise<AudioBuffer | null>} */
  function laddaMusik(namn) {
    if (!musikBuf.has(namn)) {
      const m = MUSIK[namn];
      const prova = async (/** @type {string[]} */ f) => {
        for (const x of f) {
          try { const r = await fetch(/** @type {any} */ (m)[x]); return await avkodaData(await r.arrayBuffer()); } catch (e) { /* nästa format */ }
        }
        return null;
      };
      musikBuf.set(namn, m ? prova(format()) : Promise.resolve(null));
    }
    return /** @type {Promise<AudioBuffer | null>} */ (musikBuf.get(namn));
  }
  const nivaNu = () => MUSIK_NIVA * (sankt ? 10 ** (MUSIK_SANKT_DB / 20) : 1);
  /**
   * Spela en slinga (meny eller spel), eller tystna (null). Samma slinga igen gör ingenting. Byten tonas (0,4 s ut
   * och 0,6 s in). Före första trycket kommer ihåg den vilken slinga som ska spela. @param {string | null} namn
   */
  function musik(namn) {
    onskad = namn;
    if (!ac || tyst()) return;
    if (spelar?.namn === namn) return;
    const t = ac.currentTime;
    if (spelar) {
      const { kalla, g } = spelar;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
      try { kalla.stop(t + 0.45); } catch (e) { /* redan stoppad */ }
      spelar = null;
    }
    if (!namn) return;
    if (!musikUt) { musikUt = ac.createGain(); musikUt.gain.value = nivaNu(); musikUt.connect(ac.destination); }
    laddaMusik(namn).then((buf) => {
      if (!buf || !ac || !musikUt || onskad !== namn || spelar?.namn === namn) return;
      const m = MUSIK[namn];
      const kalla = ac.createBufferSource(), g = ac.createGain();
      kalla.buffer = buf; kalla.loop = true; kalla.loopStart = m.loopStart; kalla.loopEnd = Math.min(m.loopEnd, buf.duration);
      const t0 = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.6);
      kalla.connect(g); g.connect(musikUt); kalla.start(t0, 0);
      spelar = { namn, kalla, g };
    }).catch(() => { /* ingen musik, spelet går ändå */ });
  }
  /** Sänk musiken ca 12 dB medan något läses, och höj den igen efteråt. @param {boolean} pa */
  function sank(pa) {
    if (pa === sankt) return;
    sankt = pa;
    if (ac && musikUt) { const t = ac.currentTime; musikUt.gain.cancelScheduledValues(t); musikUt.gain.setTargetAtTime(nivaNu(), t, pa ? 0.06 : 0.25); }
  }

  /** @type {Map<string, AudioBuffer>} */
  const buffrar = new Map();
  /** Hämta och avkoda de inspelade ljuden en gång (callback-formen fungerar också i äldre Safari). */
  function avkoda() {
    for (const [namn, url] of Object.entries(INSPELADE)) {
      fetch(url).then((r) => r.arrayBuffer()).then((data) => new Promise((klar, fel) => {
        const p = ac?.decodeAudioData(data, klar, fel); if (p && p.catch) p.catch(fel);
      })).then((b) => { buffrar.set(namn, /** @type {AudioBuffer} */ (b)); }).catch(() => { /* syntesen får spela i stället */ });
    }
  }

  /** Spela ett inspelat ljud, om det finns. @param {string} namn @returns {number} längden i ms, 0 om det saknas */
  function inspelat(namn) {
    let n = INSPELAT_FOR[namn];
    if (Array.isArray(n)) n = n[Math.floor(Math.random() * n.length)];
    const buf = n ? buffrar.get(n) : null;
    if (!ac || !ut || !buf) return 0;
    const k = ac.createBufferSource(), g = ac.createGain();
    g.gain.value = 1; // inspelningarna är normaliserade (topp 0,89), genom ut (0,35) som syntesen
    k.buffer = buf; k.connect(g); g.connect(ut); k.start();
    return Math.round(buf.duration * 1000);
  }

  /** @param {{ f: number, f2?: number, t?: number, v?: number, typ?: OscillatorType, d?: number }} o */
  function ton(o) {
    if (!ac || !ut) return;
    const t0 = ac.currentTime + (o.d || 0), t = o.t || 0.15;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.typ || 'triangle';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + t);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.v ?? 0.5, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    osc.connect(g); g.connect(ut); osc.start(t0); osc.stop(t0 + t + 0.05);
  }

  /** @type {Record<string, () => void>} */
  const fx = {
    dunk: () => { ton({ f: 120, f2: 50, t: 0.35, v: 0.8, typ: 'sine' }); },
    tick: () => { for (let i = 0; i < 4; i++) ton({ f: 1800, t: 0.03, v: 0.2, typ: 'square', d: i * 0.18 }); },
    kras: () => { ton({ f: 900, f2: 300, t: 0.2, v: 0.4 }); ton({ f: 600, f2: 200, t: 0.25, v: 0.3, d: 0.08 }); },
    unge: () => { ton({ f: 700, f2: 1100, t: 0.18, v: 0.4, typ: 'sine' }); ton({ f: 1100, f2: 900, t: 0.2, v: 0.35, typ: 'sine', d: 0.2 }); },
    mage: () => { for (let i = 0; i < 5; i++) ton({ f: 90 + i * 12, f2: 70, t: 0.12, v: 0.5, typ: 'sine', d: i * 0.1 }); },
    ratt: () => { [784, 988, 1175].forEach((f, i) => ton({ f, t: 0.14, v: 0.35, d: i * 0.08 })); },
    fel: () => { ton({ f: 300, f2: 180, t: 0.25, v: 0.35, typ: 'sine' }); },
    fest: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => ton({ f, t: i === 5 ? 0.4 : 0.12, v: 0.3, d: i * 0.1 })); },
    bar: () => { ton({ f: 988, t: 0.07, v: 0.3 }); ton({ f: 1319, t: 0.15, v: 0.3, d: 0.07 }); },
    klick: () => { ton({ f: 660, f2: 880, t: 0.06, v: 0.2 }); },
    bricka: () => { ton({ f: 520, t: 0.06, v: 0.25 }); },
    sla: () => { ton({ f: 260, f2: 120, t: 0.15, v: 0.5 }); },
    allmant: () => { ton({ f: 440, f2: 660, t: 0.2, v: 0.3, typ: 'sine' }); },
    // en fel bricka studsar tillbaka i kasta-läget ("pff"): mjukt och kort, inget fel
    pff: () => { ton({ f: 340, f2: 240, t: 0.09, v: 0.22, typ: 'sine' }); },
    // kodlåset skakar vid fel
    klonk: () => { ton({ f: 160, f2: 110, t: 0.12, v: 0.5, typ: 'square' }); ton({ f: 140, f2: 90, t: 0.14, v: 0.4, typ: 'square', d: 0.11 }); },
    // ett lås som klickar upp, och prassel i löv och buskar
    klick_las: () => { ton({ f: 1200, t: 0.04, v: 0.3, typ: 'square' }); ton({ f: 900, t: 0.05, v: 0.25, typ: 'square', d: 0.06 }); },
    // ett levande fågelläte: tre korta kvitter (baronens fågel, beslut 18.3)
    // Herr Skatas skratt (stilguiden §9): ett skrockande "tjack-tjack-tjack", kort och ljust, som sjunker lite
    // för varje stöt, som ett skratt. Tillfälligt syntetiserat tills Stil gör det riktiga ljudet (Stil 17).
    skata: () => {
      [0, 0.13, 0.26].forEach((d, i) => {
        const f = 1500 - i * 120;
        ton({ f: f * 1.6, f2: f * 0.7, t: 0.055, v: 0.16, typ: 'square', d });
        ton({ f: f * 2.4, f2: f, t: 0.045, v: 0.1, typ: 'sawtooth', d: d + 0.005 });
      });
    },
    fagel: () => { ton({ f: 1900, t: 0.06, v: 0.14, typ: 'sine' }); ton({ f: 2500, t: 0.05, v: 0.12, typ: 'sine', d: 0.08 }); ton({ f: 2100, t: 0.08, v: 0.12, typ: 'sine', d: 0.17 }); },
    // molnet kommer (stilguiden §3): ett mjukt pling
    pling: () => { ton({ f: 1320, f2: 1480, t: 0.12, v: 0.12, typ: 'sine' }); ton({ f: 1980, t: 0.18, v: 0.07, typ: 'sine', d: 0.06 }); },
    // ugglorna på krönet: två mjuka, låga HO (v0.7.3)
    uggla: () => { ton({ f: 392, f2: 349, t: 0.28, v: 0.32, typ: 'sine' }); ton({ f: 392, f2: 330, t: 0.34, v: 0.3, typ: 'sine', d: 0.4 }); },
    // ett hugg med svärdet: ett kort svisch som sjunker
    hugg: () => { ton({ f: 1800, f2: 300, t: 0.12, v: 0.25, typ: 'sawtooth' }); },
    prassel: () => { for (let i = 0; i < 5; i++) ton({ f: 2400 - i * 200, t: 0.04, v: 0.08, typ: 'sawtooth', d: i * 0.04 }); },
  };
  /** Ljud-id i innehållet → effekt. Okända id:n får ett allmänt ljud. */
  const LJUD_ID = /** @type {Record<string, string>} */ ({
    dunk: 'dunk', klaffen_tick: 'tick', fagel_late: 'skata', unge_forsta_late: 'unge', unge_langtan: 'unge', unge_svarar: 'unge', mage_kurrar: 'mage', hackspett: 'klick', ekorre_not: 'kras',
  });

  /** Stilguiden v0.26 §3. Ett nytt ljudord får sin färg av Stil innan Innehåll lägger in det. */
  const LJUDORD_FARG = /** @type {Record<string, string>} */ ({
    dunk: '#f5d9a8', brum: '#f4a6b8', buhu: '#8fcbf2', 'tok tok': '#c8e36a', 'ho ho': '#ffd95a', klonk: '#b9c6d3', pip: '#a6e3cf', kras: '#d9ccf5',
  });

  return {
    starta,
    /** @param {string} namn effekt eller ljud-id ur innehållet */
    /**
     * Pipet när rösten är av (beslut 21.2): lågt och mjukt, ett per ord, med en egen ton per figur.
     * @param {string} roll talarens rollröst
     */
    /**
     * Ljudordets färg (stilguiden v0.26 §3): färgen hör till ordet, så att samma ord har samma färg överallt. Alltid
     * ljus fyllning (konturen är mörk), aldrig baronens orange eller rött, och guld bara vid rätt. Ett ord som Stil
     * inte har gett en färg får läsplattans papper. @param {string} ord ljudordet i vanlig skrift
     */
    farg(ord) {
      return LJUDORD_FARG[(ord || '').toLocaleLowerCase('sv-SE').trim()] ?? '#f5ecd7';
    },
    pip(roll) {
      if (tyst()) return;
      starta();
      const f = /** @type {Record<string, number>} */ ({ berattare: 520, gammal: 330, fanig: 440, fagel: 880, metall: 700, unge: 760 })[roll] ?? 520;
      try { ton({ f, t: 0.05, v: 0.06, typ: 'sine' }); } catch (e) { /* ljud får aldrig krascha spelet */ }
    },
    musik,
    sank,
    /** För testerna och loggen: vilken slinga som ska spela, vilken som spelar och om den är sänkt. */
    get musikLage() { return { onskad, spelar: spelar?.namn ?? null, sankt }; },
    /** Introts lilla klang för bokstav i i ORDSTAVEN: mjuk och stigande (pentatont). @param {number} i */
    klang(i) {
      if (tyst()) return;
      starta();
      try {
        const f = 660 * 2 ** ([0, 2, 4, 7, 9, 12, 14, 16, 19][i % 9] / 12);
        ton({ f, t: 0.2, v: 0.09, typ: 'sine' }); ton({ f: f * 2, t: 0.1, v: 0.025, typ: 'sine', d: 0.01 });
      } catch (e) { /* ljud får aldrig krascha spelet */ }
    },
    /** @returns {number} hur länge ljudet låter i ms (0 = kort syntes eller tyst) */
    spela(namn) {
      if (tyst()) return 0;
      starta();
      try {
        const ms = inspelat(namn) || inspelat(LJUD_ID[namn] || '');
        if (ms) return ms;
        (fx[namn] || fx[LJUD_ID[namn]] || fx.allmant)();
      } catch (e) { /* ljud får aldrig krascha spelet */ }
      return 0;
    },
  };
}
