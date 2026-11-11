// Innehållskontrollen. Körs i bygget (npm run kontroll) och i testerna.
// Fel stoppar publiceringen. Varningar skrivs ut men stoppar inget.
// Reglerna kommer från pusselkatalogen (dokument 08) och ledningens krav (12-uppdrag).
import Ajv from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { rader, versaler, ord, PLATSHALLARE } from '../../src/karna/text.js';
import { kompileraUppdrag, hittaSteg } from '../../src/karna/uppdrag.js';
import { SLINGOR } from '../../src/karna/musik.js';
import { kandaLjud, ljudLista } from '../../src/karna/ljudid.js';
import { beskrivningarSomVisas, aventyretsBeskrivningar, reaktionerSomVisas } from '../../src/karna/mellanscen.js';

const schema = (namn) => JSON.parse(readFileSync(new URL(`../../content/schema/${namn}.schema.json`, import.meta.url), 'utf8'));
// teckenbredderna för typsnittet i textlagret (Lexend, beslut 13)
const BREDDER = JSON.parse(readFileSync(new URL('../lexend-bredder.json', import.meta.url), 'utf8')).tecken;
/** Ljuden innehållet får använda (64.6): Stils effekter och de inspelade lätena. */
export const KANDA_LJUD = kandaLjud(Object.keys(JSON.parse(readFileSync(new URL('../../assets/ljud/effekter/ljud.json', import.meta.url), 'utf8'))));

/** Läsplattans radbredd i em (16 em = 768 punkter vid 48 punkters text). Stilspåret kan justera. */
export const RADBREDD_EM = 16;
export const MAX_RADER_REPLIK = 2;
export const MAX_ORD_PER_RAD = 8;
export const MAX_MINUTER_PER_PASS = 10;
/**
 * Pusseltyper som räknas som läs- eller skrivuppgifter som avgör något. P9 (kodlåset) är avkodning med nyckel, inte
 * läsförståelse. P11 (formeln) avgör också: han skriver ordet som löser det (beslut 68.3).
 */
export const LASUPPGIFTER = new Set(['P1_las_och_valj', 'P28_packa', 'P15_raddning', 'P11_formel']);

let ajv;
function validerare() {
  if (!ajv) {
    ajv = new Ajv({ allErrors: true, discriminator: true, strict: true });
    for (const n of ['kapitel', 'aventyr', 'ordlistor']) ajv.addSchema(schema(n), n);
  }
  return ajv;
}

/** Bredd på en rad i em, i versaler (det spelet visar först). */
export function bredd(rad) {
  let b = 0;
  for (const ch of versaler(rad)) b += BREDDER[ch] ?? 0.6;
  return b;
}

/** Hur många rader en textrad blir på läsplattan, med radbrytning mellan ord. */
export function antalRader(rad, radbredd = RADBREDD_EM) {
  const mellanslag = BREDDER[' '] ?? 0.25;
  let rader = 1, nu = 0;
  for (const o of rad.split(/\s+/).filter(Boolean)) {
    const b = bredd(o);
    if (nu === 0) nu = b;
    else if (nu + mellanslag + b <= radbredd) nu += mellanslag + b;
    else { rader++; nu = b; }
  }
  return rader;
}

/** Skiljer sig två ord bara på Å/Ä? */
function baraAaSkillnad(a, b) {
  a = versaler(a); b = versaler(b);
  if (a.length !== b.length || a === b) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!['ÅÄ', 'ÄÅ'].includes(a[i] + b[i])) return false;
  }
  return true;
}

/** Text med versalord (två eller fler versaler i rad) som inte är formler. */
function versalord(rad, formler) {
  return ord(rad).filter((o) => o.length >= 2 && o === versaler(o) && !formler.has(o));
}

/** Ord som bara gäller en enhet (dator eller pekskärm). "Tryck på …" är okej, det gäller båda. */
const ENHETSORD = /\b(piltangent\w*|tangentbord\w*|mellanslag\w*|musen|mus|musknapp\w*|klick\w*|klicka\w*|swipe\w*|svep\w*)\b/i;

/** Objektets id i rummets innehåll (ett id eller { id, syns_i }). */
const objId = (x) => (typeof x === 'string' ? x : x.id);

/**
 * Kontrollera Tiled-kartorna mot rummen: varje föremål ska stå i kartan, kartan får inte ha föremål
 * som inte finns, allt ska rymmas i rummet och utgångar får bara leda till rum som finns.
 * @param {any} k kapitlet @param {Record<string, { objekt: any[], start: any }>} kartor @param {string[]} fel @param {string[]} varningar
 */
function kontrolleraKartor(k, kartor, fel, varningar) {
  const allaRum = new Set(k.rum.map((r) => r.id));
  for (const r of k.rum) {
    const karta = kartor[r.id];
    if (!karta) { varningar.push(`${k.id} rum ${r.id}: ingen Tiled-karta, föremålen placeras automatiskt`); continue; }
    const ids = r.innehall.map(objId);
    const iKartan = new Set(karta.objekt.map((o) => o.id));
    for (const id of ids) if (!iKartan.has(id)) fel.push(`${k.id} rum ${r.id}: ${id} saknas i kartan`);
    for (const fran of Object.keys(karta.in || {})) if (!allaRum.has(fran)) fel.push(`kartan ${r.id}: in_${fran} gäller ett rum som inte finns i ${k.id}`);
    for (const o of karta.objekt) {
      // dekor (52.2) står bara i kartan: inget samspel och ingen text, så den behöver inte stå i innehållet
      if (o.dekor && ids.includes(o.id)) varningar.push(`kartan ${r.id}: ${o.id} är dekor men står i rummets innehåll`);
      if (!ids.includes(o.id) && !o.dekor) fel.push(`kartan ${r.id}: ${o.id} finns inte i rummets innehåll`);
      const S = karta.storlek || { bredd: 320, hojd: 192 };
      if (o.x < 0 || o.y < 0 || o.x + o.b > S.bredd || o.y + o.h > S.hojd) fel.push(`kartan ${r.id}: ${o.id} går utanför rummet`);
      if (o.forsvinnerEfter && !k.pussel.some((p) => p.id === o.forsvinnerEfter && (p.typ === 'P11_formel' || p.typ === 'P26_krukorna'))) fel.push(`kartan ${r.id}: ${o.id} försvinner efter ${o.forsvinnerEfter}, som inte är en formel eller ett P26 i ${k.id}`);
      if (o.till && !allaRum.has(o.till)) fel.push(`kartan ${r.id}: ${o.id} leder till ${o.till}, som inte finns i ${k.id}`);
      if (o.visar && !k.pussel.some((p) => p.id === o.visar)) fel.push(`kartan ${r.id}: ${o.id} visar ${o.visar}, som inte finns i ${k.id}`);
      if (o.lapp && !ids.includes(o.lapp)) fel.push(`kartan ${r.id}: ${o.id} har lappen på ${o.lapp}, som inte finns i rummet`);
      if (o.till && !o.riktning) fel.push(`kartan ${r.id}: ${o.id} leder till ${o.till} men saknar riktning`);
      if (o.klattra && o.sort !== 'utgang') fel.push(`kartan ${r.id}: ${o.id} klättras men är ingen utgång`);
    }
  }
}

