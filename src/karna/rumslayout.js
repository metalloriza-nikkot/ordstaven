// @ts-check
// Gråboxens rum: placerar rummets objekt automatiskt, tills stilspåret ritar riktiga Tiled-kartor.
// Utgångar (stege, dörr, grind, stig) läggs längs kanterna, övriga objekt i ett rutnät.
import { RUM } from './skalning.js';
import { synligaIds } from './karta.js';

const FIGUR_HOJD = 24;

/**
 * @typedef {{ id: string, x: number, y: number, b: number, h: number, sort: 'utgang' | 'sak' | 'figur',
 *             till?: string, sida?: 'under' | 'over' | 'vanster' | 'hoger', golv?: boolean }} Objekt
 * till = rummet en utgång leder till, sida = var hjälten ställer sig, golv = man går på det (stig, grind).
 */

const UTGANG = /^(stege_|dorr_|grind|stig_)/;
const FIGUR = /^(farfar|apan|klaffen)/;

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
    const b = FIGUR.test(id) ? 16 : 28, h = FIGUR.test(id) ? 24 : 20;
    ut.push({ id, x: Math.round(x0 + k * steg + (steg - b) / 2), y: y0 + r * 44, b, h, sort: FIGUR.test(id) ? 'figur' : 'sak' });
  });
  return ut;
}

/** Punkten framför ett objekt där hjälten ska stå (fötterna). @param {Objekt} o */
export function framfor(o) {
  const x = Math.round(o.x + o.b / 2);
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
  const f = framfor(o);
  return Math.abs(pos.x - f.x) <= 14 && Math.abs(pos.y - f.y) <= 14;
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
