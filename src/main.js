// @ts-check
// Startar spelet och kopplar ihop modulerna. Inga globaler: allt skickas som argument.
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './stil.css';
import Phaser from 'phaser';

import { skapaLogg } from './karna/logg.js';
import { skapaSparning, AVENTYR } from './karna/sparning.js';
import { skapaInmatning } from './karna/inmatning.js';
import { RUM } from './karna/skalning.js';
import { skapaLagring, begarBestandigLagring } from './grans/lagring.js';
import { skapaLayout } from './grans/layout.js';
import { kopplaInmatning } from './grans/inmatningDom.js';
import { kopplaLogg } from './grans/loggDom.js';
import { startaUppdatering } from './grans/uppdatering.js';
import { Testrum } from './scener/Testrum.js';

const VERSION = __VERSION__;
const startTid = performance.now();

const lagring = skapaLagring();
const logg = skapaLogg({ lagring, version: VERSION });
kopplaLogg(logg);
logg.handelse('start', `ORDSTAVEN ${VERSION}`, { lagring: lagring.typ });

const sparning = skapaSparning({ lagring, spelversion: VERSION, logg });
const tillstand = sparning.las();
const aventyr = tillstand.aventyr[AVENTYR];
logg.registrera('spel', () => ({ plats: aventyr.plats, kapitel: aventyr.kapitel }));

const varld = /** @type {HTMLElement} */ (document.getElementById('varld'));
const textlager = /** @type {HTMLElement} */ (document.getElementById('textlager'));
const layout = skapaLayout({ varld, logg });
logg.registrera('skala', () => layout.skala);

const inmatning = skapaInmatning();
kopplaInmatning({ inmatning, layout, yta: /** @type {HTMLElement} */ (document.getElementById('ram')), logg });

// Sparning: högst varannan sekund medan blocket rör sig, och alltid när appen läggs undan.
let osparat = false, senastSparat = 0;
const sparaNu = () => { if (osparat) { sparning.spara(tillstand); osparat = false; senastSparat = performance.now(); } };
const vidFlytt = (/** @type {{ x: number, y: number }} */ p) => {
  aventyr.plats = { rum: 'testrum', x: Math.round(p.x), y: Math.round(p.y) };
  osparat = true;
  if (performance.now() - senastSparat > 2000) sparaNu();
};
window.addEventListener('pagehide', sparaNu);
document.addEventListener('visibilitychange', () => { if (document.hidden) sparaNu(); });
setInterval(sparaNu, 2000);

const scen = new Testrum({ inmatning, plats: aventyr.plats, vidFlytt, logg });
const spel = new Phaser.Game({
  type: Phaser.AUTO,
  parent: varld,
  width: RUM.bredd,
  height: RUM.hojd,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#2a1d16',
  banner: false,
  scale: { mode: Phaser.Scale.NONE },
  // All inmatning går genom vårt eget lager (src/karna/inmatning.js).
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  scene: [scen],
});

// Textlagret: all läsbar text ritas här i Andika, aldrig i pixelvärlden.
document.fonts.load('32px Andika').finally(() => {
  const prov = document.createElement('div');
  prov.className = 'etikett typsnittsprov';
  prov.textContent = 'ÅÄÖ';
  textlager.appendChild(prov);

  const el = document.createElement('div');
  el.className = 'etikett version';
  el.textContent = `ORDSTAVEN ${VERSION}`;
  textlager.appendChild(el);
  // Visa bara versionen där den inte täcker rummet.
  const placera = () => {
    el.hidden = false;
    const r = el.getBoundingClientRect(), s = layout.skala;
    const tackerRummet = r.right > s.vanster && r.bottom > s.topp && r.top < s.topp + s.cssHojd;
    el.hidden = tackerRummet;
  };
  placera();
  layout.vidAndring(placera);
});

startaUppdatering({ logg, arStartlage: () => performance.now() - startTid < 5000 });
begarBestandigLagring().then((ok) => logg.handelse('lagring', ok ? 'beständig' : 'inte beständig'));

// Krokar för testerna (läser bara tillstånd, ändrar inget).
/** @type {any} */ (window).__ORDSTAVEN = {
  version: VERSION,
  position: () => ({ x: scen.pos.x, y: scen.pos.y }),
  skala: () => layout.skala,
  spel,
};
