// @ts-check
import { aventyrFor } from './sparning.js';
import { geSak } from './hjalte.js';
// Berättelsemotorn: spelar ett kapitels scener och steg i ordning. Ren logik, inga globaler.
// Gränssnittet hämtar aktuellt steg med `aktuellt()`, utför det och anropar `klar(resultat)`.
// Steg som bara ändrar tillståndet (ge_bar, ge_kartbit, ge_grad, visa_ui, ge_sak, visa_foremal, dinobok,
// unge_tillagg) utförs här och lämnas sedan till gränssnittet för att visas.
// En frivillig scen (frivillig: true, t.ex. buskarna) spelas aldrig i tur och ordning: den startar när hjälten går
// in i sitt rum (startar_i_rum) under en fri väg, och gränssnittet spelar den med frivilligScen().

/** Sparningens delar för äventyret som stegen ändrar. @param {any} av */
function sakraAventyr(av) {
  av.ui = av.ui || {}; av.rumstillstand = av.rumstillstand || {}; av.lappar = av.lappar || []; av.kartbitar = av.kartbitar || [];
  av.bar = av.bar || 0; av.visade = av.visade || {}; av.frivilligt = av.frivilligt || [];
}

/**
 * Ett stegs effekt på tillståndet (steg som bara ändrar tillståndet). Delas av berättelsen och framspolningen.
 * @param {any} st @param {{ tillstand: any, av: any, unge: any, pussel: Map<string, any>, rumId: string | null }} m
 */
function stegetsEffekt(st, { tillstand, av, unge, pussel, rumId }) {
  switch (st.typ) {
    case 'ge_sak': geSak(tillstand.spelare.hjalte, st.sort, st.id); break;
    case 'visa_foremal': if (rumId) { const v = (av.visade[rumId] = av.visade[rumId] || []); if (!v.includes(st.foremal)) v.push(st.foremal); } break;
    case 'dinobok': {
      const sidor = (tillstand.spelare.dinobok = tillstand.spelare.dinobok || []);
      if (!sidor.some((/** @type {any} */ x) => x.bild === st.sida.bild)) sidor.push({ ...st.sida });
      break;
    }
    case 'unge_tillagg': { const t = (unge.tillagg = unge.tillagg || []); if (!t.includes(st.id)) t.push(st.id); break; }
    case 'ge_bar': av.bar += st.antal; break;
    case 'ge_kartbit': if (!av.kartbitar.includes(st.nummer)) av.kartbitar.push(st.nummer); break;
    case 'ge_grad': tillstand.spelare.hjalte.grad = st.grad; break;
    case 'visa_ui': av.ui[st.element] = true; break;
    case 'unge_folj': unge.folj = st.folj; break;
    case 'oppna_lasplatta': { const p = pussel.get(st.pussel_id); if (p && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id); break; }
    default:
  }
}

/**
 * Spola fram ett kapitel som den vuxne hoppar över (?kapitel=kap-01): det kapitlet skulle ha gett ges, så att nästa
 * kapitel börjar som efter en vanlig genomspelning: knapparna (bär, nos, radio), ungen som följer, formlerna,
 * kartbitar, lappar och gåvor. Namnen hittas inte på: dop-pusslen vars namn saknas returneras, och spelet frågar
 * efter dem. Frivilliga scener och bär räknas inte, så det går att spola fram en sparning som redan har spelat
 * kapitlet (allt annat sätts bara om det saknas).
 * tillScen = spola bara fram till den scenen (den vuxne hoppar till en scen mitt i kapitlet): scenerna före den.
 * @param {{ kapitel: any, tillstand: any, aventyrId: string, tillScen?: string }} opt
 * @returns {any[]} dop-pusslen (P12) som behövs, i ordning
 */
