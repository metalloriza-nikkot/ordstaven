// @ts-check
// Kartkontrollen (beslut 54.5 och 56.7): går igenom varje kapitel i berättelsens ordning och prövar kartorna i det
// läge rummet har när han är där. Den körs i CI, så att ett kapitel inte kan få en karta där han fastnar.
//  a) varje mål (dit berättelsen säger att han ska gå, alternativen i ett läsval, skyltarna och det frivilliga) går
//     att nå från där han är;
//  b) inget står i vägen för målet: vägen slutar vid det, inte bredvid;
//  c) ingen stig han går på ligger över något han inte får gå över (vatten, en häck, en vägg);
//  d) varje läsval i rummet ryms på en skärm;
//  e) inget som ritas ovanför figurerna ligger där han kan gå: ridåns rutor står aldrig under fötterna, och det som
//     ligger ovanpå allt (ugglorna, det som lyser) skymmer aldrig en figur som står där han kan gå;
//  f) med fritt vägval (fri_vag) går varje annan utgång att nå utan att han går genom en tredje, efter allt som har
//     ändrat kartan (beslut 66.3: vägen till buskarna efter hugget), och sidogrenarna nås när de erbjuds;
//  g) inget osynligt hinder: ett snår i rutlagret (dekor med rutor) står inte i vägen där inga buskar är ritade.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { lasKarta } from '../../src/karna/karta.js';
import { rumsObjekt, framfor, framforFran, vidObjekt, genom, lasplats } from '../../src/karna/rumslayout.js';
import { rumsHinder } from '../../src/karna/rumshinder.js';
import { valjVariant, tolkaNiva } from '../../src/karna/lasmotor.js';
import { omradeFor } from '../../src/karna/kamera.js';
import { FOT } from '../../src/karna/vag.js';
import { FIGUR } from '../../src/karna/rorelse.js';

const las = (/** @type {string} */ f) => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'));
const AVENTYR = 'den-gomda-dalen';
const KAPITEL = ['kap-00', 'kap-01', 'kap-02'];
/** @type {Map<string, any>} */
const kartor = new Map();
const karta = (/** @type {string} */ rum) => {
  if (!kartor.has(rum)) {
    const f = `kartor/${AVENTYR}/${rum}.tmj`;
    kartor.set(rum, existsSync(new URL(`../../${f}`, import.meta.url)) ? lasKarta(las(f)) : null);
  }
  return kartor.get(rum);
};
const idFor = (/** @type {any} */ x) => (typeof x === 'string' ? x : x.id);
const overlapp = (/** @type {any} */ a, /** @type {any} */ b) => a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

/** Bildernas storlek i atlaserna (föremålen och figurerna), för det som ritas högre än sin ruta (trädkronorna). */
const bilder = new Map();
for (const mapp of ['assets/foremal', 'assets/sprites']) {
  for (const d of readdirSync(new URL(`../../${mapp}`, import.meta.url))) {
    const f = `${mapp}/${d}/${d}.json`;
    if (!existsSync(new URL(`../../${f}`, import.meta.url))) continue;
    for (const [n, r] of Object.entries(las(f).frames || {})) if (!bilder.has(n)) bilder.set(n, /** @type {any} */ (r).frame);
  }
}
/** Bilden ett föremål ritas med (nederkant mitt på föremålets nederkant), om den är högre än föremålet. @param {any} o */
const hogBild = (o) => {
  const f = o.bild && bilder.get(o.bild);
  return f && f.h > o.h + 6 ? { x: Math.round(o.x + o.b / 2 - f.w / 2), y: o.y + o.h - f.h, b: f.w, h: f.h, fot: o.y + o.h } : null;
};

/** Läsnivåerna kapitlet har varianter för (alla prövas, eftersom spelaren kan ha vilken som helst). @param {any} kap */
const nivaerI = (kap) => [...new Set(kap.pussel.flatMap((/** @type {any} */ p) => Object.keys(p.varianter || {})).map((/** @type {string} */ n) => tolkaNiva(n).tal))].sort();

