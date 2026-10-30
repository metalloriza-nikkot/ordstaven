// @ts-check
// Gråboxens rum: placerar rummets objekt automatiskt, tills stilspåret ritar riktiga Tiled-kartor.
// Utgångar (stege, dörr, grind, stig) läggs längs kanterna, övriga objekt i ett rutnät.
import { RUM } from './skalning.js';
import { synligaIds } from './karta.js';

const FIGUR_HOJD = 24;

/**
 * @typedef {{ id: string, x: number, y: number, b: number, h: number, sort: 'utgang' | 'sak' | 'figur' | 'yta',
 *             niva?: number, forbinder?: 'trappa' | 'stege',
 *             till?: string, sida?: 'under' | 'over' | 'vanster' | 'hoger' | 'alla', golv?: boolean, visar?: string,
 *             riktning?: 'vanster' | 'hoger' | 'upp' | 'ned', klattra?: 'upp' | 'ned', ute?: boolean, lapp?: string,
 *             talare?: string, lastI?: string[], storlek?: { bredd: number, hojd: number } }} Objekt
 * till = rummet en utgång leder till, sida = var hjälten ställer sig, golv = man går på det (stig, grind).
 * sida 'alla' = föremålet har ingen framsida (krukor, buskar, en låda mitt på golvet): det går att använda från alla håll.
 * sort 'yta' = en del av golvet: en upphöjd yta (niva, kullen) eller en förbindelse mellan nivåerna (forbinder:
 * trappa eller stege). Se karna/nivaer.js.
 * storlek = områdets storlek (kartans), när det är större än en skärm: föremålen nära kanten räknas mot den.
 */

/** Områdets storlek för ett föremål (en skärm om kartan inte säger annat). @param {Objekt} o */
const ytan = (o) => o.storlek ?? RUM;

const UTGANG = /^(stege_|dorr_|grind|stig_)/;

/**
 * @param {string[]} innehall objektens id:n
 * @returns {Objekt[]} positioner i rumspixlar (övre vänstra hörnet)
 */
export function placeraObjekt(innehall) {
  const uppe = [], nere = [], sidor = [], saker = [];
  for (const id of innehall) {
    if (/^stege_/.test(id)) sidor.push(id);
    else if (/^dorr_/.test(id)) uppe.push(id);
    else if (UTGANG.test(id)) nere.push(id);
    else saker.push(id);
  }
  /** @type {Objekt[]} */
  const ut = [];
  // utan karta leder en utgång till rummet i sitt id (stig_buskarna → buskarna), om det rummet finns
  const till = (/** @type {string} */ id) => { const m = /^(?:stig|dorr|stege|grind)_(.+)$/.exec(id); return m ? { till: m[1] } : {}; };
  // dörrar jämnt längs översta väggen
  uppe.forEach((id, i) => {
    const x = Math.round(((i + 1) * RUM.bredd) / (uppe.length + 1)) - 12;
    ut.push({ id, x, y: 4, b: 24, h: 30, sort: 'utgang', ...till(id) });
  });
  // stegar i vänstra kanten, uppifrån
  sidor.forEach((id, i) => ut.push({ id, x: 6, y: 40 + i * 44, b: 18, h: 36, sort: 'utgang', ...till(id) }));
  // grindar och stigar längs nedre kanten
  nere.forEach((id, i) => {
    const x = Math.round(((i + 1) * RUM.bredd) / (nere.length + 1)) - 14;
    ut.push({ id, x, y: RUM.hojd - 22, b: 28, h: 18, sort: 'utgang', ...till(id) });
  });
  // övriga saker i ett rutnät i rummets övre och mittre del, med fri gång i mitten nertill
  const kolumner = Math.max(3, Math.min(5, Math.ceil(saker.length / 2)));
  const x0 = 40, x1 = RUM.bredd - 40, y0 = uppe.length ? 50 : 24;
  const steg = (x1 - x0) / kolumner;
  saker.forEach((id, i) => {
    const k = i % kolumner, r = Math.floor(i / kolumner);
    const b = 28, h = 20;
    ut.push({ id, x: Math.round(x0 + k * steg + (steg - b) / 2), y: y0 + r * 44, b, h, sort: 'sak' });
  });
  return ut;
}

