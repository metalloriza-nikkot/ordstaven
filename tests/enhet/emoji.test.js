// Inget i ett kapitel eller ett testrum visas som emoji (beslut 107.6, och 31.4). Varje bild som läsplattan kan visa
// ur innehållet (bildkort, ledbilder, alternativ, uppdrag, det motståndaren pekar på …) ritas med bilderna.js som
// spelet gör, och faller testet hittar det en emoji. Emoji-sköldpaddan i duellen hittades av en slump, och nästa gång
// ska den här kontrollen hitta den.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { skapaBilder } from '../../src/grans/bilder.js';

const las = (/** @type {string} */ f) => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'));
const ordlistor = las('content/ordlistor.json');
const platshallare = (() => { try { return las('kartor/den-gomda-dalen/platshallare.json'); } catch { return {}; } })();
const bilder = skapaBilder(ordlistor, platshallare);

const FILER = [
  ...readdirSync(new URL('../../content/den-gomda-dalen/', import.meta.url)).filter((f) => /^kap-\d+\.json$/.test(f)).map((f) => `content/den-gomda-dalen/${f}`),
  ...readdirSync(new URL('../../content/', import.meta.url)).filter((f) => /^testrum-.*\.json$/.test(f)).map((f) => `content/${f}`),
];

/**
 * Det som Stil inte har ritat än (testrummens 22 kort kom i 0.96.1, 107.6). Listan får bara krympa.
 * Står ett id här som inte längre är en emoji, faller testet också, så att listan hålls kort.
 */
const VANTAR_PA_STIL = new Set([
  // hittat av testet (0.96.0): "Var var vi?" på startskärmen (mat, sol, apa) och Farfars lista i prologens skylt
  'mat', 'sol', 'apa', 'farfars_lista_sista_raden',
]);

/** Fält vars värde är en bild på läsplattan. En mellanscens och en reaktions `bild` är en regi i rummet, inte en bild. */
const BILDFALT = new Set(['bild', 'ledbild', 'pekar_pa']);
const REGI_FORALDRAR = new Set(['vid_antal', 'vid_valj', 'efter', 'vid_ratt', 'vid_fel', 'vid_vinst', 'reaktion', 'nastan']);

/** Alla bild-id:n i en fil, med var de står. @param {any} d */
function bildIdn(d) {
  /** @type {Map<string, string>} */
  const ut = new Map();
  const ga = (/** @type {any} */ o, /** @type {string} */ stig, /** @type {string | null} */ far, iRummet = false) => {
    if (Array.isArray(o)) { o.forEach((x, i) => ga(x, `${stig}[${i}]`, far, iRummet)); return; }
    if (!o || typeof o !== 'object') return;
    // ett läsval i rummet visar sina alternativ som saker i världen, och det han bär (`bara`) bär hjälten i världen
    if (o.typ === 'bara' || (iRummet && far === 'alternativ')) return;
    for (const [k, v] of Object.entries(o)) {
      if (BILDFALT.has(k) && typeof v === 'string') {
        const regi = o.typ === 'mellanscen' || REGI_FORALDRAR.has(far ?? '') || /^\d+\+?$/.test(far ?? '');
        if (!regi && !ut.has(v)) ut.set(v, `${stig}.${k}`);
      }
      ga(v, `${stig}.${k}`, k, iRummet || !!o.i_rummet);
    }
  };
  ga(d, '', null);
  return ut;
}

const EMOJI = /\p{Extended_Pictographic}/u;

describe('inget i kapitlen och testrummen visas som emoji (107.6)', () => {
  for (const fil of FILER) {
    it(fil, () => {
      const emoji = [];
      for (const [id, var_] of bildIdn(las(fil))) {
        const html = bilder.html(id);
        if (EMOJI.test(html) && !VANTAR_PA_STIL.has(id)) emoji.push(`${id} (${var_})`);
      }
      expect(emoji).toEqual([]);
    });
  }
  it('listan över det som väntar på Stil gäller bara sådant som fortfarande är emoji', () => {
    const kvar = [...VANTAR_PA_STIL].filter((id) => !EMOJI.test(bilder.html(id)));
    expect(kvar).toEqual([]);
  });
});