export function spolaFram({ kapitel, tillstand, aventyrId, tillScen }) {
  const av = aventyrFor(tillstand, aventyrId);
  sakraAventyr(av);
  const unge = (tillstand.spelare.unge = tillstand.spelare.unge || { format: 1, namn: '', steg: 1, formagor: [] });
  const pussel = new Map(kapitel.pussel.map((/** @type {any} */ p) => [p.id, p]));
  /** @type {any[]} */
  const dop = [];
  for (const scen of kapitel.scener) {
    if (tillScen && scen.id === tillScen) break;
    if (scen.frivillig) continue;
    for (const st of scen.steg) {
      // bären räknas inte: spolningen ska gå att göra på en sparning som redan har spelat kapitlet
      if (st.typ !== 'ge_bar') stegetsEffekt(st, { tillstand, av, unge, pussel, rumId: scen.rum ?? null });
      const p = st.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
      if (!p) continue;
      if (p.typ === 'P11_formel') { const f = tillstand.spelare.hjalte.formler; if (!f.includes(p.svar)) f.push(p.svar); }
      if ((p.typ === 'P1_las_och_valj' || p.typ === 'P28_packa') && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id);
      if (p.typ === 'P12_dop') {
        const tom = p.sparas_som === 'hjalte.namn' ? !tillstand.spelare.hjalte.namn : p.sparas_som === 'unge.namn' ? !unge.namn : false;
        if (tom && !dop.includes(p)) dop.push(p);
      }
    }
  }
  return dop;
}

/**
 * @param {{ aventyr: any, kapitel: any, tillstand: any, aventyrId: string, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 *   tillstand = hela sparningen (ändras på plats), kapitel = kapitelfilen
 */
