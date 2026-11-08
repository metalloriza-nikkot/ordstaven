// @ts-check
// Startskärmen (F4, 10e v0.4 *Startskärmen*): Farfars skrivbord i morgonljus med mässingsskylten och Ordstaven,
// fotot av rummet där han är (FORTSÄTT), NYTT ÄVENTYR som en tom bok med två tryck, och spelarna med sina
// hjältebilder. **Inga ord under knapparna** (62.5): bilden, pilen, bocken och plusset räcker. Spelarens namn står
// under hans bild, eftersom det är hans eget ord. Allt står i världens pixlar (320 × 192) över spelytan och skalas
// med --vpx (en av världens pixlar i CSS-punkter, i hela steg, layout.js). Här finns bara det som syns och trycks:
// vad ett tryck gör (byta plats, nytt äventyr, ny spelare) bestämmer den som anropar.

const START = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/ui/start/*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));

/** Bildernas mått i världens pixlar (Stils bilder i ui/start/). */
const MATT = /** @type {Record<string, [number, number]>} */ ({
  bord: [320, 192], foto_ram: [170, 106], pil: [32, 32], pil_vilar: [32, 32], bok_ny: [40, 48], bok_ny_stor: [78, 94],
  bock: [32, 32], bak: [24, 24], plus: [28, 28], spelare_ram: [28, 28], spelare_ram_vald: [28, 28], spelare_mask: [28, 28],
});

/** En bild ur ui/start/ som URL, eller null. @param {string} namn */
export const startBild = (namn) => START[namn] ?? null;

/** Läge och storlek i världens pixlar. @param {number} x @param {number} y @param {number} [b] @param {number} [h] */
const lage = (x, y, b, h) => `left:calc(${x} * var(--vpx));top:calc(${y} * var(--vpx))${b ? `;width:calc(${b} * var(--vpx))` : ''}${h ? `;height:calc(${h} * var(--vpx))` : ''}`;
/** @param {string} namn @param {number} x @param {number} y @param {string} [klass] */
const bild = (namn, x, y, klass = '') => {
  const [b, h] = MATT[namn] || [0, 0];
  const u = startBild(namn);
  return u ? `<img class="sb ${klass}" src="${u}" alt="" draggable="false" style="${lage(x, y, b, h)}">` : '';
};

/**
 * Hjältens huvud i spelarens ram (10e): ramen med himmel och gräs, och hjälten i spelarens färger i rundeln
 * (`spelare_mask`), ritat på en liten duk. @param {string | null} hjalte bilden av hjälten (24 × 24)
 * @param {boolean} vald @returns {Promise<string | null>}
 */
