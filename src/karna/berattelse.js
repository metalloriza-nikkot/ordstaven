// @ts-check
import { aventyrFor } from './sparning.js';
import { geSak } from './hjalte.js';
// Berättelsemotorn: spelar ett kapitels scener och steg i ordning. Ren logik, inga globaler.
// Gränssnittet hämtar aktuellt steg med `aktuellt()`, utför det och anropar `klar(resultat)`.
// Steg som bara ändrar tillståndet (ge_bar, ge_kartbit, ge_grad, visa_ui, ge_sak, visa_foremal, dinobok,
// unge_tillagg) utförs här och lämnas sedan till gränssnittet för att visas.
// En frivillig scen (frivillig: true, t.ex. buskarna) spelas aldrig i tur och ordning: den startar när hjälten går
// in i sitt rum (startar_i_rum) under en fri väg, och gränssnittet spelar den med frivilligScen().
// Navet (steget `nav`, kapitel 2): grenarnas scener spelas inte heller i tur och ordning. Gränssnittet väljer en gren
// med klar({ gren }), grenens scen spelas, och sedan kommer stegen i `mellan_grenar` och navet igen, tills alla grenar
// är klara. Var han är i navet sparas i av.nav: { scen, klara, gren?, mellan?, pass }.

/** Sparningens delar för äventyret som stegen ändrar. @param {any} av */
function sakraAventyr(av) {
  av.ui = av.ui || {}; av.rumstillstand = av.rumstillstand || {}; av.lappar = av.lappar || []; av.kartbitar = av.kartbitar || [];
  av.bar = av.bar || 0; av.visade = av.visade || {}; av.frivilligt = av.frivilligt || []; av.skrivet = av.skrivet || {};
}

/**
 * Kapitlets nav: varje grens scen → navets scen och stegets plats. @param {any} kapitel
 * @returns {Map<string, { nav: string, steg: number }>}
 */
export function grenarI(kapitel) {
  const m = new Map();
  for (const s of kapitel?.scener || []) (s.steg || []).forEach((/** @type {any} */ st, /** @type {number} */ i) => {
    if (st.typ === 'nav') for (const g of st.grenar || []) m.set(g.scen, { nav: s.id, steg: i });
  });
  return m;
}

/**
 * Passet efter navets sparpunkt (`mellan_grenar` med `pass_slut`): passet för scenen som kommer efter navet och dess
 * grenar, annars navets pass + 1 (2.31: "det som kommer efter den räknas som pass 3").
 * @param {any} kapitel @param {number} navIndex navets scen
 */
