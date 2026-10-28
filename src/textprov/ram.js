// @ts-check
// En textform i en egen ram: samma textlager (ui.js) och samma stil (stil.css) som spelet, ovanpå en
// schematisk gråbox. Provsidan visar en ram per form. Öppnad ensam (?form=…) får ramen egna knappar för den vuxne.
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import '../stil.css';
import './ram.css';

import ordlistor from '../../content/ordlistor.json';
import aventyr from '../../content/den-gomda-dalen/aventyr.json';
import kap00 from '../../content/den-gomda-dalen/kap-00.json';
import kap01 from '../../content/den-gomda-dalen/kap-01.json';
import platshallare from '../../kartor/den-gomda-dalen/platshallare.json';

import { forSkarm } from '../karna/text.js';
import { rumTillSkarm } from '../karna/skalning.js';
import { skapaLayout } from '../grans/layout.js';
import { skapaUi } from '../grans/ui.js';
import { skapaBilder } from '../grans/bilder.js';
import { skapaRost } from '../grans/rost.js';
import { FORMER, VARDEN } from './former.js';
import { hamta } from './hamta.js';
import { skapaSpelare } from './upplasning.js';

/** @typedef {import('./former.js').Form} Form @typedef {import('./upplasning.js').Segment} Segment */

const q = new URLSearchParams(location.search);
const ensam = !q.has('inbaddad');
if (q.has('snabb')) document.documentElement.classList.add('snabb');
document.documentElement.classList.add('textprov-ram');

const innehall = { kapitel: [kap00, kap01], aventyr };
const form = /** @type {Form | undefined} */ (FORMER.find((f) => f.id === q.get('form')));

document.body.innerHTML = '<div id="ram"><div id="varld"></div><div id="textlager"></div></div>';
const varld = /** @type {HTMLElement} */ (document.getElementById('varld'));
const layout = skapaLayout({ varld });
const tyst = { handelse() {} };
const ui = skapaUi({ ordlistor, rost: /** @type {any} */ ({ sekvens: async () => 'klar', tyst() {} }), ljud: /** @type {any} */ ({ spela() {} }), logg: tyst });
const bilder = skapaBilder(ordlistor, platshallare.bilder);
const { esc } = ui;
const rader = (/** @type {string | string[]} */ t, /** @type {string | undefined} */ klass = undefined) => ui.rader(t, VARDEN, klass);
const sagt = (/** @type {string | string[]} */ t) => forSkarm(t, { varden: VARDEN, skrift: 'vanlig' }).join(' ');
const rollFor = (/** @type {string} */ talare) => /** @type {any} */ (aventyr.talare)[talare]?.rollrost || 'berattare';
const portratt = (/** @type {string} */ talare) => `<span class="portratt p-${esc(talare)}" aria-hidden="true"></span>`;
const pt = (/** @type {number} */ x, /** @type {number} */ y) => rumTillSkarm(layout.skala, x, y);
const rumTopp = () => layout.skala.topp;

