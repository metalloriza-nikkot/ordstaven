// @ts-check
// Tiled-kartor för rummen. Kartan säger VAR föremålen står, innehållet säger VAD som finns.
// Kartan innehåller bara id:n (objektets namn), aldrig text som spelaren ser.
// Ett objektlager med rutor: namn = föremålets id, typ = utgang, sak eller figur (frivilligt).
// Egenskaper: "till" (rummet en utgång leder till), "sida" (var hjälten ställer sig: under, over, vanster, hoger,
// eller alla = föremålet nås från alla håll, t.ex. krukor och buskar),
// "golv" (man går på det) och "visar" (pusslet vars alternativ föremålet visar, t.ex. lådorna eller krukorna).
// "riktning" (vanster, hoger, upp, ned: åt vilket håll utgången leder, nästa rum glider in därifrån),
// "klattra" (upp, ned: stegen klättras), "ute" (utedörren ritas ljusare) och "lapp" (föremålet där ordet visas
// när utgången är ett val, t.ex. skylten vid en stig), "talare" (figurens talare: ett tryck på figuren upprepar
// dess senaste instruktion). Kartans egenskap "inomhus" ger rummet väggram, och
// vagg_bak, vagg_sida och vagg_fram ger väggarnas mått i pixlar (annars 48, 32 och 16; en smal hall har tjocka sidoväggar).
// En punkt med namnet "start" är där hjälten står när rummet visas utan att hjälten kom genom en utgång.
// Punkter som heter "lampa" (eller lampa_…) lyser när rummet är mörkt, t.ex. en läslampa vid Farfars plats.
// "last_i" på en utgång (tillstånd med komma emellan, t.ex. natt): utgången är låst då, och hjälten känner på
// handtaget (ytterdörren på natten). Kartans "morker" (0–1) säger hur mörkt rummet är på natten (annars 0,72).
// Höjdnivåer: en ruta med typen "yta" och egenskapen "niva" (1, 2 …) är upphöjd (kullen, krönet), och dess kanter
// går inte att gå över. En ruta med typen "trappa" eller "stege" förbinder nivåerna och ska ligga över kanten.
// Saker på ytan (lövhögarna) når han bara uppifrån. Se karna/nivaer.js.
import { RUM } from './skalning.js';
import { VAGG } from './rumslayout.js';
import { STORSTA } from './kamera.js';

/** @typedef {import('./rumslayout.js').Objekt} Objekt */
/**
 * @typedef {{ objekt: Objekt[], start: { x: number, y: number } | null, inomhus: boolean,
 *             in: Record<string, { x: number, y: number }>, lampor: { x: number, y: number }[],
 *             vagg: { bak: number, sida: number, fram: number }, morker: number | null,
 *             storlek: { bredd: number, hojd: number } }} Karta
 * inomhus = rummet har väggram (bakvägg, sidoväggar, främre kant). in = var hjälten kommer in från ett rum
 * som inte har någon utgång hit (punkter som heter in_<rum>, t.ex. trädgården från köket). lampor = där det lyser i mörkret.
 * storlek = områdets storlek i pixlar (kartans bredd och höjd): en skärm (320×192) eller större, högst 640×384.
 */

const UTGANG = /^(stege_|dorr_|grind|stig_)/;
const SIDOR = new Set(['under', 'over', 'vanster', 'hoger', 'alla']);
const RIKTNINGAR = new Set(['vanster', 'hoger', 'upp', 'ned']);

/** Objektets id i rummets innehåll (ett id eller { id, syns_i }). @param {string | { id: string }} x */
export const innehallsId = (x) => (typeof x === 'string' ? x : x.id);

/**
 * Föremålen som syns i ett visst tillstånd av rummet. Ett dolt föremål (dold: true, t.ex. lådan under löven)
 * syns först när ett steg har visat det (visa_foremal), och sedan resten av äventyret.
 * @param {(string | { id: string, syns_i?: string[], dold?: boolean })[]} innehall @param {string | null} tillstand
 * @param {string[]} [visade] dolda föremål som har visats
 */
export function synligaIds(innehall, tillstand, visade = []) {
  return innehall.filter((x) => typeof x === 'string' || ((!x.syns_i || (tillstand !== null && x.syns_i.includes(tillstand))) && (!x.dold || visade.includes(x.id)))).map(innehallsId);
}