export function skapaBerattelse({ aventyr, kapitel, tillstand, aventyrId, logg }) {
  const av = aventyrFor(tillstand, aventyrId);
  const L = (/** @type {string} */ m, /** @type {any} */ d) => logg && logg.handelse('berättelse', m, d);
  const pussel = new Map(kapitel.pussel.map((/** @type {any} */ p) => [p.id, p]));
  const rum = new Map(kapitel.rum.map((/** @type {any} */ r) => [r.id, r]));

  // Var i kapitlet vi är: scen (id och nummer), steg och pass. Sparas efter varje steg.
  av.kapitelId = av.kapitelId || kapitel.id;
  if (av.kapitelId !== kapitel.id) { av.kapitelId = kapitel.id; av.scen = 0; delete av.scenId; delete av.steg; }
  av.scen = Number.isInteger(av.scen) ? av.scen : 0;
  const alias = kapitel.alias || {};
  /** Följ alias (gamla id → nya), även i flera led. @param {Record<string, string> | undefined} tabell @param {string} id */
  const nytt = (tabell, id) => { let x = id; for (let i = 0; i < 10 && tabell && tabell[x]; i++) x = tabell[x]; return x; };
  let startSteg = 0;
  // Scenens id gäller före numret, så att en sparning hamnar rätt även när innehållet har fått nya scener.
  // Finns scenen inte längre (borttagen, utan alias) börjar spelet i början av samma pass.
  if (typeof av.scenId === 'string') {
    const id = nytt(alias.scener, av.scenId);
    const i = kapitel.scener.findIndex((/** @type {any} */ s) => s.id === id);
    if (i >= 0) { av.scen = i; if (id === av.scenId && Number.isInteger(av.steg)) startSteg = av.steg; }
    else if (Number.isInteger(av.pass)) { const j = kapitel.scener.findIndex((/** @type {any} */ s) => s.pass === av.pass); if (j >= 0) av.scen = j; }
    else av.scen = Math.min(av.scen, kapitel.scener.length - 1);
  }
  av.ui = av.ui || {};
  av.rumstillstand = av.rumstillstand || {};
  av.lappar = (av.lappar || []).map((/** @type {string} */ id) => nytt(alias.pussel, id)).filter((/** @type {string} */ id) => pussel.has(id));
  av.kartbitar = av.kartbitar || [];
  /** @type {Record<string, string[]>} dolda föremål som har visats, per rum */
  av.visade = av.visade || {};
  /** @type {string[]} frivilliga scener och föremål som är gjorda (scenens id, eller rum/föremål) */
  av.frivilligt = av.frivilligt || [];
  // rum som har gått upp i ett större område (kapitel 1: lianerna i skogsbrynet, gamla_tradet i gläntan, beslut 18.1):
  // det som har visats, rummets tillstånd och det frivilliga följer med till det nya rummet
  for (const [gammalt] of Object.entries(alias.rum || {})) {
    const ny = nytt(alias.rum, gammalt);
    if (av.visade[gammalt]) { av.visade[ny] = [...new Set([...(av.visade[ny] || []), ...av.visade[gammalt]])]; delete av.visade[gammalt]; }
    if (gammalt in av.rumstillstand) { if (!(ny in av.rumstillstand)) av.rumstillstand[ny] = av.rumstillstand[gammalt]; delete av.rumstillstand[gammalt]; }
  }
  av.frivilligt = av.frivilligt.map((/** @type {string} */ x) => { const m = /^([^/]+)\/(.+)$/.exec(x); return m ? `${nytt(alias.rum, m[1])}/${m[2]}` : x; });
  av.bar = av.bar || 0;
  // ungen hör till spelaren (sparformat 2)
  const unge = (tillstand.spelare.unge = tillstand.spelare.unge || { format: 1, namn: '', steg: 1, formagor: [] });

  /** Första scenen från i som inte är frivillig. @param {number} i */
  const inteFrivillig = (i) => { let j = i; while (kapitel.scener[j]?.frivillig) j++; return j; };
  let scenIndex = inteFrivillig(Math.min(av.scen, kapitel.scener.length));
  let stegIndex = -1; // -1 = vid_omstart (om sådan finns och vi startar om)
  let omstart = scenIndex > 0 || !!av.startad;
  av.startad = true;

  /** Steget att fortsätta på efter "Var var vi?" (vid_omstart). */
  let aterupptaSteg = 0;
  /** @param {number} [franSteg] steget att börja på (vid en omstart mitt i scenen) */
  function borjaScen(franSteg = 0) {
    const scen = kapitel.scener[scenIndex];
    if (!scen) return;
    aterupptaSteg = Math.max(0, Math.min(scen.steg.length - 1, franSteg));
    av.scen = scenIndex; av.scenId = scen.id; av.pass = scen.pass; av.steg = aterupptaSteg;
    if (scen.rum && scen.tillstand) av.rumstillstand[scen.rum] = scen.tillstand;
    stegIndex = omstart && scen.vid_omstart ? -1 : aterupptaSteg;
    omstart = false;
    L('scen', scen.id);
  }
  borjaScen(startSteg);

  const varden = () => ({ unge: unge.namn || '', hjalte: tillstand.spelare.hjalte.namn || '' });

  /** Tillstånd för ett rum: senast satt, annars rummets första. @param {string | null} rumId */
  function rumsTillstand(rumId) {
    if (!rumId) return null;
    const r = rum.get(rumId);
    return av.rumstillstand[rumId] ?? (r && r.tillstand ? r.tillstand[0] : null);
  }

  /**
   * Utför stegets effekt på tillståndet (en gång, när steget blir aktuellt).
   * @param {any} st @param {string | null} [rumId] rummet steget spelas i (visa_foremal)
   */
  function effekt(st, rumId = kapitel.scener[scenIndex]?.rum ?? null) {
    stegetsEffekt(st, { tillstand, av, unge, pussel, rumId });
  }
  let effektGjord = false;

  return {
    kapitel,
    varden,
    rumsTillstand,
    get scen() { return kapitel.scener[scenIndex] ?? null; },
    get scenIndex() { return scenIndex; },
    get stegIndex() { return stegIndex; },
    get slut() { return scenIndex >= kapitel.scener.length; },
    /** Pusslet med ett id. @param {string} id */
    pussel(id) { return pussel.get(id); },
    /** Rummet med ett id. @param {string} id */
    rum(id) { return rum.get(id); },

    /** Aktuellt steg, eller null när kapitlet är slut. */
    aktuellt() {
      const scen = kapitel.scener[scenIndex];
      if (!scen) return null;
      const st = stegIndex === -1 ? { typ: 'replik', ...scen.vid_omstart, omstart: true } : scen.steg[stegIndex];
      if (!effektGjord) {
        // effekten görs en gång per steg, även om spelet startas om mitt i steget
        const nyckel = `${scen.id}/${stegIndex}`;
        if (stegIndex >= 0 && av.effekt !== nyckel) { effekt(st); av.effekt = nyckel; }
        effektGjord = true;
      }
      return st;
    },

    /**
     * Steget är utfört. Resultat från pussel: { namn } för dop, { tillstand } för formler.
     * @param {any} [resultat]
     */
    klar(resultat = {}) {
      const scen = kapitel.scener[scenIndex];
      if (!scen) return;
      const st = stegIndex === -1 ? null : scen.steg[stegIndex];
      if (st && st.typ === 'pussel') {
        const p = pussel.get(st.pussel_id);
        if (p && p.typ === 'P12_dop' && resultat.namn) {
          if (p.sparas_som === 'hjalte.namn') tillstand.spelare.hjalte.namn = resultat.namn;
          if (p.sparas_som === 'unge.namn') { unge.namn = resultat.namn; }
        }
        if (p && p.typ === 'P11_formel') {
          const f = p.formler.find((/** @type {any} */ x) => x.ord === p.svar);
          if (f && f.tillstand_efter && scen.rum) av.rumstillstand[scen.rum] = f.tillstand_efter;
          const formler = tillstand.spelare.hjalte.formler;
          if (!formler.includes(p.svar)) formler.push(p.svar);
        }
        if (p && (p.typ === 'P1_las_och_valj' || p.typ === 'P28_packa') && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id);
      }
      effektGjord = false;
      stegIndex = stegIndex === -1 ? aterupptaSteg : stegIndex + 1;
      av.steg = stegIndex;
      if (stegIndex >= scen.steg.length) {
        scenIndex = inteFrivillig(scenIndex + 1);
        borjaScen();
        if (scenIndex >= kapitel.scener.length) av.scen = scenIndex;
      }
    },

    /** Dolda föremål som har visats i ett rum (visa_foremal). @param {string} rumId @returns {string[]} */
    visade(rumId) { return av.visade[rumId] || []; },
    /**
     * Den frivilliga scen som startar när hjälten går in i ett rum, om den inte redan är spelad.
     * @param {string} rumId
     */
    frivilligScen(rumId) {
      return kapitel.scener.find((/** @type {any} */ s) => s.frivillig && (s.startar_i_rum || s.rum) === rumId && !av.frivilligt.includes(s.id)) ?? null;
    },
    /** Ett frivilligt steg eller föremål utanför scenernas ordning (rum.frivilligt, en frivillig scen). Effekten görs här. @param {any} st @param {string | null} rumId */
    effektUtanfor(st, rumId) { effekt(st, rumId); },
    /** Är det frivilliga (scenens id, eller rum/föremål) gjort? @param {string} id */
    frivilligtGjort(id) { return av.frivilligt.includes(id); },
    /** Det frivilliga är gjort, och görs inte igen. @param {string} id */
    frivilligtKlart(id) { if (!av.frivilligt.includes(id)) av.frivilligt.push(id); },
    /** Hoppa till en scen (gråboxens meny). @param {number} i */
    hoppaTill(i) { scenIndex = Math.max(0, Math.min(kapitel.scener.length - 1, i)); effektGjord = false; omstart = false; borjaScen(); },
  };
}
