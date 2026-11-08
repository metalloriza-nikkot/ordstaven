// @ts-check
// Introt (F4, 10e v0.4 *Introt*): som i SNES-spelen bygger det upp till titeln, väntar på ett tryck och landar på
// startskärmen. Allt är bildbyten, lägen och opacitet i världens pixlar (320 × 192, --vpx), så att golvdatorn klarar
// det. Tiderna och solarnas vägar står i Stils `assets/ui/intro/intro.json`. Inget i introt kräver läsning.
//   A. Utsikten genom Farfars fönster. Natten väntar på första trycket (vår PRESS START: webbläsaren spelar inget
//      ljud före ett tryck), sedan blir det morgon i tolv steg, de tre solarna stiger och ORDSTAVEN kommer fram.
//   B. Kameran backar lätt (b_01–10).  C. Blicken går ned mot skrivbordet (c_01–13), och namnet faller med till
//      mässingsskylten. Den sista bilden är startskärmens bord.
// **Ett tryck efter det första hoppar alltid över resten.** Det som pratar (namnet) kan avbrytas och har en maxtid.
import INTRO from '../../assets/ui/intro/intro.json';
import { startBild } from './startskarm.js';

const BILDER = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/ui/intro/*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));

const SOL = /** @type {Record<string, number>} */ ({ stor: 35, mellan: 21, liten: 17 });
/**
 * Mässingsskyltens gula yta i c_01–c_13 (överkant, underkant, vänster, höger i världens pixlar), mätt ur Stils
 * bilder. Namnet faller ned mot skylten och följer den, och i c_13 står det där startskärmens namn står
 * (överkant 9,4, 14,5 pixlar, när ytan är 8–23). Ritar Stil om del C mäts tabellen om.
 */
const SKYLT_C = [[185, 191, 90, 228], [175, 181, 90, 228], [160, 168, 90, 229], [144, 152, 89, 229], [126, 136, 89, 230],
  [108, 119, 89, 230], [90, 102, 90, 229], [71, 85, 91, 228], [53, 67, 92, 227], [37, 51, 94, 225], [22, 37, 95, 224],
  [12, 27, 95, 224], [8, 23, 95, 223]];
/**
 * Var namnet står i bild i av del C (1–13): från himlen (överkant y0, storlek s0) ned mot skylten, så att det har landat på skylten i sista bilden. @param {number} i @param {number} y0 @param {number} s0
 * @returns {{ y: number, sx: number, sy: number }} överkant och skala mot storleken s0
 */
export function namnetIC(i, y0, s0) {
  const [topp, botten, v, h] = SKYLT_C[Math.max(1, Math.min(13, i)) - 1];
  const hojd = (botten - topp + 1) / 16, bredd = (h - v + 1) / 129;
  const e = 1 - (1 - i / 13) ** 3; // faller fort i början och lägger sig mjukt på skylten
  const mal = { y: topp + 1.4 * hojd, sx: (14.5 / s0) * bredd, sy: (14.5 / s0) * hojd };
  return { y: y0 + (mal.y - y0) * e, sx: 1 + (mal.sx - 1) * e, sy: 1 + (mal.sy - 1) * e };
}
const TITEL = String(INTRO.del_a?.titel?.text || 'ORDSTAVEN');
const nn = (/** @type {number} */ i) => String(i).padStart(2, '0');
const lage = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ b, /** @type {number} */ h) => `left:calc(${x} * var(--vpx));top:calc(${y} * var(--vpx));width:calc(${b} * var(--vpx));height:calc(${h} * var(--vpx))`;

/** Alla introts bilder, för förladdningen och testerna. */
export const introBilder = () => Object.keys(BILDER);