/** Punkten framför ett objekt där hjälten ska stå (fötterna). @param {Objekt} o */
export function framfor(o) {
  const S = ytan(o);
  const x = Math.round(o.x + o.b / 2);
  // en stig som leder ut ur rummet: hjälten går ut på den, ända till kanten
  if (o.golv && o.riktning) {
    const y = Math.round(o.y + o.h / 2 + 3);
    if (o.riktning === 'hoger') return { x: Math.min(S.bredd - 8, o.x + o.b - 4), y };
    if (o.riktning === 'vanster') return { x: Math.max(8, o.x + 4), y };
    if (o.riktning === 'upp') return { x, y: Math.max(FIGUR_HOJD, o.y + 8) };
    return { x, y: Math.min(S.hojd, o.y + o.h - 2) };
  }
  if (o.sida === 'over') return { x, y: Math.max(FIGUR_HOJD, o.y - 2) };
  if (o.sida === 'vanster') return { x: o.x - 10, y: Math.min(S.hojd, o.y + o.h) };
  if (o.sida === 'hoger') return { x: o.x + o.b + 10, y: Math.min(S.hojd, o.y + o.h) };
  if (o.sida === 'under') return { x, y: Math.min(S.hojd, o.y + o.h + 12) };
  if (o.sort === 'utgang' && o.y > S.hojd / 2) return { x, y: o.y + 2 };
  if (o.sort === 'utgang' && o.x < 20) return { x: o.x + o.b + 10, y: o.y + o.h };
  return { x, y: Math.min(S.hojd, o.y + o.h + 12) };
}

/** Nära nog räcker (grind A): saker, figurer och stegen nås från alla håll inom ca 1,5 rutor från kanten. */
export const RACKVIDD = Math.round(RUM.ruta * 1.5);

/** Avståndet från fötterna till objektets ruta (0 om fötterna står på den). @param {{ x: number, y: number }} pos @param {Objekt} o */
export function avstandTill(pos, o) {
  const dx = Math.max(o.x - pos.x, 0, pos.x - (o.x + o.b));
  const dy = Math.max(o.y - pos.y, 0, pos.y - (o.y + o.h));
  return Math.hypot(dx, dy);
}

/**
 * Når hjälten objektet? Saker, figurer och stegar: inom räckvidden från alla håll. Dörrar och stigar väljs
 * genom att gå igenom dem (se genom), och "vid" betyder att han står framför dem.
 * @param {{ x: number, y: number }} pos fötterna @param {Objekt} o
 */
export function vidObjekt(pos, o) {
  if (o.sort !== 'utgang' || o.klattra) return avstandTill(pos, o) <= RACKVIDD;
  const f = framfor(o);
  return Math.abs(pos.x - f.x) <= 14 && Math.abs(pos.y - f.y) <= 14;
}

/**
 * Den enda saken hjälten använder just nu: den närmaste inom räckvidden. Står två lika nära (inom 2 px)
 * vinner den han är vänd mot. Det får aldrig vara oklart vilken sak som används (grind A).
 * @param {{ x: number, y: number }} pos fötterna @param {Objekt[]} objekt kandidaterna
 * @param {{ x: number, y: number }} [vand] åt vilket håll han tittar (enhetsvektor)
 * @returns {Objekt | null}
 */
export function aktivSak(pos, objekt, vand = { x: 0, y: 1 }) {
  const nara = objekt.map((o) => ({ o, d: avstandTill(pos, o) })).filter((x) => vidObjekt(pos, x.o));
  if (!nara.length) return null;
  const mot = (/** @type {Objekt} */ o) => {
    const cx = o.x + o.b / 2 - pos.x, cy = o.y + o.h / 2 - pos.y, l = Math.hypot(cx, cy) || 1;
    return (cx * vand.x + cy * vand.y) / l;
  };
  nara.sort((a, b) => (Math.abs(a.d - b.d) <= 2 ? mot(b.o) - mot(a.o) : a.d - b.d));
  return nara[0].o;
}

/**
 * Minsta glipan mellan två objekts rutor. Alternativen i ett val står minst 3 rutor isär, så att ingen plats
 * når två av dem. @param {Objekt} a @param {Objekt} b
 */
