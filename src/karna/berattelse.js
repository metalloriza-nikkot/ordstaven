// @ts-check
// Berättelsemotorn: spelar ett kapitels scener och steg i ordning. Ren logik, inga globaler.
// Gränssnittet hämtar aktuellt steg med `aktuellt()`, utför det och anropar `klar(resultat)`.
// Steg som bara ändrar tillståndet (ge_bar, ge_kartbit, ge_grad, visa_ui) utförs här och
// lämnas sedan till gränssnittet för att visas.

/**
 * @param {{ aventyr: any, kapitel: any, tillstand: any, aventyrId: string, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 *   tillstand = hela sparningen (ändras på plats), kapitel = kapitelfilen
 */
export function skapaBerattelse({ aventyr, kapitel, tillstand, aventyrId, logg }) {
  const av = tillstand.aventyr[aventyrId];
  const L = (/** @type {string} */ m, /** @type {any} */ d) => logg && logg.handelse('berättelse', m, d);
  const pussel = new Map(kapitel.pussel.map((/** @type {any} */ p) => [p.id, p]));
  const rum = new Map(kapitel.rum.map((/** @type {any} */ r) => [r.id, r]));

  // Var i kapitlet vi är. Sparas vid varje scenstart.
  av.kapitelId = av.kapitelId || kapitel.id;
  if (av.kapitelId !== kapitel.id) { av.kapitelId = kapitel.id; av.scen = 0; }
  av.scen = Number.isInteger(av.scen) ? av.scen : 0;
  av.ui = av.ui || {};
  av.rumstillstand = av.rumstillstand || {};
  av.lappar = av.lappar || [];
  av.kartbitar = av.kartbitar || [];
  av.bar = av.bar || 0;
  av.ungen = av.ungen || { namn: '', steg: 1 };

  let scenIndex = Math.min(av.scen, kapitel.scener.length);
  let stegIndex = -1; // -1 = vid_omstart (om sådan finns och vi startar om)
  let omstart = scenIndex > 0 || !!av.startad;
  av.startad = true;

  function borjaScen() {
    const scen = kapitel.scener[scenIndex];
    if (!scen) return;
    av.scen = scenIndex;
    if (scen.rum && scen.tillstand) av.rumstillstand[scen.rum] = scen.tillstand;
    stegIndex = omstart && scen.vid_omstart ? -1 : 0;
    omstart = false;
    L('scen', scen.id);
  }
  borjaScen();

  const varden = () => ({ unge: av.ungen.namn || '', hjalte: tillstand.spelare.hjalte.namn || '' });

  /** Tillstånd för ett rum: senast satt, annars rummets första. @param {string | null} rumId */
  function rumsTillstand(rumId) {
    if (!rumId) return null;
    const r = rum.get(rumId);
    return av.rumstillstand[rumId] ?? (r && r.tillstand ? r.tillstand[0] : null);
  }

  /** Utför stegets effekt på tillståndet (en gång, när steget blir aktuellt). @param {any} st */
  function effekt(st) {
    switch (st.typ) {
      case 'ge_bar': av.bar += st.antal; break;
      case 'ge_kartbit': if (!av.kartbitar.includes(st.nummer)) av.kartbitar.push(st.nummer); break;
      case 'ge_grad': tillstand.spelare.hjalte.grad = st.grad; break;
      case 'visa_ui': av.ui[st.element] = true; break;
      case 'oppna_lasplatta': { const p = pussel.get(st.pussel_id); if (p && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id); break; }
      default:
    }
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
      if (!effektGjord) { effekt(st); effektGjord = true; }
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
          if (p.sparas_som === 'unge.namn') { av.ungen.namn = resultat.namn; }
        }
        if (p && p.typ === 'P11_formel') {
          const f = p.formler.find((/** @type {any} */ x) => x.ord === p.svar);
          if (f && f.tillstand_efter && scen.rum) av.rumstillstand[scen.rum] = f.tillstand_efter;
          const formler = tillstand.spelare.hjalte.formler;
          if (!formler.includes(p.svar)) formler.push(p.svar);
        }
        if (p && (p.typ === 'P1_las_och_valj' || p.typ === 'P27_packa') && p.kan_oppnas_igen && !av.lappar.includes(p.id)) av.lappar.push(p.id);
      }
      effektGjord = false;
      stegIndex++;
      if (stegIndex >= scen.steg.length) {
        scenIndex++;
        borjaScen();
        if (scenIndex >= kapitel.scener.length) av.scen = scenIndex;
      }
    },

    /** Hoppa till en scen (gråboxens meny). @param {number} i */
    hoppaTill(i) { scenIndex = Math.max(0, Math.min(kapitel.scener.length - 1, i)); effektGjord = false; omstart = false; borjaScen(); },
  };
}
