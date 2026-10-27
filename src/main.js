// @ts-check
// Startar spelet och kopplar ihop modulerna. Inga globaler: allt skickas som argument.
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
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
import { RUM } from './karna/skalning.js';
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
{
  const q = new URLSearchParams(location.search);
  if (q.has('snabb') && q.has('testscen')) {
    try { const t = JSON.parse(localStorage.getItem('ordstaven_testscen') || 'null'); if (t && kapitel[0]) kapitel[0].scener.splice(t.index ?? kapitel[0].scener.length, 0, t.scen); } catch (e) { /* ingen provscen */ }
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

const inmatning = skapaInmatning();
kopplaInmatning({ inmatning, layout, yta: /** @type {HTMLElement} */ (document.getElementById('ram')), logg });

const rost = skapaRost({ logg, tyst: () => snabb });
const ljud = skapaLjud({ tyst: () => snabb });
const ui = skapaUi({ ordlistor, rost, ljud, logg });
const platshallare = /** @type {any} */ (Object.entries(platshallarfiler).find(([fil]) => mappAv(fil) === valt.mapp)?.[1])?.bilder ?? {};
const bilder = skapaBilder(ordlistor, platshallare);
inmatning.lyssna((h) => { if (!spelet?.pausad) ui.handling(h); });
// Skärmtangentbordet skickar sina tryck genom inmatningslagret, som det fysiska tangentbordet.
const tangentbord = skapaTangentbord({
  rot: document.body,
  vidBokstav: (b) => inmatning.tangentNer('', b),
  vidSudda: () => inmatning.tangentNer('Backspace'),
  vidKlar: () => inmatning.tangentNer('Enter'),
});

const rum = new Rum({ inmatning, logg });
const spel = new Phaser.Game({
  type: Phaser.AUTO,
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

// Versionsraden: information till den vuxne, bara där den inte täcker rummet.
document.fonts.load('32px Andika').finally(() => {
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

const spelet = skapaSpel({
  aventyr, kartor, kapitel, ordlistor, tillstand, sparning, logg, rost, ljud, ui, rum, layout, inmatning, tangentbord, bilder,
  snabb, pek: () => pek.matches, version: VERSION, exporteraLogg: () => exportera(logg),
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
  objekt: (id) => { const o = rum.ruta(id); if (!o) return null; const s = layout.skala; return { x: s.vanster + (o.x + o.b / 2) * s.cssSkala, y: s.topp + (o.y + o.h / 2) * s.cssSkala }; },
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
  spel,
};