/**
 * Rummets föremål just nu, som i spelet (spel.js innehallNu): av ett läsval i världen syns bara varianten för nivån,
 * och det som försvinner efter ett pussel eller en formel (lianerna efter SVÄRD) är borta när det är löst.
 */
function foremalNu(/** @type {any} */ kap, /** @type {any} */ rum, /** @type {any} */ k, /** @type {{ tillstand: any, visade: string[], losta: Set<string>, niva: number }} */ l) {
  const iRummet = new Set(rum.innehall.map(idFor));
  const borta = new Set();
  for (const p of kap.pussel) {
    if (!p.i_rummet || !p.varianter) continue;
    const alla = Object.values(p.varianter).flatMap((/** @type {any} */ v) => v.alternativ.map((/** @type {any} */ a) => a.objekt)).filter((/** @type {any} */ id) => id && iRummet.has(id));
    const [, v] = valjVariant(p.varianter, l.niva);
    const med = new Set(v.alternativ.map((/** @type {any} */ a) => a.objekt));
    for (const id of alla) if (!med.has(id)) borta.add(id);
  }
  for (const o of k.objekt) if (o.forsvinnerEfter && l.losta.has(o.forsvinnerEfter)) borta.add(o.id);
  return rumsObjekt(rum.innehall.filter((/** @type {any} */ x) => !borta.has(idFor(x))), l.tillstand, k, l.visade);
}

/** Målen i ett steg: dit han ska gå eller det han ska välja bland i rummet. */
function malI(/** @type {any} */ kap, /** @type {any} */ st, /** @type {any[]} */ obj, /** @type {number} */ niva) {
  const p = st.typ === 'pussel' ? kap.pussel.find((/** @type {any} */ x) => x.id === st.pussel_id) : null;
  if (p?.i_rummet && p.varianter) {
    const [, v] = valjVariant(p.varianter, niva);
    return [...v.alternativ.map((/** @type {any} */ a) => a.objekt).filter(Boolean), ...(p.skylt ? [p.skylt] : [])];
  }
  if (p?.typ === 'P26_krukorna') return p.foremal || obj.filter((o) => o.visar === p.id).map((o) => o.id);
  // navet (2.31): varje gren har sin utgång som mål
  if (st.typ === 'nav') return (st.grenar || []).map((/** @type {any} */ g) => g.mal);
  return [st.mal, st.till, st.fran, st.figur, ...(st.typ === 'las_skylt' || st.typ === 'fritt' ? [st.foremal].flat() : [])].filter((x) => typeof x === 'string');
}

/**
 * Gå från en punkt till ett föremål, också till en annan nivå (först till trappan eller stegen närmast målet).
 * @returns {{ slut: { x: number, y: number } | null, niva: number, fel: string | null }}
 */
function gaTill(/** @type {any} */ h, /** @type {any} */ k, /** @type {{ x: number, y: number }} */ fran, /** @type {number} */ niva, /** @type {any} */ o, /** @type {any[]} */ andra = []) {
  const mal = h.nivaer.nivaFor(o);
  let p = fran, n = niva;
  if (h.nivaer.finns && mal !== n) {
    const pass = h.nivaer.passage({ x: o.x + o.b / 2, y: o.y + o.h });
    if (!pass) return { slut: null, niva: n, fel: 'ingen trappa till nivån' };
    const v0 = /** @type {any} */ (h.per.get(n)).vag(p, pass);
    if (!v0.length) return { slut: null, niva: n, fel: 'trappan nås inte' };
    p = v0.at(-1); n = mal;
  }
  const hn = /** @type {any} */ (h.per.get(n) ?? h.per.get(0));
  // en utgång han går ut genom ska han stå i (genom), inte bara nära: annars står han kvar vid kanten
  const ar = (/** @type {any} */ q) => (o.sort === 'utgang' && !o.klattra ? genom(o, q) : vidObjekt(q, o));
  // som i rummet (Rum.standplats): den närmaste sidan han kan gå till
  const nar = (/** @type {any} */ q) => { const w = hn.vag(p, q); return w.length > 0 && ar(w.at(-1)); };
  for (const punkt of [framforFran(o, p, k.inomhus, k.vagg, k.massiv, nar), framfor(o)]) {
    const v = hn.vag(p, punkt);
    if (!v.length || !ar(v.at(-1))) continue;
    // vägen går inte genom en annan utgång: där skulle han gå ut (gången mot gläntan på väg till buskarna)
    const annan = genomAnnan(andra, p, v, o);
    if (annan) return { slut: null, niva: n, fel: `vägen går genom ${annan}` };
    return { slut: v.at(-1), niva: n, fel: null };
  }
  const v = hn.vag(p, framfor(o));
  return { slut: null, niva: n, fel: v.length ? `vägen slutar vid ${v.at(-1).x},${v.at(-1).y}` : 'ingen väg' };
}

