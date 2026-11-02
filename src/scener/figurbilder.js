// @ts-check
// Figurernas bilder i världen (dokument 02 §7): atlasen i assets/sprites, som verktyg/grafik/inkorg.py skriver.
// Hjälten och staven ritas i spelarens färger med palettbyten (karna/fargbyte.js), en bild per val.
import hjaltePng from '../../assets/sprites/hjalte/hjalte.png?url';
import hjalteRamar from '../../assets/sprites/hjalte/hjalte.json';
import stavPng from '../../assets/sprites/stav/stav.png?url';
import stavRamar from '../../assets/sprites/stav/stav.json';
import skataPng from '../../assets/sprites/herr_skata/herr_skata.png?url';
import skataRamar from '../../assets/sprites/herr_skata/herr_skata.json';

/** Atlasen: nyckel → [bild, ramar]. */
const ATLAS = { hjalte: [hjaltePng, hjalteRamar], stav: [stavPng, stavRamar], herr_skata: [skataPng, skataRamar] };

/** Ladda figurernas bilder (scenens preload). @param {Phaser.Scene} scen */
export function laddaFigurer(scen) {
  for (const [nyckel, [png, ramar]] of Object.entries(ATLAS)) if (!scen.textures.exists(nyckel)) scen.load.atlas(nyckel, png, ramar);
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
  for (const namn of bas.getFrameNames()) {
    const f = bas.get(namn);
    tex.add(namn, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  return ny;
}

/** Åt vilket håll en figur som är vänd så här tittar i bilderna. @param {{ x: number, y: number }} v */
export const riktningFor = (v) => (Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'hoger' : 'vanster') : v.y < 0 ? 'upp' : 'ner');