// ---------------------------------------------------------------- kulissen: en schematisk gråbox i rummets pixlar
/** @param {import('./former.js').Kuliss} k */
function ritaKuliss(k) {
  const B = 320, H = 192;
  const delar = [];
  if (k.rum === 'inne') {
    delar.push(`<rect width="${B}" height="${H}" fill="#8c8a86"/>`);
    for (let x = 16; x < B; x += 16) delar.push(`<rect x="${x}" width="1" height="${H}" fill="#7f7d79"/>`);
    for (let y = 16; y < H; y += 16) delar.push(`<rect y="${y}" width="${B}" height="1" fill="#7f7d79"/>`);
    delar.push(`<rect x="32" width="${B - 64}" height="48" fill="#7a6a58"/><rect x="32" y="46" width="${B - 64}" height="2" fill="#4a3f34"/>`,
      `<polygon points="0,0 32,48 32,${H - 16} 0,${H}" fill="#5e5244"/><polygon points="${B},0 ${B - 32},48 ${B - 32},${H - 16} ${B},${H}" fill="#5e5244"/>`,
      `<rect x="32" y="${H - 16}" width="${B - 64}" height="16" fill="#6a5c4c"/>`);
  } else {
    delar.push(`<rect width="${B}" height="${H}" fill="#7da35a"/>`);
    for (let x = 16; x < B; x += 16) delar.push(`<rect x="${x}" width="1" height="${H}" fill="#76995a" opacity=".6"/>`);
    for (let y = 16; y < H; y += 16) delar.push(`<rect y="${y}" width="${B}" height="1" fill="#76995a" opacity=".6"/>`);
  }
  for (const s of k.saker) delar.push(ritaSak(s));
  varld.innerHTML = `<svg class="kuliss" viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges">${delar.join('')}</svg>`;
}
/** @param {import('./former.js').Sak} s */
function ritaSak(s) {
  const { x, y } = s, b = s.b ?? 16, h = s.h ?? 16;
  switch (s.typ) {
    case 'hjalte': return `<g><rect x="${x + 3}" y="${y + 12}" width="10" height="9" fill="#3a3e48"/><rect x="${x + 1}" y="${y + 13}" width="2" height="6" fill="#2e8bd8"/><rect x="${x + 13}" y="${y + 13}" width="2" height="6" fill="#2e8bd8"/><rect x="${x + 2}" y="${y}" width="12" height="12" fill="#c9ccd2"/><rect x="${x + 4}" y="${y + 3}" width="8" height="7" fill="#2e8bd8"/><rect x="${x + 4}" y="${y + 21}" width="3" height="3" fill="#1e4fa0"/><rect x="${x + 9}" y="${y + 21}" width="3" height="3" fill="#1e4fa0"/></g>`;
    case 'unge': return `<g><rect x="${x}" y="${y}" width="12" height="8" fill="#5fae6a"/><rect x="${x + 3}" y="${y + 4}" width="6" height="3" fill="#9fd4a0"/><rect x="${x + 9}" y="${y + 1}" width="2" height="2" fill="#1a1410"/></g>`;
    case 'figur': return `<g><rect x="${x}" y="${y + 8}" width="16" height="20" fill="${s.farg || '#c9a27a'}"/><rect x="${x + 3}" y="${y}" width="10" height="10" fill="#e0c09a"/></g>`;
    case 'dorr': return `<g><rect x="${x}" y="${y}" width="28" height="26" fill="#6d5a45"/><rect x="${x}" y="${y}" width="28" height="26" fill="none" stroke="#c9a46a" stroke-width="2"/><rect x="${x + 21}" y="${y + 13}" width="3" height="3" fill="#e8d38a"/></g>`;
    case 'stig': return `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="#b49a6a"/>`;
    case 'trad': return `<g><rect x="${x + b / 2 - 3}" y="${y + h * 0.55}" width="6" height="${h * 0.45}" fill="#6b4c35"/><rect x="${x}" y="${y}" width="${b}" height="${h * 0.62}" rx="6" fill="#4f7f3f"/></g>`;
    case 'lada': return `<rect x="${x}" y="${y}" width="26" height="18" fill="#b9b2a4" stroke="#6e675c"/>`;
    case 'sak': return `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="${s.farg || '#b9b2a4'}" stroke="#6e675c"/>`;
    case 'nat': return `<g><rect x="${x}" y="${y}" width="40" height="34" fill="none" stroke="#8a5ac0" stroke-width="2"/><path d="M${x} ${y + 11}h40M${x} ${y + 22}h40M${x + 13} ${y}v34M${x + 26} ${y}v34" stroke="#8a5ac0"/><rect x="${x + 12}" y="${y + 10}" width="16" height="16" fill="#8a6a4a"/><rect x="${x + 16}" y="${y + 14}" width="8" height="6" fill="#d8b890"/></g>`;
    case 'back': return `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="#5a8fc4"/>`;
    case 'bro': return `<g><rect x="${x}" y="${y}" width="44" height="6" fill="#8a6a4a"/><rect x="${x + 2}" y="${y + 6}" width="4" height="22" fill="#6b4c35"/><rect x="${x + 38}" y="${y + 6}" width="4" height="22" fill="#6b4c35"/></g>`;
    case 'lianer': { let l = ''; for (let i = x; i < x + b; i += 8) l += `<rect x="${i}" y="${y}" width="3" height="${h + ((i * 7) % 13) + 36}" fill="#3e6b2e"/>`; return `<g>${l}</g>`; }
    default: return '';
  }
}

