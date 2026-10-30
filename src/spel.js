// @ts-check
// Spelet: kopplar berättelsemotorn (karna) till rummet (Phaser) och gränssnittet (DOM).
// Varje stegtyp i innehållet har en hanterare här. Inget innehåll hårdkodas: allt kommer från content/.
import { skapaBerattelse, spolaFram } from './karna/berattelse.js';
import { sammanfatta } from './karna/foraldravy.js';
import { skapaLasmotor, valjVariant } from './karna/lasmotor.js';
import { egenskaper, PALETT } from './karna/egenskaper.js';
import { skapaValj, skapaFormel, skapaDop, skapaKrukor, skapaRaddning } from './karna/pussel.js';
import { forSkarm, versaler } from './karna/text.js';
import { rumTillSkarm, varldTillSkarm, RUM } from './karna/skalning.js';
import { framfor, framforFran, lasplats, vidObjekt, genom, stigStart } from './karna/rumslayout.js';
import { aventyrFor } from './karna/sparning.js';
import { pekningOmMs, skapaHjalpSpar, knufftidMs } from './karna/hjalp.js';
import { HJALTE_FARGER, HJALTE_FAST } from './scener/Rum.js';
import { lagerFor, bytLager } from './karna/hjalte.js';
import { TANGENTBORD_HOJD } from './grans/tangentbord.js';
import { skapaRullning } from './grans/rullning.js';

const KNUFF_MS = 9000;
const vanta = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{ aventyr: any, kartor?: Record<string, import('./karna/karta.js').Karta>, kapitel: any[], ordlistor: any, tillstand: any, sparning: any, logg: any, rost: any, ljud: any,
 *           ui: ReturnType<typeof import('./grans/ui.js').skapaUi>, rum: import('./scener/Rum.js').Rum, layout: any,
 *           inmatning: any, tangentbord: ReturnType<typeof import('./grans/tangentbord.js').skapaTangentbord>,
 *           bilder: ReturnType<typeof import('./grans/bilder.js').skapaBilder>, snabb: boolean, pek: () => boolean,
 *           uppdatering: { tillampa(): void }, valtKapitel?: string | null, version?: string, exporteraLogg?: () => void }} d
 */
