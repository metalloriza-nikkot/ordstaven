// @ts-check
// Spelet: kopplar berättelsemotorn (karna) till rummet (Phaser) och gränssnittet (DOM).
// Varje stegtyp i innehållet har en hanterare här. Inget innehåll hårdkodas: allt kommer från content/.
import { skapaBerattelse } from './karna/berattelse.js';
import { skapaLasmotor, valjVariant } from './karna/lasmotor.js';
import { egenskaper, PALETT } from './karna/egenskaper.js';
import { skapaValj, skapaFormel, skapaDop, skapaKrukor } from './karna/pussel.js';
import { forSkarm } from './karna/text.js';
import { rumTillSkarm, RUM } from './karna/skalning.js';
import { framfor, lasplats, vidObjekt, genom, VAGG } from './karna/rumslayout.js';
import { aventyrFor } from './karna/sparning.js';
import { HJALTE_FARGER } from './scener/Rum.js';
import { TANGENTBORD_HOJD } from './grans/tangentbord.js';

const KNUFF_MS = 9000;
const vanta = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{ aventyr: any, kartor?: Record<string, import('./karna/karta.js').Karta>, kapitel: any[], ordlistor: any, tillstand: any, sparning: any, logg: any, rost: any, ljud: any,
 *           ui: ReturnType<typeof import('./grans/ui.js').skapaUi>, rum: import('./scener/Rum.js').Rum, layout: any,
 *           inmatning: any, tangentbord: ReturnType<typeof import('./grans/tangentbord.js').skapaTangentbord>,
 *           bilder: ReturnType<typeof import('./grans/bilder.js').skapaBilder>, snabb: boolean, pek: () => boolean,
 *           uppdatering: { tillampa(): void } }} d
 */