/**
 * Utgången som en väg går in i på vägen till målet, efter att han har varit utanför den (som spelet räknar när han
 * går till ett mål: han står vid den eller i den), eller null. Utgångarna är de spelet tar emot just då: dit han har
 * varit och dit en frivillig scen leder (spel.js sidoUtgangar). @returns {string | null}
 */
function genomAnnan(/** @type {any[]} */ utgangar, /** @type {{ x: number, y: number }} */ fran, /** @type {{ x: number, y: number }[]} */ vag, /** @type {any} */ mal) {
  const andra = utgangar.filter((e) => e !== mal);
  const vid = (/** @type {any} */ e, /** @type {any} */ q) => vidObjekt(q, e) || genom(e, q);
  const ute = new Set(andra.filter((/** @type {any} */ e) => !vid(e, fran)));
  let a = fran;
  for (const b of vag) {
    const l = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(l / 2));
    for (let i = 1; i <= n; i++) {
      const q = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n };
      for (const e of andra) { if (!vid(e, q)) ute.add(e); else if (ute.has(e)) return e.id; }
    }
    a = b;
  }
  return null;
}

/** Rummets hinder som i spelet, och utgångarna (för vägar som går genom en annan utgång). */
const hinderI = (/** @type {any[]} */ obj, /** @type {any} */ k) => ({ ...rumsHinder(obj, { inomhus: k.inomhus, vagg: k.vagg, storlek: k.storlek, massiv: k.massiv, over: k.overHinder }) });

/** Punkterna fötterna kan nå på en nivå från en start (rutnät à 4 pixlar, som vägsökningen). */
function nabara(/** @type {any} */ hn, /** @type {{ bredd: number, hojd: number }} */ S, /** @type {{ x: number, y: number }[]} */ starter) {
  const steg = 4, x0 = FIGUR.bredd / 2, y0 = FIGUR.hojd;
  const kol = Math.floor((S.bredd - FIGUR.bredd / 2 - x0) / steg) + 1, rad = Math.floor((S.hojd - y0) / steg) + 1;
  const sett = new Set(), ko = [];
  for (const s of starter) {
    const c = Math.round((s.x - x0) / steg), r = Math.round((s.y - y0) / steg), i = r * kol + c;
    if (c >= 0 && r >= 0 && c < kol && r < rad && hn.fri({ x: x0 + c * steg, y: y0 + r * steg }) && !sett.has(i)) { sett.add(i); ko.push(i); }
  }
  while (ko.length) {
    const i = /** @type {number} */ (ko.pop()), c = i % kol, r = Math.floor(i / kol);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, ni = nr * kol + nc;
      if (nc < 0 || nr < 0 || nc >= kol || nr >= rad || sett.has(ni)) continue;
      if (!hn.fri({ x: x0 + nc * steg, y: y0 + nr * steg })) continue;
      sett.add(ni); ko.push(ni);
    }
  }
  return [...sett].map((i) => ({ x: x0 + (i % kol) * steg, y: y0 + Math.floor(i / kol) * steg }));
}

/**
 * Spela kapitlet i ordning och samla det som inte håller. Läget följer berättelsen: rummets tillstånd, det som har
 * visats och de pussel som är lösta.
 */