// ---------------------------------------------------------------- formerna
/** @type {Segment[]} segmenten som läses upp när ▶ trycks (i tur och ordning) */
let segment = [];
/** @type {((spelare: any, inst: any) => Promise<any>) | null} egen uppspelning (titta–täck) */
let egenUppspelning = null;
/** @type {number[]} */
let klockor = [];
/** @param {string} sel @returns {HTMLElement} */
const $ = (sel) => /** @type {HTMLElement} */ (ui.ui.querySelector(sel));
/** @param {string} namn @returns {any} */
const k = (namn) => hamta(/** @type {any} */ (form?.kalla?.[namn]), innehall);
/** Det spelet visar när en fråga står ovanför korten: en rad med (dold) talare och texten. @param {any} r */
const fragaRad = (r) => `<div class="svar-rad fraga-rad">${portratt(r.talare)}<div class="text">${rader(r.text)}</div></div>`;
/** @param {string} sel @param {any} r */
const seg = (sel, r) => ({ el: $(sel), text: sagt(r.text), roll: rollFor(r.talare) });

/** @param {any} a */
const kortHtml = (a) => {
  const bild = a.ord ? '' : bilder.html(a.bild || a.id);
  const etikett = a.ord ? `<span class="kort-etikett">${rader(a.ord, 'kort-ord')}</span>` : '';
  return `<button type="button" class="kort${a.ord && a.ord.includes(' ') ? ' mening' : ''}" data-id="${esc(a.id)}">${bild}${etikett}</button>`;
};
const brickHtml = (/** @type {string[]} */ b, anvand = /** @type {Set<number>} */ (new Set())) => `<div class="brickor">${b.map((x, i) => `<button type="button" class="bricka${anvand.has(i) ? ' anvand' : ''}" data-i="${i}">${esc(x)}</button>`).join('')}<button type="button" class="bricka sudda" aria-label="Ta tillbaka">⌫</button></div>`;
const platsHtml = (/** @type {number} */ n, fylld = /** @type {string[]} */ ([])) => `<div class="platser">${Array.from({ length: n }, (_, i) => `<span class="plats${fylld[i] ? ' last' : ''}">${esc(fylld[i] || '')}</span>`).join('')}</div>`;
const forebildHtml = (/** @type {string} */ t) => `<div class="forebild" aria-label="Förebild">${[...t].map((c) => `<span class="bokstav">${esc(c)}</span>`).join('')}</div>`;
const hudFor = (/** @type {string[]} */ h = []) => ui.uppdateraHud({ bar: 3, ui: { barraknaren: h.includes('bar'), nosknappen: h.includes('nos'), radioramen: h.includes('radio') }, lappar: h.includes('lapp') ? ['lapp'] : [] });
const sak = (/** @type {string} */ id) => form?.kuliss.saker.find((s) => s.id === id);