export function passEfterNavet(kapitel, navIndex) {
  const grenar = grenarI(kapitel);
  const nasta = kapitel.scener.slice(navIndex + 1).find((/** @type {any} */ s) => !s.frivillig && !grenar.has(s.id));
  return nasta?.pass ?? (kapitel.scener[navIndex]?.pass ?? 0) + 1;
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
  // ett hopp till en gren i ett nav: de andra grenarna är inte spelade (de tas i valfri ordning)
  const grenar = grenarI(kapitel), tillGren = !!tillScen && grenar.has(tillScen);
  for (const scen of kapitel.scener) {
    if (tillScen && scen.id === tillScen) break;
    if (scen.frivillig || (tillGren && grenar.has(scen.id))) continue;
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
    if (i >= 0) {
      av.scen = i; if (id === av.scenId && Number.isInteger(av.steg)) startSteg = av.steg;
      // kapitlets sista scen är spelad till slut: kapitlet är klart och börjar inte om på sista steget
      if (i === kapitel.scener.length - 1 && id === av.scenId && Number.isInteger(av.steg) && av.steg >= kapitel.scener[i].steg.length) av.scen = kapitel.scener.length;
    } else if (Number.isInteger(av.pass)) { const j = kapitel.scener.findIndex((/** @type {any} */ s) => s.pass === av.pass); if (j >= 0) av.scen = j; }
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
  av.skrivet = av.skrivet || {};
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

  const grenar = grenarI(kapitel);
  const scenNr = (/** @type {string} */ id) => kapitel.scener.findIndex((/** @type {any} */ s) => s.id === id);
  /** Första scenen från i som spelas i tur och ordning: inte frivillig och inte en gren i ett nav. @param {number} i */
  const inteFrivillig = (i) => { let j = i; while (kapitel.scener[j]?.frivillig || grenar.has(kapitel.scener[j]?.id)) j++; return j; };
  // navet: sparningen står i navet eller i en gren. Står den i en gren utan navets läge (ett hopp i menyn för vuxna),
  // börjar grenen som om han hade valt den i navet. Ett navläge som inte hör till sparningens scen är gammalt.
  {
    const id = kapitel.scener[av.scen]?.id;
    const g = id ? grenar.get(id) : undefined;
    if (g && av.nav?.gren !== id) av.nav = { scen: g.nav, klara: (av.nav?.scen === g.nav ? av.nav.klara : []).filter((/** @type {string} */ x) => x !== id), gren: id, pass: kapitel.scener[scenNr(g.nav)]?.pass };
    else if (av.nav && av.nav.scen !== id && av.nav.gren !== id) delete av.nav;
  }
  let scenIndex = av.nav?.gren && av.nav.gren === kapitel.scener[av.scen]?.id ? av.scen : inteFrivillig(Math.min(av.scen, kapitel.scener.length));
  let stegIndex = -1; // -1 = vid_omstart (om sådan finns och vi startar om)
  let omstart = scenIndex > 0 || !!av.startad;
  av.startad = true;

  /** Steget att fortsätta på efter "Var var vi?" (vid_omstart). */
  let aterupptaSteg = 0;
  /** Passet som scenen räknas till: i navet och dess grenar navets pass (pass 3 efter navets sparpunkt). @param {any} scen */
  function passFor(scen) {
    if (av.nav && (scen.id === av.nav.scen || scen.id === av.nav.gren)) return av.nav.pass ?? scen.pass;
    return scen.pass;
  }
  /** Navets steg i scenen (eller -1). @param {any} scen */
  const navPlats = (scen) => (scen?.steg || []).findIndex((/** @type {any} */ st) => st.typ === 'nav');
  /** Står berättelsen i stegen mellan grenarna just nu? */
  function iMellan() {
    const scen = kapitel.scener[scenIndex];
    return !!scen && !!av.nav && av.nav.scen === scen.id && stegIndex >= 0 && stegIndex === navPlats(scen) && Number.isInteger(av.nav.mellan);
  }
  /** Navet är klart eller ska fortsätta: tillbaka till navets steg, med stegen mellan grenarna om grenar är kvar. */
  function tillbakaTillNavet() {
    const nav = /** @type {any} */ (av.nav);
    scenIndex = scenNr(nav.scen);
    const scen = kapitel.scener[scenIndex];
    const i = navPlats(scen), st = scen.steg[i];
    const kvar = (st.grenar || []).filter((/** @type {any} */ g) => !nav.klara.includes(g.scen));
    if (kvar.length) {
      if ((st.mellan_grenar || []).length) nav.mellan = 0;
      borjaScen(i);
      stegIndex = i; // ingen vid_omstart: han kommer från grenen
      return;
    }
    // alla grenar är klara: navet är slut, och berättelsen fortsätter efter det (scenen efter navet och grenarna)
    delete av.nav;
    if (i + 1 < scen.steg.length) { borjaScen(i + 1); stegIndex = i + 1; av.steg = stegIndex; return; }
    scenIndex = inteFrivillig(scenIndex + 1);
    borjaScen();
    if (scenIndex >= kapitel.scener.length) av.scen = scenIndex;
  }
  /** @param {number} [franSteg] steget att börja på (vid en omstart mitt i scenen) */
  function borjaScen(franSteg = 0) {
    const scen = kapitel.scener[scenIndex];
    if (!scen) return;
    aterupptaSteg = Math.max(0, Math.min(scen.steg.length - 1, franSteg));
    av.scen = scenIndex; av.scenId = scen.id; av.pass = passFor(scen); av.steg = aterupptaSteg;
    // scenens tillstånd sätts när scenen börjar. Mitt i scenen står rummets sparade tillstånd kvar (repen har fallit,
    // en formel har ändrat rummet), också när spelet startas om eller han kommer tillbaka till navet
    if (scen.rum && scen.tillstand && aterupptaSteg === 0) av.rumstillstand[scen.rum] = scen.tillstand;
    // rummet scenen fortsatte i efter att han bar något dit (bara till ett annat rum) hör bara till den scenen
    if (av.flyttad && av.flyttad.scen !== scen.id) delete av.flyttad;
    stegIndex = omstart && scen.vid_omstart ? -1 : aterupptaSteg;
    omstart = false;
    L('scen', scen.id);
  }
  borjaScen(startSteg);
  // står sparningen i navet utan navets läge (äldre sparning, eller ett hopp), börjar navet utan klara grenar
  {
    const sc = kapitel.scener[scenIndex], i = navPlats(sc);
    if (sc && i >= 0 && aterupptaSteg === i && av.nav?.scen !== sc.id) av.nav = { scen: sc.id, klara: [], pass: sc.pass };
  }

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
      const mellan = iMellan();
      const st = stegIndex === -1 ? { typ: 'replik', ...scen.vid_omstart, omstart: true }
        : mellan ? scen.steg[stegIndex].mellan_grenar[/** @type {any} */ (av.nav).mellan] : scen.steg[stegIndex];
      // navet börjar: ingen gren är klar än
      if (st?.typ === 'nav' && av.nav?.scen !== scen.id) av.nav = { scen: scen.id, klara: [], pass: scen.pass };
      if (!effektGjord) {
        // effekten görs en gång per steg, även om spelet startas om mitt i steget
        const nyckel = `${scen.id}/${stegIndex}${mellan ? `/m${/** @type {any} */ (av.nav).mellan}` : ''}`;
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
      const st = stegIndex === -1 ? null : iMellan() ? scen.steg[stegIndex].mellan_grenar[/** @type {any} */ (av.nav).mellan] : scen.steg[stegIndex];
      /** @type {any} */
      let p = null;
      if (st && st.typ === 'pussel') {
        p = pussel.get(st.pussel_id);
        if (p && p.typ === 'P12_dop' && resultat.namn) {
          if (p.sparas_som === 'hjalte.namn') tillstand.spelare.hjalte.namn = resultat.namn;
          if (p.sparas_som === 'unge.namn') { unge.namn = resultat.namn; }
        }
        if (p && p.typ === 'P11_formel') {
          // med tangentbordet (kapitel 2) är formeln det han skrev: BRO, STEGE, REP eller FLOTTE (resultat.ord)
          const ord = resultat.ord || p.svar;
          const f = (p.formler || []).find((/** @type {any} */ x) => x.ord === ord);
          if (f && f.tillstand_efter && scen.rum) av.rumstillstand[scen.rum] = f.tillstand_efter;
          const formler = tillstand.spelare.hjalte.formler;
          // ett ord som räcker en gång ristas inte in på staven (ristas: false, 2.31)
          if (f?.ristas !== false && !formler.includes(ord)) formler.push(ord);
          // ordet han skrev, för {ord:<pussel>} i texten (64.2)
          if (resultat.ord) av.skrivet[p.id] = ord;
        }
        if (p && (p.typ === 'P1_las_och_valj' || p.typ === 'P28_packa') && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id);
      }
      if (st && p && p.tillstand_efter && scen.rum && st.typ === 'pussel') av.rumstillstand[av.flyttad?.rum ?? scen.rum] = p.tillstand_efter;
      effektGjord = false;
      if (stegIndex === -1) { stegIndex = aterupptaSteg; av.steg = stegIndex; return; }
      // stegen mellan grenarna: nästa, och efter det sista navet igen. Efter navets sparpunkt börjar nästa pass.
      if (iMellan()) {
        const nav = /** @type {any} */ (av.nav), lista = scen.steg[stegIndex].mellan_grenar;
        if (lista[nav.mellan]?.typ === 'sparpunkt' && lista[nav.mellan].pass_slut) { nav.pass = passEfterNavet(kapitel, scenIndex); av.pass = nav.pass; }
        nav.mellan++;
        if (nav.mellan >= lista.length) delete nav.mellan;
        return;
      }
      // navet: han har valt en gren (resultat.gren, utgången han gick till). Grenens scen spelas nu.
      if (st && st.typ === 'nav') {
        const nav = av.nav && av.nav.scen === scen.id ? av.nav : (av.nav = { scen: scen.id, klara: [], pass: scen.pass });
        const kvar = (st.grenar || []).filter((/** @type {any} */ g) => !nav.klara.includes(g.scen) && scenNr(g.scen) >= 0);
        const g = kvar.find((/** @type {any} */ x) => x.scen === resultat.gren) ?? kvar[0];
        if (!g) { tillbakaTillNavet(); return; }
        nav.gren = g.scen; delete nav.mellan;
        L('gren', g.scen);
        scenIndex = scenNr(g.scen);
        borjaScen();
        return;
      }
      stegIndex = stegIndex + 1;
      av.steg = stegIndex;
      if (stegIndex >= scen.steg.length) {
        // en gren är klar: tillbaka till navet
        if (av.nav && av.nav.gren === scen.id) {
          if (!av.nav.klara.includes(scen.id)) av.nav.klara.push(scen.id);
          delete av.nav.gren;
          L('gren klar', scen.id);
          tillbakaTillNavet();
          return;
        }
        scenIndex = inteFrivillig(scenIndex + 1);
        borjaScen();
        if (scenIndex >= kapitel.scener.length) av.scen = scenIndex;
      }
    },
    /** Navets läge: grenarna som är klara, grenen som pågår och passet, eller null utanför ett nav. */
    navLage() {
      const n = av.nav;
      return n ? { scen: n.scen, klara: [...n.klara], gren: n.gren ?? null, mellan: Number.isInteger(n.mellan), pass: n.pass ?? null } : null;
    },
    /** Passet just nu: i navet och dess grenar navets pass (pass 3 efter navets sparpunkt). */
    get pass() { const sc = kapitel.scener[scenIndex]; return sc ? passFor(sc) : null; },

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
    hoppaTill(i) {
      scenIndex = Math.max(0, Math.min(kapitel.scener.length - 1, i)); effektGjord = false; omstart = false;
      // ett hopp till en gren: som om han hade valt den i navet. Annars gäller inget navläge längre.
      const g = grenar.get(kapitel.scener[scenIndex].id);
      if (g) av.nav = { scen: g.nav, klara: [], gren: kapitel.scener[scenIndex].id, pass: kapitel.scener[scenNr(g.nav)]?.pass };
      else delete av.nav;
      borjaScen();
    },
  };
}

