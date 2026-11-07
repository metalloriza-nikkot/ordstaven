// @ts-check
// Hindren i ett rum, en uppsättning per höjdnivå (Rum.byggHinder och kartkontrollen, 56.7). Ren logik.
import { skapaHinder, skarIgenom } from './vag.js';
import { skapaNivaer } from './nivaer.js';
import { hinderFran, vaggar, VAGG } from './rumslayout.js';
import { RUM } from './skalning.js';

/** @typedef {import('./rumslayout.js').Objekt} Objekt */
/** @typedef {{ x: number, y: number, b: number, h: number }} Ruta */

/**
 * @param {Objekt[]} objekt rummets föremål just nu
 * @param {{ sparrade?: Objekt[], inomhus?: boolean, vagg?: typeof VAGG, storlek?: { bredd: number, hojd: number },
 *           massiv?: Ruta[], over?: Ruta[] }} [rum] grenarna som spärrar, väggarna och ridåns rutor (kartans overHinder)
 */
export function rumsHinder(objekt, { sparrade = [], inomhus = false, vagg = VAGG, storlek = { bredd: RUM.bredd, hojd: RUM.hojd }, massiv = [], over = [] } = {}) {
  // en stig som är en öppning skär igenom häcken den ligger över (hålet bakom stenen), när den syns. Ridån har
  // öppningar vid utgångarna redan i kartan.
  const oppningar = objekt.filter((o) => o.oppning);
  const rutor = [...skarIgenom(hinderFran(objekt), oppningar), ...sparrade, ...(inomhus ? vaggar(vagg, storlek) : []), ...massiv, ...over];
  // en uppsättning hinder per nivå: på marken går det inte att gå upp på kullen utom på trappan, och tvärtom
  const nivaer = skapaNivaer(objekt);
  const per = new Map(nivaer.nivaer.map((niva) => [niva, skapaHinder(rutor, nivaer.finns ? (p) => nivaer.tillaten(p, niva) : undefined, storlek)]));
  // på trappan eller stegen gäller båda nivåerna: han kan gå av uppe eller nere (men aldrig över kanten)
  const forbindelse = nivaer.finns ? skapaHinder(rutor, (p) => nivaer.nivaer.some((niva) => nivaer.tillaten(p, niva)), storlek) : null;
  return { nivaer, per, forbindelse, rutor };
}
