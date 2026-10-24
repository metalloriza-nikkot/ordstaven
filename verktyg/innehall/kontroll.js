// Innehållskontrollen. Körs i bygget (npm run kontroll) och i testerna.
// Fel stoppar publiceringen. Varningar skrivs ut men stoppar inget.
// Reglerna kommer från pusselkatalogen (dokument 08) och ledningens krav (12-uppdrag).
import Ajv from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { rader, versaler, ord, PLATSHALLARE } from '../../src/karna/text.js';

const schema = (namn) => JSON.parse(readFileSync(new URL(`../../content/schema/${namn}.schema.json`, import.meta.url), 'utf8'));
const BREDDER = JSON.parse(readFileSync(new URL('../andika-bredder.json', import.meta.url), 'utf8')).tecken;

/** Läsplattans radbredd i em (16 em = 768 punkter vid 48 punkters text). Stilspåret kan justera. */
export const RADBREDD_EM = 16;
export const MAX_RADER_REPLIK = 2;
export const MAX_ORD_PER_RAD = 8;
export const MAX_MINUTER_PER_PASS = 10;

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

/**
 * @param {{ aventyr: any, kapitel: any[], ordlistor: any }} innehall
 * @returns {{ fel: string[], varningar: string[], pass: { kapitel: string, pass: number, minuter: number, lasuppgifter: number }[] }}
 */