export function glipa(a, b) {
  const dx = Math.max(b.x - (a.x + a.b), 0, a.x - (b.x + b.b));
  const dy = Math.max(b.y - (a.y + a.h), 0, a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/**
 * Var hjälten ska gå för att använda föremålet, sett från där han står. Ett föremål med sida 'alla' nås från
 * närmaste håll (under, ovanför, vänster, höger), annars från sin sida. Punkter i väggarna väljs inte.
 * @param {Objekt} o @param {{ x: number, y: number }} pos @param {boolean} [inomhus]
 * @param {{ bak: number, sida: number, fram: number }} [v] väggarnas mått
 */
export function framforFran(o, pos, inomhus = false, v = VAGG) {
  if (o.sida !== 'alla') return framfor(o);
  const S = ytan(o);
  const mx = Math.round(o.x + o.b / 2), my = Math.min(S.hojd, o.y + o.h);
  const kandidater = [
    { x: mx, y: Math.min(S.hojd, o.y + o.h + 12) },
    { x: mx, y: Math.max(FIGUR_HOJD, o.y - 2) },
    { x: o.x - 10, y: my },
    { x: o.x + o.b + 10, y: my },
  ].filter((p) => !inomhus || (p.x > v.sida + 6 && p.x < S.bredd - v.sida - 6 && p.y > v.bak + 4 && p.y < S.hojd - v.fram));
  if (!kandidater.length) return framfor(o);
  return kandidater.sort((a, c) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(c.x - pos.x, c.y - pos.y))[0];
}

/**
 * Går hjälten igenom utgången just nu? Han ska stå i dörröppningen (mot väggen), på stegen eller ute på stigen.
 * @param {Objekt} o @param {{ x: number, y: number }} pos fötterna
 */
export function genom(o, pos) {
  const f = framfor(o);
  if (o.golv && o.riktning) {
    // han ska stå på just den här stigen: inom stigens bredd, och vid dess slut (kurvan eller kanten)
    if (o.riktning === 'hoger' || o.riktning === 'vanster') return pos.y >= o.y - 2 && pos.y <= o.y + o.h + 8 && Math.abs(pos.x - f.x) <= 6;
    return pos.x >= o.x - 4 && pos.x <= o.x + o.b + 4 && Math.abs(pos.y - f.y) <= 6;
  }
  const r = o.riktning || /** @type {Record<string, string>} */ ({ hoger: 'vanster', vanster: 'hoger', under: 'upp', over: 'ned' })[o.sida || 'under'];
  // bandet är lika brett som dörren och lite till: står han med fötterna strax nedanför eller bredvid dörren
  // och trycker mot den, och skylten syns, ska han komma igenom (annars ser dörren obrukbar ut)
  if (r === 'vanster' || r === 'hoger') return Math.abs(pos.x - f.x) <= 6 && pos.y >= o.y + 10 && pos.y <= o.y + o.h + 14;
  return Math.abs(pos.y - f.y) <= 8 && pos.x >= o.x - 6 && pos.x <= o.x + o.b + 6;
}

/** Väggramen inomhus (stilguiden, avsnitt 1): bakvägg 3 rutor, sidoväggar 2, främre kant 1. */
export const VAGG = Object.freeze({ bak: 48, sida: 32, fram: 16 });

/**
 * Väggarna som rutor (hinder) i ett rum med väggram. Kartan kan ge egna mått (en smal hall har tjocka sidoväggar).
 * @param {{ bak: number, sida: number, fram: number }} [v] @param {{ bredd: number, hojd: number }} [S] områdets storlek
 */
export function vaggar(v = VAGG, S = RUM) {
  return [
    { x: 0, y: 0, b: S.bredd, h: v.bak },
    { x: 0, y: 0, b: v.sida, h: S.hojd },
    { x: S.bredd - v.sida, y: 0, b: v.sida, h: S.hojd },
    { x: 0, y: S.hojd - v.fram, b: S.bredd, h: v.fram },
  ];
}

/** Punkten en ruta in i rummet från en utgång: där hjälten står och läser lappen innan han väljer. @param {Objekt} o */
export function lasplats(o) {
  const f = framfor(o);
  const d = 18;
  const in_ = { hoger: [-1, 0], vanster: [1, 0], upp: [0, 1], ned: [0, -1] }[o.riktning || ''] ||
    ({ hoger: [1, 0], vanster: [-1, 0], under: [0, 1], over: [0, -1] }[o.sida || 'under'] || [0, 1]);
  // sida = var hjälten står i förhållande till föremålet, alltså åt vilket håll rummet ligger
  return { x: f.x + in_[0] * d, y: f.y + in_[1] * d };
}

/**
 * Där en stig börjar, sett från rummet: vägskälet framför stigen. Stigen i kartan går från vägskälet till kurvan,
 * där den försvinner bakom buskarna (granskningen, punkt 16): valet räknas vid kurvan, och en fel stig leder
 * tillbaka hit. @param {Objekt} o
 */
export function stigStart(o) {
  const S = ytan(o);
  const cx = Math.round(o.x + o.b / 2), cy = Math.round(o.y + o.h / 2) + 3;
  if (o.riktning === 'upp') return { x: cx, y: Math.min(S.hojd, o.y + o.h + 10) };
  if (o.riktning === 'ned') return { x: cx, y: Math.max(FIGUR_HOJD, o.y - 4) };
  if (o.riktning === 'hoger') return { x: Math.max(8, o.x - 10), y: cy };
  if (o.riktning === 'vanster') return { x: Math.min(S.bredd - 8, o.x + o.b + 10), y: cy };
  return lasplats(o);
}

/**
 * Objekt som hjälten inte kan gå igenom. Grindar och stigar nertill är golv man går på.
 * @param {Objekt[]} objekt
 */
export function hinderFran(objekt) {
  return objekt.filter((o) => !o.golv && o.sort !== 'yta' && !/^(stig_|grind)/.test(o.id));
}

/**
 * Rummets synliga föremål: från Tiled-kartan om den finns, annars automatiskt placerade.
 * @param {(string | { id: string, syns_i?: string[] })[]} innehall
 * @param {string | null} tillstand
 * @param {import('./karta.js').Karta | null | undefined} karta
 * @param {string[]} [visade] dolda föremål som har visats (visa_foremal)
 * @returns {Objekt[]}
 */
export function rumsObjekt(innehall, tillstand, karta, visade = []) {
  const ids = synligaIds(innehall, tillstand, visade);
  if (!karta) return placeraObjekt(ids);
  // i ett område som är större än skärmen räknas föremålen mot områdets kanter
  const storlek = karta.storlek && (karta.storlek.bredd !== RUM.bredd || karta.storlek.hojd !== RUM.hojd) ? { storlek: karta.storlek } : {};
  const iKartan = karta.objekt.filter((o) => ids.includes(o.id)).map((o) => ({ ...o, ...storlek }));
  const saknas = ids.filter((id) => !iKartan.some((o) => o.id === id));
  return [...iKartan, ...placeraObjekt(saknas).map((o) => ({ ...o, ...storlek }))];
}

/**
 * En dörr i en sidovägg (leder åt vänster eller höger). Snett uppifrån syns den som en öppning i väggen,
 * inte som en dörr framifrån (stilguiden, Så syns en väg att gå). @param {Objekt} o
 */
export const arSidodorr = (o) => o.sort === 'utgang' && !o.golv && !o.klattra && (o.riktning === 'vanster' || o.riktning === 'hoger');

/**
 * Gråboxens färg för ett föremål. Utedörren är ljusare än innedörrarna (dagsljus genom glaset),
 * och alla innedörrar har samma färg, så att bara lappen skiljer dem åt (stilguiden, Husets plan).
 * @param {Objekt} o @returns {number}
 */
export function objektFarg(o) {
  if (o.sort === 'yta') return o.forbinder === 'trappa' ? 0x9b958a : o.forbinder === 'stege' ? 0x9a8f80 : 0xa6a198;
  if (o.sort === 'utgang' && o.ute) return 0xd8c49a;
  if (o.sort === 'utgang' && o.klattra) return 0x9a8f80;
  if (o.sort === 'utgang') return 0x6d5a45;
  if (o.sort === 'figur') return 0xc9a27a;
  return 0xb9b2a4;
}
