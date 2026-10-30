// @ts-check
// Startar spelet och kopplar ihop modulerna. Inga globaler: allt skickas som argument.
// Typsnittet är Lexend (beslut 13). Andika finns kvar som paket, så att ett byte tillbaka är två rader här och en i stil.css.
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import './stil.css';
import Phaser from 'phaser';

import ordlistor from '../content/ordlistor.json';

// Äventyren: en mapp per äventyr i content/ (aventyr.json + kap-NN.json) och kartor/ (Tiled-kartor, platshållare).
// Koden vet inget om ett visst äventyr. Med flera äventyr väljs ett med ?aventyr=<id>, annars det första.
const aventyrsfiler = import.meta.glob('../content/*/aventyr.json', { import: 'default', eager: true });
const kapitelfiler = import.meta.glob('../content/*/kap-*.json', { import: 'default', eager: true });
const kartfiler = import.meta.glob('../kartor/*/*.tmj', { query: '?raw', import: 'default', eager: true });
const platshallarfiler = import.meta.glob('../kartor/*/platshallare.json', { import: 'default', eager: true });
const mappAv = (/** @type {string} */ fil) => fil.split('/').at(-2);

import { skapaLogg } from './karna/logg.js';
import { skapaSparning } from './karna/sparning.js';
import { skapaInmatning } from './karna/inmatning.js';
import { RUM, varldTillSkarm } from './karna/skalning.js';
import { lasKarta } from './karna/karta.js';
import { skapaLagring, begarBestandigLagring } from './grans/lagring.js';
import { skapaLayout } from './grans/layout.js';
import { kopplaInmatning } from './grans/inmatningDom.js';
import { kopplaLogg, exportera } from './grans/loggDom.js';
import { startaUppdatering } from './grans/uppdatering.js';
import { skapaRost } from './grans/rost.js';
import { skapaLjud } from './grans/ljud.js';
import { skapaUi } from './grans/ui.js';
import { skapaBilder } from './grans/bilder.js';
import { skapaTangentbord } from './grans/tangentbord.js';
import { bevakaBildrutor } from './grans/prestanda.js';
import { Rum } from './scener/Rum.js';
import { skapaSpel } from './spel.js';

const VERSION = __VERSION__;
const parametrar = new URLSearchParams(location.search);
const allaAventyr = Object.entries(aventyrsfiler).map(([fil, a]) => ({ mapp: mappAv(fil), data: /** @type {any} */ (a) })).sort((x, y) => x.mapp.localeCompare(y.mapp));
const valt = allaAventyr.find((a) => a.data.id === parametrar.get('aventyr')) ?? allaAventyr[0];
const aventyr = valt.data;
const kapitel = Object.entries(kapitelfiler).filter(([fil]) => mappAv(fil) === valt.mapp).map(([, k]) => /** @type {any} */ (structuredClone(k)));
// Bara för webbläsartesterna (?snabb&testscen): en provscen ur localStorage läggs till i första kapitlet, så att
// motorns steg kan provas innan innehållet använder dem. Påverkar aldrig ett vanligt spel.
/** @type {Record<string, any>} provkartor (Tiled-JSON per rum) för webbläsartesterna */
let testkartor = {};
{
  const q = new URLSearchParams(location.search);
  if (q.has('snabb') && q.has('testscen')) {
    try {
      const t = JSON.parse(localStorage.getItem('ordstaven_testscen') || 'null');
      if (t && kapitel[0]) {
        const k = kapitel[0];
        k.scener.splice(t.index ?? k.scener.length, 0, t.scen);
        // provpussel, fler scener (frivilliga) och fält i rummen, så att kapitel 1:s steg kan provas i prologens rum
        for (const p of t.pussel || []) k.pussel.push(p);
        for (const sc of t.scener || []) k.scener.push(sc);
        for (const [id, falt] of Object.entries(t.rum || {})) { const r = k.rum.find((x) => x.id === id); if (r) Object.assign(r, falt); else k.rum.push({ id, namn: id, innehall: [], ...falt }); }
        testkartor = t.kartor || {};
      }
    } catch (e) { /* ingen provscen */ }
  }
}
/** Testläge: ingen röst, korta pauser. */
const snabb = parametrar.has('snabb');
const pek = window.matchMedia('(pointer: coarse)');
if (snabb) document.documentElement.classList.add('snabb');

const lagring = skapaLagring();
const logg = skapaLogg({ lagring, version: VERSION });
kopplaLogg(logg);
logg.handelse('start', `ORDSTAVEN ${VERSION}`, { lagring: lagring.typ, snabb });

const sparning = skapaSparning({ lagring, spelversion: VERSION, logg });
if (parametrar.has('ny')) sparning.nollstall();
const tillstand = sparning.las();

