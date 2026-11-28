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
import nattenM4a from '../../assets/ljud/musik/natten.m4a?url';
import nattenOgg from '../../assets/ljud/musik/natten.ogg?url';
import skogenM4a from '../../assets/ljud/musik/skogen.m4a?url';
import skogenOgg from '../../assets/ljud/musik/skogen.ogg?url';
import raddningM4a from '../../assets/ljud/musik/raddning.m4a?url';
import raddningOgg from '../../assets/ljud/musik/raddning.ogg?url';
import lagereldenM4a from '../../assets/ljud/musik/lagerelden.m4a?url';
import lagereldenOgg from '../../assets/ljud/musik/lagerelden.ogg?url';
import bynM4a from '../../assets/ljud/musik/byn.m4a?url';
import bynOgg from '../../assets/ljud/musik/byn.ogg?url';
import flodenM4a from '../../assets/ljud/musik/floden.m4a?url';
import flodenOgg from '../../assets/ljud/musik/floden.ogg?url';
import styckeSkugganM4a from '../../assets/ljud/musik/stycke_skuggan.m4a?url';
import styckeSkugganOgg from '../../assets/ljud/musik/stycke_skuggan.ogg?url';
import styckeOnM4a from '../../assets/ljud/musik/stycke_on.m4a?url';
import styckeOnOgg from '../../assets/ljud/musik/stycke_on.ogg?url';
import styckeSegerM4a from '../../assets/ljud/musik/stycke_seger.m4a?url';
import styckeSegerOgg from '../../assets/ljud/musik/stycke_seger.ogg?url';
import tandgrottanM4a from '../../assets/ljud/musik/tandgrottan.m4a?url';
import tandgrottanOgg from '../../assets/ljud/musik/tandgrottan.ogg?url';
import isgrottanM4a from '../../assets/ljud/musik/isgrottan.m4a?url';
import isgrottanOgg from '../../assets/ljud/musik/isgrottan.ogg?url';
import slutetM4a from '../../assets/ljud/musik/slutet.m4a?url';
import slutetOgg from '../../assets/ljud/musik/slutet.ogg?url';
import dalenFrostM4a from '../../assets/ljud/musik/dalen_frost.m4a?url';
import dalenFrostOgg from '../../assets/ljud/musik/dalen_frost.ogg?url';
import styckeRasetM4a from '../../assets/ljud/musik/stycke_raset.m4a?url';
import styckeRasetOgg from '../../assets/ljud/musik/stycke_raset.ogg?url';
import { pausPlan } from '../karna/musik.js';
import { EFFEKT_FOR, INSPELAT_FOR, INSPELAT_SPELAS, ljudLista } from '../karna/ljudid.js';

export { EFFEKT_FOR };

/**
 * Musiken (F5 och 27, Stils sex slingor, 10c v0.5): varje fil har en halv sekund av slingans slut före och en halv
 * sekund av början efter, och spelas med WebAudio mellan looppunkterna, så att skarven inte hörs (ett <audio loop>
 * ger en skarv). Lägger avkodaren till tystnad i början flyttas båda punkterna lika mycket.
 * Slutpunkten räknas exakt ur takten (takter × åttondelar per takt × åttondelens längd i Stils skript), inte ur
 * tabellens avrundade tal: tabellen ligger 6–16 prover fel, och det ger ett klick.
 * meny: introt, startskärmen, pausmenyn och INSTÄLLNINGAR. Var de andra spelas står i datan (src/karna/musik.js).
 */