/** @type {Record<string, () => void>} */
const VISA = {
  replik() {
    const r = k('replik');
    const via = r.via === 'radio' ? '<span class="via-radio" aria-hidden="true">📻</span>' : '';
    const el = ui.visaPlatta(`<div class="replik-ruta">${portratt(r.talare || 'farfar')}<div class="text">${via}${rader(r.text)}</div><button type="button" class="vidare" aria-label="Vidare">▶</button></div>`, 'replik');
    el.classList.add('klar-att-ga');
    segment = [{ el: $('#plattan .text'), text: sagt(r.text), roll: rollFor(r.talare || 'farfar') }];
  },
  rop() {
    const r = k('rop'); const f = sak('farfar') || { x: 160, y: 80 };
    ui.ropa(rader(r.text), pt(f.x + 8, f.y));
    segment = [seg('#rop', r)];
  },
  instruktion() {
    const r = k('replik');
    ui.visaTanke(`<span class="instruktion">${rader(r.text)}</span>`);
    const b = $('#hud-bar').getBoundingClientRect();
    ui.styrhjalp('tryck', { x: b.left + b.width / 2, y: b.top + b.height / 2 });
    segment = [seg('#tanke .instruktion', r)];
  },
  inristning() {
    VISA.replik();
    const nya = k('formel'), forra = k('forra');
    const stav = document.createElement('div');
    stav.className = 'prov-stav';
    stav.innerHTML = `<span class="prov-stav-ord">${esc(forra)}</span><span class="prov-stav-ord ny">${esc(nya)}</span>`;
    ui.ui.appendChild(stav);
  },
  passSlut() {
    const fr = k('fraga');
    const sover = '<span class="unge-sover" aria-hidden="true"><span class="kropp"></span><span class="zz">z z</span></span>';
    ui.visaSkarm(`<div class="pass-slut"><div class="fraga-text">${rader(fr.text)}</div><div class="knappar"><button type="button" class="knapp stor fortsatt" aria-label="Fortsätt">▶</button><button type="button" class="knapp stor paus" aria-label="Sluta för idag">${sover}</button></div></div>`);
    segment = [seg('.fraga-text', fr)];
  },
  dorrar() {
    const v = k('pussel');
    ui.visaTanke(bilder.html(v.bild));
    utgangsSkyltar(v.alternativ, false);
    ui.skyltNara(v.alternativ[1]?.objekt ?? null);
  },
  stigskyltar() {
    const v = k('pussel');
    ui.visaTanke('<button type="button" class="tanke-lapp" aria-label="Lappen">📜</button>');
    utgangsSkyltar(v.alternativ, true);
  },
  tavla() {
    const b = sak('bro') || form?.kuliss.saker.find((s) => s.typ === 'bro') || { x: 236, y: 26 };
    ui.skyltar([{ objekt: 'tavla_bron', html: `<span class="kort tavla"><span class="kort-etikett">${rader(form?.exempel?.ord, 'kort-ord')}</span></span>`, punkt: pt(b.x + 22, b.y - 1), plats: { lage: 'over', rumTopp: rumTopp() }, vidTryck: () => {} }]);
  },
  lapp() {
    const p = k('pussel'), text = k('text');
    ui.visaPlatta(`<div class="pussel-ruta"><div class="lapp p-${esc(p.papper || 'lapp')}">${rader(text)}</div><button type="button" class="vidare synlig" aria-label="Stäng">▶</button></div>`, 'pussel lapp-vy');
  },
  narlapp() {
    const v = k('pussel'); const l = sak('lada') || { x: 120, y: 100 };
    const a = v.alternativ[0];
    ui.ordskylt(`<button type="button" class="kort" data-id="${esc(a.id)}"><span class="kort-etikett">${rader(a.ord, 'kort-ord')}</span></button>`, pt(l.x + 13, l.y), () => {}, { lage: 'over', rumTopp: rumTopp() });
  },
  lappFraga() {
    const p = k('pussel'); const v = p.varianter.L2;
    ui.visaPlatta(`<div class="pussel-ruta">${fragaRad(p.instruktion)}<div class="lapp p-${esc(p.papper)}">${rader(v.text)}<span class="prov-underskrift" aria-label="Baronens fjäderhatt">🎩</span></div><div class="kortrad">${v.alternativ.map(kortHtml).join('')}</div></div>`, 'pussel ' + p.typ);
    segment = [seg('.fraga-rad .text', p.instruktion)];
  },
  valj() {
    const p = k('pussel'); const v = Object.values(p.varianter)[0];
    const bild = v.bild ? `<div class="fraga">${bilder.html(v.bild)}</div>` : '';
    ui.visaPlatta(`<div class="pussel-ruta">${p.instruktion ? fragaRad(p.instruktion) : ''}${bild}<div class="kortrad">${v.alternativ.map(kortHtml).join('')}</div></div>`, 'pussel ' + p.typ);
    segment = p.instruktion ? [seg('.fraga-rad .text', p.instruktion)] : [];
  },
  formel() {
    const p = k('pussel');
    ui.visaPlatta(`<div class="formel-ruta">${p.forebild ? forebildHtml(p.forebild.text) : ''}${platsHtml(p.svar.length)}${brickHtml(p.brickor)}</div>`, 'pussel P11_formel');
  },
  tittaTack() {
    const p = k('pussel');
    const t = sak('trad_med_formel') || { x: 136, y: 20, b: 48 };
    const ristat = document.createElement('div');
    ristat.className = 'prov-ristat'; ristat.textContent = p.forebild.text;
    const pp = pt(t.x + (t.b ?? 48) / 2, t.y + 34);
    ristat.style.left = pp.x + 'px'; ristat.style.top = pp.y + 'px';
    ui.ui.appendChild(ristat);
    const rita = (/** @type {boolean} */ medBrickor, /** @type {string[]} */ fylld = []) => {
      ui.visaPlatta(`<div class="formel-ruta">${platsHtml(p.svar.length, fylld)}${medBrickor ? brickHtml(p.brickor, new Set(fylld.map((b) => p.brickor.indexOf(b)))) : '<div class="brickor prov-tomt"></div>'}</div>`, 'pussel P11_formel prov-nere');
    };
    rita(true);
    egenUppspelning = async () => {
      ristat.classList.remove('tonad'); ui.doljRegi(); rita(false);
      const vanta = (/** @type {number} */ ms) => new Promise((r) => klockor.push(window.setTimeout(r, ms)));
      await vanta(2000); rita(true);
      await vanta(1500); rita(true, [p.svar[0]]); ristat.classList.add('tonad');
      ui.visaRegi('Ungen håller tassarna för ögonen.', 0);
      return { takt: 'uppskattad', hur: 'klar' };
    };
  },
  raddning() {
    const p = k('pussel');
    ui.visaPlatta(`<div class="formel-ruta prov-raddning"><button type="button" class="prov-kasta" aria-label="Kasta ordet">🪄</button><div class="lapp">${rader(p.kategori)}</div>${platsHtml(p.svar.length)}${brickHtml(form?.exempel?.brickor || [])}</div>`, 'pussel P15_raddning');
  },
  kodlas() {
    const p = k('pussel'); const c = p.chiffer;
    const las = `<div class="prov-kodkort"><div class="prov-tecken">${c.tecken.map((/** @type {string} */ t) => bilder.html(t)).join('')}</div>${platsHtml(c.tecken.length)}</div>`;
    const nyckel = `<div class="prov-kodkort prov-nyckel"><span class="prov-ros" aria-hidden="true">🧭</span>${c.nyckel.map((/** @type {any} */ n) => `<span class="prov-par">${bilder.html(n.tecken)}<span class="prov-bokstav">${esc(n.bokstav)}</span></span>`).join('')}</div>`;
    ui.visaPlatta(`<div class="pussel-ruta">${fragaRad(p.instruktion)}<div class="prov-kodrad">${las}${nyckel}</div>${brickHtml(p.brickor)}</div>`, 'pussel P9_kodlas');
    segment = [seg('.fraga-rad .text', p.instruktion)];
  },
  dop() {
    const p = k('pussel'); const skrivet = [...(form?.exempel?.skrivet || '')];
    const rutor = Array.from({ length: p.max_bokstaver || 8 }, (_, i) => `<span class="ruta${skrivet[i] ? ' fylld' : ''}">${esc(skrivet[i] || '')}</span>`).join('');
    ui.visaPlatta(`<div class="dop-ruta"><div class="namnrutor">${rutor}</div><div class="dop-knappar"><button type="button" class="knapp visa-tb" aria-label="Visa tangentbordet">⌨</button><button type="button" class="knapp sudda" aria-label="Sudda">⌫</button><button type="button" class="knapp klar" aria-label="Klar">✓</button></div></div>`, 'pussel P12_dop');
  },
  bok() {
    const b = k('bok'); const u = b.uppslag[0];
    ui.visaPlatta(`<div class="bok-ruta"><div class="uppslag"><div class="bok-bild">${bilder.html(u.bild)}</div>${u.bildtext ? `<div class="bildtext">${rader(u.bildtext)}</div>` : ''}<div class="boktext">${rader(u.text)}</div></div>
      <div class="bok-knappar"><button type="button" class="knapp bak av" aria-label="Bakåt">◀</button><button type="button" class="knapp las" aria-label="Läs">🔊</button><button type="button" class="knapp fram" aria-label="Framåt">▶</button></div></div>`, 'bok');
    segment = [{ el: $('#plattan .boktext'), text: sagt(u.text), roll: rollFor(b.talare) }];
    const las = () => spela();
    $('#plattan .las').addEventListener('click', las);
    $('#plattan .bok-bild').addEventListener('click', las);
  },
  lista() {
    const e = form?.exempel || {};
    const rad = (/** @type {any} */ r, rubrik = false) => `<div class="prov-listrad${rubrik ? ' rubrik' : ''}${r.bockad ? ' bockad' : ''}" data-rad="${esc(r.id || 'rubrik')}">${bilder.html(r.bild)}<span class="prov-listord">${rader(r.ord)}</span></div>`;
    ui.visaPlatta(`<div class="pussel-ruta"><div class="lapp p-anteckningspapper_kompassros prov-lista">${rad(e.rubrik, true)}${e.rader.map((/** @type {any} */ r) => rad(r)).join('')}</div><button type="button" class="vidare synlig" aria-label="Stäng">▶</button></div>`, 'pussel lista');
    const rader2 = /** @type {HTMLElement[]} */ ([...ui.ui.querySelectorAll('.prov-listrad')]);
    const ordAv = [e.rubrik, ...e.rader];
    // första gången läses hela listan, rad för rad; sedan läser ett tryck på en rad bara den raden
    segment = rader2.map((el, i) => ({ el: /** @type {HTMLElement} */ (el.querySelector('.prov-listord')), text: sagt(ordAv[i].ord), roll: 'berattare' }));
    rader2.forEach((el, i) => el.addEventListener('click', () => { void spelaSegment([segment[i]]); }));
  },
  regi() {
    ui.visaRegi(k('regi'), 0);
  },
};