const varld = /** @type {HTMLElement} */ (document.getElementById('varld'));
const textlager = /** @type {HTMLElement} */ (document.getElementById('textlager'));
const layout = skapaLayout({ varld, logg });
logg.registrera('skala', () => layout.skala);
// hur världen ritas (webgl eller canvas): MacBooken vid grind A saknade WebGL
logg.registrera('ritning', () => { try { return spel.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl'; } catch (e) { return 'startar'; } });

const inmatning = skapaInmatning();
kopplaInmatning({ inmatning, layout, yta: /** @type {HTMLElement} */ (document.getElementById('ram')), logg, kamera: () => rum.kamera });

const rost = skapaRost({ logg, tyst: () => snabb });
const ljud = skapaLjud({ tyst: () => snabb });
const ui = skapaUi({ ordlistor, rost, ljud, logg });
const platshallare = /** @type {any} */ (Object.entries(platshallarfiler).find(([fil]) => mappAv(fil) === valt.mapp)?.[1])?.bilder ?? {};
const bilder = skapaBilder(ordlistor, platshallare);
// nosen (Tab, och Mellanslag/Enter/Escape medan den är tänd) tar handlingen före stegen och rummet
inmatning.fanga((h) => !spelet?.pausad && ui.fanga(h));
// Skärmtangentbordet skickar sina tryck genom inmatningslagret, som det fysiska tangentbordet.
const tangentbord = skapaTangentbord({
  rot: document.body,
  vidBokstav: (b) => inmatning.tangentNer('', b),
  vidSudda: () => inmatning.tangentNer('Backspace'),
  vidKlar: () => inmatning.tangentNer('Enter'),
});

// Har WebGL tappats förut på den här datorn (Safari på golvdatorn: "WebGL context lost") ritas världen med canvas,
// en vecka i taget. Annars väljer Phaser: WebGL om det finns, annars canvas.
const NYCKEL_RITNING = 'ordstaven_ritning';
const canvasSparad = (() => {
  try { const v = JSON.parse(localStorage.getItem(NYCKEL_RITNING) || 'null'); return !!v && v.typ === 'canvas' && Date.now() - v.t < 7 * 864e5; } catch (e) { return false; }
})();
// Finns WebGL alls? Golvdatorn (beslut 19) saknar det: då ritas världen med canvas i mjukvara, och spelet sparar
// på arbetet (takt 30, och ingen ny bildruta när inget har ändrats).
const webglFinns = (() => {
  try {
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
    /** @type {any} */ (gl)?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch (e) { return false; }
})();
const canvasLage = parametrar.has('canvas') || canvasSparad || !webglFinns;
// kameran (beslut 14): textlagret flyttar skyltarna, händerna och bubblorna med den
const rum = new Rum({ inmatning, logg, mjukvara: canvasLage, vidKamera: (k, stor) => ui.kamera(k, layout.skala.cssSkala, stor) });
const spel = new Phaser.Game({
  // ?canvas tvingar canvas-ritningen (som när datorn saknar WebGL), för att kunna testa den
  type: canvasLage ? Phaser.CANVAS : Phaser.AUTO,
  // canvas: högst 30 bildrutor per sekund, och duken rensas inte (golvet ritas över hela rummet varje gång),
  // så att en bildruta utan ändringar kan hoppas över helt (Rum.valjRitning)
  ...(canvasLage ? { fps: { limit: 30 }, clearBeforeRender: false } : {}),
  parent: varld,
  width: RUM.bredd,
  height: RUM.hojd,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1a1410',
  banner: false,
  scale: { mode: Phaser.Scale.NONE },
  // All inmatning går genom vårt eget lager (src/karna/inmatning.js).
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  scene: [rum],
});

// Tappar webbläsaren WebGL mitt i spelet startar spelet om med canvas, i stället för att stå still.
// Sparningen görs efter varje steg, så han hamnar där han var.
spel.events.once(Phaser.Core.Events.READY, () => {
  if (spel.renderer.type !== Phaser.WEBGL) return;
  spel.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    logg.handelse('ritning', 'WebGL tappades: startar om med canvas');
    try { localStorage.setItem(NYCKEL_RITNING, JSON.stringify({ typ: 'canvas', t: Date.now() })); } catch (err) { /* ingen lagring */ }
    logg.spara(true);
    location.reload();
  }, { once: true });
});
if (canvasSparad) logg.handelse('ritning', 'canvas (WebGL tappades förut på den här datorn)');
if (canvasLage) logg.handelse('ritning', 'canvas: högst 30 bildrutor per sekund, och bara när något ändras', { webgl: webglFinns });
// Hack i bildrutorna skrivs i loggen med vad som pågick (golvdatorn ritar utan grafikkort).
bevakaBildrutor({ logg, sammanhang: () => ({ scen: spelet?.scen, steg: spelet?.steg?.typ, pussel: spelet?.steg?.pussel_id, platta: !ui.plattan.hidden, ritning: spel.renderer?.type === Phaser.CANVAS ? 'canvas' : 'webgl' }) });

// Versionsraden: information till den vuxne, bara där den inte täcker rummet.
document.fonts.load('32px Lexend').finally(() => {
  const prov = document.createElement('div');
  prov.className = 'etikett typsnittsprov'; prov.textContent = 'ÅÄÖ';
  textlager.appendChild(prov);
  const el = document.createElement('div');
  el.className = 'etikett version'; el.textContent = `ORDSTAVEN ${VERSION}`;
  textlager.appendChild(el);
  const placera = () => {
    el.hidden = false;
    const r = el.getBoundingClientRect(), s = layout.skala;
    el.hidden = r.right > s.vanster && r.bottom > s.topp && r.top < s.topp + s.cssHojd;
  };
  placera(); layout.vidAndring(placera);
});

let startlage = true;
const uppdatering = startaUppdatering({ logg, arStartlage: () => startlage });
begarBestandigLagring().then((ok) => logg.handelse('lagring', ok ? 'beständig' : 'inte beständig'));

/** @type {Record<string, import('./karna/karta.js').Karta>} */
const kartor = Object.fromEntries(Object.entries(kartfiler).filter(([fil]) => mappAv(fil) === valt.mapp)
  .map(([fil, text]) => [fil.replace(/^.*\/|\.tmj$/g, ''), lasKarta(JSON.parse(/** @type {string} */ (text)))]));
for (const [id, tmj] of Object.entries(testkartor)) kartor[id] = lasKarta(tmj);

const spelet = skapaSpel({
  aventyr, kartor, kapitel, ordlistor, tillstand, sparning, logg, rost, ljud, ui, rum, layout, inmatning, tangentbord, bilder,
  snabb, pek: () => pek.matches, version: VERSION, exporteraLogg: () => exportera(logg),
  // ?kapitel=kap-01: börja i ett kapitel som ännu saknar kartor (gråbox för den vuxne)
  valtKapitel: parametrar.get('kapitel'),
  uppdatering: { tillampa: () => { uppdatering.tillampa(); startlage = false; } },
});
/** @type {any} */ (rum).redo.then(() => spelet.spela());

// Krokar för testerna (läser tillstånd, ändrar inget).
/** @type {any} */ (window).__ORDSTAVEN = {
  version: VERSION,
  position: () => ({ x: rum.pos.x, y: rum.pos.y }),
  skala: () => layout.skala,
  scen: () => spelet.scen,
  steg: () => spelet.steg,
  tillstand: () => tillstand,
  /** Skärmpunkt mitt på ett objekt i rummet (för att trycka på det). @param {string} id */
  objekt: (id) => { const o = rum.ruta(id); if (!o) return null; return varldTillSkarm(layout.skala, rum.kamera, o.x + o.b / 2, o.y + o.h / 2); },
  rumsobjekt: () => rum.objekt.map((o) => o.id),
  pausad: () => spelet.pausad,
  /** Varianten (nivån) i pusslet som pågår, t.ex. "L2". */
  variant: () => spelet.variant,
  stegIndex: () => spelet.stegIndex,
  /** Föremålets sort (utgang, sak, figur). @param {string} id */
  sort: (id) => rum.ruta(id)?.sort ?? null,
  klattrar: () => !!rum.klattrar,
  ungeMal: () => rum.ungeMal,
  buren: () => !!rum.buren,
  lagda: () => rum.lagda.length,
  ruta: (id) => { const o = rum.ruta(id); return o ? { ...o } : null; },
  logg: () => logg.text(),
  /** Föremålen som går att använda just nu. */
  interaktiva: () => [...rum.interaktiva],
  /** Hur många bildrutor rummet har ritat (canvasläget ritar bara när något ändras). */
  ritade: () => rum.antalRitade || 0,
  kamera: () => ({ ...rum.kamera, ...rum.storlek }),
  /** Föremålets ruta på skärmen (CSS-pixlar), via kameran: för att se om något syns. */
  rutaPaSkarm: (id) => { const o = rum.ruta(id); if (!o) return null; const a = varldTillSkarm(layout.skala, rum.kamera, o.x, o.y), b = varldTillSkarm(layout.skala, rum.kamera, o.x + o.b, o.y + o.h); return { x: a.x, y: a.y, b: b.x - a.x, h: b.y - a.y }; },
  /** Hur många steg (uppdateringar) rummet har gjort i canvasläget. */
  steg2: () => rum.antalSteg || 0,
  /** Stigar som är spärrade med en gren. */
  sparrade: () => [...rum.sparrade],
  /** Står världen still (läsplattan, en reaktion, han går tillbaka)? */
  fryst: () => !!rum.fryst,
  /** Syns hjälten (inte bakom kurvan)? */
  synlig: () => !!rum.hjalte?.visible,
  /** Nivån hjälten är på (0 = marken), och om han står på en stege. */
  niva: () => ({ niva: rum.niva, stege: rum.paStege }),
  /** Det hjälten har på sig. */
  lager: () => ({ ...rum.lager }),
  spel,
  /** 'webgl' eller 'canvas': hur världen ritas just nu */
  ritning: () => (spel.renderer && spel.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl'),
};