export const MUSIK = /** @type {Record<string, { m4a: string, ogg: string, loopStart: number, loopEnd: number }>} */ ({
  // 16 takter à 8 åttondelar i 92 BPM: 41,73913 s
  meny: { m4a: menyM4a, ogg: menyOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 8 * 30) / 92 },
  spel: { m4a: spelM4a, ogg: spelOgg, loopStart: 0.5, loopEnd: 48.5 },
  // fas4/slingor.py: natten 16 takter i 3/4 (6 åttondelar) i 63 BPM, 45,71429 s
  natten: { m4a: nattenM4a, ogg: nattenOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 6 * 60) / (63 * 2) },
  // skogen 24 takter i 6/8 med åttondelen 60/66/3 s, 43,63636 s
  skogen: { m4a: skogenM4a, ogg: skogenOgg, loopStart: 0.5, loopEnd: 0.5 + (24 * 6 * 60) / (66 * 3) },
  // raddning 16 takter à 8 åttondelar i 112 BPM, 34,28571 s
  raddning: { m4a: raddningM4a, ogg: raddningOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 8 * 60) / (112 * 2) },
  // lagerelden 16 takter à 8 åttondelar i 72 BPM, 53,33333 s
  lagerelden: { m4a: lagereldenM4a, ogg: lagereldenOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 8 * 60) / (72 * 2) },
  // byn (Stil 12, 70.7) 16 takter à 8 åttondelar i 96 BPM, 40,000 s
  byn: { m4a: bynM4a, ogg: bynOgg, loopStart: 0.5, loopEnd: 0.5 + (16 * 8 * 60) / (96 * 2) },
  // floden (103.3.5, Stil 10h v0.5): en vals i 3/4 med dragspel. Slutpunkten är Stils (41,739138 s efter starten)
  floden: { m4a: flodenM4a, ogg: flodenOgg, loopStart: 0.5, loopEnd: 42.239138 },
  // speldosan i tandgrottan (127.6, LASMIG_127): 37,9 s, Stils slutpunkt
  tandgrottan: { m4a: tandgrottanM4a, ogg: tandgrottanOgg, loopStart: 0.5, loopEnd: 38.394739 },
  // grottans fem rum (137.3.7, LASMIG_137): 68,6 s i D lydisk, Stils slutpunkt
  isgrottan: { m4a: isgrottanM4a, ogg: isgrottanOgg, loopStart: 0.5, loopEnd: 69.071429 },
  // kapitel 5 (lev139): slutbildernas slinga och den frostiga dalen
  slutet: { m4a: slutetM4a, ogg: slutetOgg, loopStart: 0.5, loopEnd: 62.435488 },
  dalen_frost: { m4a: dalenFrostM4a, ogg: dalenFrostOgg, loopStart: 0.5, loopEnd: 53.833333 },
});
/** Byte mellan slingor: den gamla tonas ut och den nya in på ca 1 s (Stil, 10c). Efter pausen tonas den in mjukare. */
/**
 * Kapitel 3:s korta stycken (103.3.5): inga slingor, de spelas en gång efter rätt svar (aldrig medan han läser eller
 * trycker). Slingan tonas ut medan stycket spelar och kommer tillbaka efteråt.
 */
export const STYCKEN = /** @type {Record<string, { m4a: string, ogg: string }>} */ ({
  stycke_skuggan: { m4a: styckeSkugganM4a, ogg: styckeSkugganOgg },
  stycke_on: { m4a: styckeOnM4a, ogg: styckeOnOgg },
  // ordduellens segerstycke (106.5, Stil 10h v0.8)
  stycke_seger: { m4a: styckeSegerM4a, ogg: styckeSegerOgg },
  // raset i kapitel 4 (121.2, Stil 22/11), följer regin blocket_lyfts
  stycke_raset: { m4a: styckeRasetM4a, ogg: styckeRasetOgg },
});
export const MUSIK_BYTE_S = 1;
export const MUSIK_EFTER_PAUS_S = 2;
/** Högst så många avkodade slingor i minnet (en slinga är ca 16–19 MB avkodad). Menyns stannar alltid. */
export const MUSIK_I_MINNET = 3;
/** Musikens nivå, och hur mycket den sänks när något läses (ca 12 dB, 62.10). */
export const MUSIK_NIVA = 0.5;
export const MUSIK_SANKT_DB = -12;

/**
 * Stils ljudeffekter (F5, 10c v0.5): 80 egna ljud med Stils id, nivån inbakad i filerna. Varje fil avkodas en gång
 * när ljudet startar. Det inspelade (ungen och Herr Skata) och rösternas pip stannar som förut.
 */
const EFFEKTER = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/ljud/effekter/*.wav', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.wav$/, ''), url])));
/** Signaturljuden spelas alltid likadant (samma fil, samma fart och förstärkning). */
const SIGNATUR = new Set(['stampel', 'ordkraft', 'dunk', 'baron', 'formel_ristas']);
/** Ljudeffekternas förstärkning. Musiken ligger ca 8 dB under (MUSIK_NIVA). Avvägt utan öron, ska provlyssnas. */
export const EFFEKT_NIVA = 0.5;
/** Vilka ljud-id som har en fil (för testerna och loggen). */
export const effektFinns = (/** @type {string} */ id) => !!EFFEKTER[EFFEKT_FOR[id] ?? id];