/**
 * Skyltar på utgångar i ett val (dörrar, stigar), som spelet ritar dem: ovanför dörren, vid stigen med pil.
 * @param {any[]} alternativ @param {boolean} pil
 */
function utgangsSkyltar(alternativ, pil) {
  const lista = [];
  for (const a of alternativ) {
    const o = sak(a.objekt);
    if (!o || !a.ord) continue;
    const b = o.b ?? 28;
    const [punkt, plats] = pil ? [pt(o.x + b / 2, (o.h ?? 40) - 8), { lage: /** @type {const} */ ('pa'), rumTopp: rumTopp() }] : [pt(o.x + b / 2, o.y - 1), { lage: /** @type {const} */ ('over'), rumTopp: rumTopp() }];
    lista.push({ objekt: a.objekt, punkt, plats, vidTryck: () => {},
      html: `<button type="button" class="kort${pil ? ' stigskylt' : ''}" data-id="${esc(a.id)}"><span class="kort-etikett">${rader(a.ord, 'kort-ord')}</span>${pil ? '<span class="pil" aria-hidden="true">↑</span>' : ''}</button>` });
  }
  ui.skyltar(lista);
}

// ---------------------------------------------------------------- uppspelning
/** Spelaren: provsidans (där trycket gjordes, så att rösten får tala) eller en egen när ramen är ensam. */
const egen = ensam ? skapaSpelare({ rost: skapaRost({ tyst: () => q.has('snabb') }) }) : null;
/** @type {{ spelare: any, inst: any }} */
let senast = { spelare: egen, inst: { lage: 'ord', markera: true, rost: true } };