function kontrollera(/** @type {string} */ kapId) {
  const kap = las(`content/${AVENTYR}/${kapId}.json`);
  /** @type {string[]} */
  const fel = [];
  /** @type {Map<string, Set<string>>} rum → lägen som redan är prövade för (c) och (e) */
  const provade = new Map();
  /** @type {Map<string, string>} det frivilliga och utgångarna: nåtts någon gång (tom), annars varför inte */
  const nagonGang = new Map();
  for (const niva of nivaerI(kap).length ? nivaerI(kap) : [1]) {
    /** @type {Record<string, string[]>} */
    const visade = {};
    /** @type {Record<string, any>} */
    const tillstand = {};
    const losta = new Set();
    let forraRum = /** @type {string | null} */ (null);
    /** rum han har varit i, och rum som en frivillig scen spelas i: utgångar dit tar spelet emot under en väg */
    const kanda = new Set(kap.scener.filter((/** @type {any} */ x) => x.frivillig).map((/** @type {any} */ x) => x.startar_i_rum || x.rum));
    for (const scen of kap.scener) {
      if (scen.rum) kanda.add(scen.rum);
      const rum = scen.rum ? kap.rum.find((/** @type {any} */ r) => r.id === scen.rum) : null;
      const k = scen.rum ? karta(scen.rum) : null;
      if (!rum || !k) { for (const st of scen.steg) if (st.typ === 'pussel') losta.add(st.pussel_id); continue; }
      if (scen.tillstand) tillstand[rum.id] = scen.tillstand;
      const lage = () => ({ tillstand: tillstand[rum.id] ?? rum.tillstand?.[0] ?? null, visade: visade[rum.id] || [], losta, niva });
      let obj = foremalNu(kap, rum, k, lage());
      let h = hinderI(obj, k);
      // där han kommer in: genom utgången från förra rummet, kartans in-punkt, eller i sängen när han sover
      const dorr = forraRum ? obj.find((o) => o.till === forraRum) : null;
      const sang = scen.hjalte === 'sover' ? obj.find((o) => o.sovplats) : null;
      // genom en utgång kommer han in och tar ett steg in i rummet (spel.js visaScen: lasplats)
      const start = sang ? framfor(sang) : dorr ? (dorr.klattra ? framfor(dorr) : lasplats(dorr)) : (forraRum && k.in?.[forraRum]) || k.start || { x: k.storlek.bredd / 2, y: k.storlek.hojd - 12 };
      let pos = /** @type {any} */ (h.per.get(0)).narmasteFria(start);
      let nivaNu = h.nivaer.nivaVid(pos);
      const var_ = `${kapId} L${niva} ${scen.id}`;
      // c och e, en gång per rum och läge
      const nyckel = JSON.stringify([lage().tillstand, [...lage().visade].sort(), obj.map((o) => o.id).sort()]);
      if (!provade.get(rum.id)?.has(nyckel)) {
        provade.set(rum.id, (provade.get(rum.id) || new Set()).add(nyckel));
        fel.push(...stigarOchOvanpa(rum.id, k, obj, h, pos, `${var_}`));
      }
      // det frivilliga (bärbusken, ekorren) och utgångarna (stigen till buskarna) ska gå att nå någon gång när han är i
      // rummet: på östra skärmen först när hålet i häcken syns, i apans bo först när stegen står där
      const scenensMal = new Set(scen.steg.filter((/** @type {any} */ x) => x.typ === 'ga_till').map((/** @type {any} */ x) => x.mal));
      const frivilligaOchUtgangar = () => obj.filter((x) => x.till || (rum.frivilligt || []).some((/** @type {any} */ f) => f.foremal === x.id));
      const andraUtgangar = (/** @type {any} */ o, /** @type {string | undefined} */ mal) => obj.filter((x) => x.sort === 'utgang' && x.till && (kanda.has(x.till) || x.id === mal || scenensMal.has(x.id)) && x !== o);
      const provaNagonGang = (/** @type {string | undefined} */ mal = undefined) => {
        for (const o of frivilligaOchUtgangar()) {
          const id = `L${niva} ${rum.id}/${o.id}`;
          if (nagonGang.get(id) === '') continue;
          const g = gaTill(h, k, pos, nivaNu, o, andraUtgangar(o, mal));
          nagonGang.set(id, g.fel ? `${kapId} ${id}: ${o.till ? 'utgången' : 'det frivilliga'} nås aldrig (${g.fel})` : '');
        }
      };
      /** det frivilliga och utgångarna han når härifrån, med kartan som den är nu */
      const naas = () => new Set(frivilligaOchUtgangar().filter((o) => !gaTill(h, k, pos, nivaNu, o, andraUtgangar(o)).fel).map((o) => o.id));
      /** f) efter ett steg som ändrar kartan: det han nådde före steget når han också efter (beslut 66.3) */
      const efterAndring = (/** @type {any} */ st, /** @type {Set<string>} */ fore) => {
        for (const o of frivilligaOchUtgangar().filter((x) => fore.has(x.id))) {
          const g = gaTill(h, k, pos, nivaNu, o, andraUtgangar(o));
          if (g.fel) fel.push(`${var_}: ${o.till ? 'utgången' : 'det frivilliga'} ${o.id} gick att nå före ${st.typ === 'pussel' ? st.pussel_id : st.foremal} men inte efter, från ${Math.round(pos.x)},${Math.round(pos.y)} (${g.fel})`);
        }
      };
      provaNagonGang();
      let ute = false;
      for (const st of scen.steg) {
        if (ute) break;
        if (st.typ === 'ga_till' || st.typ === 'pussel') provaNagonGang(st.typ === 'ga_till' ? st.mal : undefined);
        // f) fritt vägval: de andra utgångarna (sidogrenen) nås, och vägen dit går inte genom en annan utgång.
        // Han kommer ut genom den utgång han går in i, så varje utgång räknas, också målet.
        if (st.typ === 'ga_till' && st.fri_vag) {
          for (const x of obj.filter((o) => o.sort === 'utgang' && o.till && o.id !== st.mal)) {
            const g = gaTill(h, k, pos, nivaNu, x, obj.filter((e) => e.sort === 'utgang' && e !== x && (e.till || e.id === st.mal)));
            if (g.fel) fel.push(`${var_}: med fritt vägval nås utgången ${x.id} (till ${x.till}) inte från ${Math.round(pos.x)},${Math.round(pos.y)} (${g.fel})`);
          }
        }
        for (const id of malI(kap, st, obj, niva)) {
          const o = obj.find((x) => x.id === id);
          if (!o) { if (k.objekt.some((/** @type {any} */ x) => x.id === id) || rum.innehall.map(idFor).includes(id)) fel.push(`${var_}: målet ${id} syns inte i rummet`); continue; }
          // under en väg (ga_till) går han ut genom en annan utgång han känner, i ett läsval bara genom den han väljer
          const andra = st.typ === 'ga_till' || st.typ === 'nav' ? obj.filter((x) => x.sort === 'utgang' && x.till && (kanda.has(x.till) || x.id === st.mal || malI(kap, st, obj, niva).includes(x.id)) && x !== o) : [];
          const g = gaTill(h, k, pos, nivaNu, o, andra);
          if (g.fel) { fel.push(`${var_}: ${id} nås inte från ${Math.round(pos.x)},${Math.round(pos.y)} (${g.fel})`); continue; }
          // han går till målet han ska till; i ett läsval står han kvar och väljer
          // en utgång tar honom ut ur rummet: där står han aldrig kvar
          if (o.till && !o.klattra) { ute = true; continue; }
          if (st.typ !== 'pussel' || malI(kap, st, obj, niva).length === 1) { pos = g.slut; nivaNu = g.niva; }
        }
        if (st.typ === 'pussel') losta.add(st.pussel_id);
        // rummets tillstånd när pusslet är löst (2.33): repen på torget faller
        const pt = st.typ === 'pussel' ? kap.pussel.find((/** @type {any} */ x) => x.id === st.pussel_id) : null;
        if (pt?.tillstand_efter) tillstand[rum.id] = pt.tillstand_efter;
        if (st.typ === 'visa_foremal') { (visade[rum.id] = visade[rum.id] || []).push(st.foremal); }
        if (st.typ === 'pussel' || st.typ === 'visa_foremal') {
          const fore = naas();
          obj = foremalNu(kap, rum, k, lage());
          h = hinderI(obj, k);
          pos = /** @type {any} */ (h.per.get(nivaNu) ?? h.per.get(0)).narmasteFria(pos);
          efterAndring(st, fore);
        }
      }
      if (!ute) provaNagonGang();
      if (!scen.frivillig) forraRum = rum.id;
    }
  }
  for (const f of nagonGang.values()) if (f) fel.push(f);
  return [...new Set(fel)];
}

