// @ts-check
// Gråboxens rum: placerar rummets objekt automatiskt, tills stilspåret ritar riktiga Tiled-kartor.
// Utgångar (stege, dörr, grind, stig) läggs längs kanterna, övriga objekt i ett rutnät.
import { RUM } from './skalning.js';
import { synligaIds } from './karta.js';

const FIGUR_HOJD = 24;

/**
 * @typedef {{ id: string, x: number, y: number, b: number, h: number, sort: 'utgang' | 'sak' | 'figur',
 *             till?: string, sida?: 'under' | 'over' | 'vanster' | 'hoger' | 'alla', golv?: boolean, visar?: string,
 *             riktning?: 'vanster' | 'hoger' | 'upp' | 'ned', klattra?: 'upp' | 'ned', ute?: boolean, lapp?: string,
 *             talare?: string }} Objekt
 * till = rummet en utgång leder till, sida = var hjälten ställer sig, golv = man går på det (stig, grind).
 * sida 'alla' = föremålet har ingen framsida (krukor, buskar, en låda mitt på golvet): det går att använda från alla håll.
 */

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
  // dörrar jämnt längs översta väggen
  uppe.forEach((id, i) => {
    const x = Math.round(((i + 1) * RUM.bredd) / (uppe.length + 1)) - 12;
    ut.push({ id, x, y: 4, b: 24, h: 30, sort: 'utgang' });
  });
  // stegar i vänstra kanten, uppifrån
  sidor.forEach((id, i) => ut.push({ id, x: 6, y: 40 + i * 44, b: 18, h: 36, sort: 'utgang' }));
  // grindar och stigar längs nedre kanten
  nere.forEach((id, i) => {
    const x = Math.round(((i + 1) * RUM.bredd) / (nere.length + 1)) - 14;
    ut.push({ id, x, y: RUM.hojd - 22, b: 28, h: 18, sort: 'utgang' });
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
  const x = Math.round(o.x + o.b / 2);
  // en stig som leder ut ur rummet: hjälten går ut på den, ända till kanten
  if (o.golv && o.riktning) {
    const y = Math.round(o.y + o.h / 2 + 3);
    if (o.riktning === 'hoger') return { x: Math.min(RUM.bredd - 8, o.x + o.b - 4), y };
    if (o.riktning === 'vanster') return { x: Math.max(8, o.x + 4), y };
    if (o.riktning === 'upp') return { x, y: Math.max(FIGUR_HOJD, o.y + 8) };
    return { x, y: Math.min(RUM.hojd, o.y + o.h - 2) };
  }
  if (o.sida === 'over') return { x, y: Math.max(FIGUR_HOJD, o.y - 2) };
  if (o.sida === 'vanster') return { x: o.x - 10, y: Math.min(RUM.hojd, o.y + o.h) };
  if (o.sida === 'hoger') return { x: o.x + o.b + 10, y: Math.min(RUM.hojd, o.y + o.h) };
  if (o.sida === 'under') return { x, y: Math.min(RUM.hojd, o.y + o.h + 12) };
  if (o.sort === 'utgang' && o.y > RUM.hojd / 2) return { x, y: o.y + 2 };
  if (o.sort === 'utgang' && o.x < 20) return { x: o.x + o.b + 10, y: o.y + o.h };
  return { x, y: Math.min(RUM.hojd, o.y + o.h + 12) };
}

/** Står hjälten vid objektet? @param {{ x: number, y: number }} pos fötterna @param {Objekt} o */
export function vidObjekt(pos, o) {
  // från alla håll: fötterna står i en ring runt föremålet (ovanför står fötterna strax ovanför överkanten)
  if (o.sida === 'alla') return pos.x >= o.x - 16 && pos.x <= o.x + o.b + 16 && pos.y >= o.y - 6 && pos.y <= o.y + o.h + 16;
  const f = framfor(o);
  return Math.abs(pos.x - f.x) <= 14 && Math.abs(pos.y - f.y) <= 14;
}

/**
 * Var hjälten ska gå för att använda föremålet, sett från där han står. Ett föremål med sida 'alla' nås från
 * närmaste håll (under, ovanför, vänster, höger), annars från sin sida. Punkter i väggarna väljs inte.
 * @param {Objekt} o @param {{ x: number, y: number }} pos @param {boolean} [inomhus]
 * @param {{ bak: number, sida: number, fram: number }} [v] väggarnas mått
 */
export function framforFran(o, pos, inomhus = false, v = VAGG) {
  if (o.sida !== 'alla') return framfor(o);
  const mx = Math.round(o.x + o.b / 2), my = Math.min(RUM.hojd, o.y + o.h);
  const kandidater = [
    { x: mx, y: Math.min(RUM.hojd, o.y + o.h + 12) },
    { x: mx, y: Math.max(FIGUR_HOJD, o.y - 2) },
    { x: o.x - 10, y: my },
    { x: o.x + o.b + 10, y: my },
  ].filter((p) => !inomhus || (p.x > v.sida + 6 && p.x < RUM.bredd - v.sida - 6 && p.y > v.bak + 4 && p.y < RUM.hojd - v.fram));
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
    const iBand = pos.y >= o.y - 2 && pos.y <= o.y + o.h + 8;
    return iBand && (o.riktning === 'hoger' || o.riktning === 'vanster' ? Math.abs(pos.x - f.x) <= 6 : Math.abs(pos.y - f.y) <= 6);
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
 * @param {{ bak: number, sida: number, fram: number }} [v]
 */
export function vaggar(v = VAGG) {
  return [
    { x: 0, y: 0, b: RUM.bredd, h: v.bak },
    { x: 0, y: 0, b: v.sida, h: RUM.hojd },
    { x: RUM.bredd - v.sida, y: 0, b: v.sida, h: RUM.hojd },
    { x: 0, y: RUM.hojd - v.fram, b: RUM.bredd, h: v.fram },
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
 * Objekt som hjälten inte kan gå igenom. Grindar och stigar nertill är golv man går på.
 * @param {Objekt[]} objekt
 */
export function hinderFran(objekt) {
  return objekt.filter((o) => !o.golv && !/^(stig_|grind)/.test(o.id));
}

/**
 * Rummets synliga föremål: från Tiled-kartan om den finns, annars automatiskt placerade.
 * @param {(string | { id: string, syns_i?: string[] })[]} innehall
 * @param {string | null} tillstand
 * @param {import('./karta.js').Karta | null | undefined} karta
 * @returns {Objekt[]}
 */
export function rumsObjekt(innehall, tillstand, karta) {
  const ids = synligaIds(innehall, tillstand);
  if (!karta) return placeraObjekt(ids);
  const iKartan = karta.objekt.filter((o) => ids.includes(o.id)).map((o) => ({ ...o }));
  const saknas = ids.filter((id) => !iKartan.some((o) => o.id === id));
  return [...iKartan, ...placeraObjekt(saknas)];
}

/**
 * Gråboxens färg för ett föremål. Utedörren är ljusare än innedörrarna (dagsljus genom glaset),
 * och alla innedörrar har samma färg, så att bara lappen skiljer dem åt (stilguiden, Husets plan).
 * @param {Objekt} o @returns {number}
 */
export function objektFarg(o) {
  if (o.sort === 'utgang' && o.ute) return 0xd8c49a;
  if (o.sort === 'utgang' && o.klattra) return 0x9a8f80;
  if (o.sort === 'utgang') return 0x6d5a45;
  if (o.sort === 'figur') return 0xc9a27a;
  return 0xb9b2a4;
}