/** Provsidans spelare och inställningar, när ramen är inbäddad. */
const sidan = () => /** @type {any} */ (window.parent !== window ? window.parent : null)?.__textprov ?? null;
/** @param {Segment[]} lista */
async function spelaSegment(lista, spelare = senast.spelare ?? sidan()?.spelare, inst = sidan()?.inst?.() ?? senast.inst) {
  /** @type {any} */
  let res = { takt: 'uppskattad', hur: 'klar' };
  for (const s of lista) { res = await spelare.las(s, inst); if (res.hur === 'avbruten') break; }
  return res;
}
/** ▶: läs formens segment (eller spela titta–täck) med valda inställningar. */
async function spela(spelare = senast.spelare ?? sidan()?.spelare, inst = sidan()?.inst?.() ?? senast.inst) {
  senast = { spelare, inst };
  stopp(false);
  if (egenUppspelning) return egenUppspelning(spelare, inst);
  return spelaSegment(segment, spelare, inst);
}
function stopp(medSpelare = true) {
  klockor.forEach((x) => clearTimeout(x)); klockor = [];
  if (medSpelare) senast.spelare?.stopp();
}

/** @type {string | null} */
let fel = null;
try {
  if (!form) throw new Error(`ingen form med id ${q.get('form')}`);
  ritaKuliss(form.kuliss);
  hudFor(form.kuliss.hud);
  const visa = VISA[form.visa];
  if (!visa) throw new Error(`okänd visning ${form.visa}`);
  visa();
} catch (e) {
  fel = String(/** @type {any} */ (e)?.message || e);
  const d = document.createElement('div'); d.className = 'prov-fel'; d.textContent = fel;
  document.body.appendChild(d);
}