/**
 * @param {{ aventyr: any, kapitel: any[], ordlistor: any, kartor?: Record<string, any> }} innehall
 * @returns {{ fel: string[], varningar: string[], pass: { kapitel: string, pass: number, minuter: number, lasuppgifter: number }[], beskrivningar: { kapitel: string, klart: boolean, platser: { plats: string, beskrivning: string }[], reaktioner: { plats: string, text: string, sort: string }[] }[] }}
 */
export function kontrollera({ aventyr, kapitel, ordlistor, kartor }) {
  const fel = [], varningar = [], passInfo = [], beskrivningar = [];
  const v = validerare();

  // 1. Schemat
  const schemafel = (namn, data, var_) => {
    if (!v.validate(namn, data)) for (const e of v.errors) fel.push(`${var_}: ${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`);
  };
  schemafel('aventyr', aventyr, 'aventyr.json');
  schemafel('ordlistor', ordlistor, 'ordlistor.json');
  for (const k of kapitel) schemafel('kapitel', k, `${k.id || '?'}.json`);
  // en scen där hjälten sover (2.14) behöver en säng i rummets karta (ett föremål med sovplats)
  for (const k of kapitel) for (const s of k.scener || []) {
    if (s.hjalte === 'sover' && kartor?.[s.rum] && !(kartor[s.rum].objekt || []).some((/** @type {any} */ o) => o.sovplats)) fel.push(`${k.id} scen ${s.id}: hjälten sover, men kartan för ${s.rum} har ingen säng (sovplats)`);
  }
  if (fel.length) return { fel, varningar, pass: passInfo, beskrivningar };

  // Ordlistorna
  const ordmap = new Map();
  for (const o of ordlistor.ord) {
    const n = versaler(o.ord);
    if (ordmap.has(n)) fel.push(`ordlistor: ${o.ord} finns två gånger`);
    ordmap.set(n, o);
    const arVersal = o.ord === versaler(o.ord) && o.ord.length > 1;
    if (o.flaggor.includes('formel') && !arVersal) fel.push(`ordlistor: formeln ${o.ord} ska skrivas i versaler`);
    if (!o.flaggor.includes('formel') && arVersal) fel.push(`ordlistor: ${o.ord} ska stå i vanlig skrift (${o.ord.toLocaleLowerCase('sv-SE')})`);
  }
  const sparrad = new Set([...ordmap].filter(([, o]) => o.flaggor.includes('sparrad')).map(([n]) => n));
  const forbjudna = ordlistor.forbjudna_par.map((p) => p.map(versaler));
  // Svåra ljud sitter i stammen, så böjda former fångas också (berget, köket, kistan).
  const arSparrat = (o) => { const n = versaler(o); for (const s of sparrad) if (n === s || (s.length >= 3 && n.startsWith(s))) return s.toLocaleLowerCase('sv-SE'); return null; };

  const talare = new Set(Object.keys(aventyr.talare));
  const platshallare = new Set(Object.keys(aventyr.platshallare).map((p) => p.slice(1, -1)));
  const kapitelIds = new Set(kapitel.map((k) => k.id));
  for (const k of aventyr.kapitel) if (!kapitelIds.has(k)) varningar.push(`aventyr.json: kapitel ${k} saknas än`);

  for (const k of kapitel) {
    const var_ = (s) => `${k.id} ${s}`;
    const rum = new Map(k.rum.map((r) => [r.id, r]));
    const pussel = new Map(k.pussel.map((p) => [p.id, p]));
    // en knuff i ett läsval som verkar peka på svaret ska ha pekar: true, annars kommer den för tidigt
    const PEKORD = /\b(rätt|mot)\b/i;
    for (const p of k.pussel) {
      if (!['P1_las_och_valj', 'P28_packa'].includes(p.typ) || !p.knuff || p.knuff.pekar) continue;
      const m = (p.knuff.handling || '').match(PEKORD);
      if (m) varningar.push(`${k.id} ${p.id}: knuffen "${p.knuff.handling}" verkar peka på svaret (${m[0]}). Lägg till "pekar": true, så kommer den inte före läsningen.`);
    }
    const anvanda = new Set();

    // Formler i kapitlet (får stå i versaler i text)
    const formler = new Set([...ordmap].filter(([, o]) => o.flaggor.includes('formel')).map(([n]) => n));
    for (const p of k.pussel) if (p.typ === 'P11_formel') for (const f of p.formler) for (const o of f.ord.split(' ')) formler.add(o);

    // Unika id:n
    const sett = new Map();
    for (const [sort, lista] of [['rum', k.rum], ['scen', k.scener], ['pussel', k.pussel]]) {
      for (const x of lista) {
        if (sett.has(x.id)) fel.push(var_(`id ${x.id} används både som ${sett.get(x.id)} och ${sort}`));
        sett.set(x.id, sort);
      }
    }

    // Tillstånd som kan uppstå: rummens egna + de som formler skapar
    const tillstand = new Set();
    for (const r of k.rum) for (const t of r.tillstand || []) tillstand.add(t);
    for (const p of k.pussel) if (p.typ === 'P11_formel') for (const f of p.formler) if (f.tillstand_efter) tillstand.add(f.tillstand_efter);

    // bybornas bubblor (2.34): figuren står i rummet, och nyckeln är ett av rummets tillstånd eller *
    for (const r of k.rum) for (const [fig, per] of Object.entries(r.bubblor || {})) {
      if (!r.innehall.map(objId).includes(fig)) fel.push(var_(`rum ${r.id}: bubblan hör till ${fig}, som inte står i rummet`));
      for (const t of Object.keys(/** @type {any} */ (per))) if (t !== '*' && !(r.tillstand || []).includes(t)) fel.push(var_(`rum ${r.id}: bubblan för ${fig} gäller ${t}, men rummet har inte det tillståndet`));
    }

    // Föremål i rummen: unika, och syns_i bara med tillstånd som rummet har
    for (const r of k.rum) {
      const ids = r.innehall.map(objId);
      if (new Set(ids).size !== ids.length) fel.push(var_(`rum ${r.id}: samma föremål står två gånger i innehall`));
      for (const x of r.innehall) if (typeof x !== 'string') for (const t of x.syns_i || []) {
        if (!(r.tillstand || []).includes(t)) fel.push(var_(`rum ${r.id}: ${x.id} syns_i ${t}, men rummet har inte det tillståndet`));
      }
    }
    if (kartor) kontrolleraKartor(k, kartor, fel, varningar);

    // Golv och tak: golvet får inte ligga över taket
    for (const [slag, par] of Object.entries(k.nivaer || {})) {
      const [g, t] = par.map((x) => Number(x.slice(1)));
      if (g > t) fel.push(var_(`nivaer.${slag}: golvet ${par[0]} ligger över taket ${par[1]}`));
    }
    // Alias: gamla id pekar på id:n som finns, och ett gammalt id får inte finnas kvar
    const scenIds = new Set(k.scener.map((x) => x.id)), pusselIds = new Set(k.pussel.map((x) => x.id));
    const rumIds = new Set((k.rum || []).map((x) => x.id));
    for (const [sort, ids] of [['scener', scenIds], ['pussel', pusselIds], ['rum', rumIds]]) {
      for (const [gammalt, nyttId] of Object.entries((k.alias || {})[sort] || {})) {
        if (ids.has(gammalt)) fel.push(var_(`alias.${sort}: ${gammalt} finns fortfarande, ett alias gäller bara id:n som har tagits bort`));
        if (!ids.has(nyttId) && !((k.alias || {})[sort] || {})[nyttId]) fel.push(var_(`alias.${sort}: ${gammalt} pekar på ${nyttId}, som inte finns`));
      }
    }

    /** Ord i lästexter som saknas i ordlistorna: ordet → platserna (en varning per ord, granskningen A 25). */
    const saknade = new Map();
    // Kontroll av en text som visas
    const textKontroll = (text, plats, { lasesSjalv = false, replik = false } = {}) => {
      for (const r of rader(text)) {
        // {ord:<pussel>} prövas för sig (nedan): det ska peka på ett P11 i kapitlet
        for (const m of r.matchAll(PLATSHALLARE)) if (!platshallare.has(m[1]) && !m[1].startsWith('ord:')) fel.push(var_(`${plats}: okänd platshållare ${m[0]}`));
        if (/\{[A-ZÅÄÖ]+\}/.test(r)) fel.push(var_(`${plats}: platshållare skrivs med små bokstäver, t.ex. {unge}`));
        const vo = versalord(r, formler);
        if (vo.length) fel.push(var_(`${plats}: skriv i vanlig skrift, inte versaler (${vo.slice(0, 3).join(', ')}): "${r}"`));
        // Meningar börjar med stor bokstav. Enstaka ord (etiketter, bildtexter) skrivs med små.
        const arMening = ord(r).length > 1 || /[.!?…]\s*$/.test(r);
        const forsta = r.replace(PLATSHALLARE, 'X').trim()[0];
        if (arMening && forsta && forsta !== versaler(forsta) && !/^[.…"']/.test(forsta)) varningar.push(var_(`${plats}: meningen börjar med liten bokstav: "${r}"`));
        if (lasesSjalv) for (const o of ord(r)) { const s = arSparrat(o); if (s) fel.push(var_(`${plats}: ${o} är spärrat i text spelaren läser själv (${s}: mjukt G/K, NG, SJ m.fl.)`)); }
        // granskningen A 25: varje ord i en lästext ska stå i ordlistorna, också böjda former (SKYLTAR)
        if (lasesSjalv) for (const o of ord(r)) { const n = versaler(o); if (!ordmap.has(n) && !formler.has(n)) { if (!saknade.has(n)) saknade.set(n, []); saknade.get(n).push(plats); } }
        const antalOrd = ord(r).length;
        if (lasesSjalv && antalOrd > MAX_ORD_PER_RAD) varningar.push(var_(`${plats}: ${antalOrd} ord på en rad, högst ${MAX_ORD_PER_RAD} i de tidiga kapitlen`));
      }
      if (replik) {
        // {ord:<pussel>} räknas som det längsta ordet han kan ha skrivit (2.31)
        const langsta = (/** @type {string} */ id) => (pussel.get(id)?.formler || []).map((f) => f.ord).sort((a, b) => b.length - a.length)[0] || 'ORDET';
        const n = rader(text.replace(/\{ord:([a-z0-9_]+)\}/g, (h, id) => langsta(id))).reduce((s, r) => s + antalRader(r), 0);
        if (n > MAX_RADER_REPLIK) varningar.push(var_(`${plats}: repliken blir ${n} rader på läsplattan, högst ${MAX_RADER_REPLIK}: "${rader(text).join(' ')}"`));
      }
    };
    // Ljudord (beslut 21.5) följer reglerna för text han läser: vanlig skrift, inga spärrade ljud, och helst
    // ingen dubbelteckning (Innehålls val: det är just det som är svårt). De står var som helst i kapitlet.
    const ljudordKontroll = (x, plats) => {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) { x.forEach((y, i) => ljudordKontroll(y, `${plats}[${i}]`)); return; }
      for (const [nyckel, v] of Object.entries(x)) {
        if (nyckel !== 'ljudord') { ljudordKontroll(v, plats); continue; }
        const lo = String(v);
        if (versalord(lo, new Set()).length) fel.push(var_(`${plats}: ljudordet ${lo} ska stå i vanlig skrift`));
        for (const o of ord(lo)) { const sp = arSparrat(o); if (sp) fel.push(var_(`${plats}: ljudordet ${lo} har ett spärrat ljud (${sp})`)); }
        if (/(.)\1|ck/i.test(lo.replace(/\s+/g, ' ').split(' ').join('|'))) varningar.push(var_(`${plats}: ljudordet ${lo} har dubbelteckning`));
      }
    };
    ljudordKontroll(k.scener, 'scener');
    // Musiken och ljuden (27, beslut 64.5–64.6): en slinga som finns (eller null), och ljud som finns
    // en slinga eller ett ljud som inte finns än är en varning: det hörs inget (eller syntesen) tills Stil har gjort det
    const slingaKontroll = (x, plats) => { if (x !== undefined && x !== null && !SLINGOR.includes(x)) varningar.push(var_(`${plats}: slingan ${x} finns inte (finns: ${SLINGOR.join(', ')})`)); };
    slingaKontroll(k.musik, 'musik');
    for (const r of k.rum || []) slingaKontroll(r.musik, `rum ${r.id} musik`);
    const ljudKontroll = (x, plats) => {
      if (Array.isArray(x)) { x.forEach((y, i) => ljudKontroll(y, `${plats}[${i}]`)); return; }
      if (!x || typeof x !== 'object') return;
      if (x.typ === 'musik') slingaKontroll(x.slinga, `${plats} musik`);
      if (x.typ === 'ljud' && typeof x.id === 'string' && !KANDA_LJUD.has(x.id)) varningar.push(var_(`${plats}: ljudet ${x.id} finns inte (syntesen spelar tills Stil har gjort det)`));
      for (const [nyckel, v] of Object.entries(x)) {
        if (nyckel === 'ljud') { for (const id of ljudLista(v)) if (!KANDA_LJUD.has(id)) varningar.push(var_(`${plats}: ljudet ${id} finns inte (syntesen spelar tills Stil har gjort det)`)); continue; }
        ljudKontroll(v, `${plats}.${nyckel}`);
      }
    };
    for (const sc of k.scener || []) { slingaKontroll(sc.musik, `${sc.id} musik`); ljudKontroll(sc.steg, sc.id); if (sc.lockar) ljudKontroll(sc.lockar, `${sc.id} lockar`); }
    ljudKontroll(k.pussel, 'pussel');
    ljudKontroll(k.rum, 'rum');
    ljudordKontroll(k.pussel, 'pussel');
    const replikKontroll = (r, plats) => {
      if (!r) return;
      if (!talare.has(r.talare)) fel.push(var_(`${plats}: okänd talare ${r.talare}`));
      // instruktioner gäller alla enheter: "gå till lådan", aldrig "använd piltangenterna" eller "klicka"
      const enhet = rader(r.text).join(' ').match(ENHETSORD);
      if (enhet) varningar.push(var_(`${plats}: nämner en enhet (${enhet[0]}), skriv så att det gäller både dator och iPad: "${rader(r.text).join(' ')}"`));
      textKontroll(r.text, plats, { lasesSjalv: !r.upplast, replik: true });
    };
    const handlingKontroll = (h, plats) => { if (h && h.replik) replikKontroll(h.replik, plats); };
    // {ord:<pussel>} (2.31): ordet han skrev i ett P11 med tangentbordet
    const ordIText = (x, plats) => {
      if (Array.isArray(x)) { x.forEach((y, i) => ordIText(y, `${plats}[${i}]`)); return; }
      if (typeof x === 'string') { for (const m of x.matchAll(/\{ord:([a-z0-9_]+)\}/g)) { const p = pussel.get(m[1]); if (!p || p.typ !== 'P11_formel') fel.push(var_(`${plats}: {ord:${m[1]}} pekar inte på ett P11 i kapitlet`)); } return; }
      if (x && typeof x === 'object') for (const [n, v] of Object.entries(x)) ordIText(v, `${plats}.${n}`);
    };
    ordIText(k.scener, 'scener'); ordIText(k.uppdrag, 'uppdrag');

    // Scener
    let forraPass = 0;
    const perPass = new Map();
    /** Kontrollera ett steg i en scen (eller i ett rums frivilliga föremål) och räkna tiden. */
    const kollaSteg = (st, sp, s, pp) => {
      switch (st.typ) {
        case 'replik':
        replikKontroll(st, sp); pp.sek += 1.5 + ord(rader(st.text).join(' ')).length * 0.45;
        if (st.paminnelse) { replikKontroll(st.paminnelse.replik, `${sp} paminnelse`); if (!st.vantar_pa) fel.push(var_(`${sp}: paminnelse gäller bara en replik med vantar_pa`)); }
        break;
        case 'mellanscen':
          pp.sek += 4;
          // ungen springer till något i rummet (67.2)
          if (st.unge_till && (!s.rum || !rum.get(s.rum)?.innehall.map(objId).includes(st.unge_till))) fel.push(var_(`${sp}: ungen springer till ${st.unge_till}, men det finns inte i rummet ${s.rum}`));
          break;
        case 'musik': break; // tar ingen tid
        case 'ljud':
          pp.sek += 1;
          if (st.foremal && (!s.rum || !rum.get(s.rum)?.innehall.map(objId).includes(st.foremal))) fel.push(var_(`${sp}: ${st.foremal} finns inte i rummet ${s.rum}`));
          break;
        case 'ga_till': {
          pp.sek += 12;
          if (s.rum === null) fel.push(var_(`${sp}: scenen har inget rum att gå i`));
          // ungen är ett mål som alltid finns (2.31: dra upp ungen ur leran)
          else if (st.mal !== 'unge' && rum.has(s.rum) && !rum.get(s.rum).innehall.map(objId).includes(st.mal)) fel.push(var_(`${sp}: ${st.mal} finns inte i rummet ${s.rum}`));
          if (st.knuff) replikKontroll(st.knuff.replik, `${sp} knuff`);
          if (st.vid_annan_utgang?.replik) replikKontroll(st.vid_annan_utgang.replik, `${sp} vid_annan_utgang`);
          break;
        }
        case 'bara':
        case 'prata':
        case 'ta_emot': {
          pp.sek += st.typ === 'prata' ? 6 : 8;
          const mal = st.typ === 'bara' ? st.till : st.typ === 'prata' ? st.figur : st.fran;
          if (s.rum === null) fel.push(var_(`${sp}: scenen har inget rum`));
          // bära får gå till ett annat rum i kapitlet (2.31: halvan från bryggan till brevramen i byn)
          else if (st.typ === 'bara' && !rum.get(s.rum)?.innehall.map(objId).includes(mal)) { if (![...rum.values()].some((r) => r.innehall.map(objId).includes(mal))) fel.push(var_(`${sp}: ${mal} finns inte i något rum i kapitlet`)); }
          else if (rum.has(s.rum) && !rum.get(s.rum).innehall.map(objId).includes(mal)) fel.push(var_(`${sp}: ${mal} finns inte i rummet ${s.rum}`));
          if (st.kalla) {
            replikKontroll(st.kalla, `${sp} kalla`);
            const n = ord(rader(st.kalla.text).join(' ')).length;
            if (n > 4) varningar.push(var_(`${sp}: att kalla är högst fyra ord ("${rader(st.kalla.text).join(' ')}" har ${n})`));
          }
          break;
        }
        case 'oppna_lasplatta':
          // en skylt i rummet visas igen (2.31), med ett ord som lyser
          if (!st.skylt && !st.pussel_id) { fel.push(var_(`${sp}: oppna_lasplatta behöver pussel_id eller skylt`)); break; }
          if (st.skylt) {
            const sk = s.rum && rum.get(s.rum)?.skyltar?.[st.skylt];
            if (!sk) fel.push(var_(`${sp}: ${st.skylt} har ingen skylt i rummet ${s.rum}`));
            else if (st.lys_ord && !ord(rader(sk.text).join(' ')).some((o) => versaler(o) === versaler(st.lys_ord))) fel.push(var_(`${sp}: ordet ${st.lys_ord} står inte i skylten ${st.skylt}`));
            pp.sek += 4;
            break;
          }
        // falls through
        case 'pussel': {
          const p = pussel.get(st.pussel_id);
          if (!p) { fel.push(var_(`${sp}: pusslet ${st.pussel_id} finns inte`)); break; }
          if (st.typ === 'pussel') {
            anvanda.add(p.id);
            // rummets tillstånd när pusslet är löst (2.33): ett tillstånd som rummet har
            if (p.tillstand_efter && !(rum.get(s.rum)?.tillstand || []).includes(p.tillstand_efter)) fel.push(var_(`${sp}: ${p.id} tillstand_efter ${p.tillstand_efter}, men rummet ${s.rum} har inte det tillståndet`));
            if (p.i_rummet) {
              const r = rum.get(s.rum);
              const ids = r ? r.innehall.map(objId) : [];
              for (const vari of Object.values(p.varianter)) for (const a of vari.alternativ) {
                if (!a.objekt) fel.push(var_(`${sp}: ${p.id} har i_rummet, men alternativet ${a.id} saknar objekt`));
                else if (!ids.includes(a.objekt)) fel.push(var_(`${sp}: ${p.id} alternativet ${a.id} ligger i ${a.objekt}, som inte finns i rummet ${s.rum}`));
                if (!a.ord && !a.bild) fel.push(var_(`${sp}: ${p.id} har i_rummet, men alternativet ${a.id} saknar ord att läsa (eller en bild som visar egenskapen)`));
              }
            }
            const ids2 = s.rum && rum.get(s.rum) ? rum.get(s.rum).innehall.map(objId) : [];
            if (p.skylt && !ids2.includes(p.skylt)) fel.push(var_(`${sp}: ${p.id} står på skylten ${p.skylt}, som inte finns i rummet ${s.rum}`));
            for (const fid of p.foremal || []) if (!ids2.includes(fid)) fel.push(var_(`${sp}: ${p.id} svingar mot ${fid}, som inte finns i rummet ${s.rum}`));
            pp.sek += p.typ === 'P26_krukorna' ? 30 : p.typ === 'P12_dop' ? 45 : 40;
            if (LASUPPGIFTER.has(p.typ)) pp.lasuppgifter++;
          } else pp.sek += 10;
          break;
        }
        case 'bok':
          if (!talare.has(st.talare)) fel.push(var_(`${sp}: okänd talare ${st.talare}`));
          st.uppslag.forEach((u, j) => {
            textKontroll(u.text, `${sp} uppslag ${j + 1}`);
            if (u.bildtext) textKontroll(u.bildtext, `${sp} uppslag ${j + 1} bildtext`, { lasesSjalv: true });
            pp.sek += 6 + ord(rader(u.text).join(' ')).length * 0.45;
          });
          break;
        case 'las_skylt': {
        pp.sek += 12;
        const sk = s.rum && rum.get(s.rum)?.skyltar?.[st.foremal];
        if (!sk) fel.push(var_(`${sp}: ${st.foremal} har ingen skylt i rummet ${s.rum} (rum.skyltar)`));
        else if (ord(rader(sk.text).join(' ')).length < 2) varningar.push(var_(`${sp}: ${st.foremal} har ett ord, och ett ord syns hela tiden. las_skylt behövs bara för en mening.`));
        break;
      }
      case 'visa_foremal': {
        pp.sek += 1;
        const x = s.rum ? rum.get(s.rum)?.innehall.find((y) => objId(y) === st.foremal) : null;
        if (!x) fel.push(var_(`${sp}: ${st.foremal} finns inte i rummet ${s.rum}`));
        else if (typeof x === 'string' || !x.dold) varningar.push(var_(`${sp}: ${st.foremal} syns redan (lägg till "dold": true i rummets innehall)`));
        break;
      }
      case 'ge_sak': pp.sek += 3; break;
      case 'unge_tillagg': pp.sek += 2; break;
      case 'dinobok': pp.sek += 6; textKontroll(st.sida.bildtext, `${sp} bildtext`, { lasesSjalv: true }); break;
      case 'skapa_hjalte': pp.sek += 40; break;
        case 'sparpunkt': pp.sistaSparpunkt = !!st.pass_slut; break;
        case 'fritt': pp.sek += 20; break;
        case 'nav': {
          // navet (2.31): grenarnas scener och mål finns, och stegen mellan grenarna kontrolleras som andra steg
          for (const g of st.grenar) {
            if (!k.scener.some((x) => x.id === g.scen)) fel.push(var_(`${sp}: grenens scen ${g.scen} finns inte`));
            if (s.rum && !rum.get(s.rum)?.innehall.map(objId).includes(g.mal)) fel.push(var_(`${sp}: grenens mål ${g.mal} finns inte i rummet ${s.rum}`));
          }
          if (st.knuff?.replik) replikKontroll(st.knuff.replik, `${sp} knuff`);
          (st.mellan_grenar || []).forEach((x, i) => kollaSteg(x, `${sp} mellan_grenar ${i + 1} (${x.typ})`, s, pp));
          break;
        }
        default: pp.sek += 2;
      }
    };

    // navets grenar (2.31) spelas inne i navet: de bryter inte passet, och navets sparpunkt (mellan_grenar) slutar det
    const grenScener = new Set(k.scener.flatMap((x) => x.steg.filter((st) => st.typ === 'nav').flatMap((st) => st.grenar.map((g) => g.scen))));
    for (const s of k.scener) {
      const plats = `scen ${s.id}`;
      if (s.pass < forraPass) fel.push(var_(`${plats}: pass ${s.pass} kommer efter pass ${forraPass}`));
      forraPass = s.pass;
      if (!perPass.has(s.pass)) perPass.set(s.pass, { sek: 0, lasuppgifter: 0, sistaSparpunkt: false });
      // en frivillig scen (sidogrenen) räknas inte in i passets tid: passet går att spela utan den
      const pp = s.frivillig ? { sek: 0, lasuppgifter: 0, sistaSparpunkt: false } : perPass.get(s.pass);
      if (s.frivillig && (!s.startar_i_rum || !rum.has(s.startar_i_rum))) fel.push(var_(`${plats}: en frivillig scen behöver startar_i_rum med ett rum som finns`));
      if (!s.frivillig && s.startar_i_rum) fel.push(var_(`${plats}: startar_i_rum gäller bara en frivillig scen`));
      if (s.rum !== null && !rum.has(s.rum)) fel.push(var_(`${plats}: rummet ${s.rum} finns inte`));
      if (s.tillstand && !tillstand.has(s.tillstand)) fel.push(var_(`${plats}: tillståndet ${s.tillstand} finns inte i något rum och skapas inte av någon formel`));
      if (s.vid_omstart) replikKontroll(s.vid_omstart, `${plats} vid_omstart`);
      // det som lockar till en frivillig scen (2.31) står vid en utgång i något av kapitlets rum
      if (s.lockar && !s.frivillig) fel.push(var_(`${plats}: lockar gäller bara en frivillig scen`));
      if (s.lockar && ![...rum.values()].some((r) => r.innehall.map(objId).includes(s.lockar.vid))) fel.push(var_(`${plats}: lockar vid ${s.lockar.vid}, som inte finns i något rum`));
      if (!s.frivillig && !grenScener.has(s.id)) pp.sistaSparpunkt = false;
      s.steg.forEach((st, i) => kollaSteg(st, `${plats} steg ${i + 1} (${st.typ})`, s, pp));
    }
    for (const r of k.rum) {
      const ids = r.innehall.map(objId);
      for (const [id, sk] of Object.entries(r.skyltar || {})) {
        if (!ids.includes(id)) fel.push(var_(`rum ${r.id}: skylten ${id} finns inte i rummets innehall`));
        textKontroll(sk.text, `rum ${r.id} skylt ${id}`, { lasesSjalv: true });
      }
      const frivilliga = new Set();
      (r.frivilligt || []).forEach((fv, j) => {
        if (!ids.includes(fv.foremal)) fel.push(var_(`rum ${r.id} frivilligt ${j + 1}: ${fv.foremal} finns inte i rummets innehall`));
        if (frivilliga.has(fv.foremal)) fel.push(var_(`rum ${r.id}: ${fv.foremal} står två gånger i frivilligt`));
        frivilliga.add(fv.foremal);
        const pp = { sek: 0, lasuppgifter: 0, sistaSparpunkt: false };
        fv.steg.forEach((st, i) => {
          if (['sparpunkt', 'ga_till', 'las_skylt', 'prata'].includes(st.typ)) fel.push(var_(`rum ${r.id} frivilligt ${fv.foremal} steg ${i + 1}: ${st.typ} hör inte hemma i ett frivilligt föremål`));
          kollaSteg(st, `rum ${r.id} frivilligt ${fv.foremal} steg ${i + 1} (${st.typ})`, { rum: r.id }, pp);
        });
      });
      // zonerna (2.40, lerpölen i vassen, 72.8): ett föremål i rummet, och bara det som händer utan att han gör något
      const zoner = new Set();
      (r.zoner || []).forEach((z, j) => {
        if (!ids.includes(z.id)) fel.push(var_(`rum ${r.id} zon ${j + 1}: ${z.id} finns inte i rummets innehall`));
        if (zoner.has(z.id)) fel.push(var_(`rum ${r.id}: zonen ${z.id} står två gånger`));
        zoner.add(z.id);
        const pp = { sek: 0, lasuppgifter: 0, sistaSparpunkt: false };
        z.steg.forEach((st, i) => {
          if (!['mellanscen', 'ljud', 'replik'].includes(st.typ)) fel.push(var_(`rum ${r.id} zon ${z.id} steg ${i + 1}: ${st.typ} hör inte hemma i en zon (bara mellanscen, ljud och replik)`));
          kollaSteg(st, `rum ${r.id} zon ${z.id} steg ${i + 1} (${st.typ})`, { rum: r.id }, pp);
        });
      });
    }
    // Farfars "Var var vi?" (2.27, F2): en post per pass som finns, och allt läses upp utom ordet
    const vvvPass = new Set();
    (k.var_var_vi || []).forEach((v, j) => {
      const vp = `var_var_vi ${j + 1} (pass ${v.pass})`;
      if (!k.scener.some((s) => !s.frivillig && s.pass === v.pass)) fel.push(var_(`${vp}: kapitlet har inget pass ${v.pass}`));
      if (vvvPass.has(v.pass)) fel.push(var_(`${vp}: pass ${v.pass} har två poster`));
      vvvPass.add(v.pass);
      textKontroll(v.ord.ord, `${vp} ord`, { lasesSjalv: true });
      if (rader(v.ord.ord).join(' ').trim().split(/\s+/).length > 1) fel.push(var_(`${vp}: ordet att läsa är ett enda ord`));
      // repliker med villkor (2.31) räknas som en: högst tre hörs
      const hors = v.lang.filter((r) => !r.villkor).length + (v.lang.some((r) => r.villkor) ? 1 : 0);
      if (hors > 3) fel.push(var_(`${vp}: lang har ${hors} repliker som hörs, högst tre`));
      for (const r of v.lang) if (r.villkor?.gren_kvar && !k.scener.some((x) => x.id === r.villkor.gren_kvar)) fel.push(var_(`${vp}: villkoret gren_kvar pekar på ${r.villkor.gren_kvar}, som inte finns`));
      for (const [del, lista] of [['kort', v.kort], ['lang', v.lang]]) {
        lista.forEach((r, i) => {
          if (r.upplast === false) fel.push(var_(`${vp} ${del} ${i + 1}: läses alltid upp (upplast: false går inte här)`));
          replikKontroll({ upplast: true, ...r }, `${vp} ${del} ${i + 1}`);
        });
      }
    });
    for (const [nr, pp] of perPass) {
      const minuter = Math.round((pp.sek / 60) * 10) / 10;
      passInfo.push({ kapitel: k.id, pass: nr, minuter, lasuppgifter: pp.lasuppgifter });
      if (!pp.sistaSparpunkt) varningar.push(var_(`pass ${nr} slutar inte med en sparpunkt (pass_slut)`));
      if (minuter > MAX_MINUTER_PER_PASS) varningar.push(var_(`pass ${nr}: uppskattat ${minuter} min, högst ${MAX_MINUTER_PER_PASS}`));
      if (pp.lasuppgifter < 2) varningar.push(var_(`pass ${nr}: ${pp.lasuppgifter} läs- eller skrivuppgift(er) som avgör något, minst 2 (ledningens krav)`));
    }

    // Pussel
    for (const p of k.pussel) {
      const plats = `pussel ${p.id}`;
      if (!anvanda.has(p.id)) varningar.push(var_(`${plats} används inte i någon scen`));
      replikKontroll(p.instruktion, `${plats} instruktion`);
      if (p.knuff) replikKontroll(p.knuff.replik, `${plats} knuff`);
      for (const f of ['vid_ratt', 'vid_fel', 'efter_3_fel']) handlingKontroll(p[f], `${plats} ${f}`);

      if (p.typ === 'P1_las_och_valj' || p.typ === 'P28_packa') {
        const flera = p.typ === 'P28_packa';
        for (const [niva, vari] of Object.entries(p.varianter)) {
          const vp = `${plats} ${niva}`;
          if (vari.text) textKontroll(vari.text, `${vp} text`, { lasesSjalv: true });
          if (!vari.text && !vari.bild) fel.push(var_(`${vp}: behöver en text eller en bild som ställer frågan`));
          const ratt = vari.alternativ.filter((a) => a.ratt);
          if (!flera && ratt.length !== 1) fel.push(var_(`${vp}: exakt ett alternativ ska ha "ratt": true (har ${ratt.length})`));
          if (flera && (ratt.length < 1 || ratt.length === vari.alternativ.length)) fel.push(var_(`${vp}: minst ett alternativ ska vara rätt och minst ett fel`));
          const ids = vari.alternativ.map((a) => a.id);
          if (new Set(ids).size !== ids.length) fel.push(var_(`${vp}: två alternativ har samma id`));
          const orden = vari.alternativ.filter((a) => a.ord).map((a) => versaler(a.ord));
          for (const a of vari.alternativ) {
            if (a.ord) {
              textKontroll(a.ord, `${vp} alternativ ${a.id}`, { lasesSjalv: true });
            }
            handlingKontroll(a.vid_valj, `${vp} alternativ ${a.id}`);
          }
          for (const [a, b] of forbjudna) if (orden.includes(a) && orden.includes(b)) fel.push(var_(`${vp}: ${a} och ${b} får inte stå på samma skärm`));
          const lagNiva = ['L1', 'L2', 'L3'].includes(niva);
          if (lagNiva) for (const r of ratt) if (r.ord) {
            for (const o of orden) if (baraAaSkillnad(versaler(r.ord), o)) fel.push(var_(`${vp}: ${r.ord} och ${o} skiljer sig bara på Å/Ä`));
          }
        }
      }
      if (p.typ === 'P11_formel') {
        if (!p.formler.some((f) => f.ord === p.svar)) fel.push(var_(`${plats}: svaret ${p.svar} finns inte bland formlerna`));
        if (p.brickor) {
          const kvar = [...p.brickor];
          for (const ch of p.svar.replace(/ /g, '')) { const i = kvar.indexOf(ch); if (i < 0) fel.push(var_(`${plats}: brickorna saknar ${ch} till ${p.svar}`)); else kvar.splice(i, 1); }
          if (p.niva === 'S1' && kvar.length) fel.push(var_(`${plats}: S1 har bara rätt bokstäver, extra: ${kvar.join('')}`));
          if (p.niva === 'S2' && (kvar.length < 2 || kvar.length > 3)) varningar.push(var_(`${plats}: S2 har 2–3 extra brickor, har ${kvar.length}`));
        }
        if (p.forebild && p.forebild.text !== p.svar) fel.push(var_(`${plats}: förebilden ${p.forebild.text} är inte svaret ${p.svar}`));
        // hjälpens trappa (2.36 och 2.39, beslut 69.3, 72.2 och 72.6): med tangentbordet och med brickor. En förebild
        // som syns från början (LJUS i prologen, där han skriver av) är inget fel.
        if (p.skriv === 'tangentbord' && p.forebild && p.forebild.visas !== 'andra_felet') varningar.push(var_(`${plats}: förebilden tänds före två fel (69.3: forebild.visas andra_felet)`));
        if (p.skriv !== 'tangentbord' && p.forebild?.visas === 'vid_fel') varningar.push(var_(`${plats}: förebilden tänds efter ett fel (72.2: forebild.visas andra_felet)`));
        // ledbilden gäller från kapitel 2 (08, beslut 73.2): prologen och kapitel 1 har ingen
        const franKapitel2 = (aventyr?.kapitel || []).map((x) => (typeof x === 'string' ? x : x.id)).indexOf(k.id) >= 2;
        if (franKapitel2 && p.forebild?.visas === 'andra_felet' && !p.ledbild) varningar.push(var_(`${plats}: ingen ledbild efter första felet (72.6)`));
        if (p.ledbild && p.forebild?.visas !== 'andra_felet') varningar.push(var_(`${plats}: ledbilden tänds bara med forebild.visas andra_felet`));
        for (const f of p.formler) for (const o of f.ord.split(' ')) if (!ordmap.has(o)) varningar.push(var_(`${plats}: formeln ${o} finns inte i ordlistorna`));
      }
      if (p.typ === 'P15_raddning') {
        textKontroll(p.kategori, `${plats} kategori`, { lasesSjalv: true });
        if (p.brickor) {
          for (const ch of new Set(versaler(p.svar))) if (!p.brickor.includes(ch)) fel.push(var_(`${plats}: brickorna saknar ${ch} till ${versaler(p.svar)}`));
          if (new Set(p.brickor).size !== p.brickor.length) fel.push(var_(`${plats}: en bokstav står två gånger bland brickorna (en rätt bokstav fyller alla sina fält)`));
        }
        if (p.kasta) { replikKontroll(p.kasta.erbjudande, `${plats} kasta erbjudande`); handlingKontroll(p.kasta.vid_ratt, `${plats} kasta vid_ratt`); }
        handlingKontroll(p.mjukt_misslyckande, `${plats} mjukt_misslyckande`);
        for (const o of [p.svar, ...(p.reserv_ord || [])]) {
          if (!ordmap.has(versaler(o))) varningar.push(var_(`${plats}: ${o} finns inte i ordlistorna`));
          else if (ordmap.get(versaler(o)).flaggor.includes('sparrad')) fel.push(var_(`${plats}: ${o} är spärrat och kan inte gissas fram`));
        }
      }
      if (p.typ === 'P9_kodlas') {
        const svar = versaler(p.svar);
        if (p.chiffer) {
          const nyckel = new Map(p.chiffer.nyckel.map((n) => [n.tecken, n.bokstav]));
          const avkodat = p.chiffer.tecken.map((t) => nyckel.get(t) ?? '?').join('');
          if (avkodat !== svar) fel.push(var_(`${plats}: tecknen ger ${avkodat} med nyckeln, svaret är ${svar}`));
          const bokstaver = p.chiffer.nyckel.map((n) => n.bokstav);
          if (new Set(bokstaver).size !== bokstaver.length) fel.push(var_(`${plats}: två tecken i nyckeln har samma bokstav`));
        }
        if (p.brickor) {
          const kvar = [...p.brickor];
          for (const ch of svar) { const i = kvar.indexOf(ch); if (i < 0) fel.push(var_(`${plats}: brickorna saknar ${ch} till ${svar}`)); else kvar.splice(i, 1); }
          if (p.niva === 'S2' && (kvar.length < 2 || kvar.length > 3)) varningar.push(var_(`${plats}: S2 har 2–3 extra brickor, har ${kvar.length}`));
        }
      }
      if (p.typ === 'P26_krukorna') {
        if (p.sak_i_sista && !p.innehall.includes(p.sak_i_sista)) fel.push(var_(`${plats}: sak_i_sista ${p.sak_i_sista} finns inte i innehall`));
        if (p.foremal && p.foremal.length !== p.innehall.length) fel.push(var_(`${plats}: ${p.foremal.length} föremål men ${p.innehall.length} poster i innehall`));
      }
      if (p.typ === 'P12_dop' && p.min_bokstaver && p.max_bokstaver && p.min_bokstaver > p.max_bokstaver) fel.push(var_(`${plats}: min_bokstaver är större än max_bokstaver`));
    }
    // Uppdragslappen (2.20): stegen och stämpeln finns i kapitlet, repliken som lappen ersätter finns, och lappens
    // text följer reglerna för lästext. Texten står i versaler som på lappen (Innehålls form), och {UNGE} är ungens namn.
    if (k.uppdrag) {
      const komp = kompileraUppdrag(k);
      for (const f of komp.fel) fel.push(var_(`uppdrag ${f}`));
      const idn = new Set();
      for (const u of k.uppdrag) {
        const plats = `uppdrag ${u.id}`;
        if (idn.has(u.id)) fel.push(var_(`${plats}: id:t finns två gånger`)); idn.add(u.id);
        for (const [i, st] of u.steg.entries()) {
          for (const e of st.ersatter || []) {
            const sc = (k.scener || []).find((x) => x.id === e.scen), pu = k.pussel.find((x) => x.id === e.scen);
            const finns = sc ? sc.steg.some((x) => x.typ === 'replik' && x.text === e.text) : pu ? pu.instruktion?.text === e.text : false;
            if (!finns) fel.push(var_(`${plats} steg ${i + 1}: repliken "${e.text}" i ${e.scen}, som lappen ersätter, finns inte`));
          }
          if (st.visas === 'med_paminnelse') {
            const pos = hittaSteg(k, st.klart.scen, st.klart);
            if (pos && !k.scener[pos[0]].steg[pos[1]].paminnelse) fel.push(var_(`${plats} steg ${i + 1}: visas med påminnelsen, men steget har ingen paminnelse`));
          }
        }
        for (const [i, text] of [u.rubrik, ...u.steg.map((x) => x.text)].entries()) {
          const ren = text.replace(/\{(UNGE|HJALTE)\}/gi, '');
          const delar = ord(ren);
          if (i > 0 && delar.length > 4) varningar.push(var_(`${plats}: "${text}" har ${delar.length} ord, högst fyra på lappen`));
          for (const o of delar) {
            const sp = arSparrat(o); if (sp) fel.push(var_(`${plats}: ${o} är spärrat i text spelaren läser själv (${sp})`));
            const n = versaler(o); if (!ordmap.has(n) && !formler.has(n)) { if (!saknade.has(n)) saknade.set(n, []); saknade.get(n).push(plats); }
          }
        }
      }
    }
    for (const [n, platser] of saknade) {
      const mer = platser.length === 2 ? ' och ett ställe till' : platser.length > 2 ? ` och ${platser.length - 1} ställen till` : '';
      varningar.push(var_(`ordet ${n.toLocaleLowerCase('sv-SE')} i en lästext finns inte i ordlistorna (${platser[0]}${mer})`));
    }
    // Mellanscenernas text för den vuxne (beslut 65): ett klart kapitel (meta.klart) visar ingen beskrivning.
    // Varje mellanscen har en bild (Stils animation) eller syns_redan. Kontrollen skriver ut hur många som är kvar.
    const kvar = beskrivningarSomVisas(k);
    const klart = k.meta?.klart === true;
    // Reaktionerna och knuffarna (beslut 67.3): samma regel. Varje text i rutan har syns_redan, eller en bild som visar det.
    const reaktioner = reaktionerSomVisas(k);
    beskrivningar.push({ kapitel: k.id, klart, platser: kvar, reaktioner });
    if (klart) for (const b of kvar) fel.push(var_(`${b.plats}: kapitlet är klart, men mellanscenen visar texten för den vuxne ("${b.beskrivning}"). Ge den en bild, eller syns_redan om det redan syns.`));
    if (klart) for (const r of reaktioner) fel.push(var_(`${r.plats}: kapitlet är klart, men ${r.sort === 'knuff' ? 'knuffen' : 'reaktionen'} visar texten för den vuxne ("${r.text}"). Ge den syns_redan om det redan syns.`));
  }
  // äventyrets egna mellanscener (SLUTA FÖR IDAG och slutrutan) hör till äventyret: klart när aventyr.json säger det
  const aKvar = aventyretsBeskrivningar(aventyr);
  const aKlart = aventyr.meta?.klart === true;
  beskrivningar.push({ kapitel: 'aventyr', klart: aKlart, platser: aKvar, reaktioner: [] });
  if (aKlart) for (const b of aKvar) fel.push(`aventyr.json ${b.plats}: äventyret är klart, men mellanscenen visar texten för den vuxne ("${b.beskrivning}"). Ge den syns_redan, eller stryk den.`);
  return { fel, varningar, pass: passInfo, beskrivningar };
}
