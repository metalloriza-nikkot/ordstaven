// @ts-check
// Provsidan för textgrammatiken (beslut 13.3): alla textformer sida vid sida, var och en i en egen ram med
// spelets textlager. Här väljer den vuxne hur texten skrivs fram, ord för ord eller allt på en gång, och
// trycker ▶ för att höra och se. Rösten finns på den här sidan, där trycket görs.
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import './sida.css';

import { skapaRost } from '../grans/rost.js';
import { esc } from '../grans/ui.js';
import { FORMER, GRUPPER } from './former.js';
import { skapaSpelare } from './upplasning.js';

const q = new URLSearchParams(location.search);
const snabb = q.has('snabb');
const VERSION = __VERSION__;
const RAM = { b: 1280, h: 768 };

const rost = skapaRost({ tyst: () => snabb });
const spelare = skapaSpelare({ rost });

const nr = (/** @type {import('./former.js').Form} */ f) => [f.prolog ? `Prologen ${f.prolog}` : '', f.kap1 ? `Kapitel 1: ${f.kap1}` : ''].filter(Boolean).join(' · ');
const taggar = (/** @type {import('./former.js').Form} */ f) => [
  f.ny === 'ja' ? '<span class="tagg ny">Ny i kapitel 1</span>' : f.ny === 'delvis' ? '<span class="tagg ny">Delvis ny</span>' : '',
  f.skiss ? '<span class="tagg skiss" title="Finns inte i spelet än. Ritad med spelets stil där det går.">Skiss</span>' : '',
  f.exempel ? '<span class="tagg exempel" title="Datan har inget fält för den här texten än">Exempeltext</span>' : '',
].join('');

document.title = 'ORDSTAVEN – textens former';
document.body.innerHTML = `
<header class="huvud">
  <h1>Textens former <small>ORDSTAVEN ${esc(VERSION)} · provsida</small></h1>
  <p>Alla textformer i prologen och kapitel 1, så som gråboxen visar dem i dag, i spelets eget textlager och typsnitt.
  Texterna hämtas ur innehållet. <b>Skiss</b> betyder att formen inte finns i spelet än. Tryck <b>▶</b> på en form för att höra
  och se framskrivningen, eller <b>Förstora</b> för att se den i hela fönstret.</p>
  <details class="grundregel" open><summary>Grundregeln (beslut 13.3)</summary><ul>
    <li>En form, en plats, en ram, ett ljud.</li>
    <li>Den som pratar syns som ett ansikte, aldrig som ett namn.</li>
    <li>Berättaren har en egen ram utan figur.</li>
    <li>En uppgift visas med en bild av handlingen.</li>
    <li>Lappar och skyltar är saker i världen och läses aldrig upp.</li>
    <li>Ingen text skrivs fram bokstav för bokstav.</li></ul></details>
</header>
<form class="reglage" aria-label="Inställningar">
  <fieldset><legend>Framskrivning</legend>
    <label><input type="radio" name="lage" value="ord" checked> Ord för ord</label>
    <label><input type="radio" name="lage" value="allt"> Allt på en gång</label></fieldset>
  <label><input type="checkbox" name="markera" checked> Markera ordet som läses</label>
  <label><input type="checkbox" name="rost" checked> Röst</label>
  <fieldset><legend>Visa</legend>
    <label><input type="radio" name="filter" value="alla" checked> Alla</label>
    <label><input type="radio" name="filter" value="prolog"> Prologen</label>
    <label><input type="radio" name="filter" value="kap1"> Kapitel 1</label>
    <label><input type="radio" name="filter" value="ny"> Bara nya</label></fieldset>
  <span class="takt" aria-live="polite"></span>
</form>
<main>${GRUPPER.map((g) => `
  <section class="grupp" data-grupp="${g.id}"><h2>${esc(g.rubrik)}</h2><p class="grupptext">${esc(g.text)}</p>
  <div class="kortlista">${FORMER.filter((f) => f.grupp === g.id).map((f) => `
    <article class="form" data-form="${f.id}" data-prolog="${f.prolog ? 1 : 0}" data-kap1="${f.kap1 ? 1 : 0}" data-ny="${f.ny ? 1 : 0}">
      <div class="ramyta"><iframe title="${esc(f.namn)}" src="./textprov.html?form=${f.id}&inbaddad${snabb ? '&snabb' : ''}" width="${RAM.b}" height="${RAM.h}" tabindex="-1"></iframe></div>
      <div class="om">
        <h3>${esc(f.namn)}</h3>
        <div class="nr">${esc(nr(f))} ${taggar(f)}</div>
        <dl><dt>Plats</dt><dd>${esc(f.plats)}</dd><dt>Läses upp</dt><dd>${esc(f.upplast)}</dd></dl>
        ${f.not ? `<p class="not">${esc(f.not)}</p>` : ''}
        <div class="knappar"><button type="button" class="spela" hidden>▶ Spela</button><a class="forstora" href="./textprov.html?form=${f.id}${snabb ? '&snabb' : ''}">Förstora</a><span class="status"></span></div>
      </div>
    </article>`).join('')}</div></section>`).join('')}
  <section class="grupp"><h2>Alla former</h2>
    <table class="tabell"><thead><tr><th>Form</th><th>Prologen</th><th>Kapitel 1</th><th>Plats i dag</th><th>Läses upp</th><th>Ny</th></tr></thead><tbody>
    ${FORMER.map((f) => `<tr><td>${esc(f.namn)}</td><td>${f.prolog ?? ''}</td><td>${f.kap1 ?? ''}</td><td>${esc(f.plats)}</td><td>${esc(f.upplast)}</td><td>${f.ny === 'ja' ? 'ja' : f.ny === 'delvis' ? 'delvis' : ''}</td></tr>`).join('')}
    </tbody></table>
    <p class="not">Numren är radnumren i teknikens lista över prologens former (rapport 2026-10-28 13:50) och i tabellen "Textformer i kapitel 1" i 15 v0.8.</p>
  </section>
</main>`;