/** Det två rutor har gemensamt. @param {any} a @param {any} b */
const skarning = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y); return { x, y, b: Math.min(a.x + a.b, b.x + b.b) - x, h: Math.min(a.y + a.h, b.y + b.h) - y }; };

/** c och e för ett rum i ett läge. */
function stigarOchOvanpa(/** @type {string} */ rumId, /** @type {any} */ k, /** @type {any[]} */ obj, /** @type {ReturnType<typeof rumsHinder>} */ h, /** @type {any} */ pos, /** @type {string} */ var_) {
  /** @type {string[]} */
  const fel = [];
  const synliga = new Set(obj.map((o) => o.id));
  // c) en stig han går på (golv) och en stig som syns med ett föremål (rutlagret med visas_med) ligger inte över ett
  // hinder. Häcken som stigen skär igenom (oppning) räknas inte, och inte det som försvinner (lianerna efter SVÄRD).
  // Ridåns rutor räknas inte: de är hinder för fötterna, och stigen går mellan dem (det prövas i a och e).
  const over = new Set(k.overHinder || []);
  for (const s of obj.filter((o) => o.golv)) {
    for (const r of h.rutor) {
      if (over.has(r)) continue;
      const vem = obj.find((o) => o.x === r.x && o.y === r.y && o.b === r.b && o.h === r.h);
      if (vem && (vem.id === s.id || vem.forsvinnerEfter || vem.golv)) continue;
      if (overlapp(s, r)) fel.push(`${var_}: stigen ${s.id} ligger över ${vem ? vem.id : `ett hinder vid ${r.x},${r.y}`}`);
    }
  }
  const bredd = Math.round(k.storlek.bredd / 16);
  for (const l of k.rutlager || []) {
    if (!l.visasMed || !synliga.has(l.visasMed)) continue;
    l.data.forEach((/** @type {number} */ t, /** @type {number} */ i) => {
      if (t < 0) return;
      const ruta = { x: (i % bredd) * 16, y: Math.floor(i / bredd) * 16, b: 16, h: 16 };
      const under = obj.find((o) => !o.golv && !o.oppning && !o.forsvinnerEfter && o.sort !== 'yta' && (o.rutor || o.id === 'backen') && overlapp(ruta, o));
      if (under) fel.push(`${var_}: stigen ${l.visasMed} har en ruta över ${under.id} vid ${ruta.x},${ruta.y}`);
    });
  }
  // g) inget osynligt hinder: ett snår i rutlagret står i vägen bara där buskarna är ritade (ridåns rutor)
  for (const o of obj.filter((x) => x.dekor && x.rutor)) {
    for (let y = o.y; y < o.y + o.h; y += 4) {
      const remsa = { x: o.x, y, b: o.b, h: Math.min(4, o.y + o.h - y) };
      if (!(k.overHinder || []).some((/** @type {any} */ r) => overlapp(r, remsa))) { fel.push(`${var_}: ${o.id} står i vägen vid y ${y}, där inga buskar är ritade (ett osynligt hinder)`); break; }
    }
  }
  // e) det han kan nå på varje nivå (från där han kommer in, och från trappan eller stegen)
  const starter = [pos, ...obj.filter((o) => o.till).map(framfor), ...(h.nivaer.finns ? h.nivaer.forbindelser.map((f) => /** @type {any} */ (h.nivaer.passage({ x: f.x + f.b / 2, y: f.y + f.h / 2 }))) : [])];
  for (const [niva, hn] of h.per) {
    const punkter = nabara(hn, k.storlek, starter.map((p) => hn.narmasteFria(p)));
    // ridåns rutor står aldrig under fötterna
    for (const r of k.overHinder || []) {
      const p = punkter.find((q) => overlapp({ x: q.x - FOT.b / 2, y: q.y - FOT.h, b: FOT.b, h: FOT.h }, r));
      if (p) fel.push(`${var_} nivå ${niva}: fötterna kan stå i ridån vid ${p.x},${p.y}`);
    }
    // det som ritas ovanpå allt skymmer ingen figur där han kan stå. Står han bakom en trädkrona (fötterna ovanför
    // trädets fot) skyms han redan av kronan, och ugglorna på kronan gör ingen skillnad.
    const kronor = obj.map(hogBild).filter(Boolean);
    for (const o of obj.filter((x) => x.ovanpa || x.lyser || x.skataFonster)) {
      const p = punkter.find((q) => {
        const kropp = { x: q.x - FIGUR.bredd / 2, y: q.y - FIGUR.hojd, b: FIGUR.bredd, h: FIGUR.hojd };
        if (!overlapp(kropp, o)) return false;
        return !kronor.some((t) => q.y < t.fot && overlapp(t, o) && overlapp(t, { ...kropp, ...skarning(kropp, o) }));
      });
      if (p) fel.push(`${var_} nivå ${niva}: ${o.id} ritas ovanför en figur som står vid ${p.x},${p.y}`);
    }
  }
  return fel;
}

