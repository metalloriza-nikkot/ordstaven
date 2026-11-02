// @ts-check
// Grafiken i världen (dokument 02 §7): atlasen och bilderna i assets/, som verktyg/grafik/inkorg.py skriver.
// - assets/sprites/<figur>/<figur>.png + .json: figurerna (hjälten, staven, ungen, Herr Skata, Farfar, skuggorna)
// - assets/foremal/<zon>/<zon>.png + .json: föremålen i kartorna (kartans objekt säger vilken bild med `bild`)
// - assets/rum/<zon>/<rum>.png: inomhusrummen, en bild per rum (kartans `bild`)
// - assets/tiles/<zon>/<zon>.png + .json: rutor för marken utomhus (kartans `mark`)
// Hjälten och staven ritas i spelarens färger med palettbyten (karna/fargbyte.js), en bild per val.

const bilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/{sprites,foremal}/*/*.png', { query: '?url', import: 'default', eager: true }));
const ramar = /** @type {Record<string, any>} */ (import.meta.glob('../../assets/{sprites,foremal}/*/*.json', { import: 'default', eager: true }));
const rumsbilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/rum/*/*.png', { query: '?url', import: 'default', eager: true }));
const rutbilder = /** @type {Record<string, string>} */ (import.meta.glob('../../assets/tiles/*/*.png', { query: '?url', import: 'default', eager: true }));
const rutset = /** @type {Record<string, any>} */ (import.meta.glob('../../assets/tiles/*/*.json', { import: 'default', eager: true }));

const namn = (/** @type {string} */ fil) => /** @type {string} */ (fil.split('/').pop()).replace(/\.[a-z]+$/, '');

/** Föremålens atlas, i ordning: en bild med samma namn hittas i det första som har den. */
export const FOREMAL_ATLAS = Object.keys(ramar).filter((f) => f.includes('/foremal/')).map(namn);

/** Ladda all grafik (scenens preload). Rummen heter rum_<rum>, rutorna rutor_<zon>. @param {Phaser.Scene} scen */
export function laddaGrafik(scen) {
  for (const [fil, url] of Object.entries(bilder)) {
    const n = namn(fil), json = ramar[fil.replace(/\.png$/, '.json')];
    if (json && !scen.textures.exists(n)) scen.load.atlas(n, url, json);
  }
  for (const [fil, url] of Object.entries(rumsbilder)) if (!scen.textures.exists(`rum_${namn(fil)}`)) scen.load.image(`rum_${namn(fil)}`, url);
  for (const [fil, url] of Object.entries(rutbilder)) {
    const n = namn(fil), ts = rutset[fil.replace(/\.png$/, '.json')];
    if (ts && !scen.textures.exists(`rutor_${n}`)) scen.load.spritesheet(`rutor_${n}`, url, { frameWidth: ts.tilewidth, frameHeight: ts.tileheight });
  }
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
 * Var finns en föremålsbild? @param {Phaser.Scene} scen @param {string} bild
 * @returns {{ nyckel: string, ram: string } | null}
 */
export function foremalsbild(scen, bild) {
  for (const n of FOREMAL_ATLAS) if (scen.textures.exists(n) && scen.textures.get(n).has(bild)) return { nyckel: n, ram: bild };
  for (const n of ['hjalte', 'farfar', 'herr_skata', 'unge']) if (scen.textures.exists(n) && scen.textures.get(n).has(bild)) return { nyckel: n, ram: bild };
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
  const bild = /** @type {HTMLImageElement} */ (bas.getSourceImage());
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
  const tex = /** @type {Phaser.Textures.CanvasTexture} */ (scen.textures.addCanvas(ny, duk));
  for (const n of bas.getFrameNames()) {
    const f = bas.get(n);
    tex.add(n, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  return ny;
}

/** Åt vilket håll en figur som är vänd så här tittar i bilderna. @param {{ x: number, y: number }} v */
export const riktningFor = (v) => (Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'hoger' : 'vanster') : v.y < 0 ? 'upp' : 'ner');