const reglage = /** @type {HTMLFormElement} */ (document.querySelector('.reglage'));
const inst = () => {
  const d = new FormData(reglage);
  return { lage: /** @type {'ord' | 'allt'} */ (d.get('lage')), markera: d.has('markera'), rost: d.has('rost') };
};
reglage.addEventListener('change', () => {
  const f = String(new FormData(reglage).get('filter'));
  for (const a of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.form'))) {
    a.hidden = !(f === 'alla' || (f === 'prolog' && a.dataset.prolog === '1') || (f === 'kap1' && a.dataset.kap1 === '1') || (f === 'ny' && a.dataset.ny === '1'));
  }
});

// ramarna skalas ner till kortets bredd (samma bild som i ett rum på 1280 × 768, MacBooken i helskärm)
const skala = new ResizeObserver((lista) => {
  for (const e of lista) /** @type {HTMLElement} */ (e.target).style.setProperty('--k', String(e.contentRect.width / RAM.b));
});
document.querySelectorAll('.ramyta').forEach((el) => skala.observe(el));

/** @type {Map<string, any>} */
const ramar = new Map();
/** @param {string} id @returns {any} */
const ram = (id) => /** @type {HTMLIFrameElement | null} */ (document.querySelector(`[data-form="${id}"] iframe`))?.contentWindow?.__ram;

function stoppaAlla() {
  spelare.stopp();
  for (const id of ramar.keys()) { try { ram(id)?.stopp(false); } catch (e) { /* ramen laddas om */ } }
  document.querySelectorAll('.form.spelar').forEach((a) => a.classList.remove('spelar'));
}

/** En ram är klar: visa ▶ om formen har något att spela, eller felet om en källa saknas. @param {string} id */
function klar(id) {
  const r = ram(id);
  const kort = /** @type {HTMLElement} */ (document.querySelector(`[data-form="${id}"]`));
  if (!r || !kort) return;
  ramar.set(id, r);
  const status = /** @type {HTMLElement} */ (kort.querySelector('.status'));
  if (r.fel) { kort.classList.add('fel'); status.textContent = r.fel; return; }
  const knapp = /** @type {HTMLButtonElement} */ (kort.querySelector('.spela'));
  knapp.hidden = !r.harUppspelning;
  knapp.onclick = async () => {
    stoppaAlla();
    kort.classList.add('spelar'); status.textContent = '';
    const res = await r.spela(spelare, inst());
    kort.classList.remove('spelar');
    if (res && res.hur !== 'avbruten') status.textContent = res.takt === 'signal' ? 'Takt: röstens ordsignal' : 'Takt: uppskattad';
  };
}

/** @type {any} */ (window).__textprov = {
  spelare, inst, klar,
  /** för testerna */
  status: () => ({ antal: FORMER.length, klara: ramar.size, fel: [...ramar.entries()].filter(([, r]) => r.fel).map(([id, r]) => `${id}: ${r.fel}`) }),
};
// ramar som hann bli klara innan krokarna fanns
document.querySelectorAll('.form').forEach((a) => { const id = /** @type {HTMLElement} */ (a).dataset.form || ''; if (ram(id)) klar(id); });