describe('kartkontrollen (54.5, 56.7)', () => {
  for (const kapId of KAPITEL) {
    it(`${kapId}: varje mål går att nå, inget står i vägen, ingen stig ligger över ett hinder och inget ovanför figurerna ligger där han kan gå`, () => {
      expect(kontrollera(kapId)).toEqual([]);
    }, 60000); // kapitel 2 tar ca 4 s här och mer i CI (0.47.1 föll på 5 s)
    it(`${kapId}: varje läsval i rummet ryms på en skärm`, () => {
      const kap = las(`content/${AVENTYR}/${kapId}.json`);
      for (const p of kap.pussel.filter((/** @type {any} */ x) => x.i_rummet && x.varianter)) {
        for (const [namn, v] of Object.entries(p.varianter)) {
          const ids = [.../** @type {any} */ (v).alternativ.map((/** @type {any} */ a) => a.objekt).filter(Boolean), ...(p.skylt ? [p.skylt] : [])];
          const rum = kap.rum.find((/** @type {any} */ r) => ids.some((id) => r.innehall.map(idFor).includes(id)));
          const k = rum && karta(rum.id);
          expect(k, `${p.id} ${namn}: rummet har ingen karta`).toBeTruthy();
          const r = omradeFor(k.objekt.filter((/** @type {any} */ o) => ids.includes(o.id)));
          expect(r.b, `${p.id} ${namn}`).toBeLessThanOrEqual(320);
          expect(r.h, `${p.id} ${namn}`).toBeLessThanOrEqual(192);
        }
      }
    });
  }
  it('kontrollen hittar ett fel: en karta där ridån står mitt i gången och ett mål är instängt', () => {
    const k = karta('skogsbrynet');
    const obj = k.objekt.filter((/** @type {any} */ o) => o.id !== 'lianer');
    // ett hinder runt formelträdet: det går inte att nå
    const trad = obj.find((/** @type {any} */ o) => o.id === 'trad_med_formel');
    const mur = { x: trad.x - 40, y: trad.y - 40, b: trad.b + 80, h: trad.h + 80 };
    const ram = [{ ...mur, h: 8 }, { ...mur, y: mur.y + mur.h - 8, h: 8 }, { ...mur, b: 8 }, { ...mur, x: mur.x + mur.b - 8, b: 8 }];
    const h = rumsHinder(obj, { storlek: k.storlek, over: [...k.overHinder, ...ram] });
    expect(gaTill(h, k, h.per.get(0)?.narmasteFria(k.start) ?? k.start, 0, trad).fel).toBeTruthy();
    // ridån som inte är hinder: fötterna kan stå i den
    const utan = rumsHinder(obj, { storlek: k.storlek });
    expect(stigarOchOvanpa('skogsbrynet', k, obj, utan, k.start, 'prov').some((f) => f.includes('ridån'))).toBe(true);
  });
});