/**
 * Sätt tillbaka sparningen till början av ett pass, utan spår av det som kom efter (beslut 26.6): det som spelet ger
 * under berättelsen töms (formlerna, det han har på sig och i garderoben, Dinobokens sidor, ungens tillägg, graden,
 * kartbitarna, lapparna, det som har visats och det frivilliga), och spelet spolar sedan fram kapitlen fram till
 * passet igen (spolaFram). Det som är spelarens står kvar: namnen, utseendet, lärandet och inställningarna.
 * Bären kan inte spolas fram (en del kommer ur krukor och buskar): de får vara kvar, men aldrig fler än
 * kapitlen före passet kan ge (barFore).
 * @param {{ tillstand: any, aventyrId: string, maxBar: number }} opt
 */
export function aterstallFramsteg({ tillstand, aventyrId, maxBar }) {
  const h = tillstand.spelare.hjalte;
  h.formler = []; h.lager = { hjalmdekor: null, ryggsack: null }; h.garderob = []; h.grad = null;
  const u = tillstand.spelare.unge;
  if (u) { u.tillagg = []; u.formagor = []; delete u.folj; }
  tillstand.spelare.dinobok = [];
  tillstand.spelare.sett = {};
  // äventyrets del töms på plats (gränssnittet håller en referens till den)
  const av = aventyrFor(tillstand, aventyrId);
  const bar = Math.max(0, Math.min(av.bar || 0, maxBar));
  // bilderna av lärandet vid passens början står kvar: menyn sätter tillbaka lärandet med dem (F3, larandebild.js)
  const passbilder = av.passbilder;
  for (const k of Object.keys(av)) delete av[k];
  Object.assign(av, { kapitel: 0, flaggor: {}, bar, kartbitar: [] }, passbilder ? { passbilder } : {});
  return av;
}