export function skapaSpel(d) {
  const { aventyr, kartor = {}, tillstand, sparning, logg, rost, ljud, ui, rum, layout, inmatning, tangentbord, bilder, snabb } = d;
  const AVENTYR = aventyr.id;
  const av = aventyrFor(tillstand, AVENTYR);
  // vuxenEtiketter: föremålens namn i gråboxen, för den vuxne. Avstängt från början (inget för den vuxne syns under ett pass).
  const inst = (tillstand.installningar = { foralderLaser: false, vuxenEtiketter: false, rost: true, markera: true, ...tillstand.installningar });
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
  /**
   * Läsnivån för varje läsval i världen (i_rummet), bestämd när han kom in i rummet. Varianten byts aldrig medan
   * han är kvar i rummet: skyltarna, lådorna och stigarna ändras aldrig framför ögonen på honom (granskningen, punkt 18).
   * @type {Map<string, number>}
   */
  const rumsNiva = new Map();
  /** @param {any} p */
  const nivaFor = (p) => rumsNiva.get(p.id) ?? lasniva(p.typ);
  const varden = () => b.varden();
  /**
   * En punkt i världen på skärmen, via kameran (beslut 14). Allt i textlagret som sitter på något i världen
   * (skyltar, händer, pratbubblor) placeras med den. @param {number} x @param {number} y
   */
  const skarm = (x, y) => varldTillSkarm(layout.skala, rum.kamera, x, y);
  const tid = (/** @type {number} */ ms) => (snabb ? Math.min(ms, 30) : ms);

  // ------------------------------------------------------------------ hjälpare
  /** Lyssna på handlingar (tangenter) så länge ett steg pågår. */
  // När spelet är pausat (menyn för vuxna, dold flik) når inga handlingar stegen.
  const lyssnaHandling = (/** @type {(h: any) => void} */ f) => inmatning.lyssna((/** @type {any} */ h) => { if (!pausad) f(h); });

  /** Läser föräldern den här talarens repliker (Farfar)? @param {any} r */
  const foraldernLaser = (r) => inst.foralderLaser && (aventyr.talare[r?.talare] || {}).rost === 'foraldern_eller_datorrost';
  /** Repliken som den sägs: vanlig skrift, platshållarna ersatta. @param {any} r */
  const talText = (r) => forSkarm(r.text, { varden: varden(), skrift: 'vanlig' }).join(' ');
  /** Säg en replik högt (om den ska läsas upp). Rösten kan stängas av i menyn för vuxna. @param {any} r */
  function sag(r) {
    if (!r || !r.upplast || !inst.rost) return Promise.resolve();
    if (foraldernLaser(r)) return Promise.resolve();
    const t = aventyr.talare[r.talare] || {};
    return rost.saga(talText(r), t.rollrost || 'berattare');
  }
  const rullning = skapaRullning({ ljud, logg });
  /**
   * Repliken rullas fram på läsplattan (beslut 21.2), och rösten läser den med markeringen. Utan röst piper
   * rullningen i ordtakt, och när föräldern läser Farfar är det tyst.
   * @param {HTMLElement} textEl @param {any} r
   */
  function rullaOchSag(textEl, r) {
    const t = aventyr.talare[r.talare] || {};
    const roll = t.rollrost || 'berattare';
    const foralder = foraldernLaser(r);
    const medRost = !!r.upplast && inst.rost && !foralder && rost.harRost;
    return rullning.starta(textEl, {
      // i snabbläget (testerna) syns allt direkt, utom när testet vill se rullningen (?rulla)
      text: talText(r), roll, direkt: snabb && !/[?&]rulla\b/.test(location.search),
      tala: medRost ? (vidOrd) => rost.saga(talText(r), roll, vidOrd) : null,
      pip: !medRost && !foralder,
      markera: inst.markera && medRost,
    });
  }

  /** Nyckeln i senaste för radions senaste replik (dialogregeln: ett tryck på radion upprepar den). */
  const RADIO = '#radio';
  /**
   * Ansiktet i rutan (ingen text): en färgad ring per talare, radions högtalare när repliken hörs genom radion,
   * och stjärnan för berättaren. @param {string} talare @param {boolean} [radio]
   */
  const portratt = (talare, radio = false) => talare === 'berattare'
    ? '<span class="portratt stjarna" aria-hidden="true">★</span>'
    : `<span class="portratt p-${ui.esc(talare)}${radio ? ' radio' : ''}" aria-hidden="true">${radio ? '📻' : ''}</span>`;
  /**
   * En replik på läsplattan i sin familj (beslut 21.1): berättaren i en rak ruta med svalt papper och stjärnan,
   * alla andra i en pratruta med rundade hörn, spets och ansikte. @param {any} r
   */
  const replikHtml = (r) => {
    const familj = r.talare === 'berattare' ? 'berattarruta' : 'pratruta';
    return `<div class="replik-ruta ${familj}${r.via === 'radio' ? ' genom-radio' : ''}">${portratt(r.talare, r.via === 'radio')}<div class="text">${ui.rader(r.text, varden())}</div><button type="button" class="vidare" aria-label="Vidare">▶</button></div>`;
  };

  /** Visa en replik på läsplattan och vänta tills spelaren går vidare. @param {any} r */
  async function replik(r) {
    rum.frys(true);
    if (r.upplast && r.talare && aventyr.talare[r.talare]) senaste.set(r.talare, r);
    if (r.via === 'radio' && r.upplast) senaste.set(RADIO, r);
    if (r.via === 'radio') ui.pulsera('#hud-radio');
    const el = ui.visaPlatta(replikHtml(r), 'replik');
    // nosen fungerar på repliker också, gratis (de läses ändå upp), så att "tryck på nosen" alltid ger svar
    ui.sattNos(true, { betala: () => true });
    const rull = rullaOchSag(/** @type {HTMLElement} */ (el.querySelector('.text')), r);
    // ett tryck medan texten rullar visar allt (rösten läser vidare), nästa tryck går vidare
    const fortsatt = ui.vantaFortsatt(el, lyssnaHandling, () => { if (!rull.rullar()) return false; rull.visaAllt(); return true; });
    await Promise.race([rull.klar, fortsatt]);
    el.classList.add('klar-att-ga');
    await fortsatt;
    rull.stopp();
    rost.tyst();
    ui.doljPlatta();
  }

  /** @type {Map<string, any>} senaste upplästa repliken per talare i scenen: ett tryck på figuren upprepar den */
  const senaste = new Map();
  /** @type {string | null} */
  let senasteScen = null;
  /** @type {Map<string, () => void>} instruktioner som väntar på en handling (mata_ungen) */
  const vantarPaHandling = new Map();
  /** En handling är gjord (ungen har ätit, nosen är tänd). @param {string} namn */
  function handlingGjord(namn) { const f = vantarPaHandling.get(namn); if (f) { vantarPaHandling.delete(namn); f(); } }
  ui.vidNos((vad, ord) => { if (vad === 'tand') handlingGjord('nosen'); else handlingGjord('nosa:' + versaler(ord || '')); });

  /**
   * En instruktion som ber om en handling väntar tills den är gjord ("Tryck på bären, så får {unge} ett.").
   * Den står uppe i rummet medan världen går och läses upp. Efter ca 8 sekunder upprepas den, med en styrbild
   * som pekar på det som ska tryckas. Nästa steg kommer först efter handlingen.
   * @param {any} r
   */
  async function replikVantar(r) {
    if (r.upplast && r.talare && aventyr.talare[r.talare]) senaste.set(r.talare, r);
    rum.frys(false);
    ui.visaTanke(`<span class="instruktion">${ui.rader(r.text, varden())}</span>`);
    sag(r);
    const mal = { mata_ungen: '#hud-bar', nosen: '#hud-nos' }[/** @type {string} */ (r.vantar_pa)];
    // nosen ska gå att tända medan instruktionen väntar (den kostar inget här)
    if (r.vantar_pa === 'nosen') ui.sattNos(true, { betala: () => true });
    // styrbilden: ett finger på det som ska tryckas, eller Tab på datorn när det gäller nosen
    const pekaPa = () => {
      if (r.vantar_pa === 'nosen' && !d.pek()) { const n = ui.$('#hud-nos').getBoundingClientRect(); ui.styrhjalp('tab', { x: n.left + n.width / 2, y: n.bottom }); return; }
      const e = mal ? ui.$(mal) : null; if (!e) return; const b2 = e.getBoundingClientRect(); ui.styrhjalp('tryck', { x: b2.left + b2.width / 2, y: b2.top + b2.height / 2 });
    };
    let t = 0;
    // påminnelsen: en egen replik efter en stund ("Ge {unge} ett bär."), annars upprepas instruktionen
    const pam = r.paminnelse;
    const knuff = () => { t = window.setTimeout(() => {
      if (pausad) { knuff(); return; }
      if (mal) ui.pulsera(mal);
      pekaPa();
      if (pam) { ui.visaTanke(`<span class="instruktion">${ui.rader(pam.replik.text, varden())}</span>`); sag(pam.replik); } else sag(r);
      ui.pulseraTanke();
      logg.handelse('knuff', `väntar på ${r.vantar_pa}`, { paminnelse: !!pam });
    }, pam ? pam.efter_sek * 1000 : 8000); };
    // har han inga bär när ungen ska få ett, trillar ett ner från en buske först (kapitel 1, omsorgen)
    if (r.vantar_pa === 'mata_ungen' && av.bar <= 0) {
      av.bar = 1; ui.uppdateraHud(av); ljud.spela('bar'); logg.handelse('bär', 'ett bär trillar ner (0 bär)');
      ui.visaFest('🫐', tid(700));
    }
    if (mal) ui.pulsera(mal);
    knuff();
    await new Promise((klar) => vantarPaHandling.set(r.vantar_pa, () => klar(undefined)));
    clearTimeout(t);
    ui.styrhjalp(null); ui.visaTanke(null);
  }

  /**
   * En replik i en bubbla ovanför ungen i stället för på läsplattan (namnet som hjälten svarar med i s08).
   * Den läses upp och står kvar en stund efter uppläsningen, men aldrig längre än maxtiden.
   * @param {any} r
   */
  async function replikVidUngen(r) {
    rum.frys(true);
    const u = rum.ungePunkt;
    ui.ropa(ui.rader(r.text, varden()), skarm(u.x, u.y - 12));
    const start = performance.now();
    await Promise.race([sag(r), vanta(6000)]);
    // lästid för spelaren: minst 1,8 s med bubblan, kortas inte i snabbläget
    await vanta(Math.max(0, 1800 - (performance.now() - start)));
    ui.ropa(null);
  }

  /** En reaktion (fel, rätt): regi i bild och eventuell replik. @param {any} h */
  /**
   * Rätt val (stilguiden §7): en egen liten händelse, ca 1–1,5 s. Det han valde hoppar till och lyser, och ungen gör
   * ett glädjehopp. I gråboxen följer handlingen i vid_ratt som regi. Felet är aldrig roligare än så här.
   * @param {string | null} objekt föremålet han valde i rummet (en dörr, en sten), eller null
   */
  async function rattHandelse(objekt) {
    const o = objekt ? rum.ruta(objekt) : null;
    if (o) { rum.hoppa(o.id); rum.markera(o.id, true); }
    rum.ungeReagerar(true); ljud.spela('unge');
    logg.handelse('rätt', objekt ?? 'kort');
    await vanta(tid(1100));
    if (o) rum.markera(o.id, false);
  }

  /**
   * Samma fel en gång till: reaktionen blir kortare, bara ett ljud och ungens frågande blick (stilguiden §7).
   * Ljudet har den som anropar redan spelat.
   */
  async function kortReaktion() {
    rum.ungeReagerar(false);
    await vanta(tid(600));
  }

  /**
   * Ljudordet (beslut 21.5) i världen vid det som låter: ovanför föremålet, annars överst mitt på skärmen
   * (dunket från vinden, fågeln vid fönstret). Det står i världen, så det syns inte när läsplattan täcker den.
   * @param {string | undefined} ord @param {string} [ljudId] @param {string | null} [foremal]
   */
  function visaLjudord(ord, ljudId, foremal) {
    if (!ord || !rum.harRum) return;
    const o = foremal ? rum.ruta(foremal) : null;
    const s = layout.skala;
    const punkt = o ? skarm(o.x + o.b / 2, o.y + 4) : { x: s.vanster + s.cssBredd / 2, y: s.topp + s.cssHojd * 0.3 };
    ui.ljudord(ord, punkt, ljud.farg(ljudId || ''));
    logg.handelse('ljudord', ord);
  }

  async function reaktion(h, foremal = /** @type {string | null} */ (null)) {
    if (!h) return;
    if (h.ljudord) visaLjudord(h.ljudord, '', foremal);
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

  /**
   * Knuff efter en stunds tvekan. Returnerar en funktion som nollställer klockan.
   * extra = hjälp som upprepar frågan (tankebubblan blinkar): den kommer alltid efter tvekan.
   * En knuff med pekar: true pekar på svaret (ungen lutar sig mot rätt dörr). Med en vakt väntar den tills
   * pekningen är tillåten (karna/hjalp.js): efter första felet, eller efter 4 s per alternativ och minst 12 s.
   * @param {any} knuff @param {() => void} [extra]
   * @param {{ pekOmMs: () => number, spar: ReturnType<typeof skapaHjalpSpar>, peka?: () => boolean }} [vakt]
   * peka = visa pekningen i världen (ungen springer till rätt dörr). Då visas inte knuffens beskrivning, som är skriven för den vuxne.
   * @param {number} [efterMs] tiden när knuffen inte har efter_sek (läsplattan: efter textmängden)
   */
  function knuffKlocka(knuff, extra, vakt, efterMs = KNUFF_MS) {
    if (!knuff) return { nollstall() {}, stopp() {} };
    let t = 0, t2 = 0;
    const visa = async () => {
      if (pausad) { t2 = window.setTimeout(visa, 500); return; }
      const visad = !!knuff.pekar && !!vakt?.peka?.();
      logg.handelse('knuff', knuff.handling, { pekar: !!knuff.pekar, ungenPekar: visad });
      vakt?.spar.knuff(!!knuff.pekar);
      if (knuff.handling && !visad) ui.visaRegi(knuff.handling, 0);
      if (knuff.replik) await sag(knuff.replik); else await vanta(2500);
      ui.doljRegi();
    };
    const starta = () => {
      clearTimeout(t); clearTimeout(t2);
      t = window.setTimeout(() => {
        if (pausad) { starta(); return; }
        extra?.(); vakt?.spar.knuff(false);
        if (!knuff.handling && !knuff.replik) return;
        const om = knuff.pekar && vakt ? vakt.pekOmMs() : 0;
        if (om > 0) { logg.handelse('knuff', 'pekningen väntar', { ms: om }); t2 = window.setTimeout(visa, om); }
        else visa();
      }, (knuff.efter_sek ? knuff.efter_sek * 1000 : efterMs));
    };
    starta();
    return { nollstall: starta, stopp() { clearTimeout(t); clearTimeout(t2); } };
  }

  /** Loggen: varje val, och om en knuff eller pekning kom före det. @param {any} p @param {string} altId @param {string} resultat @param {ReturnType<typeof skapaHjalpSpar>} spar */
  function loggaVal(p, altId, resultat, spar) {
    logg.handelse('val', `${p.id}: ${altId}`, { resultat, sek: Math.round(spar.sedanStart() / 100) / 10, ...spar.fore() });
  }

  /** Nosen: tillåten i pussel med hjälp "ett_ord". Kostar ett bär, gratis vid 0 bär. @param {any} pussel @param {{ hjalp: boolean }} spar */
  function tillatNos(pussel, spar) {
    const tillaten = !!pussel && pussel.hjalp === 'ett_ord';
    ui.sattNos(tillaten, {
      betala: () => {
        if (av.bar > 0) {
          av.bar--; ui.uppdateraHud(av);
          // nosens pris syns: ett bär flyger från räknaren till nosen (stubbe i gråboxen)
          const fr = ui.$('#hud-bar').getBoundingClientRect(), ti = ui.$('#hud-nos').getBoundingClientRect();
          if (fr.width && ti.width) ui.flygBar({ x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 }, { x: ti.left + ti.width / 2, y: ti.top + ti.height / 2 }, tid(400));
        }
        return true;
      },
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
      const [, v] = valjVariant(p.varianter, nivaFor(p));
      for (const a of v.alternativ) {
        const e = egenskaper(a.bild || a.id);
        if (a.objekt && iKartan.has(a.objekt) && (e.farg || e.storlek)) ut[a.objekt] = delarAv([a]);
      }
    }
    return ut;
  }

  /**
   * Ordet på en utgångs skylt (Farfars lapp på dörren, skylten vid stigen). Kartan har bara id:n, så ordet
   * hämtas från kapitlets läsval i rummet som har utgången som alternativ, i den variant spelaren får.
   * @param {string} id
   */
  /** Pilskylt vid en stig: pilen pekar längs stigen (grind A). Ingen pil på dörrar. @param {any} o */
  const pilFor = (o) => (o.golv && o.riktning ? `<span class="pil" aria-hidden="true">${{ hoger: '→', vanster: '←', upp: '↑', ned: '↓' }[/** @type {string} */ (o.riktning)] || ''}</span>` : '');
  function skyltOrd(id) {
    for (const p of b.kapitel.pussel) {
      if (!p.i_rummet || !p.varianter) continue;
      const [, v] = valjVariant(p.varianter, nivaFor(p));
      const a = v.alternativ.find((/** @type {any} */ x) => x.objekt === id && x.ord);
      if (a) return /** @type {string} */ (a.ord);
    }
    return null;
  }
  /**
   * Skyltarna på rummets utgångar syns hela tiden, även utanför valen (beslut 9). Ett tryck på en skylt går dit.
   * Returnerar en funktion som tar bort dem.
   */
  function visaUtgangsSkyltar() {
    const rita = () => {
      const lista = [];
      for (const o of rum.objekt) {
        if (o.sort !== 'utgang') continue;
        const ord = skyltOrd(o.id);
        if (!ord) continue;
        const [punkt, plats] = skyltPlats((o.lapp && rum.ruta(o.lapp)) || o);
        lista.push({ objekt: o.id, punkt, plats, vidTryck: () => { if (rum.fryst) return; const f = framfor(o); inmatning.sattGaTill(f.x, f.y); },
          html: `<button type="button" class="kort${o.golv ? ' stigskylt' : ''}" data-id="${ui.esc(o.id)}"><span class="kort-etikett">${ui.rader(ord, varden(), 'kort-ord')}</span>${pilFor(o)}</button>` });
      }
      ui.skyltar(lista);
    };
    rita();
    skyltarNu = rita;
    return () => { if (skyltarNu === rita) { skyltarNu = null; ui.skyltar([]); } };
  }

  /** @type {any} scenen vars rum visas just nu (en frivillig scen visas utanför berättelsens ordning) */
  let visadScen = null;
  /**
   * Rummet en utgång leder till (kartans "till", eller rummet i utgångens id när kartan saknas: stig_buskarna →
   * buskarna), om rummet finns i kapitlet. @param {any} o @returns {string | null}
   */
  const tillFor = (o) => {
    if (!o || o.sort !== 'utgang') return null;
    const t = o.till ?? /^(?:stig|dorr|stege|grind)_(.+)$/.exec(o.id)?.[1];
    return t && b?.rum(t) ? t : null;
  };

  /** Formelpussel som är lösta i det här passet (formeln läggs på staven när steget är klart). @type {Set<string>} */
  const losta = new Set();
  /**
   * Rummets föremål just nu (T5):
   * - av ett läsval i världen syns bara den variant han får, så att L2:s stenar inte står bredvid L3:s
   *   (den rätta stenen står på samma plats i båda);
   * - ett föremål som försvinner efter en formel (kartans forsvinner_efter: lianerna som SVÄRD kapar) är borta när
   *   hjälten har formeln.
   * @param {any} r rummet i kapitlet
   */
  function innehallNu(r) {
    const borta = new Set();
    const iRummet = new Set(r.innehall.map((/** @type {any} */ x) => (typeof x === 'string' ? x : x.id)));
    for (const p of b.kapitel.pussel) {
      if (!p.i_rummet || !p.varianter) continue;
      const alla = Object.values(p.varianter).flatMap((/** @type {any} */ v) => v.alternativ.map((/** @type {any} */ a) => a.objekt)).filter((/** @type {any} */ id) => id && iRummet.has(id));
      if (!alla.length) continue;
      const [, v] = valjVariant(p.varianter, nivaFor(p));
      const med = new Set(v.alternativ.map((/** @type {any} */ a) => a.objekt));
      for (const id of alla) if (!med.has(id)) borta.add(id);
    }
    const formler = tillstand.spelare.hjalte.formler || [];
    for (const o of kartor[r.id]?.objekt || []) {
      if (!o.forsvinnerEfter) continue;
      const p = b.pussel(o.forsvinnerEfter);
      if (losta.has(o.forsvinnerEfter) || (p && formler.includes(p.svar))) borta.add(o.id);
    }
    return borta.size ? r.innehall.filter((/** @type {any} */ x) => !borta.has(typeof x === 'string' ? x : x.id)) : r.innehall;
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
  /**
   * @param {any} [scen] scenen vars rum ska visas: berättelsens, eller en frivillig scen (buskarna)
   * @param {any} [steg] steget som ska utföras (annars berättelsens aktuella), för närbilden
   */
  async function visaScen(scen = b.scen, steg = undefined) {
    if (!scen) return;
    visadScen = scen;
    if (scen.id !== senasteScen) { senaste.clear(); senasteScen = scen.id; }
    const nytt = scen.rum !== aktuelltRum;
    const franRum = aktuelltRum ?? null;
    aktuelltRum = scen.rum;
    const r = scen.rum ? b.rum(scen.rum) : null;
    // varianten för läsvalen i världen bestäms när han kommer in i rummet
    if (nytt) { rumsNiva.clear(); for (const p of b.kapitel.pussel) if (p.i_rummet && p.varianter) rumsNiva.set(p.id, lasniva(p.typ)); }
    // utgången i förra rummet som leder hit, och åt vilket håll den leder
    const ut = nytt && franRum && scen.rum ? rum.objekt.find((o) => tillFor(o) === scen.rum) : null;
    const glida = !!(ut && ut.riktning) && !tonaNasta;
    const tonas = (nytt && !glida) || (tonaNasta && !!scen.rum);
    let forra = null;
    if (glida) { rum.frys(true); forra = await rum.bild(); }
    if (tonas) { rum.frys(true); await ui.tona(true, tid(300)); }
    rum.visa({ rum: scen.rum, tillstand: b.rumsTillstand(scen.rum), innehall: r ? innehallNu(r) : [], unge: tillstand.spelare.unge?.folj ?? !!tillstand.spelare.unge?.namn, nyttRum: nytt,
      karta: scen.rum ? kartor[scen.rum] ?? null : null, franRum, delar: scen.rum ? delarIRummet(kartor[scen.rum]) : {}, visade: scen.rum ? b.visade(scen.rum) : [] });
    visaRumsskyltar();
    // närbilden (t.ex. kartbiten) visas tills spelaren ska röra sig i rummet igen
    const st = steg === undefined ? b.aktuellt() : steg;
    const sp = st && st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
    const iRummet = st && (st.typ === 'ga_till' || st.typ === 'fritt' || st.typ === 'las_skylt' || sp?.typ === 'P26_krukorna' || !!sp?.i_rummet);
    ui.$('#narbild').hidden = scen.vy !== 'narbild' || !!iRummet;
    ui.uppdateraHud(av); visaPausknapp();
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
    ui.etiketter(rum.objekt.filter((o) => o.sort !== 'utgang' && !doljEtikett.has(o.id)), (x, y) => skarm(x, y), inst.vuxenEtiketter && !pusselPagar && rum.harRum);
  }
  // dialogregeln: ett tryck på en figur (kartans "talare") upprepar dess senaste instruktion
  let fragar = false;
  rum.fragaIgen = (/** @type {any} */ o) => {
    const r = o.talare ? senaste.get(o.talare) : null;
    if (!r || fragar || pausad || !ui.plattan.hidden) return false;
    // är figuren målet just nu (gå fram till Farfar, ta lappen) går trycket dit i stället
    const st = aktuelltSteg;
    if (st && [st.mal, st.figur, st.fran].includes(o.id)) return false;
    fragar = true;
    const varFryst = rum.fryst;
    logg.handelse('fråga igen', o.id);
    replik({ ...r, vantar_pa: undefined }).finally(() => { fragar = false; rum.frys(varFryst); });
    return true;
  };
  // dialogregeln för radion (granskningen, regel 4 B): ett tryck på radion upprepar Farfars senaste replik genom
  // den i scenen. Har han inte sagt något sprakar det bara.
  ui.$('#hud-radio').addEventListener('click', () => {
    if (!b || pausad || fragar || !ui.plattan.hidden) return;
    const r = senaste.get(RADIO);
    if (!r) { ljud.spela('klick'); ui.pulsera('#hud-radio'); logg.handelse('fråga igen', 'radion (tyst)'); return; }
    fragar = true;
    const varFryst = rum.fryst;
    logg.handelse('fråga igen', 'radion');
    replik({ ...r, vantar_pa: undefined }).finally(() => { fragar = false; rum.frys(varFryst); });
  });
  /** Utgången är låst i rummets tillstånd (kartans last_i): ytterdörren på natten. @param {any} o */
  const lastNu = (o) => !!o?.lastI && !!rum.tillstand && o.lastI.includes(rum.tillstand);
  /**
   * Går hjälten till en låst utgång känner han på handtaget: dörren skakar och klickar, och han tar ett steg
   * tillbaka. Ingen text. Gäller i alla steg, eftersom dörren är låst hela natten.
   * @param {any} o
   */
  async function kannaPaHandtaget(o) {
    logg.handelse('låst', `${o.id} (handtaget)`);
    inmatning.rensaGaTill();
    rum.frys(true);
    ljud.spela('klick'); rum.hoppa(o.id); await vanta(tid(260));
    ljud.spela('klick'); rum.hoppa(o.id); await vanta(tid(360));
    await rum.ga(lasplats(o), tid(250));
    rum.frys(false);
  }
  {
    /** utgångar hjälten har varit borta från: att komma in i rummet vid dörren räknas inte */
    const vapnade = new Set();
    let upptagen = false;
    /** @type {any} */
    let rummet = null;
    window.setInterval(() => {
      if (!b || !rum.harRum || rum.fryst || rum.klattrar || pausad || upptagen) return;
      if (rummet !== rum.objekt) { vapnade.clear(); rummet = rum.objekt; }
      for (const o of rum.objekt) {
        if (o.sort !== 'utgang' || !lastNu(o)) continue;
        if (!genom(o, rum.pos) && !vidObjekt(rum.pos, o)) { vapnade.add(o.id); continue; }
        if (!vapnade.has(o.id)) continue;
        vapnade.delete(o.id); upptagen = true;
        kannaPaHandtaget(o).finally(() => { upptagen = false; });
        return;
      }
    }, 60);
  }
  /** @type {(() => void) | null} skyltarna i valet som pågår, ritas om när layouten ändras */
  let skyltarNu = null;
  layout.vidAndring(() => { visaEtiketter(); skyltarNu?.(); visaRumsskyltar(); });
  // när kameran har stannat placeras skyltarna om på riktigt (under rörelsen flyttas de bara med, se ui.kamera):
  // då hamnar en skylt vid bildens kant rätt, och en som kommit in i bilden hålls inne i rummet
  {
    let t = 0;
    ui.vidKamera(() => { window.clearTimeout(t); t = window.setTimeout(() => { visaEtiketter(); skyltarNu?.(); visaRumsskyltar(); }, 150); });
  }

  // ------------------------------------------------------------------ rummets skyltar (beslut 15.2)
  /** En skylt med en mening (inte ett ord) öppnas på läsplattan när han går dit. @param {string} text */
  const arMening = (text) => /\s/.test(text.trim()) || /[.!?]$/.test(text.trim());
  /**
   * Skyltarna i rummet just nu: rummets egna (rum.skyltar), och skylten med frågan i ett läsval i världen
   * (pusslets skylt, t.ex. Farfars skylt vid stenarna) medan scenen har det pusslet. Pusslets skylt har texten
   * i den variant han får.
   * @returns {{ id: string, text: string, papper: string, mening: boolean, pussel?: any }[]}
   */
  function skyltarIRummet() {
    const scen = visadScen;
    if (!b || !scen?.rum || !rum.harRum) return [];
    const ut = [];
    for (const [id, x] of Object.entries(b.rum(scen.rum)?.skyltar || {})) {
      if (rum.ruta(id)) ut.push({ id, text: /** @type {any} */ (x).text, papper: /** @type {any} */ (x).papper || 'skylt', mening: arMening(/** @type {any} */ (x).text) });
    }
    for (const st of scen.steg || []) {
      const p = st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
      if (!p?.skylt || !p.varianter || !rum.ruta(p.skylt) || ut.some((x) => x.id === p.skylt)) continue;
      const [, v] = valjVariant(p.varianter, nivaFor(p));
      if (v.text) ut.push({ id: p.skylt, text: v.text, papper: p.papper || 'skylt', mening: true, pussel: p });
    }
    return ut;
  }
  /** @type {Set<string>} skyltar som ett steg sköter just nu (las_skylt, pusslet med skylten): de öppnas inte av sig själva */
  const skyltStyrs = new Set();
  /** @type {string | null} skylten som är öppen på läsplattan */
  let skyltOppen = null;
  /** @type {{ hjalp: boolean } | null} pusslet som pågår, om skylten är dess fråga (nosen kostar då ett bär) */
  let skyltSpar = null;
  /** @type {string | null} skylten med frågan i läsvalet som pågår */
  let skyltPusselNu = null;
  /**
   * Läsplattan med skyltens text. Skyltar läses aldrig upp (beslut 13.3), men nosen fungerar: gratis på en skylt
   * i rummet, som i pusslet på pusslets skylt. ▶ stänger.
   * @param {{ id: string, text: string, papper: string, pussel?: any }} sk
   */
  async function lasSkyltText(sk) {
    if (skyltOppen) return;
    skyltOppen = sk.id;
    const varFryst = rum.fryst;
    rum.frys(true); inmatning.rensaGaTill();
    logg.handelse('skylt', sk.id);
    const el = ui.visaPlatta(`<div class="pussel-ruta"><div class="lapp p-${ui.esc(sk.papper)}">${ui.rader(sk.text, varden())}</div><button type="button" class="vidare synlig" aria-label="Stäng">▶</button></div>`, 'pussel lapp-vy skylt-vy');
    if (sk.pussel) tillatNos(sk.pussel, skyltSpar ?? { hjalp: false }); else ui.sattNos(true, { betala: () => true });
    await ui.vantaFortsatt(/** @type {HTMLElement} */ (el.querySelector('.vidare')), lyssnaHandling);
    await vanta(0); // trycket på ▶ får inte nå nästa steg
    ui.doljPlatta(); rum.frys(varFryst); skyltOppen = null;
  }
  /** Rummets skyltar i textlagret: ett ord syns som ordet, en mening som ett papper. Ett tryck går dit (eller läser). */
  function visaRumsskyltar() {
    if (!b || !rum.harRum) { ui.rumsskyltar([]); return; }
    ui.rumsskyltar(skyltarIRummet().map((sk) => {
      const o = /** @type {any} */ (rum.ruta(sk.id));
      const [punkt, plats] = skyltPlats(o);
      const html = sk.mening
        ? `<button type="button" class="kort mening-skylt p-${ui.esc(sk.papper)}" data-id="${ui.esc(sk.id)}" aria-label="Skylten"><span aria-hidden="true">📜</span></button>`
        : `<button type="button" class="kort p-${ui.esc(sk.papper)}" data-id="${ui.esc(sk.id)}"><span class="kort-etikett">${ui.rader(sk.text, varden(), 'kort-ord')}</span></button>`;
      return { objekt: sk.id, punkt, plats, html, vidTryck: () => {
        if (rum.fryst || pausad) return;
        if (sk.mening && vidObjekt(rum.pos, o)) {
          // ett steg väntar på att han går till skylten (ga_till, las_skylt): trycket räknas som att han är framme
          if (skyltStyrs.has(sk.id) && skyltPusselNu !== sk.id) { rum.tryckPa?.(sk.id); return; }
          lasSkyltText(sk); return;
        }
        const f = framforFran(o, rum.pos, rum.inomhus, rum.vagg, rum.massiv); inmatning.sattGaTill(f.x, f.y);
      } };
    }));
  }
  {
    // en skylt med en mening öppnas när han går dit (men inte när han redan står där när rummet visas)
    const vapnade = new Set();
    /** @type {any} */
    let rummet = null;
    window.setInterval(() => {
      if (!b || !rum.harRum || rum.klattrar || pausad || skyltOppen) return;
      if (rummet !== rum.objekt) { vapnade.clear(); rummet = rum.objekt; }
      for (const sk of skyltarIRummet()) {
        if (!sk.mening) continue;
        const o = rum.ruta(sk.id); if (!o) continue;
        if (skyltStyrs.has(sk.id)) { vapnade.delete(sk.id); continue; }
        if (!vidObjekt(rum.pos, o)) { vapnade.add(sk.id); continue; }
        if (rum.fryst || !ui.plattan.hidden || !vapnade.has(sk.id)) continue;
        vapnade.delete(sk.id);
        lasSkyltText(sk);
        return;
      }
    }, 80);
  }
  /**
   * Läs en skylt (las_skylt): scenen väntar tills han har gått dit och läst den. Skylten glimtar efter en stund.
   * @param {any} st
   */
  async function lasSkylt(st) {
    const sk = skyltarIRummet().find((x) => x.id === st.foremal);
    const o = rum.ruta(st.foremal);
    if (!sk || !o) { logg.handelse('FEL', 'las_skylt: skylten finns inte i rummet: ' + st.foremal); return; }
    skyltStyrs.add(sk.id);
    rum.frys(false);
    const k = knuffKlocka({ handling: '' }, () => { rum.markera(sk.id, true); ui.pulseraSkylt(sk.id); });
    const bort = visaUtgangsSkyltar();
    await rum.vantaPa([sk.id]);
    bort(); k.stopp(); rum.markera(sk.id, false);
    await lasSkyltText(sk);
    skyltStyrs.delete(sk.id);
  }

  // ------------------------------------------------------------------ stegen
  /** @param {any} st */
  async function utfor(st) {
    aktuelltSteg = st;
    switch (st.typ) {
      case 'replik': return st.vantar_pa ? replikVantar(st) : st.vid === 'ungen' ? replikVidUngen(st) : replik(st);
      case 'mellanscen': {
        const ms = tid(Math.min(6000, 1800 + st.beskrivning.split(' ').length * 140));
        await ui.visaRegi(st.beskrivning, ms); ui.doljRegi(); return;
      }
      case 'ljud': ljud.spela(st.id); if (st.foremal) rum.hoppa(st.foremal); visaLjudord(st.ljudord, st.id, st.foremal); await vanta(tid(600)); return;
      case 'unge_folj': return; // effekten (ungen syns och följer) görs i berättelsemotorn
      case 'ga_till': return gaTill(st);
      case 'pussel': return pussel(b.pussel(st.pussel_id));
      case 'oppna_lasplatta': return visaLapp(b.pussel(st.pussel_id), true);
      case 'visa_ui': {
        ui.uppdateraHud(av);
        visaPausknapp();
        const id = { nosknappen: '#hud-nos', barraknaren: '#hud-bar', radioramen: '#hud-radio', hjalteboken: '#hud-paus' }[/** @type {string} */ (st.element)];
        if (id) ui.pulsera(id);
        if (st.element === 'radioramen') { const r = ui.$('#hud-radio'); r.classList.remove('glider-in'); void r.offsetWidth; r.classList.add('glider-in'); }
        await vanta(tid(700)); return;
      }
      case 'nos_demo': return nosDemo(st);
      case 'ge_bar': ljud.spela('bar'); ui.uppdateraHud(av); ui.pulsera('#hud-bar'); await ui.visaFest('🫐', tid(900)); return;
      case 'ge_kartbit': ljud.spela('fest'); await ui.visaFest('🗺️', tid(1200)); return;
      case 'ge_grad': ljud.spela('fest'); await ui.visaFest('⭐', tid(1500)); return;
      case 'bok': return bok(st);
      case 'skapa_hjalte': return skapaHjalte(st);
      case 'sparpunkt': spara(); if (st.pass_slut) return passSlut(st); return;
      case 'fritt': return fritt(st);
      case 'bara': return bara(st);
      case 'prata': return prata(st);
      case 'ta_emot': return taEmot(st);
      case 'las_skylt': return lasSkylt(st);
      case 'visa_foremal': return visaForemal(st);
      case 'ge_sak': return geSakSteg(st);
      case 'dinobok': return dinobok(st);
      case 'unge_tillagg': return ungeTillagg(st);
      default: logg.handelse('steg', 'okänd stegtyp ' + st.typ); return;
    }
  }

  /**
   * Ett dolt föremål kommer fram (lådan under löven, lappen Klaffen tappar, den hemliga stigen). Effekten
   * (att det syns resten av äventyret) är redan gjord: rummet ritas om, och föremålet hoppar till och lyser.
   * @param {any} st
   */
  async function visaForemal(st) {
    await visaScen(visadScen, st);
    const o = rum.ruta(st.foremal);
    if (!o) { logg.handelse('FEL', 'visa_foremal: föremålet finns inte i rummet: ' + st.foremal); return; }
    ljud.spela('prassel'); rum.hoppa(o.id); rum.markera(o.id, true);
    await vanta(tid(900));
    rum.markera(o.id, false);
  }

  /**
   * Hjälten får något att ha på sig (taggkammen, ryggsäcken). Det tas på direkt (effekten är gjord), och pausknappen
   * glimtar en gång eftersom garderoben har något nytt.
   * @param {any} st
   */
  async function geSakSteg(st) {
    rum.sattLager(lagerFor(tillstand.spelare.hjalte));
    ljud.spela('fest');
    nyttIHjalteboken();
    await ui.visaFest(st.sort === 'ryggsack' ? '🎒' : '👑', tid(1100));
  }
  /** Dinoboken får en sida (stubbe i gråboxen: sidan finns i hjälteboken, och pausknappen glimtar). @param {any} st */
  async function dinobok(st) {
    ljud.spela('fest'); nyttIHjalteboken();
    await ui.visaFest(bilder.html(st.sida.bild), tid(1100));
  }
  /** Ungen lär sig något nytt (stubbe i gråboxen: ungen hoppar och låter glad). @param {any} st */
  async function ungeTillagg(st) {
    logg.handelse('unge', 'tillägg ' + st.id);
    rum.ungeReagerar(true); ljud.spela('unge');
    await vanta(tid(800));
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
   * - en dörr: skylten sitter på dörren
   * - ett föremål mot en sidovägg (lådorna längs väggen, sängen): bredvid, ute i väggen
   * - annars ovanför föremålet.
   * Den hålls alltid inne i rummet.
   * @param {any} o @returns {[{ x: number, y: number }, import('./grans/ui.js').Plats]}
   */
  function skyltPlats(o) {
    const s = layout.skala;
    const ram = { vanster: rumTillSkarm(s, 0, 0).x, hoger: rumTillSkarm(s, RUM.bredd, 0).x };
    // ram = skärmens kanter (bilden av rummet), punkterna = föremålet i världen via kameran
    const bas = { rumTopp: s.topp, ram, under: skarm(0, o.y + o.h).y, objekt: o.id };
    const mitt = o.y + o.h / 2;
    // dörrens skylt sitter ovanför dörren och täcker den aldrig (grind A), och den går att läsa från mitten av rummet
    if (o.sort === 'utgang' && !o.golv) return [skarm(o.x + o.b / 2, o.y - 1), bas];
    if (o.sort !== 'utgang' && o.sida === 'hoger' && o.x <= rum.vagg.sida + 8) return [skarm(o.x, mitt), { ...bas, lage: 'vanster' }];
    if (o.sort !== 'utgang' && o.sida === 'vanster' && o.x + o.b >= rum.storlek.bredd - rum.vagg.sida - 8) return [skarm(o.x + o.b, mitt), { ...bas, lage: 'hoger' }];
    return [skarm(o.x + o.b / 2, o.y), bas];
  }

  /**
   * Styrbilden för att använda något (första gången hjälten står vid något som går att använda) och för att svinga
   * staven (första krukan): Mellanslag på datorn, ett finger som trycker på pekskärm. Den försvinner när han har
   * gjort det en gång, och kommer inte tillbaka (sparas i äventyrets gränssnitt).
   * @param {'anvand' | 'svinga'} verb @param {{ x: number, y: number } | null} punkt handen på skärmen, null döljer
   */
  function styrAnvand(verb, punkt) {
    const flagga = verb === 'svinga' ? 'styrSvinga' : 'styrAnvand';
    if (!punkt) { if (ui.$('#styrhjalp').dataset.verb === verb) { ui.styrhjalp(null); delete ui.$('#styrhjalp').dataset.verb; } return; }
    if (av.ui?.[flagga]) return;
    ui.styrhjalp(d.pek() ? 'tryck' : 'mellanslag', punkt);
    ui.$('#styrhjalp').dataset.verb = verb;
  }
  /** Han har använt eller svingat: styrbilden är lärd. @param {'anvand' | 'svinga'} verb */
  function styrGjort(verb) {
    const flagga = verb === 'svinga' ? 'styrSvinga' : 'styrAnvand';
    styrAnvand(verb, null);
    if (!av.ui?.[flagga]) { av.ui = { ...(av.ui || {}), [flagga]: true }; spara(); }
  }

  /**
   * @param {string[]} ids
   * @param {{ verb?: 'anvand' | 'svinga', last?: { ljud?: string, handling?: string, replik?: any }, framme?: string[] }} [opt]
   * last = de andra utgångarna i rummet är låsta: går hjälten till en av dem öppnas den inte, ljudet spelas,
   * hjälten tittar upp och målet lyser (hallen före kläckningen: DUNK ovanifrån, och stegen lyser).
   * framme = föremål som räknas när han går dit, som en utgång (en skylt med en mening öppnas när han går dit).
   */
  function anvand(ids, { verb = 'anvand', last, framme: narFramme = [] } = {}) {
    let avbryt = () => {};
    const lova = /** @type {Promise<string> & { avbryt(): void }} */ (new Promise((klar) => {
      const utgangar = ids.filter((id) => rum.ruta(id)?.sort === 'utgang' || narFramme.includes(id));
      const saker = ids.filter((id) => !utgangar.includes(id));
      rum.sattInteraktiva(saker);
      /** @type {string | null} */
      let nara = null;
      const visaNara = (/** @type {string | null} */ id) => {
        if (id === nara) return;
        nara = id; rum.nara(id);
        const o = id ? rum.ruta(id) : null;
        if (!o) { ui.handknapp(null); styrAnvand(verb, null); return; }
        ljud.spela('klick');
        const [pt, plats] = skyltPlats(o);
        ui.handknapp(pt, () => gor(o.id), plats);
        styrAnvand(verb, pt);
      };
      // en utgång räknas när hjälten går dit. Står han redan där när steget börjar (t.ex. efter FORTSÄTT) väntar
      // spelet tills han gått därifrån, eller tills spelaren trycker på utgången eller använder den.
      const framme = (/** @type {string} */ id) => { const o = rum.ruta(id); return !!o && (vidObjekt(rum.pos, o) || genom(o, rum.pos)); };
      // en skylt som räknas när han går dit räknas också om han redan står där
      const vapnade = new Set(narFramme);
      // en utgång som är låst hela natten (ytterdörren) har sin egen reaktion: han känner på handtaget
      const andra = last ? rum.objekt.filter((o) => o.sort === 'utgang' && !ids.includes(o.id) && !lastNu(o)).map((o) => o.id) : [];
      const vapnadeAndra = new Set();
      let lastUpptagen = false;
      const lastDorr = async (/** @type {string} */ id) => {
        lastUpptagen = true;
        const o = rum.ruta(id);
        logg.handelse('låst', id);
        if (last?.ljud) ljud.spela(last.ljud);
        rum.tittaUpp(tid(900));
        for (const m of ids) rum.markera(m, true);
        if (last?.handling) ui.visaRegi(last.handling, 0);
        if (last?.replik) await sag(last.replik); else await vanta(tid(900));
        if (o) await rum.ga(lasplats(o), tid(250));
        ui.doljRegi();
        window.setTimeout(() => { for (const m of ids) rum.markera(m, false); }, tid(1500));
        lastUpptagen = false;
      };
      const tick = window.setInterval(() => {
        if (rum.fryst) { visaNara(null); return; }
        for (const id of utgangar) if (!framme(id)) vapnade.add(id);
        for (const id of andra) {
          if (!framme(id)) vapnadeAndra.add(id);
          else if (vapnadeAndra.has(id) && !lastUpptagen) { vapnadeAndra.delete(id); lastDorr(id); }
        }
        visaNara(rum.starVid(saker));
        const ut = utgangar.find((id) => vapnade.has(id) && framme(id));
        if (ut) gor(ut);
      }, 60);
      const sluta = lyssnaHandling((h) => {
        if (h.typ !== 'interagera' || rum.fryst) return;
        if (nara) gor(nara); else { const ut = utgangar.find(framme); if (ut) gor(ut); }
      });
      rum.tryckPa = (id) => { if (id === nara || (utgangar.includes(id) && framme(id))) { gor(id); return true; } return false; };
      let gjort = false;
      const stada = () => { gjort = true; window.clearInterval(tick); sluta(); rum.tryckPa = null; visaNara(null); rum.sattInteraktiva([]); };
      function gor(/** @type {string} */ id) { if (gjort) return; if (saker.includes(id)) styrGjort(verb); stada(); inmatning.rensaGaTill(); klar(id); }
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
      ui.styrhjalp(d.pek() ? 'tryck' : 'pilar', o ? skarm(o.x + o.b / 2, o.y + o.h / 2) : null);
      styr = window.setInterval(() => { if (Math.hypot(rum.pos.x - start.x, rum.pos.y - start.y) > 6) { ui.styrhjalp(null); window.clearInterval(styr); } }, 100);
    }
    const k = knuffKlocka(st.knuff ?? { handling: '' }, () => { rum.markera(st.mal, true); ui.pulseraSkylt(st.mal); });
    // en yta (krönet på kullen): framme när han står på den, på dess nivå (han går upp för trappan själv)
    const yta = rum.ruta(st.mal);
    if (yta?.sort === 'yta') {
      const bortSkyltar = visaUtgangsSkyltar();
      await new Promise((klar) => {
        const t = window.setInterval(() => {
          const p = rum.pos;
          if (!rum.fryst && rum.niva === rum.nivaer.nivaFor(yta) && p.x >= yta.x && p.x <= yta.x + yta.b && p.y >= yta.y && p.y <= yta.y + yta.h) { window.clearInterval(t); klar(undefined); }
        }, 60);
      });
      bortSkyltar(); window.clearInterval(styr); ui.styrhjalp(null); k.stopp(); rum.markera(st.mal, false); ui.doljRegi();
      return;
    }
    // en skylt med en mening räknas när han går dit (pusslet eller las_skylt öppnar den sedan)
    const skyltMal = skyltarIRummet().some((x) => x.id === st.mal && x.mening);
    if (skyltMal) skyltStyrs.add(st.mal);
    // Medan han går dit kan han göra det frivilliga i rummet (rum.frivilligt), och med fri_vag gå in i en
    // sidogren (en frivillig scen, buskarna). Efteråt fortsätter steget som förut.
    /** @type {string[]} sidogrenar han tog under det fria vägvalet, i ordning (loggen, beslut 17.1) */
    const tog = [];
    for (;;) {
      const sidor = st.fri_vag ? sidoUtgangar(st.mal) : [];
      const fri = frivilligaKvar().filter((id) => id !== st.mal);
      const bortSkyltar = visaUtgangsSkyltar();
      const id = await anvand([st.mal, ...sidor, ...fri], { last: st.vid_annan_utgang, framme: skyltMal ? [st.mal] : [] });
      bortSkyltar();
      if (id === st.mal) {
        // vägvalet: gick han till målet först (apan), eller tog han sidogrenen (buskarna) först?
        if (st.fri_vag) logg.handelse('vägval', tog.length ? `${st.mal} efter ${tog.join(', ')}` : `${st.mal} först`, { sidogrenar_kvar: sidor });
        break;
      }
      if (st.fri_vag && sidor.includes(id)) { logg.handelse('vägval', tog.length ? `${id} (sedan ${tog.join(', ')})` : `${id} först`); tog.push(id); }
      k.stopp(); window.clearInterval(styr); ui.styrhjalp(null); rum.markera(st.mal, false);
      if (fri.includes(id)) await korFrivilligt(id); else await sidoScen(id);
      rum.frys(false); k.nollstall();
    }
    if (skyltMal) skyltStyrs.delete(st.mal); // pusslet tar över skylten (den öppnas inte av sig själv, han står redan där)
    window.clearInterval(styr); ui.styrhjalp(null);
    k.stopp(); rum.markera(st.mal, false); ui.doljRegi();
    // stegen: hjälten klättrar själv upp eller ned tills huvudet når luckan, sedan glider nästa rum in
    const o = rum.ruta(st.mal);
    if (o?.klattra) {
      // nära nog räcker: hjälten ställer sig själv mitt för stegen och klättrar
      await rum.ga(framfor(o), tid(300));
      klattrade = o.klattra; await rum.klattra(o.id, o.klattra, 'pa', tid(700));
    }
  }

  // ------------------------------------------------------------------ det frivilliga
  /** Föremålen i rummet med något frivilligt kvar (rum.frivilligt): ett tryck gör det, en gång. */
  function frivilligaKvar() {
    const r = aktuelltRum ? b.rum(aktuelltRum) : null;
    // en formel går inte att öva innan han har lärt sig den (lilla lianen före SVÄRD)
    const kan = (/** @type {any} */ f) => f.steg.every((/** @type {any} */ st) => {
      const p = st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
      return !p || p.typ !== 'P11_formel' || (tillstand.spelare.hjalte.formler || []).includes(p.svar);
    });
    return (r?.frivilligt || []).filter((/** @type {any} */ f) => rum.ruta(f.foremal) && !b.frivilligtGjort(`${aktuelltRum}/${f.foremal}`) && kan(f)).map((/** @type {any} */ f) => /** @type {string} */ (f.foremal));
  }
  /**
   * Gör det frivilliga vid ett föremål: stegen spelas utanför berättelsens ordning, och det räknas som gjort
   * direkt (bären ges inte två gånger om spelet startas om mitt i). @param {string} id
   */
  async function korFrivilligt(id) {
    const rumId = /** @type {string} */ (aktuelltRum);
    const f = (b.rum(rumId)?.frivilligt || []).find((/** @type {any} */ x) => x.foremal === id);
    if (!f) return;
    const nyckel = `${rumId}/${id}`;
    logg.handelse('frivilligt', nyckel);
    b.frivilligtKlart(nyckel); spara();
    const forra = aktuelltSteg;
    for (const st of f.steg) { b.effektUtanfor(st, rumId); await utfor(st); }
    aktuelltSteg = forra;
    ui.uppdateraHud(av); spara(); rum.frys(false);
  }
  /** Utgångar till en frivillig scen som inte är spelad (stig_buskarna). @param {string} mal utgången steget väntar på */
  function sidoUtgangar(mal) {
    return rum.objekt.filter((o) => o.sort === 'utgang' && o.id !== mal && !lastNu(o) && !!tillFor(o) && !!b.frivilligScen(/** @type {string} */ (tillFor(o)))).map((o) => o.id);
  }
  /**
   * En sidogren (frivillig scen): han går in i rummet, scenen spelas en gång, och sedan går han själv tillbaka
   * ut genom utgången han kom in genom. Berättelsen står kvar i steget han lämnade.
   * @param {string} utId utgången han gick ut genom
   */
  async function sidoScen(utId) {
    const hem = aktuelltRum, hemScen = visadScen;
    const scen = b.frivilligScen(/** @type {string} */ (tillFor(rum.ruta(utId))));
    if (!scen) return;
    logg.handelse('frivilligt', 'scen ' + scen.id);
    const forra = aktuelltSteg;
    for (const st of scen.steg) {
      await visaScen(scen, st);
      b.effektUtanfor(st, scen.rum);
      await utfor(st);
    }
    b.frivilligtKlart(scen.id); spara();
    await visaScen(scen, null);
    const tillbaka = rum.objekt.find((o) => o.sort === 'utgang' && tillFor(o) === hem);
    if (tillbaka) await gaTill({ typ: 'ga_till', mal: tillbaka.id });
    else logg.handelse('FEL', `ingen utgång tillbaka från ${scen.rum} till ${hem}`);
    aktuelltSteg = forra;
    await visaScen(hemScen ?? b.scen, forra);
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
      case 'P15_raddning': res = await raddning(p); break;
      case 'P9_kodlas': res = await kodlas(p); break;
      default:
        // P15, P9 och andra typer byggs i fas 3. Gråboxen hoppar över dem.
        await ui.visaRegi(`(${p.typ} byggs i fas 3)`, tid(1500)); ui.doljRegi(); res = {};
    }
    ui.doljPlatta(); rum.frys(false);
    pusselPagar = false; visaEtiketter();
    // en formel som kapar något i rummet (lianerna): rummet ritas om utan det
    if (p.typ === 'P11_formel' && res && aktuelltRum && (kartor[aktuelltRum]?.objekt || []).some((/** @type {any} */ o) => o.forsvinnerEfter === p.id)) {
      losta.add(p.id); await visaScen(visadScen);
    }
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
      const hjalpSpar = skapaHjalpSpar(() => performance.now());
      const vakt = { spar: hjalpSpar, pekOmMs: () => pekningOmMs({ antalAlternativ: v.s.alternativ.length, antalFel: v.s.fel, sedanStartMs: hjalpSpar.sedanStart() }) };
      // knufftiden på läsplattan följer textmängden: ca 11 s per mening (granskningen av kapitel 1)
      const k = knuffKlocka(p.knuff, () => plattan().querySelector('.fraga, .lapp')?.classList.add('puls'), vakt, knufftidMs({ text: v.s.text, alternativ: v.s.alternativ }));
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
        ui.visaPlatta(`<div class="pussel-ruta">${papper}${bild}<div class="kortrad ${flera && v.s.klar ? 'packat' : ''}">${v.s.alternativ.map(kortHtml).join('')}</div>${flera ? '<div class="ryggsack" aria-hidden="true">🎒</div>' : ''}</div>`, 'pussel ' + p.typ);
        if (flera) bockaListan();
        tillatNos(p, spar);
        plattan().querySelectorAll('.kort').forEach((el) => el.addEventListener('click', () => tryck(/** @type {HTMLElement} */ (el).dataset.id || '')));
      };
      /**
       * Packlistan: varje rad som är packad får en bock. När allt är packat lyser raden som inte är en sak
       * (GÅ MOT SKOGEN), och sakerna tonas ut.
       */
      const bockaListan = () => {
        const rattOrd = v.s.alternativ.filter((a) => a.ratt && a.ord).map((a) => ({ a, re: new RegExp(`(^|[\\s])${versaler(a.ord)}[.!,]?(\\s|$)`) }));
        for (const rad of /** @type {NodeListOf<HTMLElement>} */ (plattan().querySelectorAll('.lapp .rad'))) {
          const t = versaler(rad.textContent || '');
          const m = rattOrd.find((x) => x.re.test(t));
          rad.classList.toggle('bockad', !!m && v.s.valda.has(m.a.id));
          rad.classList.toggle('lyser', !m && v.s.klar);
        }
      };
      const tryck = async (/** @type {string} */ id) => {
        if (upptagen || ui.nosAktiv) return;
        k.nollstall();
        if (v.s.pekar) hjalpSpar.pekning();
        const r = v.valj(id);
        if (r.resultat === 'redan') return;
        loggaVal(p, id, r.resultat, hjalpSpar);
        upptagen = true;
        const kort = /** @type {HTMLElement | null} */ (plattan().querySelector(`.kort[data-id="${CSS.escape(id)}"]`));
        if (r.resultat === 'fel') {
          ljud.spela('fel'); kort?.classList.add('skakar');
          await reaktion(r.reaktion);
          rita();
        } else if (r.resultat === 'ratt') {
          ljud.spela('ratt'); rita();
        } else if (flera) {
          // allt är packat: bockarna, raden som lyser och reaktionen ("Allt är packat!") medan listan syns
          ljud.spela('ratt'); k.stopp();
          rita();
          await vanta(tid(600));
          await reaktion(r.reaktion);
          await vanta(tid(600));
          ui.doljPlatta();
          klar({ niva: v.s.variantNyckel, forstaForsoket: v.forstaForsoket, forsok: v.s.forsok, hjalp: spar.hjalp });
          return;
        } else {
          ljud.spela('ratt'); kort?.classList.add('ratt');
          k.stopp();
          await vanta(tid(500));
          ui.doljPlatta();
          await Promise.all([rattHandelse(null), reaktion(r.reaktion)]);
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
   * Frågan syns uppe i rummet. Dörrar och stigar har sin skylt synlig hela tiden, så att han kan läsa från mitten
   * av rummet. En utgång väljs genom att gå igenom den (ett tryck på dörren eller skylten, eller piltangenterna).
   * Ett föremål har en närlapp som syns när hjälten står vid det, och öppnas med ett tryck på lappen
   * (eller på föremålet igen, eller Mellanslag): i FILT är letandet en del av uppgiften.
   * Fel dörr öppnas aldrig: hjälten tar ett steg tillbaka och felreaktionen spelas vid dörren. Förenkling och
   * ungens pekning som i P1. Glimten är lika för alla alternativ.
   * @param {any} p
   */
  async function valjIRummet(p) {
    const niva = nivaFor(p);
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
    // Har spelaren fått pusslet som en lapp (dinomaten) står inte texten i tankebubblan: han läser lappen
    // eller minns den. Bubblan visar lappen, och ett tryck på den öppnar lappen igen.
    const harLapp = (av.lappar || []).includes(p.id);
    // Står frågan på en skylt i rummet (p.skylt, Farfars skylt vid stenarna) läser han den där: bubblan visar ett
    // papper, och skylten öppnas när han går dit eller trycker på papperet. Den läses aldrig upp.
    const skylt = p.skylt ? skyltarIRummet().find((x) => x.id === p.skylt) ?? null : null;
    if (p.skylt && !skylt) logg.handelse('FEL', `${p.id}: skylten ${p.skylt} finns inte i rummet`);
    const fraga = () => ui.visaTanke(skylt ? '<button type="button" class="tanke-lapp tanke-skylt" aria-label="Skylten">📜</button>'
      : harLapp ? '<button type="button" class="tanke-lapp" aria-label="Lappen">📜</button>'
      : v.s.bild ? bilder.html(v.s.bild) : v.s.text ? ui.rader(v.s.text, varden()) : null);
    if (skylt) {
      skyltStyrs.add(skylt.id); skyltSpar = spar; skyltPusselNu = skylt.id;
      // han har just gått fram till skylten: den öppnas direkt
      const so = rum.ruta(skylt.id);
      if (so && vidObjekt(rum.pos, so)) await lasSkyltText(skylt);
    }
    const avst = (/** @type {{ x: number, y: number }} */ a, /** @type {{ x: number, y: number }} */ b2) => Math.hypot(a.x - b2.x, a.y - b2.y);
    /** Står hjälten nära utgången (inom ungefär en ruta från dörren, läsplatsen eller skylten)? @param {any} o */
    const naraUtgang = (o) => {
      if (avst(rum.pos, framfor(o)) <= 22 || avst(rum.pos, lasplats(o)) <= 16) return true;
      const l = o.lapp ? rum.ruta(o.lapp) : null;
      return !!l && vidObjekt(rum.pos, l);
    };
    rum.frys(false);
    // kameran visar hela valet: alla alternativ, deras skyltar och frågans skylt (beslut 18.1)
    rum.visaOmrade([...v.s.alternativ.flatMap((a) => (a.objekt ? [a.objekt, rum.ruta(a.objekt)?.lapp ?? ''] : [])), p.skylt ?? ''].filter(Boolean));
    rum.sattInteraktiva(kvarSaker());
    for (const a of v.s.alternativ) { if (a.objekt) doljEtikett.add(a.objekt); const l = a.objekt && rum.ruta(a.objekt)?.lapp; if (l) doljEtikett.add(l); }
    visaEtiketter();
    /** Bubblan med frågan täcker aldrig alternativen (dörrarna i bakväggen) eller deras skyltar. */
    const tankeUrVagen = () => {
      const s = layout.skala;
      const rutor = v.s.alternativ.map((a) => (a.objekt ? rum.ruta(a.objekt) : null)).filter(Boolean).map((o) => {
        const a = skarm(o.x, o.y), b = skarm(o.x + o.b, o.y + o.h);
        return { left: a.x, top: a.y, right: b.x, bottom: b.y };
      });
      ui.placeraTanke(rutor, { vanster: s.vanster, topp: s.topp, bredd: s.cssBredd, hojd: s.cssHojd });
    };
    fraga();
    tankeUrVagen();
    if (harLapp) ui.pulsera('#hud-lapp'); // lappen glimtar när han kommer in: den finns kvar
    tillatNos(p, spar);
    return new Promise((klar) => {
      let upptagen = false;
      /** @type {string | null} föremålet eller utgången hjälten står vid och vars lapp syns */
      let vid = null;
      const hjalpSpar = skapaHjalpSpar(() => performance.now());
      const peka = () => { const r = kvarAlt().find((a) => a.ratt); return !!r?.objekt && rum.ungePekar(r.objekt); };
      const vakt = { spar: hjalpSpar, pekOmMs: () => pekningOmMs({ antalAlternativ: kvarAlt().length, antalFel: v.s.fel, sedanStartMs: hjalpSpar.sedanStart() }), peka };
      // knuffen upprepar frågan: tankebubblan blinkar, eller lappen lyser om frågan står på en lapp
      const k = knuffKlocka(p.knuff ?? (harLapp ? { handling: '' } : undefined), () => { ui.pulseraTanke(); if (harLapp) ui.pulsera('#hud-lapp'); if (skylt) ui.pulseraSkylt(skylt.id); }, vakt);
      // skylten öppnas när han går dit (efter att ha gått därifrån), och ett tryck på papperet i bubblan öppnar den
      let skyltVapnad = false;
      const tankeTryck = (/** @type {Event} */ e) => { if (skylt && !upptagen && !rum.fryst && /** @type {HTMLElement} */ (e.target).closest('.tanke-skylt')) lasSkyltText(skylt); };
      ui.$('#tanke').addEventListener('click', tankeTryck);
      /** stigar han har prövat som inte är spärrade än: går han dit igen händer samma sak bakom kurvan, utan att räknas */
      const provadeStigar = () => v.s.alternativ.filter((a) => borta.has(a.id) && !!rum.ruta(a.objekt)?.golv);
      /** Skyltarna på dörrar och stigar i valet: de syns hela tiden. En prövad dörr behåller sin skylt, nedtonad. */
      const ritaSkyltar = () => {
        const lista = [];
        for (const a of v.s.alternativ) {
          const o = a.objekt ? rum.ruta(a.objekt) : null;
          if (!o || o.sort !== 'utgang' || !a.ord) continue;
          const vis = (o.lapp && rum.ruta(o.lapp)) || o;
          const [punkt, plats] = skyltPlats(vis);
          const provad = borta.has(a.id);
          lista.push({ objekt: o.id, punkt, plats, vidTryck: () => { if (!provad) anvandAlt(a); },
            html: `<button type="button" class="kort ${provad ? 'provad' : ''} ${v.s.pekar === a.id ? 'pekar' : ''}${o.golv ? ' stigskylt' : ''}" data-id="${ui.esc(a.id)}"${provad ? ' tabindex="-1"' : ''}><span class="kort-etikett">${ui.rader(a.ord, varden(), 'kort-ord')}</span>${pilFor(o)}</button>` });
        }
        ui.skyltar(lista);
        ui.skyltNara(vid && arUtgang(vid) ? vid : null);
        tankeUrVagen();
      };
      skyltarNu = ritaSkyltar;
      const visaLappen = (/** @type {string | null} */ id) => {
        if (id === vid) return;
        vid = id;
        rum.nara(id && !arUtgang(id) ? id : null);
        ui.skyltNara(id && arUtgang(id) ? id : null);
        const a = id ? altFor(id) : null;
        const o = id ? rum.ruta(id) : null;
        ui.ordskylt(null); ui.handknapp(null); styrAnvand('anvand', null);
        if (!a || !o) return;
        ljud.spela('klick');
        if (arUtgang(o.id)) return; // dörrar och stigar har sin skylt hela tiden
        // lappen vid föremålet (se skyltPlats)
        const [pt, plats] = skyltPlats(o);
        if (a.ord) ui.ordskylt(`<button type="button" class="kort ${v.s.pekar === a.id ? 'pekar' : ''}" data-id="${ui.esc(a.id)}"><span class="kort-etikett">${ui.rader(a.ord, varden(), 'kort-ord')}</span></button>`, pt, () => anvandAlt(a), plats);
        else ui.handknapp(pt, () => anvandAlt(a), plats); // ett föremål utan ord (färg, storlek): handen
        styrAnvand('anvand', pt);
      };
      /** Lappen, skylten eller handen: en sak öppnas, en utgång går hjälten igenom. @param {any} a */
      const anvandAlt = (a) => {
        if (upptagen || ui.nosAktiv) return;
        const o = rum.ruta(a.objekt); if (!o) return;
        if (arUtgang(o.id)) { const f = framfor(o); inmatning.sattGaTill(f.x, f.y); }
        else { styrGjort('anvand'); valj(a.id); }
      };
      /** utgångar hjälten har varit borta från sedan valet började: att stå kvar på tröskeln räknas inte som att gå igenom */
      const vapnade = new Set();
      const tick = window.setInterval(() => {
        if (upptagen || rum.fryst) return;
        if (skylt) {
          const so = rum.ruta(skylt.id);
          if (so && !vidObjekt(rum.pos, so)) skyltVapnad = true;
          else if (so && skyltVapnad && ui.plattan.hidden) { skyltVapnad = false; lasSkyltText(skylt); return; }
        }
        for (const id of kvarUtgangar()) { const o = rum.ruta(id); if (o && !genom(o, rum.pos)) vapnade.add(id); }
        for (const a of provadeStigar()) {
          const o = rum.ruta(a.objekt); if (!o) continue;
          if (!genom(o, rum.pos)) { vapnade.add(o.id); continue; }
          if (vapnade.has(o.id)) { vapnade.delete(o.id); igen(a, o); return; }
        }
        const sak = rum.starVid(kvarSaker());
        const nara = kvarUtgangar().map((id) => rum.ruta(id)).find((o) => o && naraUtgang(o)) ?? null;
        visaLappen(sak ?? nara?.id ?? null);
        // att gå igenom utgången är valet: skylten har syntes hela tiden, så han går rakt igenom
        const ut = kvarUtgangar().map((id) => rum.ruta(id)).find((o) => o && vapnade.has(o.id) && genom(o, rum.pos));
        if (ut) { const a = altFor(ut.id); if (a) valj(a.id); }
      }, 60);
      const sluta = lyssnaHandling((h) => { if (h.typ === 'interagera' && vid) { const a = altFor(vid); if (a) anvandAlt(a); } });
      rum.tryckPa = (/** @type {string} */ id) => { if (id !== vid) return false; const a = altFor(id); if (a) anvandAlt(a); return true; };
      // ett tryck på en dörr i valet går igenom den (skylten syns redan)
      rum.malFor = (/** @type {any} */ o) => (o.sort === 'utgang' && altFor(o.id) ? framfor(o) : null);
      ritaSkyltar();
      const stada = () => {
        window.clearInterval(tick); sluta(); k.stopp(); rum.visaOmrade(null); rum.tryckPa = null; rum.malFor = null; rum.nara(null); rum.sattInteraktiva([]); ui.ordskylt(null); ui.handknapp(null); ui.skyltar([]); skyltarNu = null; doljEtikett.clear(); visaEtiketter(); rum.ungePekar(null);
        ui.$('#tanke').removeEventListener('click', tankeTryck);
        if (skylt) { skyltStyrs.delete(skylt.id); skyltSpar = null; skyltPusselNu = null; }
      };
      /**
       * En prövad stig igen: samma sak händer bakom kurvan, och han kommer tillbaka. Det räknas inte som ett nytt fel.
       * @param {any} a @param {any} o
       */
      const igen = async (a, o) => {
        upptagen = true; visaLappen(null); rum.frys(true);
        logg.handelse('val', `${p.id}: ${a.id} igen (räknas inte)`);
        ljud.spela('fel');
        // samma stig igen: bakom kurvan händer bara ljudet, och ungen tittar frågande när han kommer tillbaka
        await bakomKurvan(o, null);
        await kortReaktion();
        fraga(); tankeUrVagen(); rum.frys(false); upptagen = false;
      };
      const valj = async (/** @type {string} */ altId) => {
        if (upptagen) return;
        k.nollstall();
        const alt = v.s.alternativ.find((a) => a.id === altId);
        const o = alt ? rum.ruta(alt.objekt) : null;
        const utgang = !!o && o.sort === 'utgang';
        if (v.s.pekar) hjalpSpar.pekning();
        rum.ungePekar(null);
        const r = v.valj(altId);
        loggaVal(p, altId, r.resultat, hjalpSpar);
        upptagen = true; visaLappen(null);
        if (r.resultat === 'fel') {
          rum.frys(true);
          ljud.spela('fel');
          borta.add(altId); aktuellVariant = v.s.variantNyckel;
          if (utgang && o?.golv) await bakomKurvan(o, r.reaktion); // en fel stig leder aldrig vidare
          else {
            // dörren öppnas aldrig: hjälten tar ett steg tillbaka in i rummet
            if (utgang && o) await rum.ga(lasplats(o), tid(250));
            else if (alt?.objekt) rum.tomt(alt.objekt);
            await reaktion(r.reaktion, alt?.objekt ?? null);
          }
          // förenklingen kan ha tagit bort alternativ: lådor blir tomma, dörrar och stigar spikas igen
          for (const a of /** @type {any[]} */ (Object.values(p.varianter).flatMap((x) => /** @type {any} */ (x).alternativ))) {
            // bara föremål som inget kvarvarande alternativ använder (samma stig kan stå i flera varianter med olika id)
            if (!v.s.alternativ.some((x) => x.id === a.id) && a.objekt && !v.s.alternativ.some((x) => x.objekt === a.objekt)) { if (arUtgang(a.objekt)) rum.spika(a.objekt); else rum.tomt(a.objekt); }
          }
          // varianten kan ha bytts (förenkling): lådorna visar de nya alternativens färg och storlek
          for (const a of v.s.alternativ) { const e = egenskaper(a.bild || a.id); if (a.objekt && (e.farg || e.storlek)) rum.visaDelar(a.objekt, delarAv([a])); }
          rum.sattInteraktiva(kvarSaker());
          ritaSkyltar();
          const pekar = v.s.pekar ? v.s.alternativ.find((a) => a.id === v.s.pekar) : null;
          if (pekar?.objekt) { rum.markera(pekar.objekt, true); rum.ungePekar(pekar.objekt); }
          fraga(); tankeUrVagen();
          rum.frys(false); upptagen = false;
          return;
        }
        ljud.spela('ratt');
        stada();
        ui.visaTanke(null);
        for (const a of v.s.alternativ) if (a.objekt) rum.markera(a.objekt, false);
        rum.frys(true);
        await Promise.all([rattHandelse(alt?.objekt ?? null), reaktion(r.reaktion, alt?.objekt ?? null)]);
        klar({ niva: v.s.variantNyckel, forstaForsoket: v.forstaForsoket, forsok: v.s.forsok, hjalp: spar.hjalp });
      };
    });
  }

  /**
   * En fel stig: han går bakom kurvan och syns inte, felet händer där (kotten på hjälmen), och sedan kommer han
   * tillbaka till vägskälet (granskningen, punkt 16). @param {any} o stigen @param {any} reakt felreaktionen
   */
  async function bakomKurvan(o, reakt) {
    await rum.ga(framfor(o), tid(200));
    rum.gom(true);
    await vanta(tid(300));
    await reaktion(reakt);
    rum.gom(false);
    await rum.ga(stigStart(o), tid(500));
  }

  /**
   * Formel med brickor (P11). Med titta–täck (forebild.tacks, SVÄRD): förebilden syns, brickorna glider in efter en
   * stund, och förebilden tonas bort när första brickan läggs medan ungen håller för ögonen. Vid fel eller knuff tänds
   * den igen och står kvar resten av försöket. Vid rätt lyser den en sekund ovanför hans ord.
   * @param {any} p
   */
  async function formel(p) {
    const f = skapaFormel(p);
    const spar = { hjalp: false, forebild: false };
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    const tt = p.forebild?.tacks === 'forsta_brickan';
    // utifrån bilden (forebild.visas vid_fel, beslut 18.5): ingen förebild från början och brickorna direkt.
    // Förebilden tänds först vid fel (titta), tonas bort vid nästa bricka (täck) och står kvar efter ett andra fel.
    const vidFel = p.forebild?.visas === 'vid_fel';
    /** titta–täck: syns förebilden, har den synts, och står den kvar (efter fel eller knuff)? */
    const fb = { syns: !vidFel, visad: !vidFel, kvar: false, brickor: vidFel || !tt || !(p.forebild?.brickor_efter_sek > 0) };
    return new Promise((klar) => {
      let upptagen = false;
      const tandForebild = (/** @type {string} */ varfor) => {
        if (vidFel && !fb.visad) {
          // första felet: ordet tänds bredvid bilden, och han tittar. Vid nästa bricka tonas det bort.
          fb.syns = true; fb.visad = true; spar.forebild = true;
          logg.handelse('formel', `${p.id}: förebilden tänds (${varfor})`);
          return;
        }
        if (!tt || fb.kvar) return;
        fb.syns = true; fb.kvar = true; spar.forebild = true;
        logg.handelse('formel', `${p.id}: förebilden tänds (${varfor}) och står kvar`);
      };
      // knuffen: utifrån bilden glimtar bilden (förebilden pekar på svaret och kommer först efter fel), annars förebilden
      const k = knuffKlocka(p.knuff, () => {
        if (vidFel && !fb.visad) { const b = ui.plattan.querySelector('.formel-bild'); b?.classList.remove('puls'); void (/** @type {HTMLElement | null} */ (b))?.offsetWidth; b?.classList.add('puls'); return; }
        tandForebild('knuff'); rita(); ui.plattan.querySelector('.forebild .bokstav')?.classList.add('blinkar');
      });
      if (!fb.brickor) window.setTimeout(() => { fb.brickor = true; if (!upptagen) rita(); }, tid(p.forebild.brickor_efter_sek * 1000));
      const tack = () => {
        if (!tt || !fb.syns || fb.kvar) return;
        fb.syns = false; logg.handelse('formel', `${p.id}: förebilden tonas bort (täck)`);
      };
      const rita = () => {
        const bokstav = (/** @type {number | null} */ id) => (id === null ? '' : f.s.brickor.find((x) => x.id === id)?.bokstav ?? '');
        // förebilden: utifrån bilden finns den inte alls förrän första felet
        const forebild = p.forebild && fb.visad ? `<div class="forebild ${fb.syns ? '' : 'tonad'}" aria-label="Förebild">${[...p.forebild.text].map((c) => `<span class="bokstav">${ui.esc(c)}</span>`).join('')}</div>` : '';
        // bilden som ställer frågan (Farfars ristade svärd), med förebilden bredvid när den har tänts
        const bild = p.bild ? `<div class="formel-bild" aria-hidden="true">${bilder.html(p.bild)}</div>` : '';
        const overst = bild ? `<div class="formel-overst">${bild}${forebild}</div>` : forebild;
        // ungen håller tassarna för ögonen medan förebilden är borta (titta–täck), men bara när den har synts
        const tacker = tt && fb.visad && !fb.syns ? '<span class="unge-tacker" aria-hidden="true"><span class="kropp"></span><span class="tass"></span><span class="tass"></span></span>' : '';
        const platser = `<div class="platser">${f.s.platser.map((id, i) => `<span class="plats ${f.s.last[i] ? 'last' : ''} ${id !== null && !f.s.last[i] ? 'flyttbar' : ''}" data-plats="${i}" ${id !== null ? `data-id="${id}"` : ''}>${ui.esc(bokstav(id))}</span>`).join('')}</div>`;
        const brickor = `<div class="brickor ${fb.brickor ? '' : 'vantar'}">${f.s.brickor.map((x) => `<button type="button" class="bricka ${f.s.platser.includes(x.id) ? 'anvand' : ''} ${f.s.tips === x.id ? 'tips' : ''}" data-id="${x.id}">${ui.esc(x.bokstav)}</button>`).join('')}<button type="button" class="bricka sudda" aria-label="Ta tillbaka">⌫</button></div>`;
        ui.visaPlatta(`<div class="formel-ruta">${tacker}${overst}${platser}${brickor}</div>`, 'pussel P11_formel');
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
        if (r.resultat === 'lagd') { tack(); ljud.spela('bricka'); rita(); upptagen = false; return; }
        rita();
        if (r.resultat === 'fel') {
          tandForebild('fel'); ljud.spela('fel'); ui.plattan.querySelector('.platser')?.classList.add('skakar'); await vanta(tid(400));
          // samma fel ord igen: bara ljudet och ungens blick
          if (/** @type {any} */ (r).samma) { logg.handelse('formel', `${p.id}: samma fel igen (kort)`); await kortReaktion(); } else await reaktion(r.reaktion);
          rita(); upptagen = false; return;
        }
        k.stopp(); sluta();
        ljud.spela('ratt');
        // kolla: förebilden lyser en sekund ovanför hans ord (titta–täck)
        // utifrån bilden lyser ordet ovanför bilden
        const kolla = tt ? `<div class="forebild kolla">${[...p.forebild.text].map((c) => `<span class="bokstav">${ui.esc(c)}</span>`).join('')}</div>${p.bild ? `<div class="formel-bild" aria-hidden="true">${bilder.html(p.bild)}</div>` : ''}` : '';
        const ordet = `<div class="formel-luft-ruta">${kolla}<div class="formel-i-luften">${ui.esc(p.svar)}</div></div>`;
        ui.visaPlatta(ordet, 'formel-luft');
        await vanta(tid(1000)); ui.doljPlatta();
        if (tt) logg.handelse('formel', `${p.id}: klar ${spar.forebild ? 'med' : 'utan'} förebild`);
        await reaktion(r.reaktion);
        klar({ niva: p.niva, forstaForsoket: f.forstaForsoket, forsok: f.s.fel + 1, hjalp: spar.hjalp });
      };
      const sluta = lyssnaHandling((h) => {
        if (h.typ === 'bokstav' && fb.brickor) svar(f.skriv(h.tecken));
        if (h.typ === 'sudda' && !upptagen && f.sudda()) rita();
      });
      rita();
    });
  }

  /**
   * Räddningen (P15, apan i nätet): kategorin läser han själv, ett fält per bokstav och bokstavsbrickor.
   * Ett tryck i taget: reaktionen spelas klart innan nästa tryck tas emot. En rätt bokstav fylls i överallt där den
   * finns, en fel bricka tonas ut och apan glider en bit. Efter första rätta bokstaven lyser staven: ett tryck på den
   * ger kasta-läget, som formelvyn (fälten får guldkant och nästa tomma lyser). Där studsar en fel bricka tillbaka
   * ("pff"), de rätta ligger kvar, och efter två fel på samma plats blinkar rätt bricka. Inget fel räknas där.
   * Mellanslag trycker på staven, och en bokstavstangent trycker på brickan.
   * @param {any} p
   */
  async function raddning(p) {
    const r = skapaRaddning(p);
    const spar = { hjalp: false };
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    return new Promise((klar) => {
      let upptagen = false, stavGlimtar = false;
      const k = knuffKlocka(p.knuff, () => ui.plattan.querySelector('.lapp')?.classList.add('puls'), undefined, knufftidMs({ text: p.kategori }));
      const rita = () => {
        const falt = `<div class="platser">${r.s.falt.map((b, i) => `<span class="plats ${b ? 'last' : ''} ${r.s.kastar && i === r.nasta ? 'nasta' : ''}" data-plats="${i}">${ui.esc(b || '')}</span>`).join('')}</div>`;
        // i kasta-läget går alla brickor att använda utom de fel gissade (E behövs kanske två gånger)
        const dold = (/** @type {number} */ id) => !r.s.kastar && r.s.provade.has(id) && !r.s.fela.has(id);
        const brickor = `<div class="brickor">${r.s.brickor.map((x) => `<button type="button" class="bricka ${r.s.fela.has(x.id) ? 'tonad' : ''} ${dold(x.id) ? 'anvand' : ''} ${r.s.tips === x.id ? 'tips' : ''}" data-id="${x.id}"${r.s.fela.has(x.id) ? ' disabled' : ''}>${ui.esc(x.bokstav)}</button>`).join('')}</div>`;
        const stav = r.s.kastaErbjuden ? `<button type="button" class="stav-knapp ${r.s.kastar ? 'lyft' : ''} ${stavGlimtar ? 'glimtar' : ''}" aria-label="Staven"><span class="stav-ikon"></span></button>` : '';
        ui.visaPlatta(`<div class="formel-ruta raddning-ruta ${r.s.kastar ? 'kastar' : ''}">${stav}<div class="lapp p-${ui.esc(p.papper || 'lapp')}">${ui.rader(p.kategori, varden())}</div>${falt}${brickor}</div>`, 'pussel P15_raddning');
        tillatNos(p, spar);
        ui.plattan.querySelectorAll('.bricka[data-id]').forEach((el) => el.addEventListener('click', () => tryck(Number(/** @type {HTMLElement} */ (el).dataset.id))));
        ui.plattan.querySelector('.stav-knapp')?.addEventListener('click', () => vaxla());
      };
      const vaxla = () => {
        if (upptagen || !r.vaxlaKasta()) return;
        stavGlimtar = false; ljud.spela('klick');
        logg.handelse('räddning', r.s.kastar ? 'kasta-läget' : 'ut ur kasta-läget');
        rita();
      };
      const studsa = (/** @type {number} */ id) => {
        const el = ui.plattan.querySelector(`.bricka[data-id="${id}"]`);
        el?.classList.remove('studsar'); void (/** @type {HTMLElement | null} */ (el))?.offsetWidth; el?.classList.add('studsar');
      };
      const tryck = async (/** @type {number} */ id) => {
        if (upptagen || ui.nosAktiv) return;
        k.nollstall();
        if (r.s.kastar) {
          const res = r.kasta(id);
          if (res.resultat === 'ingen') return;
          logg.handelse('val', `${p.id}: kasta ${r.s.brickor.find((x) => x.id === id)?.bokstav} på plats ${res.plats + 1}`, { resultat: res.resultat });
          if (res.resultat === 'studs') { ljud.spela('pff'); rita(); studsa(id); return; }
          ljud.spela('bricka'); rita();
          if (res.resultat === 'klar') await fardig();
          return;
        }
        const res = r.gissa(id);
        if (res.resultat === 'ingen') return;
        logg.handelse('val', `${p.id}: ${r.s.brickor.find((x) => x.id === id)?.bokstav}`, { resultat: res.resultat });
        upptagen = true;
        if (res.resultat === 'fel') {
          ljud.spela('fel'); rita();
          await reaktion(p.vid_fel);
          upptagen = false; rita(); return;
        }
        ljud.spela('ratt'); rita();
        if (res.resultat === 'klar') { await fardig(); return; }
        if (res.erbjud) {
          // staven lyser stilla, och erbjudandet läses upp utan att vänta (det är ett erbjudande, inget krav)
          stavGlimtar = true; rita();
          if (p.kasta?.erbjudande) sag(p.kasta.erbjudande).then(() => {}, () => {});
        }
        await vanta(tid(350));
        upptagen = false;
      };
      const fardig = async () => {
        upptagen = true; k.stopp(); sluta();
        ljud.spela('ratt');
        ui.visaPlatta(`<div class="formel-i-luften">${ui.esc(r.s.svar)}</div>`, 'formel-luft');
        await vanta(tid(1000)); ui.doljPlatta();
        logg.handelse('räddning', r.s.kastat ? 'klar i kasta-läget' : 'klar genom att gissa', { fel: r.s.fel });
        await reaktion(r.s.kastat ? (p.kasta?.vid_ratt ?? p.vid_ratt) : p.vid_ratt);
        // bara kasta-läget räknas som skrivning på S2 (granskningen, B)
        klar({ niva: r.s.kastat ? 'S2' : null, forstaForsoket: r.forstaForsoket, forsok: r.s.fel + 1, hjalp: spar.hjalp });
      };
      const sluta = lyssnaHandling((h) => {
        if (h.typ === 'interagera') { vaxla(); return; }
        if (h.typ !== 'bokstav') return;
        const b = r.s.brickor.find((x) => x.bokstav === versaler(h.tecken) && !r.s.fela.has(x.id) && (r.s.kastar || !r.s.provade.has(x.id)));
        if (b) tryck(b.id);
      });
      rita();
    });
  }

  /**
   * Kodlåset (P9): låset med tecken och chiffernyckeln står på samma skärm, och han lägger bokstäverna med brickor.
   * Låset kontrolleras först när alla fälten är fyllda (kontroll: hela_ordet). Rätta bokstäver stannar, och varje rätt
   * avkodat tecken lyser på låset. Med visa_forsta visar ungen det första tecknet: det lyser på låset och på nyckeln,
   * och det räknas inte som hjälp. Efter två fel lyser tecknet för nästa saknade bokstav på nyckeln. Ordet lyser en
   * stund (svar_lyser_sek) innan locket flyger upp.
   * @param {any} p
   */
  async function kodlas(p) {
    const f = skapaFormel({ ...p, svar: versaler(p.svar) });
    const spar = { hjalp: false };
    if (p.instruktion) await replik(p.instruktion);
    rum.frys(true);
    const c = p.chiffer || { tecken: [], nyckel: [] };
    let visar = p.visa_forsta ? 0 : -1;
    if (visar >= 0) logg.handelse('kodlås', 'ungen visar första tecknet (inte hjälp)');
    return new Promise((klar) => {
      let upptagen = false;
      const k = knuffKlocka(p.knuff, () => ui.plattan.querySelector('.kod-nyckel')?.classList.add('puls'));
      const tipsBokstav = () => (f.s.tips === null ? null : f.s.brickor.find((x) => x.id === f.s.tips)?.bokstav ?? null);
      const rita = () => {
        const bokstav = (/** @type {number | null} */ id) => (id === null ? '' : f.s.brickor.find((x) => x.id === id)?.bokstav ?? '');
        const las = `<div class="kod-kort kod-las"><div class="kod-tecken">${c.tecken.map((t, i) => `<span class="kod-tecken-ruta ${f.s.last[i] ? 'ratt' : ''} ${i === visar ? 'visar' : ''}">${bilder.html(t)}</span>`).join('')}</div>
          <div class="platser">${f.s.platser.map((id, i) => `<span class="plats ${f.s.last[i] ? 'last' : ''} ${id !== null && !f.s.last[i] ? 'flyttbar' : ''}" data-plats="${i}">${ui.esc(bokstav(id))}</span>`).join('')}</div></div>`;
        const tb = tipsBokstav();
        const nyckel = `<div class="kod-kort kod-nyckel">${c.nyckel.map((n) => `<span class="kod-par ${visar >= 0 && n.tecken === c.tecken[visar] ? 'visar' : ''} ${tb && n.bokstav === tb ? 'tips' : ''}">${bilder.html(n.tecken)}<span class="kod-bokstav">${ui.esc(n.bokstav)}</span></span>`).join('')}</div>`;
        const brickor = `<div class="brickor">${f.s.brickor.map((x) => `<button type="button" class="bricka ${f.s.platser.includes(x.id) ? 'anvand' : ''}" data-id="${x.id}">${ui.esc(x.bokstav)}</button>`).join('')}<button type="button" class="bricka sudda" aria-label="Ta tillbaka">⌫</button></div>`;
        ui.visaPlatta(`<div class="pussel-ruta kod-ruta"><div class="kod-rad">${las}${nyckel}</div>${brickor}</div>`, 'pussel P9_kodlas');
        tillatNos(p, spar);
        ui.plattan.querySelectorAll('.bricka[data-id]').forEach((el) => el.addEventListener('click', () => svar(f.lagg(Number(/** @type {HTMLElement} */ (el).dataset.id)))));
        ui.plattan.querySelectorAll('.plats.flyttbar').forEach((el) => el.addEventListener('click', () => { if (!upptagen && f.taBort(Number(/** @type {HTMLElement} */ (el).dataset.plats))) { ljud.spela('klick'); rita(); } }));
        ui.plattan.querySelector('.sudda')?.addEventListener('click', () => { if (!upptagen && f.sudda()) { ljud.spela('klick'); rita(); } });
      };
      const svar = async (/** @type {{ resultat: string, reaktion: any }} */ r) => {
        if (upptagen || r.resultat === 'ingen') return;
        k.nollstall(); upptagen = true;
        if (r.resultat === 'lagd') { visar = -1; ljud.spela('bricka'); rita(); upptagen = false; return; }
        if (r.resultat === 'fel') {
          logg.handelse('val', `${p.id}: fel ord`, { ratt: f.s.senastRatt });
          ljud.spela('klonk'); rita(); ui.plattan.querySelector('.kod-las')?.classList.add('skakar');
          await vanta(tid(400));
          if (/** @type {any} */ (r).samma) await kortReaktion(); else await reaktion(r.reaktion);
          rita(); upptagen = false; return;
        }
        k.stopp(); sluta();
        logg.handelse('val', `${p.id}: ${f.s.svar}`, { resultat: 'klar' });
        ljud.spela('ratt'); rita();
        // ordet lyser en stund innan låset klickar upp (han ska hinna läsa det innan Farfar säger det)
        ui.visaPlatta(`<div class="formel-i-luften">${ui.esc(f.s.svar)}</div>`, 'formel-luft');
        await vanta((p.svar_lyser_sek ?? 1) * 1000); // lästid för spelaren: kortas inte i snabbläget
        ljud.spela('klick_las'); ui.doljPlatta();
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

  /**
   * Krukorna (P26): svinga staven mot krukorna i rummet, eller mot rummets föremål (foremal: buskarna, lövhögarna).
   * Det sista som hittas är alltid sak_i_sista (skattlådan, lådan) eller kartbiten. Vila, ingen text.
   * @param {any} p
   */
  async function krukor(p) {
    const k = skapaKrukor(p);
    rum.frys(false);
    /** @type {string[]} */
    let ids;
    if (p.foremal) {
      ids = p.foremal.filter((/** @type {string} */ id) => rum.ruta(id));
      if (ids.length !== p.foremal.length) logg.handelse('FEL', `${p.id}: ${p.foremal.length - ids.length} föremål saknas i rummet`);
    } else {
      // kartan säger vilket föremål som är krukorna (visar: pusslets id)
      const bas = visarFor(p.id)?.id ?? rum.objekt.find((o) => o.sort === 'sak')?.id ?? '';
      if (!visarFor(p.id)) logg.handelse('FEL', `ingen karta visar ${p.id}, krukorna hamnar vid ${bas}`);
      ids = rum.dela(bas, k.s.antal);
    }
    visaEtiketter();
    const knuff = knuffKlocka(p.knuff, () => { const i = k.s.slagna.findIndex((x) => x === null); if (i >= 0 && ids[i]) rum.markera(ids[i], true); });
    while (!k.s.klar && ids.length) {
      const kvar = ids.filter((_, i) => k.s.slagna[i] === null);
      if (!kvar.length) break;
      const id = await anvand(kvar, { verb: 'svinga' });
      knuff.nollstall(); rum.markera(id, false);
      const fynd = k.sla(ids.indexOf(id));
      ljud.spela(p.foremal ? 'prassel' : 'sla'); rum.slagen(id);
      logg.handelse('svinga', `${id}: ${fynd}`);
      if (fynd === 'bar') { av.bar++; ui.uppdateraHud(av); ljud.spela('bar'); await ui.visaFest('🫐', tid(600)); }
      else if (fynd && fynd === k.sista) { ljud.spela('fest'); await ui.visaFest(bilder.emoji(fynd) || (fynd.startsWith('kartbit') ? '📜' : '✨'), tid(900)); }
      else if (fynd && fynd !== 'tom') { ljud.spela('allmant'); await ui.visaFest(bilder.emoji(fynd) || '✨', tid(700)); }
      else await vanta(tid(300));
    }
    knuff.stopp();
    if (p.vid_ratt) await reaktion(p.vid_ratt);
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
    handlingGjord('mata_ungen');
    const fran = ui.$('#hud-bar').getBoundingClientRect();
    const u = rum.ungePunkt, till = skarm(u.x, u.y);
    ui.flygBar({ x: fran.left + fran.width / 2, y: fran.top + fran.height / 2 }, till, tid(450)).then(() => {
      rum.ungeReagerar(true); ljud.spela('unge');
    });
  });
  ui.$('#tanke').addEventListener('click', (e) => { if (/** @type {HTMLElement} */ (e.target).closest('.tanke-lapp:not(.tanke-skylt)')) /** @type {HTMLElement} */ (ui.$('#hud-lapp')).click(); });
  ui.$('#hud-lapp').addEventListener('click', () => {
    if (!ui.plattan.hidden) return;
    const id = av.lappar[av.lappar.length - 1];
    if (id) visaLapp(b.pussel(id), false);
  });

  /**
   * Spelaren nosar själv (s09): lappen öppnas med nosen tänd, och ordet (DINOMAT) glimtar. Han trycker på ordet,
   * eller trycker Mellanslag på datorn (ordet är redan markerat), och hör det. Gratis. Nosar han på ett annat ord
   * läses det också, och nosen tänds igen. Knuff efter 8 s, och efter 20 s går det att gå vidare ändå.
   * @param {any} st
   */
  async function nosDemo(st) {
    const id = (av.lappar || [])[(av.lappar || []).length - 1];
    const p = id ? b.pussel(id) : null;
    rum.frys(true);
    const text = p ? skapaValj(p, { niva: lasniva(p.typ) }).s.text : null;
    const el = ui.visaPlatta(`<div class="pussel-ruta"><div class="lapp p-${ui.esc(p?.papper || 'lapp')}">${ui.rader(text || st.ord, varden())}</div><button type="button" class="vidare" aria-label="Stäng" style="visibility:hidden">▶</button></div>`, 'pussel lapp-vy nos-demo');
    const malOrd = /** @type {HTMLElement | undefined} */ ([...el.querySelectorAll('.ord')].find((e) => versaler(/** @type {HTMLElement} */ (e).dataset.ord || '') === versaler(st.ord)));
    const tand = () => {
      ui.sattNos(true, { betala: () => true }); // kostnad 0
      ui.tandNos();
      if (!d.pek() && malOrd) ui.markeraOrd(malOrd);
    };
    tand();
    malOrd?.classList.add('glimtar');
    ui.pulsera('#hud-nos');
    logg.handelse('nos', 'demo ' + st.ord);
    const vidare = /** @type {HTMLElement} */ (el.querySelector('.vidare'));
    const visaVidare = () => { vidare.style.visibility = ''; vidare.classList.add('synlig'); };
    let knuff = 0;
    const satKnuff = () => {
      window.clearTimeout(knuff);
      knuff = window.setTimeout(() => {
        if (pausad) { satKnuff(); return; }
        if (!ui.nosAktiv) tand();
        malOrd?.classList.remove('puls'); void malOrd?.offsetWidth; malOrd?.classList.add('puls');
        if (malOrd) { const r2 = malOrd.getBoundingClientRect(); ui.styrhjalp(d.pek() ? 'tryck' : 'mellanslag', { x: r2.left + r2.width / 2, y: r2.bottom }); ui.$('#styrhjalp').classList.add('over-platta'); }
        logg.handelse('knuff', 'nosa på ' + st.ord);
        satKnuff();
      }, 8000);
    };
    satKnuff();
    const nodutgang = window.setTimeout(visaVidare, 20000); // spelaren ska aldrig fastna
    // ett annat ord: det läses, och nosen tänds igen
    const sluta = ui.vidNos((vad, ord) => { if (vad === 'ord' && versaler(ord || '') !== versaler(st.ord)) window.setTimeout(() => { if (ui.plattan.contains(el)) tand(); }, 400); });
    const fardig = new Promise((klar) => vantarPaHandling.set('nosa:' + versaler(st.ord), () => klar(undefined)));
    await Promise.race([fardig, new Promise((klar) => vidare.addEventListener('click', () => klar(undefined), { once: true }))]);
    vantarPaHandling.delete('nosa:' + versaler(st.ord));
    window.clearTimeout(knuff); window.clearTimeout(nodutgang); sluta(); ui.styrhjalp(null);
    malOrd?.classList.remove('glimtar', 'puls');
    // låt ordet läsas klart (med maxtid), sedan går han vidare själv
    const t0 = performance.now();
    while (ui.ljudar && performance.now() - t0 < 5000) await vanta(100);
    if (vidare.style.visibility === 'hidden' || !vidare.classList.contains('synlig')) {
      visaVidare();
      await ui.vantaFortsatt(vidare, lyssnaHandling);
    }
    // trycket på ▶ får inte bubbla vidare till nästa replik på samma läsplatta
    await vanta(0);
    ui.doljPlatta();
  }

  /** Farfars bok. @param {any} st */
  /**
   * Boken: uppslag 1 läses av sig själv, och sedan glimtar sidhörnet (▶) som knuff. Från uppslag 2 bläddrar
   * spelaren själv, och uppslaget läses efter hans tryck. Bilden och 🔊 läser uppslaget igen.
   * @param {any} st
   */
  async function bok(st) {
    rum.frys(true);
    let i = 0;
    let knuff = 0;
    await new Promise((klar) => {
      const rita = () => {
        clearTimeout(knuff);
        const u = st.uppslag[i];
        const sist = i === st.uppslag.length - 1;
        ui.visaPlatta(`<div class="bok-ruta"><div class="uppslag"><div class="bok-bild">${bilder.html(u.bild)}</div>${u.bildtext ? `<div class="bildtext">${ui.rader(u.bildtext, varden())}</div>` : ''}<div class="boktext">${ui.rader(u.text, varden())}</div></div>
          <div class="bok-knappar"><button type="button" class="knapp bak ${i === 0 ? 'av' : ''}" aria-label="Bakåt">◀</button><button type="button" class="knapp las" aria-label="Läs">🔊</button><button type="button" class="knapp fram" aria-label="${sist ? 'Klar' : 'Framåt'}">${sist ? '✓' : '▶'}</button></div></div>`, 'bok');
        ui.sattNos(true, { betala: () => true });
        const plat = ui.plattan;
        const las = () => sag({ talare: st.talare, text: u.text, upplast: true });
        const fram = /** @type {HTMLElement | null} */ (plat.querySelector('.fram'));
        // sidhörnet glimtar: direkt efter första uppslaget (så syns det hur man bläddrar), annars efter en stund
        const glimta = (/** @type {number} */ ms) => { clearTimeout(knuff); knuff = window.setTimeout(() => { if (!pausad) fram?.classList.add('glimtar'); }, ms); };
        plat.querySelector('.las')?.addEventListener('click', las);
        plat.querySelector('.bok-bild')?.addEventListener('click', las);
        plat.querySelector('.bak')?.addEventListener('click', () => { if (i > 0) { rost.tyst(); i--; rita(); } });
        fram?.addEventListener('click', () => { rost.tyst(); clearTimeout(knuff); if (sist) { sluta(); klar(undefined); } else { i++; ljud.spela('klick'); rita(); } });
        // uppslag 1 läses alltid av sig själv; de följande läses efter spelarens tryck (han har just bläddrat)
        las().then(() => glimta(i === 0 ? 0 : tid(6000)), () => glimta(0));
      };
      const sluta = lyssnaHandling((h) => { if (h.typ === 'interagera') /** @type {HTMLElement | null} */ (ui.plattan.querySelector('.fram'))?.click(); });
      rita();
    });
    clearTimeout(knuff);
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
        const f = (/** @type {keyof HJALTE_FARGER} */ del) => hex(HJALTE_FARGER[del][val[del] ?? 0] ?? HJALTE_FARGER[del][0]);
        // spelarens figur: rund hjälm runt ett stort ansikte, dräkt, armar i hudfärgen, skor (hjälmen och skorna går inte att välja)
        const bild = `<div class="hjalte-bild" aria-hidden="true"><span class="hb-hjalm" style="background:${hex(HJALTE_FAST.hjalm)}"><span class="hb-ansikte" style="background:${f('hudfarg')}"><i></i><i></i><b></b></span></span><span class="hb-kropp"><span class="hb-arm" style="background:${f('hudfarg')}"></span><span class="hb-drakt" style="background:${f('drakt')}"></span><span class="hb-arm" style="background:${f('hudfarg')}"></span></span><span class="hb-skor"><span style="background:${hex(HJALTE_FAST.skor)}"></span><span style="background:${hex(HJALTE_FAST.skor)}"></span></span></div>`;
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
    const bortSkyltar = visaUtgangsSkyltar();
    (async () => {
      while (!klar) {
        const fri = frivilligaKvar().filter((x) => !foremal.includes(x));
        vantar = anvand([...foremal, ...fri]);
        const id = await Promise.race([vantar, slutat.then(() => null)]);
        if (!id || klar) break;
        senast = performance.now();
        if (fri.includes(id)) { await korFrivilligt(id); senast = performance.now(); continue; }
        const n = (slagna.get(id) || 0) + 1; slagna.set(id, n);
        ljud.spela('sla');
        if (n <= BAR_PER) { av.bar++; ui.uppdateraHud(av); ljud.spela('bar'); await ui.visaFest('🫐', tid(500)); }
        await vanta(tid(300));
        if (foremal.every((f) => (slagna.get(f) || 0) >= BAR_PER)) slut();
      }
    })();
    await slutat;
    bortSkyltar();
    window.clearInterval(vakt); window.clearInterval(rorelse);
    vantar?.avbryt();
  }

  /**
   * Hjälten bär en sak (filten): den svävar efter honom som ljusbollen och läggs på målet när han når fram själv.
   * @param {any} st
   */
  async function bara(st) {
    rum.frys(false);
    const o = rum.ruta(st.till);
    if (!o) { logg.handelse('FEL', 'bära: målet finns inte i rummet: ' + st.till); return; }
    const e = egenskaper(st.bild);
    const farg = e.farg && PALETT[e.farg] ? parseInt(PALETT[e.farg].slice(1), 16) : 0xc8553d;
    rum.bara(farg);
    rum.markera(st.till, true);
    await rum.vantaPa([st.till]);
    rum.markera(st.till, false);
    rum.lagg(st.till);
    ljud.spela('klick');
    await vanta(tid(400));
  }

  /** Avståndet från hjältens fötter till en ruta. @param {{ x: number, y: number }} p @param {any} o */
  const avstandTill = (p, o) => Math.hypot(Math.max(o.x - p.x, 0, p.x - (o.x + o.b)), Math.max(o.y - p.y, 0, p.y - (o.y + o.h)));

  /**
   * Dialogregeln: figuren kallar på avstånd (vinkar och ropar högst fyra korta ord), och samtalet börjar när hjälten
   * kommer inom ca 1,5 rutor. Då stannar världen, och stegen efter detta (repliker) är samtalet.
   * @param {any} st
   */
  async function prata(st) {
    rum.frys(false);
    const o = rum.ruta(st.figur);
    if (!o) { logg.handelse('FEL', 'prata: figuren finns inte i rummet: ' + st.figur); return; }
    const nara = () => avstandTill(rum.pos, o) <= RUM.ruta * 1.5;
    if (nara()) {
      // står hjälten redan vid figuren kallar den ändå ("Här!"), men samtalet börjar direkt
      if (st.kalla) {
        rum.vinka(o.id);
        ui.ropa(ui.rader(st.kalla.text, varden()), skarm(o.x + o.b / 2, o.y));
        const start = performance.now();
        await Promise.race([sag(st.kalla), vanta(4000)]);
        await vanta(Math.max(0, 1500 - (performance.now() - start)));
        ui.ropa(null);
      }
      rum.frys(true);
      return;
    }
    const kalla = () => {
      rum.vinka(o.id);
      if (!st.kalla) return;
      ui.ropa(ui.rader(st.kalla.text, varden()), skarm(o.x + o.b / 2, o.y));
      sag(st.kalla);
      window.setTimeout(() => ui.ropa(null), 2200); // lästid för spelaren, kortas inte i snabbläget
    };
    kalla();
    const igen = window.setInterval(() => { if (!pausad && !rum.fryst) kalla(); }, 9000);
    await new Promise((klar) => {
      const t = window.setInterval(() => { if (!rum.fryst && nara()) { window.clearInterval(t); klar(undefined); } }, 60);
    });
    window.clearInterval(igen); ui.ropa(null); inmatning.rensaGaTill();
    rum.frys(true);
  }

  /**
   * Figuren räcker fram en sak (lappen): den glimtar vid figuren, och hjälten tar den själv med ett tryck
   * (eller Mellanslag) när han står vid figuren. Sedan flyger den till honom.
   * @param {any} st
   */
  async function taEmot(st) {
    rum.frys(false);
    const o = rum.ruta(st.fran);
    if (!o) { logg.handelse('FEL', 'ta emot: figuren finns inte i rummet: ' + st.fran); return; }
    await anvand([st.fran]);
    ljud.spela('klick');
    await ui.visaFest(bilder.html(st.bild), tid(700));
  }

  /** Passets slut: föreslå en paus, men tvinga inte. */
  /**
   * Passets slut: föreslå en paus, men tvinga inte. Två bilder: ▶ för att fortsätta och den sovande ungen för att
   * sluta för idag (aldrig en dörr, som han just har lärt sig betyder "gå vidare"). Frågan läses upp.
   * @param {any} [st]
   */
  async function passSlut(st) {
    rum.frys(true);
    tonaNasta = true; // nästa pass börjar en ny stund (ny dag): tona in
    ljud.spela('fest');
    const sover = '<span class="unge-sover" aria-hidden="true"><span class="kropp"></span><span class="zz">z z</span></span>';
    // frågan: sparpunktens egen, annars äventyrets (sparpunkt_fraga i aventyr.json)
    const fr = st?.fraga ?? aventyr.sparpunkt_fraga?.text ?? null;
    const fraga = fr ? `<div class="fraga-text">${ui.rader(fr.text, varden())}</div>` : '';
    const s = ui.visaSkarm(`<div class="pass-slut">${fraga}<div class="knappar"><button type="button" class="knapp stor fortsatt" aria-label="Fortsätt">▶</button><button type="button" class="knapp stor paus" aria-label="Sluta för idag">${sover}</button></div></div>`);
    if (fr) sag(fr).then(() => {}, () => {});
    await new Promise((klar) => {
      s.querySelector('.fortsatt')?.addEventListener('click', () => { rost.tyst(); klar(undefined); });
      s.querySelector('.paus')?.addEventListener('click', () => { rost.tyst(); ui.doljSkarm(); slutaForIdag().then(() => klar(undefined)); });
    });
    ui.doljSkarm();
  }

  const SOVER = '<span class="unge-sover" aria-hidden="true"><span class="kropp"></span><span class="zz">z z</span></span>';
  /**
   * SLUTA FÖR IDAG (aventyr.json: sluta_for_idag), från pausmenyn eller vid passets slut: spelet har sparat, och
   * en kort avslutning spelas, med ungen som somnar om den finns, annars utan. Sedan den sovande ungen och ▶, som
   * fortsätter där han var.
   */
  async function slutaForIdag() {
    const s = aventyr.sluta_for_idag;
    const medUngen = !!tillstand.spelare.unge?.folj && !!tillstand.spelare.unge?.namn;
    logg.handelse('sluta för idag', medUngen ? 'med ungen' : 'före ungen');
    spara();
    const varFryst = rum.fryst;
    rum.frys(true);
    for (const st of (s && (medUngen ? s.med_ungen : s.fore_ungen)) || []) {
      if (st.typ === 'replik') await replik(st);
      else if (st.typ === 'mellanscen' && st.beskrivning) { ui.visaRegi(st.beskrivning, 0); await vanta(tid(1500)); ui.doljRegi(); }
    }
    rum.frys(true);
    const p = ui.visaSkarm(`<div class="pass-slut sover-nu"><div class="stor-ikon">${SOVER}</div><button type="button" class="knapp stor fortsatt" aria-label="Fortsätt">▶</button></div>`);
    await new Promise((klar) => p.querySelector('.fortsatt')?.addEventListener('click', () => klar(undefined), { once: true }));
    ui.doljSkarm();
    logg.handelse('sluta för idag', 'fortsätter');
    rum.frys(varFryst);
  }

  // ------------------------------------------------------------------ pausmenyn (stilguiden §6)
  /** Hjälteboken: vad varje flik har, för stjärnan på en ny flik. */
  const FLIKAR = /** @type {const} */ (['staven', 'garderoben', 'dinoboken']);
  const hjalte = () => tillstand.spelare.hjalte;
  /** @param {typeof FLIKAR[number]} flik */
  const antalI = (flik) => (flik === 'staven' ? (hjalte().formler || []).length : flik === 'garderoben' ? (hjalte().garderob || []).length : (tillstand.spelare.dinobok || []).length);
  const sett = () => (tillstand.spelare.sett = tillstand.spelare.sett || {});
  /** @param {typeof FLIKAR[number]} flik */
  const nyFlik = (flik) => antalI(flik) > (sett()[flik] || 0);
  /** Pausknappen syns när det finns något i kartan eller hjälteboken (eller när ett steg har visat den). */
  function visaPausknapp() {
    const finns = !!av.ui?.hjalteboken || FLIKAR.some((f) => antalI(f) > 0) || (av.kartbitar || []).length > 0;
    ui.$('#hud-paus').hidden = !finns || !b;
  }
  /** Något nytt i hjälteboken: pausknappen glimtar en gång (inte menyn). */
  function nyttIHjalteboken() {
    visaPausknapp();
    const k = ui.$('#hud-paus'); k.classList.remove('glimt'); void k.offsetWidth; k.classList.add('glimt');
  }
  /** Ordet på en knapp eller flik (aventyr.json: gransnitt). Saknas det visas bara bilden. @param {string} nyckel */
  const gransnittsOrd = (nyckel) => /** @type {string | undefined} */ (aventyr.gransnitt?.[nyckel]);
  /** En bildknapp med sitt ord under. @param {string} nyckel @param {string} bild @param {string} [klass] */
  const bildknapp = (nyckel, bild, klass = '') => {
    const ord = gransnittsOrd(nyckel);
    return `<button type="button" class="paus-val ${klass}" data-val="${nyckel}" aria-label="${ui.esc(ord ?? nyckel)}"><span class="paus-bild" aria-hidden="true">${bild}</span>${ord ? `<span class="paus-ord">${ui.rader(ord, varden(), 'kort-ord')}</span>` : ''}</button>`;
  };
  /** Ordet läses upp vid tryck (stilguiden §6). @param {string} nyckel */
  const lasOrd = (nyckel) => { const ord = gransnittsOrd(nyckel); if (ord) sag({ talare: 'berattare', text: ord, upplast: true }); };
  const BILD = { kartan: '🗺️', hjalteboken: '📖', staven: '<span class="stav-ikon"></span>', garderoben: '👑', dinoboken: '🦕' };
  /**
   * Pausmenyn: världen står still. KARTAN visar kartbitarna, HJÄLTEBOKEN har flikarna staven (formlerna),
   * garderoben (byt tillbaka det han har på sig) och Dinoboken. En ny flik har en stjärna tills han har tittat.
   * @param {'start' | 'kartan' | typeof FLIKAR[number]} [vy]
   */
  function oppnaPaus(vy = 'start') {
    if (!b) return;
    pausa('pausmeny');
    ritaPaus(vy);
  }
  /** En vy i pausmenyn (menyn är redan öppen). @param {'start' | 'kartan' | typeof FLIKAR[number]} vy */
  function ritaPaus(vy) {
    logg.handelse('pausmeny', vy);
    const stang = '<button type="button" class="knapp stor paus-stang" aria-label="Fortsätt">▶</button>';
    const tillbaka = '<button type="button" class="knapp paus-tillbaka" aria-label="Tillbaka">◀</button>';
    let html = '';
    if (vy === 'start') {
      const ny = FLIKAR.some(nyFlik);
      html = `<div class="paus-start">${bildknapp('kartan', BILD.kartan)}${bildknapp('hjalteboken', BILD.hjalteboken, ny ? 'ny' : '')}${aventyr.sluta_for_idag ? bildknapp('sluta_for_idag', SOVER, 'sluta') : ''}</div>${stang}`;
    } else if (vy === 'kartan') {
      const bitar = (av.kartbitar || []).slice().sort((x, y) => x - y);
      html = `${tillbaka}<div class="paus-karta">${bitar.map((n) => `<span class="kartbit" aria-label="Kartbit ${n}">🗺️<b>${n}</b></span>`).join('')}</div>${stang}`;
    } else {
      sett()[vy] = antalI(vy); spara(); // han har tittat: stjärnan släcks
      const flikar = FLIKAR.map((f) => bildknapp(f, BILD[f], `flik ${f === vy ? 'vald' : ''} ${nyFlik(f) ? 'ny' : ''}`)).join('');
      let sida = '';
      if (vy === 'staven') sida = `<div class="paus-formler">${(hjalte().formler || []).map((f) => `<button type="button" class="kort formel-ord" data-formel="${ui.esc(f)}"><span class="kort-etikett">${ui.rader(f, varden(), 'kort-ord')}</span></button>`).join('')}</div>`;
      if (vy === 'garderoben') {
        const pa = lagerFor(hjalte());
        sida = `<div class="paus-garderob">${(hjalte().garderob || []).map((x) => `<button type="button" class="kort sak ${pa[/** @type {'hjalmdekor' | 'ryggsack'} */ (x.sort)] === x.id ? 'vald' : ''}" data-sort="${ui.esc(x.sort)}" data-id="${ui.esc(x.id)}">${bilder.html(x.id)}</button>`).join('')}</div>`;
      }
      if (vy === 'dinoboken') sida = `<div class="paus-dinobok">${(tillstand.spelare.dinobok || []).map((x) => `<button type="button" class="kort dinosida" data-text="${ui.esc(x.bildtext || '')}">${bilder.html(x.bild)}${x.bildtext ? `<span class="kort-etikett">${ui.rader(x.bildtext, varden(), 'kort-ord')}</span>` : ''}</button>`).join('')}</div>`;
      html = `${tillbaka}<div class="paus-flikar">${flikar}</div><div class="paus-sida">${sida}</div>${stang}`;
    }
    const m = ui.visaPausmeny(`<div class="pausmeny vy-${vy}">${html}</div>`);
    m.querySelector('.paus-stang')?.addEventListener('click', stangPaus);
    m.querySelector('.paus-tillbaka')?.addEventListener('click', () => { rost.tyst(); ljud.spela('klick'); ritaPaus('start'); });
    m.querySelectorAll('.paus-val').forEach((el) => el.addEventListener('click', () => {
      const val = /** @type {HTMLElement} */ (el).dataset.val || '';
      ljud.spela('klick');
      if (val === 'sluta_for_idag') { stangPaus(); slutaForIdag(); return; }
      // hjälteboken öppnas på den nya fliken, annars på staven
      ritaPaus(val === 'hjalteboken' ? (FLIKAR.find(nyFlik) ?? 'staven') : /** @type {any} */ (val));
      lasOrd(val);
    }));
    m.querySelectorAll('.formel-ord').forEach((el) => el.addEventListener('click', () => sag({ talare: 'berattare', text: /** @type {HTMLElement} */ (el).dataset.formel || '', upplast: true })));
    m.querySelectorAll('.dinosida').forEach((el) => el.addEventListener('click', () => { const t = /** @type {HTMLElement} */ (el).dataset.text; if (t) sag({ talare: 'berattare', text: t, upplast: true }); }));
    m.querySelectorAll('.paus-garderob .sak').forEach((el) => el.addEventListener('click', () => {
      const e = /** @type {HTMLElement} */ (el); const sort = /** @type {'hjalmdekor' | 'ryggsack'} */ (e.dataset.sort);
      const pa = lagerFor(hjalte())[sort] === e.dataset.id;
      if (bytLager(hjalte(), sort, pa ? null : (e.dataset.id || null))) { ljud.spela('klick'); rum.sattLager(lagerFor(hjalte())); spara(); logg.handelse('garderob', `${sort}: ${pa ? 'av' : e.dataset.id}`); }
      ritaPaus('garderoben');
    }));
  }
  function stangPaus() { rost.tyst(); ui.doljPausmeny(); fortsatt('pausmeny'); }
  ui.$('#hud-paus').addEventListener('click', () => { if (pausad || !ui.plattan.hidden) return; ljud.spela('klick'); oppnaPaus(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ui.$('#pausmeny').hidden) { e.preventDefault(); stangPaus(); } });

  // ------------------------------------------------------------------ start, slut, meny
  async function startskarm() {
    const s = ui.visaSkarm(`<div class="start"><div class="stav-glimt" aria-hidden="true"></div><button type="button" class="knapp start-knapp" aria-label="Starta">▶</button></div>`);
    await new Promise((klar) => s.querySelector('.start-knapp')?.addEventListener('click', () => klar(undefined), { once: true }));
    ljud.starta(); rost.lasUpp();
    d.uppdatering.tillampa();
    ui.doljSkarm();
  }

  async function spela() {
    rum.lager = { ...lagerFor(tillstand.spelare.hjalte) };
    rum.sattUtseende(tillstand.spelare.hjalte.utseende || {});
    await startskarm();
    /** @type {any[]} namn som saknas efter ett hopp förbi tidigare kapitel (dop-pusslen frågar efter dem) */
    let dopAttFraga = [];
    for (const kapitelId of aventyr.kapitel) {
      const kapitel = d.kapitel.find((k) => k.id === kapitelId);
      if (!kapitel) continue;
      const fore = (/** @type {string} */ id) => aventyr.kapitel.indexOf(kapitelId) < aventyr.kapitel.indexOf(id);
      // sparningen är längre fram, eller ?kapitel=<id> hoppar dit (för den vuxne): kapitlet spelas inte, men det
      // spolas fram en gång, så att nästa kapitel börjar med det kapitlet ger (ungen, knapparna, formlerna)
      const hoppa = (av.kapitelId && av.kapitelId !== kapitelId && fore(av.kapitelId)) || (d.valtKapitel && aventyr.kapitel.includes(d.valtKapitel) && fore(d.valtKapitel));
      if (hoppa) {
        const spolat = (av.spolat = av.spolat || []);
        if (!spolat.includes(kapitelId)) { spolaFram({ kapitel, tillstand, aventyrId: AVENTYR }); spolat.push(kapitelId); logg.handelse('berättelse', 'spolat fram ' + kapitelId); spara(); }
        dopAttFraga = [...dopAttFraga, ...kapitel.pussel.filter((/** @type {any} */ p) => p.typ === 'P12_dop'
          && ((p.sparas_som === 'hjalte.namn' && !tillstand.spelare.hjalte.namn) || (p.sparas_som === 'unge.namn' && !tillstand.spelare.unge?.namn)))];
        continue;
      }
      if (!stodsAvGrabox(kapitel)) break;
      // den vuxne hoppade till en scen mitt i kapitlet (menyn): scenerna före den spolas fram, så att ungen,
      // knapparna, formlerna och det som har visats finns där, som efter en vanlig genomspelning
      if (av.spolaTill && av.kapitelId === kapitel.id) {
        const dop = spolaFram({ kapitel, tillstand, aventyrId: AVENTYR, tillScen: av.spolaTill });
        logg.handelse('berättelse', `spolat fram ${kapitel.id} till ${av.spolaTill}`);
        dopAttFraga = [...dopAttFraga, ...dop.filter((p) => !dopAttFraga.includes(p))];
        delete av.spolaTill; spara();
      }
      b = skapaBerattelse({ aventyr, kapitel, tillstand, aventyrId: AVENTYR, logg });
      // namnen som saknas frågas efter först, med de hoppade kapitlens egna dop-pussel, med rummet bakom
      if (dopAttFraga.length) await visaScen();
      for (const p of dopAttFraga) {
        const r = await pussel(p);
        if (r?.namn && p.sparas_som === 'hjalte.namn') tillstand.spelare.hjalte.namn = r.namn;
        if (r?.namn && p.sparas_som === 'unge.namn') tillstand.spelare.unge.namn = r.namn;
        spara();
      }
      dopAttFraga = [];
      ui.uppdateraHud(av); visaPausknapp();
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
  /**
   * Gråboxen spelar bara kapitel vars alla pusseltyper finns och vars alla rum har en karta (kapitel 1 får sina
   * kartor i T5). Med ?kapitel=<id> spelas ett kapitel ändå, med föremålen placerade automatiskt (för den vuxne).
   * @param {any} kapitel
   */
  const stodsAvGrabox = (kapitel) => kapitel.pussel.every((/** @type {any} */ p) => ['P1_las_och_valj', 'P28_packa', 'P11_formel', 'P12_dop', 'P26_krukorna', 'P15_raddning', 'P9_kodlas'].includes(p.typ))
    && (d.valtKapitel === kapitel.id || kapitel.rum.every((/** @type {any} */ r) => !!kartor[r.id]));


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
  /** Pusseltyperna i föräldravyn (för den vuxne, inte speltext). */
  const TYPNAMN = /** @type {Record<string, string>} */ ({ P1_las_och_valj: 'Läsa och välja', P28_packa: 'Packa', P11_formel: 'Formler', P9_kodlas: 'Kodlås', P15_raddning: 'Räddning', P12_dop: 'Namn' });
  /**
   * Den minimala föräldravyn: per pusseltyp nivån, hur många uppgifter, andelen rätt på första försöket utan hjälp,
   * hur ofta hjälpen användes, och för läsvalen vad slumpen hade gett. Ur lärandehistoriken.
   */
  function foraldravy() {
    const rader = sammanfatta(tillstand.spelare.larande?.historik || [], d.kapitel.flatMap((k) => k.pussel));
    if (!rader.length) return '<div class="menygrupp foraldravy"><b>Hur det går:</b> inga uppgifter än.</div>';
    const pct = (/** @type {number} */ x) => `${Math.round(100 * x)} %`;
    const tr = rader.map((r) => `<tr><td>${ui.esc(TYPNAMN[r.typ] ?? r.typ)}</td><td>${r.slag}${lasmotor.niva(r.slag, r.typ)}</td><td>${r.antal}</td><td>${r.rattForsta} (${pct(r.rattForsta / r.antal)})</td><td>${r.slump === null ? '–' : pct(r.slump)}</td><td>${r.hjalp}</td><td>${r.sekunder === null ? '–' : r.sekunder + ' s'}</td></tr>`).join('');
    return `<div class="menygrupp foraldravy"><b>Hur det går:</b><table><thead><tr><th>Uppgift</th><th>Nivå</th><th>Antal</th><th>Rätt direkt</th><th>Slumpen</th><th>Med hjälp</th><th>Tid</th></tr></thead><tbody>${tr}</tbody></table>
      <small>Rätt direkt = rätt på första försöket utan hjälp. Slumpen = vad gissningar hade gett i läsvalen.</small></div>`;
  }
  function oppnaMeny() {
    pausa('meny');
    const niva = lasmotor.niva('L', 'P1_las_och_valj');
    // alla kapitlens scener: ett hopp till ett senare kapitel eller en senare scen spolar fram det som kommer före
    const scener = aventyr.kapitel.map((/** @type {string} */ kid) => d.kapitel.find((k) => k.id === kid)).filter(Boolean).map((/** @type {any} */ k) =>
      `<div class="kapitelrad"><small>${ui.esc(k.id)}</small>${k.scener.map((/** @type {any} */ s, i) => `<button type="button" class="menyval scen ${b && b.kapitel.id === k.id && i === b.scenIndex ? 'nu' : ''}" data-kapitel="${ui.esc(k.id)}" data-i="${i}">${i + 1}. ${ui.esc(s.id)} <small>(pass ${s.pass})</small></button>`).join('')}</div>`).join('');
    const s = ui.visaMeny(`<div class="meny vuxen"><h2>Gråboxen <small>${ui.esc(String(d.version))}</small></h2>
      <div class="menygrupp"><b>Läsnivå (läs och välj):</b> ${[1, 2, 3, 4].map((n) => `<button type="button" class="menyval niva ${n === niva ? 'nu' : ''}" data-n="${n}">L${n}</button>`).join('')}</div>
      <div class="menygrupp"><label><input type="checkbox" class="foralder" ${inst.foralderLaser ? 'checked' : ''}> Föräldern läser ${ui.esc(Object.values(aventyr.talare).filter((/** @type {any} */ t) => t.rost === 'foraldern_eller_datorrost').map((/** @type {any} */ t) => t.namn).join(' och ') || 'rollernas')} repliker</label>
      <label><input type="checkbox" class="etiketter" ${inst.vuxenEtiketter ? 'checked' : ''}> Visa objektens namn (inte under pussel)</label>
      <label><input type="checkbox" class="rostval" ${inst.rost ? 'checked' : ''}> Datorrösten läser upp (av: rullningen piper i ordtakt)</label>
      <label><input type="checkbox" class="markeraval" ${inst.markera ? 'checked' : ''}> Markera ordet som läses (stäng av om markeringen hamnar fel på den här datorn)</label></div>
      ${foraldravy()}
      <div class="menygrupp scenlista"><b>Hoppa till scen:</b>${scener}</div>
      <div class="menygrupp"><button type="button" class="menyval logg">Spara loggen</button><button type="button" class="menyval nollstall">Börja om från början</button><button type="button" class="menyval stang">Stäng</button></div></div>`);
    s.querySelectorAll('.niva').forEach((el) => el.addEventListener('click', () => { lasmotor.sattNiva('L', 'P1_las_och_valj', Number(/** @type {HTMLElement} */ (el).dataset.n)); lasmotor.sattNiva('L', 'P28_packa', Number(/** @type {HTMLElement} */ (el).dataset.n)); spara(); oppnaMeny(); }));
    s.querySelector('.foralder')?.addEventListener('change', (e) => { inst.foralderLaser = /** @type {HTMLInputElement} */ (e.target).checked; spara(); });
    s.querySelector('.rostval')?.addEventListener('change', (e) => { inst.rost = /** @type {HTMLInputElement} */ (e.target).checked; logg.handelse('inställning', `rösten ${inst.rost ? 'på' : 'av'}`); spara(); });
    s.querySelector('.markeraval')?.addEventListener('change', (e) => { inst.markera = /** @type {HTMLInputElement} */ (e.target).checked; logg.handelse('inställning', `markeringen ${inst.markera ? 'på' : 'av'}`); spara(); });
    s.querySelector('.etiketter')?.addEventListener('change', (e) => { inst.vuxenEtiketter = /** @type {HTMLInputElement} */ (e.target).checked; spara(); visaEtiketter(); });
    s.querySelectorAll('.scen').forEach((el) => el.addEventListener('click', () => {
      const i = Number(/** @type {HTMLElement} */ (el).dataset.i);
      const k = d.kapitel.find((x) => x.id === /** @type {HTMLElement} */ (el).dataset.kapitel);
      if (!k) return;
      // kapitlen före spolas fram (av.spolat töms, spolningen gör inget två gånger), och kapitlets scener före hoppet
      av.kapitelId = k.id; av.scen = i; av.scenId = k.scener[i]?.id; delete av.steg; av.startad = false;
      av.spolat = []; av.spolaTill = av.scenId;
      logg.handelse('meny', `hopp till ${k.id} ${av.scenId}`);
      spara();
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