/**
 * Spela introt i `skarm`. Löses när det är slut eller överhoppat; startskärmen ritas sedan i samma skärm.
 * @param {{
 *   skarm: HTMLElement,
 *   tid?: (ms: number) => number,
 *   forstaTrycket?: () => void,
 *   klang?: (i: number) => void,
 *   lasNamnet?: () => Promise<unknown>,
 *   tyst?: () => void,
 *   ordkraft?: string | null,
 *   logg?: { handelse(t: string, m: string, d?: any): void },
 * }} opt forstaTrycket startar ljudet och musiken; klang(i) är bokstav i:s lilla klang; lasNamnet läser upp namnet
 *   (med maxtid), och tyst avbryter det; ordkraft är bilden av ordkraftens ljus vid stavens ändar
 * @returns {Promise<'klart' | 'hoppat'>}
 */
export function spelaIntro({ skarm, tid = (ms) => ms, forstaTrycket = () => {}, klang = () => {}, lasNamnet = () => Promise.resolve(), tyst = () => {}, ordkraft = null, logg }) {
  const A = INTRO.del_a, B = INTRO.del_b, C = INTRO.del_c;
  const steg = Number(A?.steg || 12), msSteg = Number(A?.ms_per_steg || 340);
  const solar = /** @type {Record<string, { mitt_per_steg: number[][] }>} */ (A?.solar || {});
  const titelY = Number(A?.titel?.overkant_y ?? 26), titelPx = Number(A?.titel?.storlek_px ?? 15), msBokstav = Number(A?.titel?.en_bokstav_per_ms ?? 170);
  const bokstaver = [...TITEL].map((c, i) => `<span class="intro-bokstav" data-i="${i}">${c}</span>`).join('');
  const sol = (/** @type {string} */ n) => {
    const [x, y] = solar[n]?.mitt_per_steg?.[0] || [160, 121];
    return `<img class="sb intro-sol" data-sol="${n}" src="${BILDER['sol_' + n] || ''}" alt="" draggable="false" style="${lage(Math.round(x - SOL[n] / 2), Math.round(y - SOL[n] / 2), SOL[n], SOL[n])}">`;
  };
  skarm.innerHTML = `<button type="button" class="intro" aria-label="Starta">`
    + `<img class="sb intro-himmel" src="${BILDER.a_himmel_00 || ''}" alt="" draggable="false" style="${lage(0, 0, 320, 192)}">`
    + ['stor', 'mellan', 'liten'].map(sol).join('')
    + `<img class="sb intro-land" src="${BILDER.a_land_00 || ''}" alt="" draggable="false" style="${lage(0, 0, 320, 192)}">`
    + `<img class="sb intro-bild" alt="" draggable="false" hidden style="${lage(0, 0, 320, 192)}">`
    + `<div class="intro-titel" aria-hidden="true" style="top:calc(${titelY} * var(--vpx));font-size:calc(${titelPx} * var(--vpx))">${bokstaver}</div>`
    + (ordkraft ? [96, 196].map((x) => `<img class="sb intro-ordkraft" src="${ordkraft}" alt="" draggable="false" style="${lage(x, 22, 32, 32)}">`).join('') : '')
    + `<span class="intro-pil" style="${lage(144, 80, 32, 32)}"><img class="sb" src="${startBild('pil_vilar') || ''}" alt="" draggable="false" style="${lage(0, 0, 32, 32)}"><img class="sb puls" src="${startBild('pil') || ''}" alt="" draggable="false" style="${lage(0, 0, 32, 32)}"></span>`
    + `</button>`;
  skarm.hidden = false;
  skarm.classList.add('start-skarm');
  const rot = /** @type {HTMLButtonElement} */ (skarm.querySelector('.intro'));
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (rot.querySelector(s));
  const himmel = /** @type {HTMLImageElement} */ ($('.intro-himmel')), land = /** @type {HTMLImageElement} */ ($('.intro-land'));
  const bild = /** @type {HTMLImageElement} */ ($('.intro-bild')), titel = $('.intro-titel'), pil = $('.intro-pil');
  try { rot.focus({ preventScroll: true }); } catch (e) { /* ok */ }

  // förladdning medan natten väntar, så att bildbytena aldrig blinkar
  const forladdat = Promise.all(Object.values(BILDER).map((u) => new Promise((klar) => {
    const i = new Image(); i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(klar); i.onerror = klar; i.src = u;
  })));

  let hoppat = false, startad = false;
  /** @type {ReturnType<typeof setTimeout>[]} */
  const klockor = [];
  /** @type {(v: 'klart' | 'hoppat') => void} */
  let svara = () => {};
  const klar = new Promise((r) => { svara = r; });
  const vanta = (/** @type {number} */ ms) => new Promise((r) => { if (hoppat) { r(undefined); return; } klockor.push(setTimeout(r, tid(ms))); });
  const sluta = (/** @type {'klart' | 'hoppat'} */ hur) => {
    if (hur === 'hoppat') { if (hoppat) return; hoppat = true; tyst(); logg?.handelse('intro', 'hoppat över'); }
    klockor.forEach(clearTimeout);
    skarm.removeEventListener('click', tryck);
    svara(hur);
  };
  function tryck() {
    if (!startad) { startad = true; forstaTrycket(); logg?.handelse('intro', 'första trycket'); kor(); return; }
    sluta('hoppat');
  }
  // ett tryck var som helst (också på ramen runt spelytan), eller Enter och mellanslag på knappen
  skarm.addEventListener('click', tryck);

  async function kor() {
    pil.hidden = true;
    await forladdat;
    // A: morgonen i tolv steg, solarna glider mjukt mellan stegens lägen
    rot.classList.add('morgon');
    rot.style.setProperty('--steg-ms', tid(msSteg) + 'ms');
    for (let i = 1; i < steg && !hoppat; i++) {
      await vanta(msSteg);
      if (hoppat) return;
      himmel.src = BILDER['a_himmel_' + nn(i)] || himmel.src;
      land.src = BILDER['a_land_' + nn(i)] || land.src;
      for (const n of Object.keys(SOL)) {
        const p = solar[n]?.mitt_per_steg?.[i], el = /** @type {HTMLElement | null} */ (rot.querySelector(`[data-sol="${n}"]`));
        const p0 = solar[n]?.mitt_per_steg?.[0];
        if (p && p0 && el) el.style.transform = `translate(calc(${p[0] - p0[0]} * var(--vpx)), calc(${p[1] - p0[1]} * var(--vpx)))`;
      }
    }
    // namnet kommer fram över bergen, en bokstav i taget med en liten klang, och läses upp
    const b = /** @type {HTMLElement[]} */ ([...titel.querySelectorAll('.intro-bokstav')]);
    for (let i = 0; i < b.length && !hoppat; i++) { await vanta(i ? msBokstav : 300); if (hoppat) return; b[i].classList.add('fram'); klang(i); }
    if (hoppat) return;
    await Promise.race([lasNamnet(), vanta(3000)]);
    await vanta(500);
    if (hoppat) return;
    // B: kameran backar (landskapet står still, fönstret kommer in från kanterna)
    bild.hidden = false;
    for (let i = 1; i <= 10 && !hoppat; i++) { bild.src = BILDER['b_' + nn(i)] || bild.src; await vanta(Number(B?.ms || 90)); }
    await vanta(250);
    // C: blicken går ned mot skrivbordet, och bokstäverna faller ned till mässingsskylten och följer den
    rot.classList.add('ned');
    rot.style.setProperty('--c-ms', tid(Number(C?.ms || 90)) + 'ms');
    for (let i = 1; i <= 13 && !hoppat; i++) {
      bild.src = BILDER['c_' + nn(i)] || bild.src;
      const n = namnetIC(i, titelY, titelPx);
      titel.style.transform = `translateX(-50%) translateY(calc(${(n.y - titelY).toFixed(2)} * var(--vpx))) scale(${n.sx.toFixed(4)}, ${n.sy.toFixed(4)})`;
      await vanta(Number(C?.ms || 90));
    }
    if (hoppat) return;
    // bokstäverna har landat: stavens båda ändar lyser upp
    rot.classList.add('landat');
    await vanta(700);
    if (!hoppat) { logg?.handelse('intro', 'klart'); sluta('klart'); }
  }
  logg?.handelse('intro', 'natten väntar på första trycket');
  return /** @type {Promise<'klart' | 'hoppat'>} */ (klar);
}