/** Sort efter id när kartan inte säger något. @param {string} id @returns {Objekt['sort']} */
export const sortFor = (id) => (UTGANG.test(id) ? 'utgang' : 'sak');

/**
 * Läs en Tiled-karta (JSON, .tmj).
 * @param {any} tmj
 * @returns {Karta}
 */
export function lasKarta(tmj) {
  if (!tmj || tmj.type !== 'map') throw new Error('inte en Tiled-karta');
  const bredd = tmj.width * tmj.tilewidth, hojd = tmj.height * tmj.tileheight;
  // ett område är minst en skärm och högst ungefär 2×2 skärmar (beslut 14). Är det större än skärmen följer kameran hjälten.
  if (bredd < RUM.bredd || hojd < RUM.hojd || bredd > STORSTA.bredd || hojd > STORSTA.hojd) {
    throw new Error(`kartan är ${bredd}×${hojd}, ett område är ${RUM.bredd}×${RUM.hojd} till ${STORSTA.bredd}×${STORSTA.hojd}`);
  }
  /** @type {Objekt[]} */
  const objekt = [];
  let start = null;
  /** @type {Record<string, { x: number, y: number }>} */
  const inpunkter = {};
  /** @type {{ x: number, y: number }[]} */
  const lampor = [];
  const kartegen = Object.fromEntries((tmj.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
  for (const lager of tmj.layers || []) {
    if (lager.type !== 'objectgroup') continue;
    for (const o of lager.objects || []) {
      const egen = Object.fromEntries((o.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
      if (o.point || o.name === 'start' || /^in_/.test(o.name) || /^lampa(_|$)/.test(o.name)) {
        const p = { x: Math.round(o.x), y: Math.round(o.y) };
        if (o.name === 'start') start = p; else if (/^in_/.test(o.name)) inpunkter[o.name.slice(3)] = p;
        else if (/^lampa(_|$)/.test(o.name)) lampor.push(p);
        continue;
      }
      const typ = o.type || o.class || '';
      /** @type {Objekt} */
      const ut = {
        id: o.name,
        x: Math.round(o.x), y: Math.round(o.y), b: Math.round(o.width), h: Math.round(o.height),
        sort: typ === 'utgang' || typ === 'sak' || typ === 'figur' ? typ : typ === 'yta' || typ === 'trappa' || typ === 'stege' ? 'yta' : sortFor(o.name),
      };
      if (typ === 'yta') ut.niva = Math.max(1, Math.round(Number(egen.niva) || 1));
      if (typ === 'trappa' || typ === 'stege') ut.forbinder = typ;
      if (egen.till) ut.till = String(egen.till);
      if (SIDOR.has(egen.sida)) ut.sida = egen.sida;
      if (egen.golv) ut.golv = true;
      if (egen.visar) ut.visar = String(egen.visar);
      if (RIKTNINGAR.has(egen.riktning)) ut.riktning = egen.riktning;
      if (egen.klattra === 'upp' || egen.klattra === 'ned') ut.klattra = egen.klattra;
      if (egen.ute) ut.ute = true;
      if (egen.lapp) ut.lapp = String(egen.lapp);
      if (egen.talare) ut.talare = String(egen.talare);
      if (egen.last_i) ut.lastI = String(egen.last_i).split(',').map((t) => t.trim()).filter(Boolean);
      objekt.push(ut);
    }
  }
  const tal = (/** @type {any} */ x, /** @type {number} */ d) => (Number.isFinite(Number(x)) && x !== '' && x !== undefined ? Math.round(Number(x)) : d);
  const vagg = { bak: tal(kartegen.vagg_bak, VAGG.bak), sida: tal(kartegen.vagg_sida, VAGG.sida), fram: tal(kartegen.vagg_fram, VAGG.fram) };
  const m = Number(kartegen.morker);
  const morker = kartegen.morker !== undefined && Number.isFinite(m) ? Math.max(0, Math.min(1, m)) : null;
  return { objekt, start, inomhus: !!kartegen.inomhus, in: inpunkter, lampor, vagg, morker, storlek: { bredd, hojd } };
}
