// @ts-check
// Grafiken i världen (dokument 02 §7): atlasen och bilderna i assets/, som verktyg/grafik/inkorg.py skriver.
// - assets/sprites/<figur>/<figur>.png + .json: figurerna (hjälten, staven, ungen, Herr Skata, Farfar, skuggorna)
// - assets/foremal/<zon>/<zon>.png + .json: föremålen i kartorna (kartans objekt säger vilken bild med `bild`)
// - assets/rum/<zon>/<rum>.png: inomhusrummen, en bild per rum (kartans `bild`)
// - assets/tiles/<zon>/<zon>.png + .json: rutor för marken utomhus (kartans `mark`)
// - assets/sidovyer/<namn>.png: sidovyernas bakgrunder och det som rör sig i dem (mellanscenens `bild`)
// Hjälten och staven ritas i spelarens färger med palettbyten (karna/fargbyte.js), en bild per val.

const bilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/{sprites,foremal}/*/*.png', { query: '?url', import: 'default', eager: true }));
const ramar = /** @type {Record<string, any>} */ (import.meta.glob('../../assets/{sprites,foremal}/*/*.json', { import: 'default', eager: true }));
const rumsbilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/rum/*/*.png', { query: '?url', import: 'default', eager: true }));
const rutbilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/tiles/*/*.png', { query: '?url', import: 'default', eager: true }));
const rutset = /** @type {Record<string, any>} */ (import.meta.glob('../../assets/tiles/*/*.json', { import: 'default', eager: true }));
const falten = /** @type {Record<string, { bredd: number, hojd: number, rader: number[][] }>} */ (import.meta.glob('../../assets/rum/*/*_falt.json', { import: 'default', eager: true }));
const sidovyer = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/sidovyer/*.png', { query: '?url', import: 'default', eager: true }));

const namn = (/** @type {string} */ fil) => /** @type {string} */ (fil.split('/').pop()).replace(/\.[a-z]+$/, '');

/** Föremålens atlas, i ordning: en bild med samma namn hittas i det första som har den. */
export const FOREMAL_ATLAS = Object.keys(ramar).filter((f) => f.includes('/foremal/')).map(namn);

/**
 * Figurernas atlas, i ordning efter föremålen: de första i den gamla ordningen, och sedan alla andra figurer som
 * Stil har ritat (byborna i kapitel 2), så att en ny figur bara behöver sin mapp i assets/sprites/.
 */
const FORST = ['hjalte', 'farfar', 'herr_skata', 'unge', 'baronen', 'apa', 'djur', 'omgivning'];
const UTAN = new Set(['skugga', 'stav', 'effekter']);
export const FIGUR_ATLAS = [...FORST, ...Object.keys(ramar).filter((f) => f.includes('/sprites/')).map(namn).filter((n) => !FORST.includes(n) && !UTAN.has(n)).sort()];

/** Ladda all grafik (scenens preload). Rummen heter rum_<rum>, rutorna rutor_<zon>, sidovyerna sidovy_<namn>. @param {Phaser.Scene} scen */
export function laddaGrafik(scen) {
  for (const [fil, url] of Object.entries(bilder)) {
    const n = namn(fil), json = ramar[fil.replace(/\.png$/, '.json')];
    if (json && !scen.textures.exists(n)) scen.load.atlas(n, url, json);
  }
  for (const [fil, url] of Object.entries(rumsbilder)) if (!scen.textures.exists(`rum_${namn(fil)}`)) scen.load.image(`rum_${namn(fil)}`, url);
  for (const [fil, url] of Object.entries(sidovyer)) if (!scen.textures.exists(`sidovy_${namn(fil)}`)) scen.load.image(`sidovy_${namn(fil)}`, url);
  for (const [fil, url] of Object.entries(rutbilder)) {
    const n = namn(fil), ts = rutset[fil.replace(/\.png$/, '.json')];
    if (ts && !scen.textures.exists(`rutor_${n}`)) scen.load.spritesheet(`rutor_${n}`, url, { frameWidth: ts.tilewidth, frameHeight: ts.tileheight });
  }
}

/**
 * Rummets mask (82.8, <rum>_falt.json): rader av [x, längd] där fältet är, t.ex. vassfältet. null om rummet inte har
 * någon. @param {string | null} rum rummets bild
 * @returns {{ bredd: number, hojd: number, rader: number[][] } | null}
 */
export function faltFor(rum) {
  if (!rum) return null;
  return Object.entries(falten).find(([f]) => namn(f) === `${rum}_falt`)?.[1] ?? null;
}

/**
 * Rutsetets rutor efter namn (Tiled-egenskapen `namn`): namn → rutans nummer.
 * @param {string} zon @returns {Map<string, number>}
 */
export function rutnamn(zon) {
  const ts = Object.entries(rutset).find(([f]) => namn(f) === zon)?.[1];
  return new Map((ts?.tiles || []).map((/** @type {any} */ t) => [(t.properties || []).find((/** @type {any} */ p) => p.name === 'namn')?.value, t.id]));
}

/**
 * Rutsetets animerade rutor (Tileds animation: vattnet, 3 bilder på 250 ms): rutans nummer → bildernas nummer.
 * @param {string} zon @returns {Map<number, { rutor: number[], ms: number }>}
 */
export function rutanimation(zon) {
  const ts = Object.entries(rutset).find(([f]) => namn(f) === zon)?.[1];
  return new Map((ts?.tiles || []).filter((/** @type {any} */ t) => t.animation?.length).map((/** @type {any} */ t) => [t.id, { rutor: t.animation.map((/** @type {any} */ a) => a.tileid), ms: t.animation[0].duration || 250 }]));
}