/**
 * Hur många bär kapitlen kan ge före en scen: ge_bar, bären i krukorna (P26) och buskarna i fri lek (fritt,
 * perForemal bär per föremål). Frivilliga scener räknas inte.
 * @param {{ kapitlen: any[], tillKapitel: string, tillScen: string, perForemal: number }} opt
 */
export function barFore({ kapitlen, tillKapitel, tillScen, perForemal }) {
  let n = 0;
  for (const k of kapitlen) {
    const pussel = new Map((k.pussel || []).map((/** @type {any} */ p) => [p.id, p]));
    const grenar = grenarI(k), tillGren = k.id === tillKapitel && grenar.has(tillScen);
    for (const sc of k.scener) {
      if (k.id === tillKapitel && sc.id === tillScen) return n;
      if (sc.frivillig || (tillGren && grenar.has(sc.id))) continue;
      for (const st of sc.steg) {
        if (st.typ === 'ge_bar') n += st.antal || 0;
        if (st.typ === 'fritt') n += (st.foremal || []).length * perForemal;
        const p = st.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
        if (p?.typ === 'P26_krukorna') n += (p.innehall || []).filter((/** @type {string} */ x) => x === 'bar').length;
      }
    }
    if (k.id === tillKapitel) return n;
  }
  return n;
}