export function kontrollera({ aventyr, kapitel, ordlistor }) {
  const fel = [], varningar = [], passInfo = [];
  const v = validerare();

  // 1. Schemat
  const schemafel = (namn, data, var_) => {
    if (!v.validate(namn, data)) for (const e of v.errors) fel.push(`${var_}: ${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`);
  };
  schemafel('aventyr', aventyr, 'aventyr.json');
  schemafel('ordlistor', ordlistor, 'ordlistor.json');
  for (const k of kapitel) schemafel('kapitel', k, `${k.id || '?'}.json`);
  if (fel.length) return { fel, varningar, pass: passInfo };

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

    // Kontroll av en text som visas
    const textKontroll = (text, plats, { lasesSjalv = false, replik = false } = {}) => {
      for (const r of rader(text)) {
        for (const m of r.matchAll(PLATSHALLARE)) if (!platshallare.has(m[1])) fel.push(var_(`${plats}: okänd platshållare ${m[0]}`));
        if (/\{[A-ZÅÄÖ]+\}/.test(r)) fel.push(var_(`${plats}: platshållare skrivs med små bokstäver, t.ex. {unge}`));
        const vo = versalord(r, formler);
        if (vo.length) fel.push(var_(`${plats}: skriv i vanlig skrift, inte versaler (${vo.slice(0, 3).join(', ')}): "${r}"`));
        // Meningar börjar med stor bokstav. Enstaka ord (etiketter, bildtexter) skrivs med små.
        const arMening = ord(r).length > 1 || /[.!?…]\s*$/.test(r);
        const forsta = r.replace(PLATSHALLARE, 'X').trim()[0];
        if (arMening && forsta && forsta !== versaler(forsta) && !/^[.…"']/.test(forsta)) varningar.push(var_(`${plats}: meningen börjar med liten bokstav: "${r}"`));
        if (lasesSjalv) for (const o of ord(r)) { const s = arSparrat(o); if (s) fel.push(var_(`${plats}: ${o} är spärrat i text spelaren läser själv (${s}: mjukt G/K, NG, SJ m.fl.)`)); }
        const antalOrd = ord(r).length;
        if (lasesSjalv && antalOrd > MAX_ORD_PER_RAD) varningar.push(var_(`${plats}: ${antalOrd} ord på en rad, högst ${MAX_ORD_PER_RAD} i de tidiga kapitlen`));
      }
      if (replik) {
        const n = rader(text).reduce((s, r) => s + antalRader(r), 0);
        if (n > MAX_RADER_REPLIK) varningar.push(var_(`${plats}: repliken blir ${n} rader på läsplattan, högst ${MAX_RADER_REPLIK}: "${rader(text).join(' ')}"`));
      }
    };
    const replikKontroll = (r, plats) => {
      if (!r) return;
      if (!talare.has(r.talare)) fel.push(var_(`${plats}: okänd talare ${r.talare}`));
      textKontroll(r.text, plats, { lasesSjalv: !r.upplast, replik: true });
    };
    const handlingKontroll = (h, plats) => { if (h && h.replik) replikKontroll(h.replik, plats); };

    // Scener
    let forraPass = 0;
    const perPass = new Map();
    for (const s of k.scener) {
      const plats = `scen ${s.id}`;
      if (s.pass < forraPass) fel.push(var_(`${plats}: pass ${s.pass} kommer efter pass ${forraPass}`));
      forraPass = s.pass;
      if (!perPass.has(s.pass)) perPass.set(s.pass, { sek: 0, lasuppgifter: 0, sistaSparpunkt: false });
      const pp = perPass.get(s.pass);
      if (s.rum !== null && !rum.has(s.rum)) fel.push(var_(`${plats}: rummet ${s.rum} finns inte`));
      if (s.tillstand && !tillstand.has(s.tillstand)) fel.push(var_(`${plats}: tillståndet ${s.tillstand} finns inte i något rum och skapas inte av någon formel`));
      if (s.vid_omstart) replikKontroll(s.vid_omstart, `${plats} vid_omstart`);
      pp.sistaSparpunkt = false;
      s.steg.forEach((st, i) => {
        const sp = `${plats} steg ${i + 1} (${st.typ})`;
        switch (st.typ) {
          case 'replik': replikKontroll(st, sp); pp.sek += 1.5 + ord(rader(st.text).join(' ')).length * 0.45; break;
          case 'mellanscen': pp.sek += 4; break;
          case 'ljud': pp.sek += 1; break;
          case 'ga_till': {
            pp.sek += 12;
            if (s.rum === null) fel.push(var_(`${sp}: scenen har inget rum att gå i`));
            else if (rum.has(s.rum) && !rum.get(s.rum).innehall.includes(st.mal)) fel.push(var_(`${sp}: ${st.mal} finns inte i rummet ${s.rum}`));
            if (st.knuff) replikKontroll(st.knuff.replik, `${sp} knuff`);
            break;
          }
          case 'pussel':
          case 'oppna_lasplatta': {
            const p = pussel.get(st.pussel_id);
            if (!p) { fel.push(var_(`${sp}: pusslet ${st.pussel_id} finns inte`)); break; }
            if (st.typ === 'pussel') {
              anvanda.add(p.id);
              pp.sek += p.typ === 'P26_krukorna' ? 30 : p.typ === 'P12_dop' ? 45 : 40;
              if (p.typ === 'P1_las_och_valj') pp.lasuppgifter++;
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
          case 'skapa_hjalte': pp.sek += 40; break;
          case 'sparpunkt': pp.sistaSparpunkt = !!st.pass_slut; break;
          case 'fritt': pp.sek += 20; break;
          default: pp.sek += 2;
        }
      });
    }
    for (const [nr, pp] of perPass) {
      const minuter = Math.round((pp.sek / 60) * 10) / 10;
      passInfo.push({ kapitel: k.id, pass: nr, minuter, lasuppgifter: pp.lasuppgifter });
      if (!pp.sistaSparpunkt) varningar.push(var_(`pass ${nr} slutar inte med en sparpunkt (pass_slut)`));
      if (minuter > MAX_MINUTER_PER_PASS) varningar.push(var_(`pass ${nr}: uppskattat ${minuter} min, högst ${MAX_MINUTER_PER_PASS}`));
      if (pp.lasuppgifter < 2) varningar.push(var_(`pass ${nr}: ${pp.lasuppgifter} läsuppgift(er) som avgör något, minst 2 (ledningens krav)`));
    }

    // Pussel
    for (const p of k.pussel) {
      const plats = `pussel ${p.id}`;
      if (!anvanda.has(p.id)) varningar.push(var_(`${plats} används inte i någon scen`));
      replikKontroll(p.instruktion, `${plats} instruktion`);
      if (p.knuff) replikKontroll(p.knuff.replik, `${plats} knuff`);
      for (const f of ['vid_ratt', 'vid_fel', 'efter_3_fel']) handlingKontroll(p[f], `${plats} ${f}`);

      if (p.typ === 'P1_las_och_valj') {
        for (const [niva, vari] of Object.entries(p.varianter)) {
          const vp = `${plats} ${niva}`;
          if (vari.text) textKontroll(vari.text, `${vp} text`, { lasesSjalv: true });
          if (!vari.text && !vari.bild) fel.push(var_(`${vp}: behöver en text eller en bild som ställer frågan`));
          const ratt = vari.alternativ.filter((a) => a.ratt);
          if (ratt.length !== 1) fel.push(var_(`${vp}: exakt ett alternativ ska ha "ratt": true (har ${ratt.length})`));
          const ids = vari.alternativ.map((a) => a.id);
          if (new Set(ids).size !== ids.length) fel.push(var_(`${vp}: två alternativ har samma id`));
          const orden = vari.alternativ.filter((a) => a.ord).map((a) => versaler(a.ord));
          for (const a of vari.alternativ) {
            if (a.ord) {
              textKontroll(a.ord, `${vp} alternativ ${a.id}`, { lasesSjalv: true });
              if (!ordmap.has(versaler(a.ord))) varningar.push(var_(`${vp}: ordet ${a.ord} finns inte i ordlistorna`));
            }
            handlingKontroll(a.vid_valj, `${vp} alternativ ${a.id}`);
          }
          for (const [a, b] of forbjudna) if (orden.includes(a) && orden.includes(b)) fel.push(var_(`${vp}: ${a} och ${b} får inte stå på samma skärm`));
          const lagNiva = ['L1', 'L2', 'L3'].includes(niva);
          if (lagNiva && ratt.length === 1 && ratt[0].ord) {
            for (const o of orden) if (baraAaSkillnad(versaler(ratt[0].ord), o)) fel.push(var_(`${vp}: ${ratt[0].ord} och ${o} skiljer sig bara på Å/Ä`));
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
        for (const f of p.formler) for (const o of f.ord.split(' ')) if (!ordmap.has(o)) varningar.push(var_(`${plats}: formeln ${o} finns inte i ordlistorna`));
      }
      if (p.typ === 'P12_dop' && p.min_bokstaver && p.max_bokstaver && p.min_bokstaver > p.max_bokstaver) fel.push(var_(`${plats}: min_bokstaver är större än max_bokstaver`));
    }
  }
  return { fel, varningar, pass: passInfo };
}
