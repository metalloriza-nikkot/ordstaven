// @ts-check
// Uppläsning med framskrivning på provsidan. En spelare läser ett segment (en text i textlagret, med orden
// i egna spans från ui.rader) och visar det ord för ord eller allt på en gång, med eller utan markering av
// ordet som läses. Takten kommer från röstens ordsignal (onboundary) när webbläsaren ger den, annars uppskattas den.
// Segmentet kan ligga i ett annat dokument (provsidans ramar): rösten finns där trycket gjordes.
import { ordStarter, ordVid, ordTider, uppskattadTid } from '../karna/framskrivning.js';

/**
 * @typedef {{ el: HTMLElement, text: string, roll?: string }} Segment
 * el: elementet med orden (.ord), text: det som sägs (vanlig skrift, platshållare ersatta)
 * @typedef {{ lage?: 'ord' | 'allt', markera?: boolean, rost?: boolean }} Installning
 * @typedef {{ takt: 'signal' | 'uppskattad', hur: string }} Resultat
 */

/**
 * Skiljetecknen mellan orden ("!", "." …) står utanför ordens spans. De läggs i egna spans och hör till ordet
 * före (eller det första), så att de kommer fram med sitt ord. Görs en gång per element.
 * @param {HTMLElement} el @param {HTMLElement[]} ord @returns {[HTMLElement, number][]}
 */
function skiljetecken(el, ord) {
  const doc = el.ownerDocument;
  if (!el.querySelector('.tecken')) {
    const gang = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    /** @type {Text[]} */
    const noder = [];
    for (let n = gang.nextNode(); n; n = gang.nextNode()) if (/\S/.test(n.nodeValue || '') && !n.parentElement?.closest('.ord, [aria-hidden="true"]')) noder.push(/** @type {Text} */ (n));
    for (const n of noder) { const s = doc.createElement('span'); s.className = 'tecken'; n.replaceWith(s); s.appendChild(n); }
  }
  /** @type {[HTMLElement, number][]} */
  const ut = [];
  let senaste = 0;
  const alla = /** @type {HTMLElement[]} */ ([...el.querySelectorAll('.ord, .tecken')]);
  for (const e of alla) { if (e.classList.contains('ord')) senaste = Math.max(0, ord.indexOf(e)); else ut.push([e, senaste]); }
  return ut;
}

/** @param {{ rost: { saga(t: string, r?: string, vidOrd?: (i: number) => void): Promise<string>, tyst(): void } }} opt */
export function skapaSpelare({ rost }) {
  let token = 0;
  /** @type {number[]} */
  let klockor = [];
  /** @type {(() => void) | null} */
  let avsluta = null;
  /** släpper en väntan utan röst när den avbryts */
  let slapp = () => {};
  const rensa = () => { klockor.forEach((k) => clearTimeout(k)); klockor = []; };

  /** Avbryt det som läses, och visa hela texten. */
  function stopp() { token++; rensa(); rost.tyst(); slapp(); avsluta?.(); avsluta = null; }

  /**
   * Läs ett segment. Löser sig när det är uppläst eller avbrutet (stopp, eller ett nytt segment).
   * @param {Segment} seg @param {Installning} [inst] @returns {Promise<Resultat>}
   */
  async function las(seg, { lage = 'ord', markera = true, rost: medRost = true } = {}) {
    stopp();
    const min = ++token;
    const ord = /** @type {HTMLElement[]} */ ([...seg.el.querySelectorAll('.ord')]);
    const tecken = skiljetecken(seg.el, ord);
    const starter = ordStarter(seg.text);
    // orden på skärmen och i det som sägs är desamma; skulle antalet skilja sig fördelas de jämnt
    const skala = starter.length ? ord.length / starter.length : 1;
    let signal = false;
    const visaAllt = () => { ord.forEach((o) => o.classList.remove('dold')); tecken.forEach(([t]) => t.classList.remove('dold')); };
    const slut = () => { visaAllt(); ord.forEach((o) => o.classList.remove('lases')); seg.el.classList.remove('lases-upp'); seg.el.removeEventListener('click', visaAllt); };
    avsluta = slut;
    /** ord nummer i (i det som sägs) börjar */
    const satt = (/** @type {number} */ i) => {
      if (min !== token) return;
      const k = Math.min(ord.length - 1, Math.floor(i * skala));
      if (lage === 'ord') {
        for (let j = 0; j <= k; j++) ord[j].classList.remove('dold');
        for (const [t, j] of tecken) if (j <= k) t.classList.remove('dold');
      }
      if (markera) ord.forEach((o, j) => o.classList.toggle('lases', j === k));
    };
    seg.el.classList.add('lases-upp');
    if (lage === 'ord') { ord.forEach((o) => o.classList.add('dold')); tecken.forEach(([t]) => t.classList.add('dold')); }
    // ett tryck på texten visar allt direkt (som i spelen); rösten läser vidare
    seg.el.addEventListener('click', visaAllt);
    const vidOrd = (/** @type {number} */ tecken) => { signal = true; rensa(); satt(Math.max(0, ordVid(starter, tecken))); };
    // uppskattad takt tills röstens ordsignal kommer (eller om den aldrig kommer)
    ordTider(seg.text).forEach((t, i) => klockor.push(window.setTimeout(() => { if (!signal) satt(i); }, t)));
    let hur;
    if (medRost) hur = await rost.saga(seg.text, seg.roll || 'berattare', vidOrd);
    else {
      await new Promise((r) => { const k = window.setTimeout(r, uppskattadTid(seg.text)); slapp = () => { clearTimeout(k); r(undefined); }; });
      slapp = () => {};
      hur = min === token ? 'klar' : 'avbruten';
    }
    if (min === token) { rensa(); slut(); avsluta = null; } else hur = 'avbruten';
    return { takt: signal ? 'signal' : 'uppskattad', hur: String(hur) };
  }

  return { las, stopp };
}