export function skapaSpel(d) {
  const { aventyr, kartor = {}, tillstand, sparning, logg, rost, ljud, ui, rum, layout, inmatning, tangentbord, bilder, snabb } = d;
  const AVENTYR = aventyr.id;
  const av = aventyrFor(tillstand, AVENTYR);
  // vuxenEtiketter: föremålens namn i gråboxen, för den vuxne. Avstängt från början (inget för den vuxne syns under ett pass).
  const inst = (tillstand.installningar = { foralderLaser: false, vuxenEtiketter: false, ...tillstand.installningar });
  const lasmotor = skapaLasmotor({ larande: tillstand.spelare.larande, logg });
  /** @type {ReturnType<typeof skapaBerattelse>} */
  let b;
  let aktuelltRum = /** @type {string | null | undefined} */ (undefined);
  let aktuelltSteg = /** @type {any} */ (null);

  const spara = () => { sparning.spara(tillstand); };
  /** @type {string | null} varianten i pusslet som pågår (för testerna) */
  let aktuellVariant = null;
  /** Spelet står still (menyn för vuxna är öppen eller fliken är dold). */
  let pausad = false;
  /** @type {Set<string>} orsakerna till pausen */
  const pausorsaker = new Set();
  let fryst = false;
  /**
   * Pausa spelet: världen stannar, rösten tystnar, knuffar och tangenter väntar. Läsplattan och
   * allt annat ligger kvar som det var, så att spelet fortsätter exakt där det stod.
   * @param {string} orsak
   */
  function pausa(orsak) {
    if (!pausorsaker.size) { fryst = rum.fryst; rum.frys(true); rost.tyst(); ui.avbrytLjudning(); spara(); }
    pausorsaker.add(orsak); pausad = true;
    logg.handelse('paus', orsak);
  }
  /** @param {string} orsak */
  function fortsatt(orsak) {
    if (!pausorsaker.delete(orsak) || pausorsaker.size) return;
    pausad = false; rum.frys(fryst);
    logg.handelse('paus', 'slut');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausa('dold'); else fortsatt('dold'); });
  /** Läsnivån för en pusseltyp, inom kapitlets golv och tak (nivaer). @param {string} typ */
  const lasniva = (typ) => {
    const n = lasmotor.niva('L', typ);
    const [golv, tak] = (b?.kapitel?.nivaer?.lasning || ['L1', 'L7']).map((/** @type {string} */ x) => Number(x.slice(1)));
    return Math.max(golv, Math.min(tak, n));
  };
  const varden = () => b.varden();
  const tid = (/** @type {number} */ ms) => (snabb ? Math.min(ms, 30) : ms);

  // ------------------------------------------------------------------ hjälpare
  /** Lyssna på handlingar (tangenter) så länge ett steg pågår. */
  // När spelet är pausat (menyn för vuxna, dold flik) når inga handlingar stegen.
  const lyssnaHandling = (/** @type {(h: any) => void} */ f) => inmatning.lyssna((/** @type {any} */ h) => { if (!pausad) f(h); });

  /** Säg en replik högt (om den ska läsas upp). @param {any} r */
  function sag(r) {
    if (!r || !r.upplast) return Promise.resolve();
    const t = aventyr.talare[r.talare] || {};
    if (inst.foralderLaser && t.rost === 'foraldern_eller_datorrost') return Promise.resolve();
    const text = forSkarm(r.text, { varden: varden(), skrift: 'vanlig' }).join(' ');
    return rost.saga(text, t.rollrost || 'berattare');
  }

  /** Portätt: färgad ring per talare (ingen text). @param {string} talare */
  const portratt = (talare) => `<span class="portratt p-${ui.esc(talare)}" aria-hidden="true"></span>`;

  /** Visa en replik på läsplattan och vänta tills spelaren går vidare. @param {any} r */
  async function replik(r) {
    rum.frys(true);
    const el = ui.visaPlatta(`<div class="replik-ruta">${portratt(r.talare)}<div class="text">${ui.rader(r.text, varden())}</div><button type="button" class="vidare" aria-label="Vidare">▶</button></div>`, 'replik');
    // nosen fungerar på repliker också, gratis (de läses ändå upp), så att "tryck på nosen" alltid ger svar
    ui.sattNos(true, { betala: () => true });
    const fortsatt = ui.vantaFortsatt(el, lyssnaHandling);
    await Promise.race([sag(r), fortsatt]);
    el.classList.add('klar-att-ga');
    await fortsatt;
    rost.tyst();
    ui.doljPlatta();
  }

  /** En reaktion (fel, rätt): regi i bild och eventuell replik. @param {any} h */
  async function reaktion(h) {
    if (!h) return;
    const regi = h.handling || h.reaktion;
    if (regi) ui.visaRegi(regi, 0);
    if (h.fest) { ljud.spela('fest'); ui.visaFest('✨', tid(900)); }
    const ruta = ui.plattan.hidden ? null : ui.plattan.querySelector('.pussel-ruta, .formel-ruta');
    if (h.replik && ruta) { const rad = document.createElement('div'); rad.className = 'svar-rad'; rad.innerHTML = portratt(h.replik.talare) + `<div class="text">${ui.rader(h.replik.text, varden())}</div>`; ruta.prepend(rad); }
    if (h.replik && !ruta) { await replik(h.replik); if (regi) ui.doljRegi(); return; }
    if (h.replik) await Promise.all([sag(h.replik), vanta(tid(1200))]); else await vanta(tid(1400));
    if (regi) await vanta(tid(500));
    ui.doljRegi();
  }

  /** Knuff efter en stunds tvekan. Returnerar en funktion som nollställer klockan. @param {any} knuff @param {() => void} [extra] */
  function knuffKlocka(knuff, extra) {
    if (!knuff) return { nollstall() {}, stopp() {} };
    let t = 0;
    const starta = () => { clearTimeout(t); t = window.setTimeout(async () => { if (pausad) { starta(); return; } logg.handelse('knuff', knuff.handling); extra?.(); if (knuff.handling) ui.visaRegi(knuff.handling, 0); if (knuff.replik) await sag(knuff.replik); else await vanta(2500); ui.doljRegi(); }, (knuff.efter_sek ? knuff.efter_sek * 1000 : KNUFF_MS)); };
    starta();
    return { nollstall: starta, stopp() { clearTimeout(t); } };
  }

  /** Nosen: tillåten i pussel med hjälp "ett_ord". Kostar ett bär, gratis vid 0 bär. @param {any} pussel @param {{ hjalp: boolean }} spar */
  function tillatNos(pussel, spar) {
    const tillaten = !!pussel && pussel.hjalp === 'ett_ord';
    ui.sattNos(tillaten, {
      betala: () => { if (av.bar > 0) { av.bar--; ui.uppdateraHud(av); } return true; },
      anvand: () => { spar.hjalp = true; },
    });
  }

  // ------------------------------------------------------------------ rummet
  /** Föremålet i rummet som visar ett pussels alternativ (kartans "visar"). @param {string} pusselId */
  const visarFor = (pusselId) => rum.objekt.find((o) => o.visar === pusselId) ?? null;
  /** Alternativen som rutor i rätt färg och storlek. @param {any[]} alternativ */
  const delarAv = (alternativ) => alternativ.map((a) => {
    const e = egenskaper(a.bild || a.id);
    return { farg: e.farg ? parseInt(PALETT[e.farg].slice(1), 16) : null, storlek: e.storlek };
  });
  /** Delar för alla föremål i ett rum som visar ett läs och välj-pussel, i den variant spelaren får. @param {any} karta */
  function delarIRummet(karta) {
    /** @type {Record<string, any[]>} */
    const ut = {};
    for (const o of karta?.objekt || []) {
      const p = o.visar ? b.pussel(o.visar) : null;
      if (!p || !p.varianter || p.i_rummet) continue;
      const [, v] = valjVariant(p.varianter, lasniva(p.typ));
      ut[o.id] = delarAv(v.alternativ);
    }
    // läs i rummet: varje låda har sitt alternativs färg och storlek, i den variant spelaren får
    const iKartan = new Set((karta?.objekt || []).map((/** @type {any} */ o) => o.id));
    for (const p of b.kapitel.pussel) {
      if (!p.i_rummet || !p.varianter) continue;
      const [, v] = valjVariant(p.varianter, lasniva(p.typ));
      for (const a of v.alternativ) {
        const e = egenskaper(a.bild || a.id);
        if (a.objekt && iKartan.has(a.objekt) && (e.farg || e.storlek)) ut[a.objekt] = delarAv([a]);
      }
    }
    return ut;
  }

  /** Nästa rumsbyte tonas (start, FORTSÄTT, ny dag), i stället för att glida. */
  let tonaNasta = true;
  /** Åt vilket håll hjälten klättrade på stegen ut ur förra rummet (han klättrar vidare i nästa). @type {'upp' | 'ned' | null} */
  let klattrade = null;

  /**
   * Visa scenens rum. Ett byte till ett grannrum glider (båda rummen syns sida vid sida, ca 0,5 s, världen står
   * still), och hjälten står en stund på tröskeln eller klättrar de sista pinnarna på stegen. Hopp som inte går
   * till ett grannrum (mellanscener, sidovy, ny dag, FORTSÄTT) tonas.
   */
  async function visaScen() {
    const scen = b.scen;
    if (!scen) return;
    const nytt = scen.rum !== aktuelltRum;
    const franRum = aktuelltRum ?? null;
    aktuelltRum = scen.rum;
    const r = scen.rum ? b.rum(scen.rum) : null;
    // utgången i förra rummet som leder hit, och åt vilket håll den leder
    const ut = nytt && franRum && scen.rum ? rum.objekt.find((o) => o.till === scen.rum) : null;
    const glida = !!(ut && ut.riktning) && !tonaNasta;
    const tonas = (nytt && !glida) || (tonaNasta && !!scen.rum);
    let forra = null;
    if (glida) { rum.frys(true); forra = await rum.bild(); }
    if (tonas) { rum.frys(true); await ui.tona(true, tid(300)); }
    rum.visa({ rum: scen.rum, tillstand: b.rumsTillstand(scen.rum), innehall: r ? r.innehall : [], unge: tillstand.spelare.unge?.folj ?? !!tillstand.spelare.unge?.namn, nyttRum: nytt,
      karta: scen.rum ? kartor[scen.rum] ?? null : null, franRum, delar: scen.rum ? delarIRummet(kartor[scen.rum]) : {} });
    // närbilden (t.ex. kartbiten) visas tills spelaren ska röra sig i rummet igen
    const st = b.aktuellt();
    const sp = st && st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
    const iRummet = st && (st.typ === 'ga_till' || st.typ === 'fritt' || sp?.typ === 'P26_krukorna' || !!sp?.i_rummet);
    ui.$('#narbild').hidden = scen.vy !== 'narbild' || !!iRummet;
    ui.uppdateraHud(av);
    visaEtiketter();
    if (glida && forra && ut?.riktning) await ui.glid(/** @type {HTMLElement} */ (document.getElementById('varld')), forra, ut.riktning, layout.skala.cssSkala, tid(500));
    if (tonas) { await ui.tona(false, tid(300)); tonaNasta = false; }
    if (nytt && rum.inkom) {
      // hjälten kommer in vid motsvarande utgång: på stegen klättrar han själv de sista pinnarna, annars står han
      // ett ögonblick på tröskeln så att det syns var han kom ifrån
      if (rum.inkom.klattra && klattrade) await rum.klattra(rum.inkom.id, klattrade, 'av', tid(600));
      else { await vanta(tid(200)); await rum.ga(lasplats(rum.inkom), tid(250)); } // sedan ett steg in i rummet
    }
    klattrade = null;
    if ((nytt || tonas) && scen.rum) rum.frys(false);
  }
  /** Föremål vars etikett inte visas just nu: alternativen i ett val i världen (etiketten får inte avslöja svaret). */
  const doljEtikett = new Set();
  /** Pågår ett pussel? Då syns inga etiketter alls, även om den vuxne har slagit på dem. */
  let pusselPagar = false;
  /**
   * Gråboxens etiketter (föremålens id) för den vuxne. Avstängda från början (menyn: Visa objektens namn).
   * Aldrig på utgångar ("dorr sov" vore svaret på dörrvalet), och aldrig medan ett pussel pågår.
   */
  function visaEtiketter() {
    const s = layout.skala;
    ui.etiketter(rum.objekt.filter((o) => o.sort !== 'utgang' && !doljEtikett.has(o.id)), (x, y) => rumTillSkarm(s, x, y), inst.vuxenEtiketter && !pusselPagar && rum.harRum);
  }
  layout.vidAndring(() => visaEtiketter());

  // ------------------------------------------------------------------ stegen
  /** @param {any} st */
  async function utfor(st) {
    aktuelltSteg = st;
    switch (st.typ) {
      case 'replik': return replik(st);
      case 'mellanscen': {
        const ms = tid(Math.min(6000, 1800 + st.beskrivning.split(' ').length * 140));
        await ui.visaRegi(st.beskrivning, ms); ui.doljRegi(); return;
      }
      case 'ljud': ljud.spela(st.id); if (st.foremal) rum.hoppa(st.foremal); await vanta(tid(600)); return;
      case 'unge_folj': return; // effekten (ungen syns och följer) görs i berättelsemotorn
      case 'ga_till': return gaTill(st);
      case 'pussel': return pussel(b.pussel(st.pussel_id));
      case 'oppna_lasplatta': return visaLapp(b.pussel(st.pussel_id), true);
      case 'visa_ui': {
        ui.uppdateraHud(av);
        const id = { nosknappen: '#hud-nos', barraknaren: '#hud-bar', radioramen: '#hud-radio', hjalteboken: '#hud-meny' }[/** @type {string} */ (st.element)];
        if (id) ui.pulsera(id);
        await vanta(tid(700)); return;
      }
      case 'nos_demo': {
        ui.pulsera('#hud-nos');
        await ui.ljuda(st.ord); return;
      }
      case 'ge_bar': ljud.spela('bar'); ui.uppdateraHud(av); ui.pulsera('#hud-bar'); await ui.visaFest('🫐', tid(900)); return;
      case 'ge_kartbit': ljud.spela('fest'); await ui.visaFest('🗺️', tid(1200)); return;
      case 'ge_grad': ljud.spela('fest'); await ui.visaFest('⭐', tid(1500)); return;
      case 'bok': return bok(st);
      case 'skapa_hjalte': return skapaHjalte(st);
      case 'sparpunkt': spara(); if (st.pass_slut) return passSlut(); return;
      case 'fritt': return fritt(st);
      default: logg.handelse('steg', 'okänd stegtyp ' + st.typ); return;
    }
  }

  /**
   * Vänta tills spelaren använder ett av föremålen. Att gå fram räcker inte: hjälten går dit, föremålet lyser
   * och en hand visas ovanför, och spelaren använder det med ett tryck till (på föremålet eller handen),
   * Mellanslag eller Enter. Utgångar (dörrar, stegar, grinden) går man igenom bara genom att gå dit.
   * @param {string[]} ids
   * @returns {Promise<string> & { avbryt(): void }}
   */
  /**
   * Var lappen eller handen visas för ett föremål, så att den inte täcker hjälten, grannföremålet eller det man ska läsa:
   * - en dörr i bakväggen: skylten sitter på dörren
   * - en dörr i en sidovägg: ovanför dörren
   * - ett föremål mot en sidovägg (lådorna längs väggen, sängen): bredvid, ute i väggen
   * - annars ovanför föremålet.
   * Den hålls alltid inne i rummet.
   * @param {any} o @returns {[{ x: number, y: number }, import('./grans/ui.js').Plats]}
   */
  function skyltPlats(o) {
    const s = layout.skala;
    const ram = { vanster: rumTillSkarm(s, 0, 0).x, hoger: rumTillSkarm(s, RUM.bredd, 0).x };
    const bas = { rumTopp: s.topp, ram, under: rumTillSkarm(s, 0, o.y + o.h).y, objekt: o.id };
    const mitt = o.y + o.h / 2;
    if (o.sort === 'utgang' && !o.golv && (o.sida === 'under' || o.sida === 'over')) return [rumTillSkarm(s, o.x + o.b / 2, mitt), { ...bas, lage: 'pa' }];
    if (o.sort !== 'utgang' && o.sida === 'hoger' && o.x <= VAGG.sida + 8) return [rumTillSkarm(s, o.x, mitt), { ...bas, lage: 'vanster' }];
    if (o.sort !== 'utgang' && o.sida === 'vanster' && o.x + o.b >= RUM.bredd - VAGG.sida - 8) return [rumTillSkarm(s, o.x + o.b, mitt), { ...bas, lage: 'hoger' }];
    return [rumTillSkarm(s, o.x + o.b / 2, o.y), bas];
  }

  function anvand(ids) {
    let avbryt = () => {};
    const lova = /** @type {Promise<string> & { avbryt(): void }} */ (new Promise((klar) => {
      const utgangar = ids.filter((id) => rum.ruta(id)?.sort === 'utgang');
      const saker = ids.filter((id) => !utgangar.includes(id));
      rum.sattInteraktiva(saker);
      /** @type {string | null} */
      let nara = null;
      const visaNara = (/** @type {string | null} */ id) => {
        if (id === nara) return;
        nara = id; rum.nara(id);
        const o = id ? rum.ruta(id) : null;
        if (!o) { ui.handknapp(null); return; }
        ljud.spela('klick');
        const [pt, plats] = skyltPlats(o);
        ui.handknapp(pt, () => gor(o.id), plats);
      };
      // en utgång räknas när hjälten går dit. Står han redan där när steget börjar (t.ex. efter FORTSÄTT) väntar
      // spelet tills han gått därifrån, eller tills spelaren trycker på utgången eller använder den.
      const framme = (/** @type {string} */ id) => { const o = rum.ruta(id); return !!o && (vidObjekt(rum.pos, o) || genom(o, rum.pos)); };
      const vapnade = new Set();
      const tick = window.setInterval(() => {
        if (rum.fryst) { visaNara(null); return; }
        for (const id of utgangar) if (!framme(id)) vapnade.add(id);
        visaNara(rum.starVid(saker));
        const ut = utgangar.find((id) => vapnade.has(id) && framme(id));
        if (ut) gor(ut);
      }, 60);
      const sluta = lyssnaHandling((h) => {
        if (h.typ !== 'interagera' || rum.fryst) return;
        if (nara) gor(nara); else { const ut = utgangar.find(framme); if (ut) gor(ut); }
      });
      rum.tryckPa = (id) => { if (id === nara || (utgangar.includes(id) && framme(id))) gor(id); };
      let gjort = false;
      const stada = () => { gjort = true; window.clearInterval(tick); sluta(); rum.tryckPa = null; visaNara(null); rum.sattInteraktiva([]); };
      function gor(/** @type {string} */ id) { if (gjort) return; stada(); inmatning.rensaGaTill(); klar(id); }
      avbryt = () => { if (!gjort) stada(); };
    }));
    lova.avbryt = () => avbryt();
    return lova;
  }

  /** @param {any} st */
  async function gaTill(st) {
    rum.frys(false);
    if (!rum.ruta(st.mal)) { logg.handelse('FEL', 'objektet finns inte i rummet: ' + st.mal); return; }
    if (st.visa_styrhjalp) rum.markera(st.mal, true);
    // styrhjälpen visar hur man går på just den här enheten: piltangenter på dator, ett finger som trycker på pekskärm.
    // Den försvinner så fort hjälten börjar gå.
    let styr = 0;
    if (st.visa_styrhjalp) {
      const o = rum.ruta(st.mal), start = { ...rum.pos };
      ui.styrhjalp(d.pek() ? 'tryck' : 'pilar', o ? rumTillSkarm(layout.skala, o.x + o.b / 2, o.y + o.h / 2) : null);
      styr = window.setInterval(() => { if (Math.hypot(rum.pos.x - start.x, rum.pos.y - start.y) > 6) { ui.styrhjalp(null); window.clearInterval(styr); } }, 100);
    }
    const k = knuffKlocka(st.knuff ?? { handling: '' }, () => rum.markera(st.mal, true));
    await anvand([st.mal]);
    window.clearInterval(styr); ui.styrhjalp(null);
    k.stopp(); rum.markera(st.mal, false); ui.doljRegi();
    // stegen: hjälten klättrar själv upp eller ned tills huvudet når luckan, sedan glider nästa rum in
    const o = rum.ruta(st.mal);
    if (o?.klattra) { klattrade = o.klattra; await rum.klattra(o.id, o.klattra, 'pa', tid(700)); }
  }

  // ------------------------------------------------------------------ pussel
  /** @param {any} p */
  async function pussel(p) {
    if (!p) return;
    rum.frys(true);
    pusselPagar = true; visaEtiketter();
    const start = performance.now();
    logg.handelse('pussel', p.id);
    let res;
    switch (p.typ) {
      case 'P1_las_och_valj': case 'P28_packa': res = p.i_rummet ? await valjIRummet(p) : await valj(p); break;
      case 'P11_formel': res = await formel(p); break;
      case 'P12_dop': res = await dop(p); break;
      case 'P26_krukorna': res = await krukor(p); break;
      default:
        // P15, P9 och andra typer byggs i fas 3. Gråboxen hoppar över dem.
        await ui.visaRegi(`(${p.typ} byggs i fas 3)`, tid(1500)); ui.doljRegi(); res = {};
    }
    ui.doljPlatta(); rum.frys(false);
    pusselPagar = false; visaEtiketter();
    if (res && res.niva) {
      lasmotor.registrera({ pussel_id: p.id, typ: p.typ, niva: res.niva, ratt: res.forstaForsoket, antal_forsok: res.forsok, hjalp_anvand: res.hjalp, tid: performance.now() - start });
    }
    spara();
    return res;
  }

  /** Läs och välj (P1) och packa (P28). @param {any} p */
  async function valj(p) {
    const flera = p.typ === 'P28_packa';
    const niva = lasniva(p.typ);
    const v = skapaValj(p, { niva });
    const spar = { hjalp: false };
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    return new Promise((klar) => {
      let upptagen = false;
      const k = knuffKlocka(p.knuff, () => plattan().querySelector('.fraga')?.classList.add('puls'));
      const plattan = () => ui.plattan;
      const kortHtml = (/** @type {any} */ a) => {
        const bild = flera ? bilder.html(a.bild || a.id) : a.ord ? '' : bilder.html(a.bild || a.id);
        const etikett = a.ord ? `<span class="kort-etikett">${ui.rader(a.ord, varden(), 'kort-ord')}</span>` : '';
        const klasser = ['kort', v.s.valda.has(a.id) ? 'vald' : '', v.s.pekar === a.id ? 'pekar' : '', a.ord && a.ord.includes(' ') ? 'mening' : ''].join(' ');
        return `<button type="button" class="${klasser}" data-id="${ui.esc(a.id)}">${bild}${etikett}${v.s.pekar === a.id ? '<span class="nos-pekar" aria-hidden="true">👃</span>' : ''}</button>`;
      };
      const rita = () => {
        const papper = v.s.text ? `<div class="lapp p-${ui.esc(p.papper || 'lapp')}">${ui.rader(v.s.text, varden())}</div>` : '';
        const bild = v.s.bild ? `<div class="fraga">${bilder.html(v.s.bild)}</div>` : '';
        const visar = visarFor(p.id);
        if (visar) rum.visaDelar(visar.id, delarAv(p.varianter[v.s.variantNyckel].alternativ.filter((/** @type {any} */ a) => v.s.alternativ.some((x) => x.id === a.id))));
        ui.visaPlatta(`<div class="pussel-ruta">${papper}${bild}<div class="kortrad">${v.s.alternativ.map(kortHtml).join('')}</div>${flera ? '<div class="ryggsack" aria-hidden="true">🎒</div>' : ''}</div>`, 'pussel ' + p.typ);
        tillatNos(p, spar);
        plattan().querySelectorAll('.kort').forEach((el) => el.addEventListener('click', () => tryck(/** @type {HTMLElement} */ (el).dataset.id || '')));
      };
      const tryck = async (/** @type {string} */ id) => {
        if (upptagen || ui.nosAktiv) return;
        k.nollstall();
        const r = v.valj(id);
        if (r.resultat === 'redan') return;
        upptagen = true;
        const kort = /** @type {HTMLElement | null} */ (plattan().querySelector(`.kort[data-id="${CSS.escape(id)}"]`));
        if (r.resultat === 'fel') {
          ljud.spela('fel'); kort?.classList.add('skakar');
          await reaktion(r.reaktion);
          rita();
        } else if (r.resultat === 'ratt') {
          ljud.spela('ratt'); rita();
        } else {
          ljud.spela('ratt'); kort?.classList.add('ratt');
          k.stopp();
          await vanta(tid(500));
          ui.doljPlatta();
          await reaktion(r.reaktion);
          klar({ niva: v.s.variantNyckel, forstaForsoket: v.forstaForsoket, forsok: v.s.forsok, hjalp: spar.hjalp });
          return;
        }
        upptagen = false;
      };
      rita();
    });
  }

  /**
   * Läs och välj i rummet (P1 med i_rummet): alternativen ligger i föremål eller utgångar runt rummet.
   * Frågan syns uppe i rummet. Närlappen med ordet syns när hjälten står vid föremålet, eller inom ungefär en ruta
   * från en dörr eller en skylt. Ett föremål öppnas med ett tryck på lappen (eller på föremålet igen, eller Mellanslag).
   * En utgång väljs genom att gå igenom den: ett tryck på dörren går först fram till lappen, ett tryck till går igenom.
   * Fel dörr öppnas aldrig: hjälten tar ett steg tillbaka och felreaktionen spelas vid dörren. Förenkling och
   * ungens pekning som i P1. Glimten är lika för alla alternativ.
   * @param {any} p
   */
  async function valjIRummet(p) {
    const niva = lasniva(p.typ);
    const v = skapaValj(p, { niva });
    aktuellVariant = v.s.variantNyckel;
    const spar = { hjalp: false };
    if (p.instruktion) await replik(p.instruktion);
    /** @type {Set<string>} alternativ som är använda (fel) eller borttagna */
    const borta = new Set();
    const altFor = (/** @type {string} */ objekt) => v.s.alternativ.find((a) => a.objekt === objekt && !borta.has(a.id));
    const kvarAlt = () => v.s.alternativ.filter((a) => !borta.has(a.id));
    const arUtgang = (/** @type {string} */ id) => rum.ruta(id)?.sort === 'utgang';
    const kvarSaker = () => kvarAlt().map((a) => a.objekt).filter((id) => !arUtgang(id));
    const kvarUtgangar = () => kvarAlt().map((a) => a.objekt).filter((id) => arUtgang(id));
    const fraga = () => ui.visaTanke(v.s.bild ? bilder.html(v.s.bild) : v.s.text ? ui.rader(v.s.text, varden()) : null);
    const avst = (/** @type {{ x: number, y: number }} */ a, /** @type {{ x: number, y: number }} */ b2) => Math.hypot(a.x - b2.x, a.y - b2.y);
    /** Står hjälten nära utgången (inom ungefär en ruta från dörren, läsplatsen eller skylten)? @param {any} o */
    const naraUtgang = (o) => {
      if (avst(rum.pos, framfor(o)) <= 22 || avst(rum.pos, lasplats(o)) <= 16) return true;
      const l = o.lapp ? rum.ruta(o.lapp) : null;
      return !!l && vidObjekt(rum.pos, l);
    };
    rum.frys(false);
    rum.sattInteraktiva(kvarSaker());
    for (const a of v.s.alternativ) { if (a.objekt) doljEtikett.add(a.objekt); const l = a.objekt && rum.ruta(a.objekt)?.lapp; if (l) doljEtikett.add(l); }
    visaEtiketter();
    fraga();
    tillatNos(p, spar);
    return new Promise((klar) => {
      let upptagen = false;
      /** @type {string | null} föremålet eller utgången hjälten står vid och vars lapp syns */
      let vid = null;
      const k = knuffKlocka(p.knuff, () => ui.pulseraTanke());
      const visaLappen = (/** @type {string | null} */ id) => {
        if (id === vid) return;
        vid = id;
        rum.nara(id && !arUtgang(id) ? id : null);
        const a = id ? altFor(id) : null;
        const o = id ? rum.ruta(id) : null;
        ui.ordskylt(null); ui.handknapp(null);
        if (!a || !o) return;
        ljud.spela('klick');
        // lappen visas vid skylten vid en stig, annars vid föremålet eller dörren (se skyltPlats)
        const vis = (o.lapp && rum.ruta(o.lapp)) || o;
        const [pt, plats] = skyltPlats(vis);
        plats.objekt = o.id; // valet gäller utgången, även när lappen sitter på skylten bredvid
        if (a.ord) ui.ordskylt(`<button type="button" class="kort ${v.s.pekar === a.id ? 'pekar' : ''}" data-id="${ui.esc(a.id)}"><span class="kort-etikett">${ui.rader(a.ord, varden(), 'kort-ord')}</span></button>`, pt, () => anvandAlt(a), plats);
        else ui.handknapp(pt, () => anvandAlt(a), plats); // ett föremål utan ord (färg, storlek): handen
      };
      /** Lappen eller handen: en sak öppnas, en utgång går hjälten igenom. @param {any} a */
      const anvandAlt = (a) => {
        if (upptagen || ui.nosAktiv) return;
        const o = rum.ruta(a.objekt); if (!o) return;
        if (arUtgang(o.id)) { const f = framfor(o); inmatning.sattGaTill(f.x, f.y); }
        else valj(a.id);
      };
      /** utgångar hjälten har varit borta från sedan valet började: att stå kvar på tröskeln räknas inte som att gå igenom */
      const vapnade = new Set();
      const tick = window.setInterval(() => {
        if (upptagen || rum.fryst) return;
        for (const id of kvarUtgangar()) { const o = rum.ruta(id); if (o && !genom(o, rum.pos)) vapnade.add(id); }
        const sak = rum.starVid(kvarSaker());
        const ut = kvarUtgangar().map((id) => rum.ruta(id)).find((o) => o && naraUtgang(o)) ?? null;
        visaLappen(sak ?? ut?.id ?? null);
        // att gå igenom utgången är valet
        if (ut && vapnade.has(ut.id) && genom(ut, rum.pos)) { const a = altFor(ut.id); if (a) valj(a.id); }
      }, 60);
      const sluta = lyssnaHandling((h) => { if (h.typ === 'interagera' && vid) { const a = altFor(vid); if (a) anvandAlt(a); } });
      rum.tryckPa = (/** @type {string} */ id) => { if (id === vid) { const a = altFor(id); if (a) anvandAlt(a); } };
      // ett tryck på en dörr i valet går först fram till lappen, och först nästa tryck går igenom
      rum.malFor = (/** @type {any} */ o) => {
        const a = o.sort === 'utgang' ? altFor(o.id) : null;
        if (!a) return null;
        return vid === o.id ? framfor(o) : lasplats(o);
      };
      const stada = () => { window.clearInterval(tick); sluta(); k.stopp(); rum.tryckPa = null; rum.malFor = null; rum.nara(null); rum.sattInteraktiva([]); ui.ordskylt(null); ui.handknapp(null); doljEtikett.clear(); visaEtiketter(); };
      const valj = async (/** @type {string} */ altId) => {
        if (upptagen) return;
        k.nollstall();
        const alt = v.s.alternativ.find((a) => a.id === altId);
        const o = alt ? rum.ruta(alt.objekt) : null;
        const utgang = !!o && o.sort === 'utgang';
        const r = v.valj(altId);
        upptagen = true; visaLappen(null);
        if (r.resultat === 'fel') {
          rum.frys(true);
          ljud.spela('fel');
          borta.add(altId); aktuellVariant = v.s.variantNyckel;
          if (utgang && o) {
            // dörren öppnas aldrig: hjälten tar ett steg tillbaka in i rummet
            const l = lasplats(o);
            await rum.ga(l, tid(250));
          } else if (alt?.objekt) rum.tomt(alt.objekt);
          await reaktion(r.reaktion);
          // förenklingen kan ha tagit bort alternativ: lådor blir tomma, dörrar och stigar spikas igen
          for (const a of /** @type {any[]} */ (Object.values(p.varianter).flatMap((x) => /** @type {any} */ (x).alternativ))) {
            if (!v.s.alternativ.some((x) => x.id === a.id) && a.objekt) { if (arUtgang(a.objekt)) rum.spika(a.objekt); else rum.tomt(a.objekt); }
          }
          // varianten kan ha bytts (förenkling): lådorna visar de nya alternativens färg och storlek
          for (const a of v.s.alternativ) { const e = egenskaper(a.bild || a.id); if (a.objekt && (e.farg || e.storlek)) rum.visaDelar(a.objekt, delarAv([a])); }
          rum.sattInteraktiva(kvarSaker());
          const pekar = v.s.pekar ? v.s.alternativ.find((a) => a.id === v.s.pekar) : null;
          if (pekar?.objekt) rum.markera(pekar.objekt, true);
          fraga();
          rum.frys(false); upptagen = false;
          return;
        }
        ljud.spela('ratt');
        stada();
        ui.visaTanke(null);
        for (const a of v.s.alternativ) if (a.objekt) rum.markera(a.objekt, false);
        rum.frys(true);
        await reaktion(r.reaktion);
        klar({ niva: v.s.variantNyckel, forstaForsoket: v.forstaForsoket, forsok: v.s.forsok, hjalp: spar.hjalp });
      };
    });
  }

  /** Formel med brickor (P11). @param {any} p */
  async function formel(p) {
    const f = skapaFormel(p);
    const spar = { hjalp: false };
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    return new Promise((klar) => {
      let upptagen = false;
      const k = knuffKlocka(p.knuff, () => ui.plattan.querySelector('.forebild .bokstav')?.classList.add('blinkar'));
      const rita = () => {
        const bokstav = (/** @type {number | null} */ id) => (id === null ? '' : f.s.brickor.find((x) => x.id === id)?.bokstav ?? '');
        const forebild = p.forebild ? `<div class="forebild" aria-label="Förebild">${[...p.forebild.text].map((c) => `<span class="bokstav">${ui.esc(c)}</span>`).join('')}</div>` : '';
        const platser = `<div class="platser">${f.s.platser.map((id, i) => `<span class="plats ${f.s.last[i] ? 'last' : ''} ${id !== null && !f.s.last[i] ? 'flyttbar' : ''}" data-plats="${i}" ${id !== null ? `data-id="${id}"` : ''}>${ui.esc(bokstav(id))}</span>`).join('')}</div>`;
        const brickor = `<div class="brickor">${f.s.brickor.map((x) => `<button type="button" class="bricka ${f.s.platser.includes(x.id) ? 'anvand' : ''} ${f.s.tips === x.id ? 'tips' : ''}" data-id="${x.id}">${ui.esc(x.bokstav)}</button>`).join('')}<button type="button" class="bricka sudda" aria-label="Ta tillbaka">⌫</button></div>`;
        ui.visaPlatta(`<div class="formel-ruta">${forebild}${platser}${brickor}</div>`, 'pussel P11_formel');
        tillatNos(p, spar);
        ui.plattan.querySelectorAll('.bricka[data-id]').forEach((el) => {
          el.addEventListener('click', () => { if (!dra.nyss) svar(f.lagg(Number(/** @type {HTMLElement} */ (el).dataset.id))); });
          el.addEventListener('pointerdown', (e) => borjaDra(/** @type {PointerEvent} */ (e), /** @type {HTMLElement} */ (el)));
        });
        ui.plattan.querySelectorAll('.plats.flyttbar').forEach((el) => {
          // tryck på en lagd bokstav skickar tillbaka den
          el.addEventListener('click', () => { if (!dra.nyss && !upptagen && f.taBort(Number(/** @type {HTMLElement} */ (el).dataset.plats))) { ljud.spela('klick'); rita(); } });
          el.addEventListener('pointerdown', (e) => borjaDra(/** @type {PointerEvent} */ (e), /** @type {HTMLElement} */ (el)));
        });
        ui.plattan.querySelector('.sudda')?.addEventListener('click', () => { if (!upptagen && f.sudda()) { ljud.spela('klick'); rita(); } });
      };
      // Dra och släpp: en bricka eller en lagd bokstav kan dras till valfri plats, eller tillbaka.
      // Ett vanligt tryck fungerar som förut (rörelse under 8 px räknas som tryck).
      const dra = { nyss: false };
      const borjaDra = (/** @type {PointerEvent} */ e, /** @type {HTMLElement} */ kalla) => {
        if (upptagen || e.button > 0) return;
        const brickId = Number(kalla.dataset.id), franPlats = kalla.dataset.plats !== undefined ? Number(kalla.dataset.plats) : -1;
        const x0 = e.clientX, y0 = e.clientY;
        /** @type {HTMLElement | null} */ let spoke = null;
        const flytta = (/** @type {PointerEvent} */ ev) => {
          if (!spoke && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
          if (!spoke) {
            const r = kalla.getBoundingClientRect();
            spoke = document.createElement('div');
            spoke.className = 'bricka dras';
            spoke.textContent = kalla.textContent;
            spoke.style.width = r.width + 'px'; spoke.style.height = r.height + 'px';
            document.body.appendChild(spoke);
            kalla.classList.add('lyft');
          }
          spoke.style.left = ev.clientX + 'px'; spoke.style.top = ev.clientY + 'px';
          ui.plattan.querySelectorAll('.plats').forEach((pl) => pl.classList.toggle('over', pl === under(ev)));
        };
        const under = (/** @type {PointerEvent} */ ev) => {
          const el = document.elementsFromPoint(ev.clientX, ev.clientY).find((x) => x.classList.contains('plats'));
          return /** @type {HTMLElement | undefined} */ (el);
        };
        const slapp = (/** @type {PointerEvent} */ ev) => {
          window.removeEventListener('pointermove', flytta); window.removeEventListener('pointerup', slapp); window.removeEventListener('pointercancel', slapp);
          if (!spoke) return; // ett tryck: click sköter det
          spoke.remove(); kalla.classList.remove('lyft');
          dra.nyss = true; setTimeout(() => { dra.nyss = false; }, 0);
          const mal = ev.type === 'pointerup' ? under(ev) : undefined;
          if (mal) { const r = f.laggPa(brickId, Number(mal.dataset.plats)); if (r.resultat === 'ingen') rita(); else svar(r); return; }
          if (franPlats >= 0 && f.taBort(franPlats)) ljud.spela('klick'); // utanför platserna: tillbaka till raden
          rita();
        };
        window.addEventListener('pointermove', flytta); window.addEventListener('pointerup', slapp); window.addEventListener('pointercancel', slapp);
      };
      const svar = async (/** @type {{ resultat: string, reaktion: any }} */ r) => {
        if (upptagen || r.resultat === 'ingen') return;
        k.nollstall();
        upptagen = true;
        if (r.resultat === 'lagd') { ljud.spela('bricka'); rita(); upptagen = false; return; }
        rita();
        if (r.resultat === 'fel') { ljud.spela('fel'); ui.plattan.querySelector('.platser')?.classList.add('skakar'); await vanta(tid(400)); await reaktion(r.reaktion); rita(); upptagen = false; return; }
        k.stopp(); sluta();
        ljud.spela('ratt');
        const ordet = `<div class="formel-i-luften">${ui.esc(p.svar)}</div>`;
        ui.visaPlatta(ordet, 'formel-luft');
        await vanta(tid(1000)); ui.doljPlatta();
        await reaktion(r.reaktion);
        klar({ niva: p.niva, forstaForsoket: f.forstaForsoket, forsok: f.s.fel + 1, hjalp: spar.hjalp });
      };
      const sluta = lyssnaHandling((h) => {
        if (h.typ === 'bokstav') svar(f.skriv(h.tecken));
        if (h.typ === 'sudda' && !upptagen && f.sudda()) rita();
      });
      rita();
    });
  }

  /** Fritt namn (P12). Skärmtangentbordet på pekskärm, med skrivläget. @param {any} p */
  async function dop(p) {
    const n = skapaDop(p);
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    return new Promise((klar) => {
      const k = knuffKlocka(p.knuff, () => tangentbord.blinka());
      const rita = () => {
        const rutor = Array.from({ length: n.s.max }, (_, i) => `<span class="ruta ${i < n.s.namn.length ? 'fylld' : ''}">${ui.esc(n.s.namn[i] || '')}</span>`).join('');
        ui.visaPlatta(`<div class="dop-ruta"><div class="namnrutor">${rutor}</div><div class="dop-knappar">${d.pek() ? '' : '<button type="button" class="knapp visa-tb" aria-label="Visa tangentbordet">⌨</button>'}<button type="button" class="knapp sudda" aria-label="Sudda">⌫</button><button type="button" class="knapp klar ${n.kanKlar ? '' : 'av'}" aria-label="Klar">✓</button></div></div>`, 'pussel P12_dop');
        tangentbord.klarAktiv(n.kanKlar);
        ui.plattan.querySelector('.sudda')?.addEventListener('click', () => { if (n.sudda()) { ljud.spela('klick'); rita(); } });
        ui.plattan.querySelector('.klar')?.addEventListener('click', () => fardig());
        ui.plattan.querySelector('.visa-tb')?.addEventListener('click', () => visaTangentbord());
      };
      const skriv = (/** @type {string} */ bokstav) => { k.nollstall(); if (n.skriv(bokstav)) { ljud.spela('bricka'); rita(); } };
      const visaTangentbord = () => { tangentbord.visa(); layout.sattReserv(TANGENTBORD_HOJD); };
      let fardigt = false;
      const fardig = async () => {
        const namn = n.klar(); if (!namn || fardigt) return;
        fardigt = true; k.stopp(); sluta();
        tangentbord.dolj(); layout.sattReserv(0);
        ljud.spela('ratt');
        ui.visaPlatta(`<div class="formel-i-luften">${ui.esc(namn)}</div>`, 'formel-luft');
        await vanta(tid(1000)); ui.doljPlatta();
        if (p.vid_ratt) await reaktion(p.vid_ratt);
        klar({ namn });
      };
      const sluta = lyssnaHandling((h) => {
        if (h.typ === 'bokstav') skriv(h.tecken);
        if (h.typ === 'sudda' && n.sudda()) rita();
        if (h.typ === 'interagera') fardig();
      });
      if (d.pek()) visaTangentbord();
      rita();
    });
  }

  /** Krukorna (P26): svinga staven mot krukorna i rummet. @param {any} p */
  async function krukor(p) {
    const k = skapaKrukor(p);
    rum.frys(false);
    // kartan säger vilket föremål som är krukorna (visar: pusslets id)
    const bas = visarFor(p.id)?.id ?? rum.objekt.find((o) => o.sort === 'sak')?.id ?? '';
    if (!visarFor(p.id)) logg.handelse('FEL', `ingen karta visar ${p.id}, krukorna hamnar vid ${bas}`);
    const ids = rum.dela(bas, k.s.antal);
    visaEtiketter();
    const knuff = knuffKlocka(p.knuff, () => { const i = k.s.slagna.findIndex((x) => x === null); if (i >= 0) rum.markera(ids[i], true); });
    while (!k.s.klar) {
      const kvar = ids.filter((_, i) => k.s.slagna[i] === null);
      const id = await anvand(kvar);
      knuff.nollstall(); rum.markera(id, false);
      const fynd = k.sla(ids.indexOf(id));
      ljud.spela('sla'); rum.slagen(id);
      if (fynd === 'bar') { av.bar++; ui.uppdateraHud(av); ljud.spela('bar'); await ui.visaFest('🫐', tid(600)); }
      else if (fynd && fynd.startsWith('kartbit')) { await ui.visaFest('📜', tid(900)); }
      else await vanta(tid(300));
    }
    knuff.stopp();
    return {};
  }

  /** Lappen (läsplattan utan pussel): visas, nosen tillåten, stängs med ▶. @param {any} p @param {boolean} forsta */
  async function visaLapp(p, forsta) {
    if (!p) return;
    const niva = lasniva(p.typ);
    const v = skapaValj(p, { niva });
    rum.frys(true);
    const el = ui.visaPlatta(`<div class="pussel-ruta"><div class="lapp p-${ui.esc(p.papper || 'lapp')}">${ui.rader(v.s.text || '', varden())}</div><button type="button" class="vidare synlig" aria-label="Stäng">▶</button></div>`, 'pussel lapp-vy');
    tillatNos(p, { hjalp: false });
    const vidare = /** @type {HTMLElement} */ (el.querySelector('.vidare'));
    await ui.vantaFortsatt(vidare, lyssnaHandling);
    ui.doljPlatta(); if (!forsta) rum.frys(false);
    ui.uppdateraHud(av);
  }
  // Bärräknaren matar ungen: ett bär flyger till ungen, ungen hoppar och låter glad, räknaren går ned.
  // Vid 0 bär rycker ungen på axlarna, utan straff. Bara när världen går (inte med läsplattan öppen).
  ui.$('#hud-bar').addEventListener('click', () => {
    if (!b || !ui.plattan.hidden || rum.fryst || !rum.harRum || !rum.unge.visible || pausad) return;
    if (av.bar <= 0) { rum.ungeReagerar(false); ljud.spela('klick'); logg.handelse('bär', 'tom påse'); return; }
    av.bar--; ui.uppdateraHud(av); spara();
    logg.handelse('bär', 'ungen äter', { kvar: av.bar });
    const fran = ui.$('#hud-bar').getBoundingClientRect();
    const u = rum.ungePunkt, till = rumTillSkarm(layout.skala, u.x, u.y);
    ui.flygBar({ x: fran.left + fran.width / 2, y: fran.top + fran.height / 2 }, till, tid(450)).then(() => {
      rum.ungeReagerar(true); ljud.spela('unge');
    });
  });
  ui.$('#hud-lapp').addEventListener('click', () => {
    if (!ui.plattan.hidden) return;
    const id = av.lappar[av.lappar.length - 1];
    if (id) visaLapp(b.pussel(id), false);
  });

  /** Farfars bok. @param {any} st */
  async function bok(st) {
    rum.frys(true);
    let i = 0;
    await new Promise((klar) => {
      const rita = () => {
        const u = st.uppslag[i];
        const sist = i === st.uppslag.length - 1;
        ui.visaPlatta(`<div class="bok-ruta"><div class="uppslag"><div class="bok-bild">${bilder.html(u.bild)}</div>${u.bildtext ? `<div class="bildtext">${ui.rader(u.bildtext, varden())}</div>` : ''}<div class="boktext">${ui.rader(u.text, varden())}</div></div>
          <div class="bok-knappar"><button type="button" class="knapp bak ${i === 0 ? 'av' : ''}" aria-label="Bakåt">◀</button><button type="button" class="knapp las" aria-label="Läs">🔊</button><button type="button" class="knapp fram" aria-label="${sist ? 'Klar' : 'Framåt'}">${sist ? '✓' : '▶'}</button></div></div>`, 'bok');
        ui.sattNos(true, { betala: () => true });
        const plat = ui.plattan;
        const las = () => sag({ talare: st.talare, text: u.text, upplast: true });
        plat.querySelector('.las')?.addEventListener('click', las);
        plat.querySelector('.bok-bild')?.addEventListener('click', las);
        plat.querySelector('.bak')?.addEventListener('click', () => { if (i > 0) { rost.tyst(); i--; rita(); } });
        plat.querySelector('.fram')?.addEventListener('click', () => { rost.tyst(); if (sist) { sluta(); klar(undefined); } else { i++; ljud.spela('klick'); rita(); } });
        if (!st.las_upp_efter_tryck) las();
      };
      const sluta = lyssnaHandling((h) => { if (h.typ === 'interagera') /** @type {HTMLElement | null} */ (ui.plattan.querySelector('.fram'))?.click(); });
      rita();
    });
    ui.doljPlatta();
  }

  /** Välj hjältens utseende (bara bilder). @param {any} st */
  async function skapaHjalte(st) {
    const val = (tillstand.spelare.hjalte.utseende = { ...tillstand.spelare.hjalte.utseende });
    await new Promise((klar) => {
      const hex = (/** @type {number} */ n) => '#' + n.toString(16).padStart(6, '0');
      const rita = () => {
        const rader = st.delar.filter((/** @type {string} */ del) => del in HJALTE_FARGER).map((/** @type {keyof HJALTE_FARGER} */ del) =>
          `<div class="valrad" data-del="${del}">${HJALTE_FARGER[del].map((f, i) => `<button type="button" class="farg ${(val[del] ?? 0) === i ? 'vald' : ''}" data-i="${i}" style="background:${hex(f)}" aria-label="${del} ${i + 1}"></button>`).join('')}</div>`).join('');
        const f = (/** @type {keyof HJALTE_FARGER} */ del) => hex(HJALTE_FARGER[del][val[del] ?? 0]);
        // spelarens figur: rund hjälm runt ett stort ansikte, dräkt, armar i hudfärgen, skor
        const bild = `<div class="hjalte-bild" aria-hidden="true"><span class="hb-hjalm" style="background:${f('hatt')}"><span class="hb-ansikte" style="background:${f('hudton')}"><i></i><i></i><b></b></span></span><span class="hb-kropp"><span class="hb-arm" style="background:${f('hudton')}"></span><span class="hb-drakt" style="background:${f('klader')}"></span><span class="hb-arm" style="background:${f('hudton')}"></span></span><span class="hb-skor"><span style="background:${f('kropp')}"></span><span style="background:${f('kropp')}"></span></span></div>`;
        ui.visaPlatta(`<div class="hjalte-ruta">${bild}<div class="valrader">${rader}</div><button type="button" class="knapp klar" aria-label="Klar">✓</button></div>`, 'pussel hjalte');
        ui.plattan.querySelectorAll('.farg').forEach((el) => el.addEventListener('click', () => {
          const e = /** @type {HTMLElement} */ (el); const del = /** @type {HTMLElement} */ (e.parentElement).dataset.del || '';
          val[del] = Number(e.dataset.i); rum.sattUtseende(val); ljud.spela('klick'); rita();
        }));
        ui.plattan.querySelector('.klar')?.addEventListener('click', () => { sluta(); klar(undefined); });
      };
      const sluta = lyssnaHandling((h) => { if (h.typ === 'interagera') { sluta(); klar(undefined); } });
      rita();
    });
    rum.sattUtseende(val);
    ui.doljPlatta();
    spara();
  }

  /** Fri lek: svinga staven mot föremålen tills spelaren går vidare. @param {any} st */
  /**
   * Fritt: spelaren får svinga staven mot föremålen (bär trillar ut), men behöver inte. Ingen knapp:
   * steget tar slut när föremålen har gett sina bär, när hjälten går mot en utgång eller genom en öppning (grinden),
   * eller när inget har hänt på en stund. Mellanslag svingar staven.
   * @param {any} st
   */
  async function fritt(st) {
    rum.frys(false);
    const foremal = /** @type {string[]} */ (st.foremal || []);
    // väntetiden är spelarens tid, inte en animation: den kortas inte i snabbläget
    const BAR_PER = 2, STILLA_MS = 25000;
    const slagna = new Map();
    let senast = performance.now();
    /** @type {ReturnType<typeof anvand> | null} */
    let vantar = null;
    let klar = false;
    /** @type {() => void} */
    let slut = () => {};
    const slutat = new Promise((r) => { slut = () => { klar = true; r(undefined); }; });
    // går hjälten mot en utgång, eller står stilla länge, går berättelsen vidare
    const nara = (/** @type {any} */ o) => vidObjekt(rum.pos, o) || genom(o, rum.pos) || Math.hypot(rum.pos.x - framfor(o).x, rum.pos.y - framfor(o).y) <= 24;
    const vakt = window.setInterval(() => {
      if (rum.fryst || pausad) { senast = performance.now(); return; }
      // på väg ut: vid en utgång, eller i en öppning man går genom (grinden, en stig)
      const iOppning = (/** @type {any} */ o) => o.golv && rum.pos.x >= o.x - 4 && rum.pos.x <= o.x + o.b + 4 && rum.pos.y >= o.y - 4 && rum.pos.y <= o.y + o.h + 8;
      if (rum.objekt.some((o) => (o.sort === 'utgang' && nara(o)) || iOppning(o))) slut();
      else if (performance.now() - senast > STILLA_MS) slut();
    }, 100);
    // har hjälten rört sig räknas det som att något händer
    let forra = { ...rum.pos };
    const rorelse = window.setInterval(() => { if (Math.hypot(rum.pos.x - forra.x, rum.pos.y - forra.y) > 2) senast = performance.now(); forra = { ...rum.pos }; }, 250);
    (async () => {
      while (!klar) {
        vantar = anvand(foremal);
        const id = await Promise.race([vantar, slutat.then(() => null)]);
        if (!id || klar) break;
        senast = performance.now();
        const n = (slagna.get(id) || 0) + 1; slagna.set(id, n);
        ljud.spela('sla');
        if (n <= BAR_PER) { av.bar++; ui.uppdateraHud(av); ljud.spela('bar'); await ui.visaFest('🫐', tid(500)); }
        await vanta(tid(300));
        if (foremal.every((f) => (slagna.get(f) || 0) >= BAR_PER)) slut();
      }
    })();
    await slutat;
    window.clearInterval(vakt); window.clearInterval(rorelse);
    vantar?.avbryt();
  }

  /** Passets slut: föreslå en paus, men tvinga inte. */
  async function passSlut() {
    rum.frys(true);
    tonaNasta = true; // nästa pass börjar en ny stund (ny dag): tona in
    ljud.spela('fest');
    const s = ui.visaSkarm(`<div class="pass-slut"><div class="stor-ikon">🌙</div><div class="knappar"><button type="button" class="knapp stor fortsatt" aria-label="Fortsätt">▶</button><button type="button" class="knapp stor paus" aria-label="Paus">💤</button></div></div>`);
    await new Promise((klar) => {
      s.querySelector('.fortsatt')?.addEventListener('click', () => klar(undefined));
      s.querySelector('.paus')?.addEventListener('click', () => {
        const p = ui.visaSkarm(`<div class="pass-slut"><div class="stor-ikon">💤</div><button type="button" class="knapp stor fortsatt" aria-label="Fortsätt">▶</button></div>`);
        p.querySelector('.fortsatt')?.addEventListener('click', () => klar(undefined));
      });
    });
    ui.doljSkarm();
  }

  // ------------------------------------------------------------------ start, slut, meny
  async function startskarm() {
    const s = ui.visaSkarm(`<div class="start"><div class="stav-glimt" aria-hidden="true"></div><button type="button" class="knapp start-knapp" aria-label="Starta">▶</button></div>`);
    await new Promise((klar) => s.querySelector('.start-knapp')?.addEventListener('click', () => klar(undefined), { once: true }));
    ljud.starta(); rost.lasUpp();
    d.uppdatering.tillampa();
    ui.doljSkarm();
  }

  async function spela() {
    rum.sattUtseende(tillstand.spelare.hjalte.utseende || {});
    await startskarm();
    for (const kapitelId of aventyr.kapitel) {
      const kapitel = d.kapitel.find((k) => k.id === kapitelId);
      if (!kapitel) continue;
      if (av.kapitelId && av.kapitelId !== kapitelId && aventyr.kapitel.indexOf(av.kapitelId) > aventyr.kapitel.indexOf(kapitelId)) continue;
      if (!stodsAvGrabox(kapitel)) break;
      b = skapaBerattelse({ aventyr, kapitel, tillstand, aventyrId: AVENTYR, logg });
      logg.registrera('berättelse', () => ({ kapitel: kapitel.id, scen: b.scen?.id, steg: b.stegIndex, typ: aktuelltSteg?.typ }));
      while (!b.slut) {
        await visaScen();
        const st = b.aktuellt();
        if (!st) break;
        const res = await utfor(st);
        b.klar(res || {});
        spara();
      }
    }
    slutskarm();
  }
  /** Fas 2 spelar bara kapitel vars alla pusseltyper finns. @param {any} kapitel */
  const stodsAvGrabox = (kapitel) => kapitel.pussel.every((/** @type {any} */ p) => ['P1_las_och_valj', 'P28_packa', 'P11_formel', 'P12_dop', 'P26_krukorna'].includes(p.typ));


  function slutskarm() {
    rum.frys(true);
    const s = ui.visaSkarm(`<div class="pass-slut"><div class="stor-ikon">⭐</div><p class="vuxen">Slut på gråboxen. Kapitel 1 kommer i fas 3.</p><button type="button" class="knapp stor om" aria-label="Börja om">↺</button></div>`);
    s.querySelector('.om')?.addEventListener('click', () => { sparning.nollstall(); location.reload(); });
  }

  // gråboxens meny för vuxna: håll inne ⚙ en stund (en ring fylls). Ett kort tryck visar att man ska hålla.
  // Hållet räknas på hela knappen och tål att fingret glider lite, så att det fungerar på iPad.
  const HALL_MS = 800;
  let hallTimer = 0;
  const meny = ui.$('#hud-meny');
  const slapp = () => { clearTimeout(hallTimer); meny.classList.remove('haller'); };
  meny.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { meny.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
    meny.classList.remove('visa-hall'); meny.classList.add('haller');
    hallTimer = window.setTimeout(() => { slapp(); oppnaMeny(); }, HALL_MS);
  });
  meny.addEventListener('pointerup', () => { if (meny.classList.contains('haller')) { meny.classList.add('visa-hall'); setTimeout(() => meny.classList.remove('visa-hall'), 1800); } slapp(); });
  meny.addEventListener('pointercancel', slapp);
  meny.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); oppnaMeny(); } });
  function stangMeny() { ui.doljMeny(); fortsatt('meny'); }
  // Escape stänger menyn (en väg ut, även med tangentbord)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ui.$('#vuxenmeny').hidden) { e.preventDefault(); stangMeny(); } });
  function oppnaMeny() {
    pausa('meny');
    const niva = lasmotor.niva('L', 'P1_las_och_valj');
    const scener = !b ? '' : b.kapitel.scener.map((/** @type {any} */ s, i) => `<button type="button" class="menyval scen ${i === b.scenIndex ? 'nu' : ''}" data-i="${i}">${i + 1}. ${ui.esc(s.id)} <small>(pass ${s.pass})</small></button>`).join('');
    const s = ui.visaMeny(`<div class="meny vuxen"><h2>Gråboxen <small>${ui.esc(String(d.version))}</small></h2>
      <div class="menygrupp"><b>Läsnivå (läs och välj):</b> ${[1, 2, 3, 4].map((n) => `<button type="button" class="menyval niva ${n === niva ? 'nu' : ''}" data-n="${n}">L${n}</button>`).join('')}</div>
      <div class="menygrupp"><label><input type="checkbox" class="foralder" ${inst.foralderLaser ? 'checked' : ''}> Föräldern läser ${ui.esc(Object.values(aventyr.talare).filter((/** @type {any} */ t) => t.rost === 'foraldern_eller_datorrost').map((/** @type {any} */ t) => t.namn).join(' och ') || 'rollernas')} repliker</label>
      <label><input type="checkbox" class="etiketter" ${inst.vuxenEtiketter ? 'checked' : ''}> Visa objektens namn (inte under pussel)</label></div>
      <div class="menygrupp scenlista"><b>Hoppa till scen:</b>${scener}</div>
      <div class="menygrupp"><button type="button" class="menyval logg">Spara loggen</button><button type="button" class="menyval nollstall">Börja om från början</button><button type="button" class="menyval stang">Stäng</button></div></div>`);
    s.querySelectorAll('.niva').forEach((el) => el.addEventListener('click', () => { lasmotor.sattNiva('L', 'P1_las_och_valj', Number(/** @type {HTMLElement} */ (el).dataset.n)); lasmotor.sattNiva('L', 'P28_packa', Number(/** @type {HTMLElement} */ (el).dataset.n)); spara(); oppnaMeny(); }));
    s.querySelector('.foralder')?.addEventListener('change', (e) => { inst.foralderLaser = /** @type {HTMLInputElement} */ (e.target).checked; spara(); });
    s.querySelector('.etiketter')?.addEventListener('change', (e) => { inst.vuxenEtiketter = /** @type {HTMLInputElement} */ (e.target).checked; spara(); visaEtiketter(); });
    s.querySelectorAll('.scen').forEach((el) => el.addEventListener('click', () => {
      const i = Number(/** @type {HTMLElement} */ (el).dataset.i);
      av.scen = i; av.scenId = b.kapitel.scener[i]?.id; av.startad = false; spara();
      // ladda om utan ?ny, annars nollställs sparningen igen
      const u = new URL(location.href); u.searchParams.delete('ny'); location.href = u.toString();
    }));
    s.querySelector('.logg')?.addEventListener('click', () => d.exporteraLogg());
    s.querySelector('.nollstall')?.addEventListener('click', () => { sparning.nollstall(); location.reload(); });
    s.querySelector('.stang')?.addEventListener('click', stangMeny);
  }

  return {
    spela,
    /** För testerna. */
    get scen() { return b?.scen?.id ?? null; },
    get steg() { return aktuelltSteg; },
    get pausad() { return pausad; },
    get variant() { return aktuellVariant; },
    get stegIndex() { return b?.stegIndex ?? null; },
    lasmotor,
  };
}