/** De inspelade ljuden. */
const INSPELADE = { herr_skata_skratt: skrattUrl, unge_late_01: unge1Url, unge_late_02: unge2Url, unge_late_03: unge3Url };

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

  // ---------------------------------------------------------------- musiken (F5 och 27)
  /** @type {string | null} slingan som ska spela (också innan ljudet har startats) */
  let onskad = null;
  /** @type {{ namn: string, kalla: AudioBufferSourceNode, g: GainNode } | null} */
  let spelar = null;
  /** @type {{ namn: string, timer: number } | null} slingan vilar (pausen efter två varv, 64.5) */
  let vilar = null;
  /** @type {GainNode | null} */
  let musikUt = null;
  let sankt = false;
  /** @type {Map<string, Promise<AudioBuffer | null>>} de avkodade slingorna, senast använd sist */
  const musikBuf = new Map();
  /** AAC (m4a) där webbläsaren kan det (Safari och Chrome på Mac och iPad), annars Ogg Vorbis. */
  const format = () => {
    try { return new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"') ? ['m4a', 'ogg'] : ['ogg', 'm4a']; } catch (e) { return ['m4a', 'ogg']; }
  };
  /** @param {ArrayBuffer} data @returns {Promise<AudioBuffer>} */
  const avkodaData = (data) => new Promise((klar, fel) => { const p = ac?.decodeAudioData(data, klar, fel); if (p && p.catch) p.catch(fel); });
  /** @param {string} namn @returns {Promise<AudioBuffer | null>} */
  function laddaMusik(namn) {
    const finns = musikBuf.get(namn);
    if (finns) { musikBuf.delete(namn); musikBuf.set(namn, finns); return finns; }
    const m = MUSIK[namn] ?? STYCKEN[namn];
    const prova = async (/** @type {string[]} */ f) => {
      for (const x of f) {
        try { const r = await fetch(/** @type {any} */ (m)[x]); return await avkodaData(await r.arrayBuffer()); } catch (e) { /* nästa format */ }
      }
      return null;
    };
    const p = m ? prova(format()) : Promise.resolve(null);
    musikBuf.set(namn, p);
    // minnet (iPad): de äldsta slingorna släpps, utom menyns och den som spelar (den laddas igen när den behövs)
    for (const n of [...musikBuf.keys()]) {
      if (musikBuf.size <= MUSIK_I_MINNET) break;
      if (n !== 'meny' && n !== namn && n !== spelar?.namn) musikBuf.delete(n);
    }
    return p;
  }
  const nivaNu = () => MUSIK_NIVA * (sankt ? 10 ** (MUSIK_SANKT_DB / 20) : 1);
  /** Tona ut en slinga och stoppa den. @param {{ kalla: AudioBufferSourceNode, g: GainNode }} x @param {number} s */
  function tonaUt(x, s) {
    if (!ac) return;
    const t = ac.currentTime, { kalla, g } = x;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.linearRampToValueAtTime(0.0001, t + s);
    try { kalla.stop(t + s + 0.05); } catch (e) { /* redan stoppad */ }
  }
  /**
   * Starta en slinga från början (loopStart, där motivet börjar), tonad in, och tona ut den som spelar. Efter två
   * varv tonas den ut och vilar 20–40 s (pausPlan), sedan börjar den om. Räddningen vilar aldrig.
   * @param {string} namn @param {AudioBuffer} buf @param {number} inS sekunder att tona in
   */
  function startaSlinga(namn, buf, inS) {
    if (!ac || !musikUt) return;
    if (spelar) { tonaUt(spelar, MUSIK_BYTE_S); spelar = null; }
    const m = MUSIK[namn];
    const kalla = ac.createBufferSource(), g = ac.createGain();
    kalla.buffer = buf; kalla.loop = true; kalla.loopStart = m.loopStart; kalla.loopEnd = Math.min(m.loopEnd, buf.duration);
    const t0 = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(1, t0 + inS);
    kalla.connect(g); g.connect(musikUt); kalla.start(t0, m.loopStart);
    const x = { namn, kalla, g };
    spelar = x;
    const plan = pausPlan(namn, kalla.loopEnd - kalla.loopStart);
    if (!plan) return;
    const slut = t0 + plan.spelaS;
    g.gain.setValueAtTime(1, slut - plan.tonaUtS); g.gain.linearRampToValueAtTime(0.0001, slut);
    kalla.stop(slut + 0.05);
    kalla.onended = () => {
      if (spelar !== x) return; // bytt eller tystad före pausen
      spelar = null;
      const timer = window.setTimeout(() => {
        if (vilar?.timer !== timer) return;
        vilar = null;
        if (onskad !== namn || tyst()) return;
        laddaMusik(namn).then((b) => { if (b && onskad === namn && !spelar && !vilar) startaSlinga(namn, b, MUSIK_EFTER_PAUS_S); }).catch(() => {});
      }, plan.vilaS * 1000);
      vilar = { namn, timer };
    };
  }
  /**
   * Spela en slinga (MUSIK), eller tystna (null). Samma slinga igen gör ingenting, inte heller medan den vilar.
   * Ett byte tonas på ca 1 s när den nya är avkodad, så att det aldrig blir tyst emellan. Före första trycket
   * kommer den ihåg vilken slinga som ska spela. @param {string | null} namn
   */
  function musik(namn) {
    onskad = namn;
    if (!ac || tyst()) return;
    if (stycket) return; // slingan kommer efter stycket
    if (spelar?.namn === namn || vilar?.namn === namn) return;
    if (vilar) { clearTimeout(vilar.timer); vilar = null; }
    if (!namn || !MUSIK[namn]) { if (spelar) { tonaUt(spelar, MUSIK_BYTE_S); spelar = null; } return; }
    if (!musikUt) { musikUt = ac.createGain(); musikUt.gain.value = nivaNu(); musikUt.connect(ac.destination); }
    laddaMusik(namn).then((buf) => {
      if (!buf || onskad !== namn || spelar?.namn === namn || vilar?.namn === namn) return;
      startaSlinga(namn, buf, MUSIK_BYTE_S);
    }).catch(() => { /* ingen musik, spelet går ändå */ });
  }
  /** @type {{ namn: string, kalla: AudioBufferSourceNode, g: GainNode } | null} stycket som spelar (STYCKEN) */
  let stycket = null;
  /**
   * Spela ett av kapitlets korta stycken (STYCKEN) en gång: slingan tonas ut, och efter stycket kommer den önskade
   * slingan tillbaka. @param {string} namn @returns {Promise<number>} styckets längd i ms (0 = tyst eller saknas)
   */
  async function stycke(namn) {
    if (!ac || tyst() || !STYCKEN[namn]) return 0;
    if (!musikUt) { musikUt = ac.createGain(); musikUt.gain.value = nivaNu(); musikUt.connect(ac.destination); }
    const buf = await laddaMusik(namn).catch(() => null);
    if (!buf || !ac || !musikUt) return 0;
    if (stycket) tonaUt(stycket, 0.3);
    if (spelar) { tonaUt(spelar, 0.4); spelar = null; }
    if (vilar) { clearTimeout(vilar.timer); vilar = null; }
    const kalla = ac.createBufferSource(), g = ac.createGain();
    kalla.buffer = buf; g.gain.value = 1;
    kalla.connect(g); g.connect(musikUt); kalla.start();
    const x = { namn, kalla, g };
    stycket = x;
    kalla.onended = () => {
      if (stycket !== x) return;
      stycket = null;
      const n = onskad; onskad = null; if (n) musik(n);
    };
    return Math.round(buf.duration * 1000);
  }

  // ---------------------------------------------------------------- ljudslingor i rummet (103.3.4)
  /** @type {Map<string, { kalla: AudioBufferSourceNode, g: GainNode }>} vattenhjulet och kvarnens dunk som går */
  const effektSlingor = new Map();
  /**
   * En ljudeffekt som går i slinga så länge rummet vill (vattenhjulet, kvarnens dunk), på nivån 0–1 (avståndet till
   * hjälten). 0 eller null tonar ut och stoppar den. @param {string} id @param {number | null} niva
   */
  function effektSlinga(id, niva) {
    const x = effektSlingor.get(id);
    if (!ac || tyst() || !niva || niva <= 0) {
      if (x && ac) { tonaUt(x, 0.4); }
      effektSlingor.delete(id);
      return;
    }
    const n = Math.min(1, niva);
    if (x) { x.g.gain.setTargetAtTime(n, ac.currentTime, 0.25); return; }
    const buf = effektBuf.get(id);
    if (!buf) return;
    if (!effektUt) { effektUt = ac.createGain(); effektUt.gain.value = EFFEKT_NIVA; effektUt.connect(ac.destination); }
    const kalla = ac.createBufferSource(), g = ac.createGain();
    kalla.buffer = buf; kalla.loop = true;
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.linearRampToValueAtTime(n, ac.currentTime + 0.6);
    kalla.connect(g); g.connect(effektUt); kalla.start();
    effektSlingor.set(id, { kalla, g });
  }

  /** Sänk musiken ca 12 dB medan något läses, och höj den igen efteråt. @param {boolean} pa */
  function sank(pa) {
    if (pa === sankt) return;
    sankt = pa;
    if (ac && musikUt) { const t = ac.currentTime; musikUt.gain.cancelScheduledValues(t); musikUt.gain.setTargetAtTime(nivaNu(), t, pa ? 0.06 : 0.25); }
  }

  /** @type {Map<string, AudioBuffer>} */
  const buffrar = new Map();
  /** @type {Map<string, AudioBuffer>} */
  const effektBuf = new Map();
  /** @type {GainNode | null} */
  let effektUt = null;
  /** Hämta och avkoda de inspelade ljuden och ljudeffekterna en gång (callback-formen fungerar också i äldre Safari). */
  function avkoda() {
    // ljudeffekterna fyra åt gången, så att avkodningen inte tar hela datorn när spelet startar (golvdatorn, iPad).
    // I snabbläget (testerna) hörs inget, och då avkodas de inte alls.
    if (!tyst()) {
      const ko = Object.entries(EFFEKTER);
      const nasta = () => {
        const x = ko.shift();
        if (!x) return;
        const [id, url] = x;
        fetch(url).then((r) => r.arrayBuffer()).then((data) => new Promise((klar, fel) => {
          const p = ac?.decodeAudioData(data, klar, fel); if (p && p.catch) p.catch(fel);
        })).then((b) => { effektBuf.set(id, /** @type {AudioBuffer} */ (b)); }).catch(() => { /* syntesen får spela i stället */ }).finally(nasta);
      };
      for (let i = 0; i < 4; i++) nasta();
    }
    for (const [namn, url] of Object.entries(INSPELADE)) {
      fetch(url).then((r) => r.arrayBuffer()).then((data) => new Promise((klar, fel) => {
        const p = ac?.decodeAudioData(data, klar, fel); if (p && p.catch) p.catch(fel);
      })).then((b) => { buffrar.set(namn, /** @type {AudioBuffer} */ (b)); }).catch(() => { /* syntesen får spela i stället */ });
    }
  }

  /**
   * Spela ett inspelat ljud, om det finns. Mammas rop (INSPELAT_SPELAS) är ungens läte, långsammare och svagare.
   * @param {string} namn @returns {number} längden i ms, 0 om det saknas
   */
  function inspelat(namn) {
    let n = INSPELAT_FOR[namn];
    if (Array.isArray(n)) n = n[Math.floor(Math.random() * n.length)];
    const buf = n ? buffrar.get(n) : null;
    if (!ac || !ut || !buf) return 0;
    const satt = INSPELAT_SPELAS[namn];
    const k = ac.createBufferSource(), g = ac.createGain();
    // inspelningarna är normaliserade (topp 0,89), genom ut (0,35) som syntesen
    g.gain.value = satt ? 10 ** (satt.db / 20) : 1;
    k.buffer = buf; k.playbackRate.value = satt?.fart ?? 1;
    k.connect(g); g.connect(ut); k.start();
    return Math.round((buf.duration / k.playbackRate.value) * 1000);
  }
  /** Hur länge ett ljud låter (ms), om det är avkodat, utan att spela det. @param {string} namn */
  function langd(namn) {
    let n = INSPELAT_FOR[namn];
    if (Array.isArray(n)) n = n[0];
    const ins = n ? buffrar.get(n) : null;
    if (ins) return Math.round((ins.duration / (INSPELAT_SPELAS[namn]?.fart ?? 1)) * 1000);
    const ef = effektBuf.get(EFFEKT_FOR[namn] ?? namn);
    return ef ? Math.round(ef.duration * 1000) : 0;
  }

  /**
   * Spela en av Stils ljudeffekter, om den är avkodad. @param {string} id Stils id @param {number} [fart] playbackRate
   * (inte för signaturljuden) @param {number} [om] sekunder till start @returns {number} längden i ms, 0 om den saknas
   */
  function effekt(id, fart = 1, om = 0) {
    const buf = effektBuf.get(id);
    if (!ac || !buf) return 0;
    if (!effektUt) { effektUt = ac.createGain(); effektUt.gain.value = EFFEKT_NIVA; effektUt.connect(ac.destination); }
    const k = ac.createBufferSource();
    k.buffer = buf; k.playbackRate.value = SIGNATUR.has(id) ? 1 : fart;
    k.connect(effektUt); k.start(ac.currentTime + om);
    return Math.round((buf.duration / k.playbackRate.value) * 1000);
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
    // fyndet (133.10): en kort fanfar i tre stigande toner och ett ackord, tills Stils fanfar finns
    fanfar: () => { [523, 659, 784].forEach((f, i) => ton({ f, t: 0.14, v: 0.3, typ: 'square', d: i * 0.12 })); [523, 659, 784, 1047].forEach((f) => ton({ f, t: 0.5, v: 0.18, typ: 'square', d: 0.38 })); },
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

  /**
   * Ett ljud: det inspelade lätet, annars Stils ljudeffekt (10c v0.5), annars syntesen.
   * @param {string} namn @param {{ fart?: number, om?: number }} [opt] fart: playbackRate, om: sekunder till start
   * @returns {number} hur länge ljudet låter i ms (0 = kort syntes eller tyst)
   */
  function spela(namn, opt = {}) {
    if (tyst()) return 0;
    starta();
    try {
      const ms = inspelat(namn) || inspelat(LJUD_ID[namn] || '') || effekt(EFFEKT_FOR[namn] ?? namn, opt.fart, opt.om);
      if (ms) return ms;
      (fx[namn] || fx[LJUD_ID[namn]] || fx.allmant)();
    } catch (e) { /* ljud får aldrig krascha spelet */ }
    return 0;
  }

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
    stycke,
    /** Finns ljudet (Stils fil eller en inspelning)? @param {string} id */
    har(id) { return !!EFFEKTER[id] || id in INSPELADE; },
    /**
     * Tystnad (126.6): stycket och slingan tonas ut på en kvarts sekund, och efter ms kommer den önskade slingan
     * tillbaka. Raset dånar, och när snön stannar blir det tyst. @param {number} ms
     */
    tystnad(ms) {
      if (!ac) return;
      const n = onskad ?? stycket?.namn ?? spelar?.namn ?? null;
      if (stycket) { const x = stycket; stycket = null; tonaUt(x, 0.25); }
      if (spelar) { tonaUt(spelar, 0.25); spelar = null; }
      if (vilar) { clearTimeout(vilar.timer); vilar = null; }
      onskad = null;
      window.setTimeout(() => { if (!stycket && !spelar && n && !STYCKEN[n]) musik(n); }, ms);
    },
    effektSlinga,
    /** För testerna och loggen: ljudslingorna som går i rummet. */
    get slingorNu() { return [...effektSlingor.keys()]; },
    sank,
    /** För testerna och loggen: vilken slinga som ska spela, vilken som spelar och om den är sänkt. */
    get musikLage() { return { onskad, spelar: spelar?.namn ?? null, vilar: vilar?.namn ?? null, stycke: stycket?.namn ?? null, sankt }; },
    spela,
    /**
     * En reaktions ljud (64.6): ett id eller upp till tre, efter varandra med ett litet glapp (`["badanka", "spolning"]`).
     * @param {unknown} lista @returns {number} hur länge de låter tillsammans i ms (0 = tyst eller okänt)
     */
    spelaRad(lista) {
      const ids = ljudLista(lista);
      if (tyst() || !ids.length) return 0;
      let om = 0;
      ids.forEach((id, i) => {
        if (i === 0) spela(id); else window.setTimeout(() => spela(id), om);
        om += Math.max(350, langd(id)) + 120;
      });
      return om - 120;
    },
  };
}