export function spelarHuvud(hjalte, vald) {
  const las = (/** @type {string | null} */ u) => new Promise((klar) => {
    if (!u) { klar(null); return; }
    const i = new Image(); i.onload = () => klar(i); i.onerror = () => klar(null); i.src = u;
  });
  return Promise.all([las(startBild(vald ? 'spelare_ram_vald' : 'spelare_ram')), las(startBild('spelare_mask')), las(hjalte)]).then(([ram, mask, h]) => {
    if (!ram) return null;
    try {
      const c = document.createElement('canvas'); c.width = 28; c.height = 28;
      const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      g.imageSmoothingEnabled = false;
      g.drawImage(/** @type {HTMLImageElement} */ (ram), 0, 0);
      if (mask && h) {
        const m = document.createElement('canvas'); m.width = 28; m.height = 28;
        const mg = /** @type {CanvasRenderingContext2D} */ (m.getContext('2d'));
        mg.imageSmoothingEnabled = false;
        mg.drawImage(/** @type {HTMLImageElement} */ (mask), 0, 0);
        mg.globalCompositeOperation = 'source-in';
        // hjälten (24 × 24, fötterna nere) så att huvudet och hjälmen står mitt i rundeln
        mg.drawImage(/** @type {HTMLImageElement} */ (h), 2, 7);
        g.drawImage(m, 0, 0);
      }
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  });
}

/**
 * @typedef {{ plats: string, namn: string, hjalte: string | null, vald: boolean }} SpelarRad
 * @param {{
 *   skarm: HTMLElement,
 *   ord: (text: string) => string,
 *   borjat: boolean,
 *   foto: string | null,
 *   figurer: { hjalte: string | null, unge: string | null },
 *   ungeRam?: ((ram: string) => string | null) | null,
 *   spelare: SpelarRad[],
 *   kanNySpelare: boolean,
 *   tid?: (ms: number) => number,
 *   klick?: () => void,
 *   logg?: { handelse(t: string, m: string, d?: any): void },
 * }} opt
 * @returns {{ val: Promise<{ vad: 'start' } | { vad: 'spelare', plats: string } | { vad: 'nytt_aventyr' } | { vad: 'ny_spelare' }>, stang: () => void }}
 */
export function visaStartskarm({ skarm, ord, borjat, foto, figurer, ungeRam, spelare, kanNySpelare, tid = (ms) => ms, klick = () => {}, logg }) {
  // spelarna i en kolumn till vänster (x 8, y 52, 46 pixlar ned per spelare), och plusset under den sista.
  // Är de många krymper avståndet, så att alla ryms ovanför bordets framkant.
  const n = spelare.length + (kanNySpelare ? 1 : 0);
  let topp = 52, steg = 46;
  if (n > 1 && topp + steg * (n - 1) + 28 > 186) { topp = 40; steg = Math.max(30, Math.floor((186 - 28 - topp) / (n - 1))); }
  const kolumn = spelare.map((s, i) => `<button type="button" class="spelarkort ${s.vald ? 'vald' : ''}" data-plats="${s.plats}" aria-label="${s.namn ? 'Spelare' : 'Spelare utan namn'}" style="${lage(8, topp + i * steg, 28, 28)}">`
    + `<img class="sb huvud" src="${startBild(s.vald ? 'spelare_ram_vald' : 'spelare_ram') || ''}" alt="" draggable="false" style="${lage(0, 0, 28, 28)}">`
    + (s.namn && steg >= 40 ? `<span class="spelarnamn">${ord(s.namn)}</span>` : '') + '</button>').join('')
    + (kanNySpelare ? `<button type="button" class="ny-spelare" aria-label="Ny spelare" style="${lage(8, topp + spelare.length * steg, 28, 28)}">${bild('plus', 0, 0)}</button>` : '');
  // fotot i ramens hål (80, 54), 160 × 96; finns inget foto står hjälten och ungen där i dubbel storlek
  const ifoto = foto
    ? `<img class="sb foto" src="${foto}" alt="" draggable="false" style="${lage(4, 4, 160, 96)}">`
    : `<span class="foto tom" style="${lage(4, 4, 160, 96)}">${figurer.hjalte ? `<img class="sb" src="${figurer.hjalte}" alt="" draggable="false" style="${lage(figurer.unge ? 44 : 56, 36, 48, 48)}">` : ''}${figurer.unge ? `<img class="sb" src="${figurer.unge}" alt="" draggable="false" style="${lage(84, 36, 48, 48)}">` : ''}</span>`;
  const huvud = borjat
    ? `<button type="button" class="start-knapp fortsatt" aria-label="Fortsätt" style="${lage(76, 50, 170, 106)}">${ifoto}${bild('foto_ram', 0, 0)}${bild('pil', 154, 78)}</button>`
      + `<button type="button" class="nytt-aventyr" aria-label="Nytt äventyr" style="${lage(276, 96, 40, 48)}">${bild('bok_ny', 0, 0)}</button>`
      + (figurer.unge ? `<img class="sb unge" src="${figurer.unge}" alt="" draggable="false" data-lage="vaken" style="${lage(52, 148, 24, 24)}">` : '')
      + `<div class="ny-bok" hidden>${bild('bok_ny_stor', 196, 34)}`
      + `<button type="button" class="bekrafta" aria-label="Börja ett nytt äventyr" style="${lage(248, 100, 32, 32)}">${bild('bock', 0, 0)}</button>`
      + `<button type="button" class="tillbaka" aria-label="Tillbaka" style="${lage(178, 104, 24, 24)}">${bild('bak', 0, 0)}</button></div>`
    : `<button type="button" class="start-knapp forsta" aria-label="Starta" style="${lage(122, 40, 78, 94)}">${bild('bok_ny_stor', 0, 0)}${bild('pil', 56, 68)}</button>`;
  skarm.innerHTML = `<div class="startbord${borjat ? ' med-fortsatt' : ' forsta-gangen'}">${bild('bord', 0, 0, 'bord')}`
    + `<div class="skylt-namn" aria-hidden="true">ORDSTAVEN</div>${kolumn}${huvud}</div>`;
  skarm.hidden = false;
  skarm.classList.add('start-skarm');
  const bord = /** @type {HTMLElement} */ (skarm.querySelector('.startbord'));
  // hjältarnas huvuden ritas när bilderna har laddats
  skarm.querySelectorAll('.spelarkort').forEach((el, i) => {
    const s = spelare[i];
    spelarHuvud(s.hjalte, s.vald).then((u) => { const im = /** @type {HTMLImageElement | null} */ (el.querySelector('.huvud')); if (u && im) im.src = u; });
  });

  // ungen bredvid fotot: står skärmen orörd en stund gäspar den och somnar, och ett tryck väcker den (vår demo)
  const unge = /** @type {HTMLImageElement | null} */ (skarm.querySelector('.unge'));
  /** @type {ReturnType<typeof setTimeout>[]} */
  let klockor = [];
  const stopp = () => { klockor.forEach(clearTimeout); klockor = []; };
  const ram = (/** @type {string} */ r) => { const u = ungeRam?.(r); if (unge && u) unge.src = u; };
  const somna = () => {
    if (!unge || !ungeRam) return;
    stopp();
    klockor.push(setTimeout(() => {
      unge.dataset.lage = 'gaspar';
      ['gaspar_ner_01', 'gaspar_ner_02', 'gaspar_ner_01', 'gaspar_ner_02'].forEach((r, i) => klockor.push(setTimeout(() => ram(r), tid(i * 400))));
      klockor.push(setTimeout(() => {
        unge.dataset.lage = 'sover';
        let i = 0;
        const andas = () => { ram(i++ % 2 ? 'sover_ner_02' : 'sover_ner_01'); klockor.push(setTimeout(andas, 900)); };
        andas();
      }, tid(1700)));
    }, tid(25000)));
  };
  const vakna = () => {
    if (!unge || !ungeRam) return;
    if (unge.dataset.lage !== 'vaken') { unge.dataset.lage = 'vaken'; ram('glad_ner_01'); logg?.handelse('start', 'ungen vaknar'); }
    somna();
  };
  bord.addEventListener('pointerdown', vakna);
  somna();

  /** @type {(v: any) => void} */
  let svara = () => {};
  const val = new Promise((klar) => { svara = klar; });
  const ga = (/** @type {any} */ v) => { stopp(); svara(v); };
  skarm.querySelector('.start-knapp')?.addEventListener('click', () => ga({ vad: 'start' }), { once: true });
  skarm.querySelectorAll('.spelarkort').forEach((el) => el.addEventListener('click', () => {
    const p = /** @type {HTMLElement} */ (el).dataset.plats || '';
    klick();
    if (spelare.find((s) => s.plats === p)?.vald) ga({ vad: 'start' }); else ga({ vad: 'spelare', plats: p });
  }));
  skarm.querySelector('.ny-spelare')?.addEventListener('click', () => { klick(); ga({ vad: 'ny_spelare' }); });
  // NYTT ÄVENTYR, två tryck: boken lyfts fram (fotot och spelarna tonas ned), och bocken startar ett nytt äventyr.
  // Pilen bakåt eller ett tryck någon annanstans lägger tillbaka boken. Inget raderas.
  const nyBok = /** @type {HTMLElement | null} */ (skarm.querySelector('.ny-bok'));
  const lagg = (/** @type {boolean} */ fram) => { bord.classList.toggle('lyft', fram); if (nyBok) nyBok.hidden = !fram; };
  skarm.querySelector('.nytt-aventyr')?.addEventListener('click', (e) => { e.stopPropagation(); klick(); lagg(true); logg?.handelse('start', 'nytt äventyr: boken lyfts fram'); });
  skarm.querySelector('.bekrafta')?.addEventListener('click', (e) => { e.stopPropagation(); klick(); ga({ vad: 'nytt_aventyr' }); });
  skarm.querySelector('.tillbaka')?.addEventListener('click', (e) => { e.stopPropagation(); klick(); lagg(false); });
  bord.addEventListener('click', (e) => {
    if (!bord.classList.contains('lyft') || (/** @type {HTMLElement} */ (e.target)).closest('.ny-bok button, .nytt-aventyr')) return;
    e.stopPropagation(); e.preventDefault(); lagg(false);
  }, true);
  return { val, stang: () => { stopp(); skarm.classList.remove('start-skarm'); } };
}