/**
 * Var finns en föremålsbild? @param {Phaser.Scene} scen @param {string} bild
 * @returns {{ nyckel: string, ram: string } | null}
 */
export function foremalsbild(scen, bild) {
  for (const n of FOREMAL_ATLAS) if (scen.textures.exists(n) && scen.textures.get(n).has(bild)) return { nyckel: n, ram: bild };
  for (const n of FIGUR_ATLAS) if (scen.textures.exists(n) && scen.textures.get(n).has(bild)) return { nyckel: n, ram: bild };
  return null;
}

/**
 * En bild av atlasen med färgerna bytta (hjältens hud och dräkt). Görs en gång per val och sparas i scenens texturer.
 * @param {Phaser.Scene} scen @param {string} nyckel atlasen @param {Map<number, number>} byten förlagans färg → ny
 * @returns {string} texturens nyckel
 */
export function fargad(scen, nyckel, byten) {
  if (!byten.size || !scen.textures.exists(nyckel)) return nyckel;
  const ny = `${nyckel}:${[...byten].map(([a, b]) => `${a.toString(16)}-${b.toString(16)}`).join(',')}`;
  if (scen.textures.exists(ny)) return ny;
  const bas = scen.textures.get(nyckel);
  // från dagens bild, också på kvällen: kvällen läggs på efter hud och dräkt
  const duk = medByten(/** @type {HTMLImageElement | HTMLCanvasElement} */ (DAG.get(nyckel) ?? bas.getSourceImage()), byten);
  const tex = /** @type {Phaser.Textures.CanvasTexture} */ (scen.textures.addCanvas(ny, duk));
  for (const n of bas.getFrameNames()) {
    const f = bas.get(n);
    tex.add(n, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  if (kvallNu && kvallBerors(ny)) vaxla(scen, ny, kvallNu);
  return ny;
}

/** En kopia av bilden med färgerna bytta. @param {HTMLImageElement | HTMLCanvasElement} bild @param {Map<number, number>} byten */
function medByten(bild, byten) {
  const duk = document.createElement('canvas');
  duk.width = bild.width; duk.height = bild.height;
  const c = /** @type {CanvasRenderingContext2D} */ (duk.getContext('2d', { willReadFrequently: true }));
  c.drawImage(bild, 0, 0);
  const d = c.getImageData(0, 0, duk.width, duk.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const till = byten.get((p[i] << 16) | (p[i + 1] << 8) | p[i + 2]);
    if (till === undefined) continue;
    p[i] = (till >> 16) & 255; p[i + 1] = (till >> 8) & 255; p[i + 2] = till & 255;
  }
  c.putImageData(d, 0, 0);
  return duk;
}

/**
 * Kvällen på figurerna (Stil, beslut 84.2): hjälten (i spelarens färger), staven, ungen och byborna ritas med
 * kvällstabellen. Bilderna byggs en gång per atlas, första gången ett rum har tillståndet kvall, och atlasens källa
 * byts sedan mellan dagens och kvällens bild när rummet laddas. Alla bilder ur atlasen följer med utan att någon
 * figur behöver veta om det.
 */
export const KVALL_FIGURER = ['hjalte', 'stav', 'unge', 'tant_rosa', 'fiskaren', 'tvatterskan', 'barnet', 'bo'];
const kvallBerors = (/** @type {string} */ k) => KVALL_FIGURER.some((f) => k === f || k.startsWith(`${f}:`));
/** atlas → dagens källa, och atlas → kvällens bild */
const DAG = /** @type {Map<string, HTMLImageElement | HTMLCanvasElement>} */ (new Map());
const KVALL = /** @type {Map<string, HTMLCanvasElement>} */ (new Map());
let kvallNu = /** @type {Map<number, number> | null} */ (null);

/** @param {Phaser.Scene} scen @param {string} k @param {Map<number, number> | null} byten */
function vaxla(scen, k, byten) {
  const src = scen.textures.get(k).source[0];
  if (!src) return;
  if (!DAG.has(k)) { if (!byten) return; DAG.set(k, /** @type {any} */ (src.image)); }
  const dag = /** @type {HTMLImageElement | HTMLCanvasElement} */ (DAG.get(k));
  let mal = dag;
  if (byten) { mal = KVALL.get(k) ?? medByten(dag, byten); KVALL.set(k, /** @type {HTMLCanvasElement} */ (mal)); }
  if (src.image !== mal) src.updateSource(mal);
}

/**
 * Kväll eller dag på figurerna. Billigt när inget ändras. @param {Phaser.Scene} scen
 * @param {Map<number, number> | null} byten kvällstabellen, eller null för dag
 */
export function sattKvall(scen, byten) {
  if (kvallNu === byten) return;
  kvallNu = byten;
  for (const k of scen.textures.getTextureKeys()) if (kvallBerors(k)) vaxla(scen, k, byten);
}

/** Atlasen som just nu har kvällens bild (för testerna). @param {Phaser.Scene} scen @returns {string[]} */
export function kvallsAtlas(scen) {
  return scen.textures.getTextureKeys().filter((k) => KVALL.has(k) && scen.textures.get(k).source[0]?.image === KVALL.get(k));
}

/** Åt vilket håll en figur som är vänd så här tittar i bilderna. @param {{ x: number, y: number }} v */
export const riktningFor = (v) => (Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'hoger' : 'vanster') : v.y < 0 ? 'upp' : 'ner');
