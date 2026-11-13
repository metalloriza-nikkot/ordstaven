// @ts-check
// Mellanscenernas text för den vuxne (beslut 65). En mellanscen beskriver vad som händer. I gråboxen stod
// beskrivningen i en ruta, och regeln var att den försvinner när det som händer syns (granskningen A 9).
// Grind C kräver att spelet går att spela utan en vuxen, så i ett klart kapitel visas ingen beskrivning.

/**
 * Visar mellanscenen sin beskrivning i rutan? Bara när den inte har någon bild (Stils animation eller regin, som
 * Farfar i dörren), inte låter ungen springa till något (`unge_till`) och inte är markerad `syns_redan` (det som
 * händer syns redan: rummet, en animation eller nästa steg visar det).
 * Att varje `bild` finns prövar ett eget test (tillgangar.test.js).
 * @param {any} st ett steg
 */
export const visarBeskrivning = (st) => !!st && st.typ === 'mellanscen' && !!st.beskrivning && !st.bild && !st.unge_till && !st.syns_redan;

/** Hur länge berättelsen väntar när ungen springer till ett föremål (`unge_till`, 67.2): den springer vidare själv. */
export const UNGE_TILL_MS = 1000;

/**
 * Visar det som lockar till en frivillig scen (`lockar`, 2.31) sin beskrivning? Samma regel som en mellanscen.
 * @param {any} l scenens `lockar`
 */
export const lockarVisarBeskrivning = (l) => !!l && visarBeskrivning({ ...l, typ: 'mellanscen' });

/**
 * Var mellanscenerna som visar sin beskrivning står: i scenerna (också stegen mellan navets grenar), i det som
 * lockar till en frivillig scen och i rummens frivilliga föremål.
 * @param {any} kapitel @returns {{ plats: string, beskrivning: string }[]}
 */
export function beskrivningarSomVisas(kapitel) {
  /** @type {{ plats: string, beskrivning: string }[]} */
  const ut = [];
  const steg = (/** @type {any[]} */ lista, /** @type {string} */ plats) => (lista || []).forEach((st, i) => {
    if (visarBeskrivning(st)) ut.push({ plats: `${plats} steg ${i}`, beskrivning: st.beskrivning });
    if (st?.typ === 'nav') steg(st.mellan_grenar, `${plats} steg ${i} mellan_grenar`);
  });
  for (const s of kapitel?.scener || []) {
    steg(s.steg, s.id);
    if (lockarVisarBeskrivning(s.lockar)) ut.push({ plats: `${s.id} lockar`, beskrivning: s.lockar.beskrivning });
  }
  for (const r of kapitel?.rum || []) for (const f of r.frivilligt || []) steg(f.steg, `rum ${r.id} frivilligt ${f.foremal}`);
  return ut;
}

/**
 * Samma för äventyrets egna steg (aventyr.json): SLUTA FÖR IDAG och slutrutan när nästa kapitel är låst.
 * @param {any} aventyr @returns {{ plats: string, beskrivning: string }[]}
 */
export function aventyretsBeskrivningar(aventyr) {
  /** @type {{ plats: string, beskrivning: string }[]} */
  const ut = [];
  const steg = (/** @type {any[]} */ lista, /** @type {string} */ plats) => (lista || []).forEach((st, i) => { if (visarBeskrivning(st)) ut.push({ plats: `${plats} steg ${i}`, beskrivning: st.beskrivning }); });
  steg(aventyr?.sluta_for_idag?.fore_ungen, 'sluta_for_idag.fore_ungen');
  steg(aventyr?.sluta_for_idag?.med_ungen, 'sluta_for_idag.med_ungen');
  steg(aventyr?.kapitel_last?.steg, 'kapitel_last');
  return ut;
}

/** Hur länge berättelsen väntar vid en mellanscen som redan syns (ms), så att det hinner synas. */
export const SYNS_REDAN_MS = 800;

// Reaktionerna och knuffarna (beslut 67.3): samma regel som för mellanscenerna. En reaktion (`vid_ratt`, `vid_fel`,
// `vid_valj`, ett rimligt ord, en låst utgång) och en knuff visar sin `handling` eller `reaktion` i samma ruta, för
// den vuxne. Med `syns_redan` syns det redan (dörren som förblir stängd, skylten som glimtar), och rutan visas inte.

/**
 * Visar reaktionen (eller knuffen) sin text i rutan? @param {any} h
 */
export const visarRegi = (h) => !!h && !!(h.handling || h.reaktion) && !h.syns_redan && !(h.bild && BILD_PA_KORTET.has(h.bild));