// den vuxnes knappar när ramen är öppnad ensam
if (ensam && form && !fel) {
  const bar = document.createElement('div');
  bar.className = 'prov-knappar';
  bar.innerHTML = `<a href="./textprov.html${q.has('snabb') ? '?snabb' : ''}">← Alla former</a><b>${esc(form.namn)}</b>
    <label><input type="radio" name="lage" value="ord" checked> Ord för ord</label><label><input type="radio" name="lage" value="allt"> Allt på en gång</label>
    <label><input type="checkbox" name="markera" checked> Markera ordet som läses</label><label><input type="checkbox" name="rost" checked> Röst</label>
    <button type="button" class="prov-spela" ${segment.length || egenUppspelning ? '' : 'disabled'}>▶ Spela</button><span class="prov-takt"></span>`;
  document.body.appendChild(bar);
  const inst = () => ({ lage: /** @type {HTMLInputElement} */ (bar.querySelector('[name=lage]:checked')).value, markera: /** @type {HTMLInputElement} */ (bar.querySelector('[name=markera]')).checked, rost: /** @type {HTMLInputElement} */ (bar.querySelector('[name=rost]')).checked });
  /** @type {HTMLButtonElement} */ (bar.querySelector('.prov-spela')).addEventListener('click', async () => {
    const r = await spela(egen, inst());
    /** @type {HTMLElement} */ (bar.querySelector('.prov-takt')).textContent = r?.takt === 'signal' ? 'Takt: röstens ordsignal' : 'Takt: uppskattad';
  });
}

/** Krokar för provsidan och testerna. */
/** @type {any} */ (window).__ram = { id: form?.id, fel, get segment() { return segment.length; }, harUppspelning: !!egenUppspelning || segment.length > 0, spela, stopp };
/** @type {any} */ (window).parent?.__textprov?.klar?.(form?.id);