/**
 * Bilder en reaktion kan ha (`bild`, 2.35, Teknik 31): figuren som syns på kortet han valde (ekorren vid baronens
 * lapp skakar på huvudet). Med en sådan bild visas inte texten.
 */
export const BILD_PA_KORTET = Object.freeze(new Set(['ekorre_skakar']));

/**
 * Pusseltyper och steg vars knuff aldrig visar rutan: den pekar i världen (krukorna: ungen nosar mot närmaste
 * föremål; navet: ungen springer mot närmaste gren som inte är klar).
 */
export const KNUFF_UTAN_RUTA = Object.freeze(new Set(['P26_krukorna', 'nav']));

/** Fält som har en handling men aldrig visar den: efter tre fel (ägget gungar) och förenklingen. */
const VISAS_INTE = new Set(['efter_3_fel', 'forenkla']);

/**
 * Reaktionerna och knuffarna som visar sin text i rutan, i pusslen, scenernas steg och rummens frivilliga föremål.
 * @param {any} kapitel @returns {{ plats: string, text: string, sort: 'reaktion' | 'knuff' }[]}
 */
export function reaktionerSomVisas(kapitel) {
  /** @type {{ plats: string, text: string, sort: 'reaktion' | 'knuff' }[]} */
  const ut = [];
  /** @param {any} x @param {string[]} vag @param {string} typ pusslets typ (eller '') */
  const ga = (x, vag, typ) => {
    if (Array.isArray(x)) { x.forEach((y, i) => ga(y, [...vag, y?.id ?? y?.ord ?? String(i)], typ)); return; }
    if (!x || typeof x !== 'object') return;
    const nyckel = [...vag].reverse().find((s) => /^[a-z_0-9]+$/.test(s) && !/^\d+$/.test(s)) ?? '';
    if (VISAS_INTE.has(nyckel)) return;
    const knuff = nyckel === 'knuff';
    if (visarRegi(x) && !(knuff && KNUFF_UTAN_RUTA.has(typ)) && vag.length) ut.push({ plats: vag.join(' '), text: x.handling || x.reaktion, sort: knuff ? 'knuff' : 'reaktion' });
    for (const [k, v] of Object.entries(x)) if (v && typeof v === 'object' && k !== 'replik') ga(v, [...vag, k], typ);
  };
  for (const p of kapitel?.pussel || []) for (const [k, v] of Object.entries(p)) if (v && typeof v === 'object') ga(v, [`pussel ${p.id}`, k], p.typ);
  const steg = (/** @type {any[]} */ lista, /** @type {string} */ plats) => (lista || []).forEach((st, i) => {
    for (const [k, v] of Object.entries(st || {})) if (v && typeof v === 'object' && k !== 'replik') ga(v, [`${plats} steg ${i}`, k], st?.typ === 'nav' ? 'nav' : '');
  });
  for (const s of kapitel?.scener || []) steg(s.steg, s.id);
  for (const r of kapitel?.rum || []) for (const f of r.frivilligt || []) steg(f.steg, `rum ${r.id} frivilligt ${f.foremal}`);
  return ut;
}

/**
 * Närbilder på läsplattan (Stil del 3, 13/11): mellanscenens `bild` → föremålet vars läge avgör bilden, och bildkorten
 * per läge. Läget är hur många `bara` till föremålet som är gjorda (bryggans halva kommer alltid först, navet i
 * kapitel 2). `blot`: lägena där den sista halvan är blöt först och torkar efter en stund, när den sattes i i samma
 * scen (halvan från vassen).
 * @type {Record<string, { foremal: string, lagen: string[], blot: string[] }>}
 */
export const NARBILDER = Object.freeze({
  brevram_nara: { foremal: 'brevram', lagen: ['brevram_nara_tom', 'brevram_nara_vanster', 'brevram_nara_hel'], blot: ['brevram_nara_hel'] },
});

/** Hur länge närbilden står (ms), och hur länge en blöt halva är blöt innan den torkar. */
export const NARBILD_MS = 2600, BLOT_MS = 1000;

/**
 * Vilken närbild som visas. @param {string} bild mellanscenens bild @param {number} gjorda antal `bara` till föremålet
 * @param {boolean} iScenen den sista sattes i i den här scenen @returns {{ bilder: string[] } | null} en eller två bilder i följd
 */
export function narbildFor(bild, gjorda, iScenen) {
  const n = NARBILDER[bild];
  if (!n) return null;
  const id = n.lagen[Math.max(0, Math.min(gjorda, n.lagen.length - 1))];
  return { bilder: iScenen && n.blot.includes(id) ? [`${id}_blot`, id] : [id] };
}

