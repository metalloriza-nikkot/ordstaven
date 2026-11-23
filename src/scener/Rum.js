// @ts-check
// Gråboxens rum: grå golv, objekt som rutor, hjälten och ungen som block, och ljuset (natt, upplyst, morgon).
// All text (objektens namn, lappar) ritas i textlagret, aldrig här.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';
import { rumsObjekt, framfor, framforFran, vidObjekt, aktivSak, VAGG, objektFarg, lasplats, arSidodorr, stigStart, landningNara } from '../karna/rumslayout.js';
import { synligaIds } from '../karna/karta.js';
import { skapaHinder } from '../karna/vag.js';
import { hinderFramfor, krockVakt } from '../karna/krock.js';
import { rumsHinder } from '../karna/rumshinder.js';
import { skapaNivaer } from '../karna/nivaer.js';
import { KAMERA, centrera, folj, visaRuta, omradeFor, narmare, enSkarm } from '../karna/kamera.js';
import { hjaltensByten, kvallTabell } from '../karna/fargbyte.js';
import kvallJson from '../../assets/kvall.json';
import { laddaGrafik, fargad, riktningFor, foremalsbild, rutnamn, rutanimation, faltFor, sattKvall, kvallsAtlas } from './figurbilder.js';

/** Kvällen på figurerna (Stil, 84.2): palettfärg → kvällsfärg. */
const KVALL_TABELL = kvallTabell(kvallJson);
import { foremaletsBild } from '../karna/egenskaper.js';
import { Livet } from './livet.js';
import { Duellfigur } from './duellfigur.js';
import { BaronStege, harBaronStege } from './baronstege.js';
import { figurensBilder, portrattUttryck } from '../karna/duellfigur.js';

/** Luftskeppets bild (112 × 96): repstegen hänger på x 74–83 från gondolen (y 60) till y 95, och aktern med propellern är på x 105, y 18 (95.6). */
const STEGE = { x: 78, ovre: 62, nedre: 95 };
const AKTER = { x: 104, y: 18 };

const FARG = {
  golv: 0x8c8a86, rutnat: 0x7f7d79, kant: 0x5d5b58,
  sak: 0xb9b2a4, sakKant: 0x6e675c, utgang: 0x6d5a45, figur: 0xc9a27a, markerad: 0xf2c14e,
  unge: 0x5fae6a, ungeMage: 0x9fd4a0, ljus: 0xfff2b0,
};
/**
 * Hjältens färger. Förvalet (index 0) är spelarens egen figur: blå hud, mörkgrå dräkt (stilguiden, avsnitt 5).
 * Formen är alltid densamma. Huden och dräkten går att byta (sparningens utseende.hudfarg och utseende.drakt),
 * hjälmen och skorna har fasta färger.
 */
export const HJALTE_FARGER = {
  hudfarg: [0x2e8bd8, 0x4fae6a, 0xd8a24a, 0x9a6ad8],
  drakt: [0x3a3e48, 0x2f4f6f, 0x6e3a3a, 0x3f5f3a],
};
/** Det som inte går att välja: den runda grå hjälmen och de mörkblå skorna. */
export const HJALTE_FAST = Object.freeze({ hjalm: 0xc9ccd2, skor: 0x1e4fa0 });
/** Gången: en ny bild var femte pixel han går (stå, steg, stå, steg). */
const GANG_STEG = 5;
/** Ordduellens ljud (106.5): Stils startljud (en effekt) och segerstycke (ett stycke, som spelas över slingan). */
const DUELL_LJUD = { start: 'duell_start', seger: 'stycke_seger' };
/**
 * Gråboxens bild av sakerna han kan ha på sig (lager): en färg per sak. Okända saker ritas i en neutral färg.
 * Riktig grafik kommer med Stil (stilguiden §5).
 */
const LAGER_FARG = { taggkam: 0x5fae6a, drakvimpel: 0xe0503a, ryggsack_skog: 0x8a5a2b, ryggsack_vass: 0xb8a060, ryggsack_rosa: 0xe58fb0 };
/** Ryggsäckar i en annan färg än Stils bild (72.11): bilden tonas, tills Stil har ritat dem. */
const SACK_TON = { ryggsack_rosa: 0xffa8cc };
/** Dräkter han får (72.11): dräktens färg byts mot gåvans, och garderoben byter tillbaka till den han valde. */
export const DRAKT_GAVOR = { drakt_grodgron: 0x20946a }; // dräktens mitt i Stils grodgröna (10g)

/** Ordkraftens ljus: en bild per 100 ms, händelsetakten i 10e §7 (46.5). */
export const ORDKRAFT_MS = 100;
/** Ordkraftens ljus: bildernas ordning (beslut 48.3), ca 0,5 s. */
export const ORDKRAFT_BILDER = [1, 2, 3, 3, 4];

/**
 * Äggets regi (36.7, 10f): mellanscenens `bild` → äggets bilder. `steg` = ms per bild, `ms` = mellanscenens längd.
 * @type {Record<string, { ramar: string[], steg?: number, ms: number, slinga?: boolean, tona?: boolean }>}
 */
const AGGET = {
  agg_frost: { ramar: ['agg_01'], ms: 1400 },
  agg_filt: { ramar: ['agg_filt_frost', 'agg_filt'], tona: true, steg: 900, ms: 1600 },
  agg_lyser: { ramar: ['agg_lyser_01', 'agg_lyser_02', 'agg_lyser_03'], slinga: true, steg: 150, ms: 1800 },
  agg_klackning: { ramar: ['agg_knack_01', 'agg_knack_02', 'agg_kras_01', 'agg_nos_01', 'agg_ute_01', 'agg_ute_02', 'agg_hopp_01', 'agg_ute_02'], steg: 450, ms: 3800 },
};

export class Rum extends Phaser.Scene {
  /**
   * @param {{ inmatning: ReturnType<typeof import('../karna/inmatning.js').skapaInmatning>,
   *           logg: { handelse(t: string, m: string, d?: any): void },
   *           vidAndring?: () => void, mjukvara?: boolean,
   *           vidKamera?: (k: import('../karna/skalning.js').Kamera, stor: boolean) => void, plattaOppen?: () => boolean,
   *           ljud?: { spela(id: string): number, stycke(namn: string): Promise<number>, slinga(id: string, niva: number | null): void } }} b
   * ljud = regiernas ljud, kapitel 3:s stycken och rummets ljudslingor (103.3.4–103.3.5)
   * plattaOppen = läsplattan är öppen (golvdatorn: världen bakom den ritas i lugn takt)
   * mjukvara = världen ritas med canvas utan grafikkort (golvdatorn): en bildruta ritas bara när något har ändrats
   * vidKamera = kameran har flyttat sig (textlagret flyttar skyltarna med), stor = området är större än skärmen
   */
  constructor(b) {
    super({ key: 'Rum' });
    this.b = b;
    this.pos = { x: RUM.bredd / 2, y: RUM.hojd - 12 };
    /** @type {{ x: number, y: number } | null} stigens kant medan han går dit själv (122.3) */
    this.stigKanten = null;
    /** @type {Promise<HTMLImageElement | null> | null} bilden av rummet som tas nu (bild()) */
    this.bildKo = null;
    /**
     * Kamerans läge i världen (beslut 14): punkten i skärmens övre vänstra hörn, i hela pixlar. I ett område som ryms
     * på en skärm står den i (0, 0). I ett större område följer den hjälten (karna/kamera.js).
     * @type {import('../karna/skalning.js').Kamera}
     */
    this.kamera = { x: 0, y: 0 };
    /** Områdets storlek (kartans): en skärm, eller större när kameran följer hjälten. */
    this.storlek = { bredd: RUM.bredd, hojd: RUM.hojd };
    /** Förskjutning framåt åt det håll han går, i pixlar (en inställning, 0 = ingen, beslut 18.1). */
    this.kameraFramat = KAMERA.framat;
    /** @type {{ x: number, y: number, b: number, h: number } | null} rutan som ska synas medan en fråga är ställd (valet) */
    this.omrade = null;
    this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
    /** @type {import('../karna/rumslayout.js').Objekt[]} */
    this.objekt = [];
    /** föremål som en regi har flyttat i rummet (fjädern som landar vid hjälten, 75.4): id → övre vänstra hörnet */
    /** @type {Map<string, { x: number, y: number }>} */
    this.flyttade = new Map();
    /** @type {Map<string, any>} tussar som står kvar efter fältet (75.3), tills rummet byts */
    this.kvarDelar = new Map();
    /** kameran visar kartans visas_forst tills han ska göra något (76.5) */
    this.forstFokus = false;
    /** @type {Map<string, any>} */
    this.ritade = new Map();
    /** @type {string | null} vilka figurer som gör sin syssla nu (livTick, 103.3.6) */
    this.sysslaNu = null;
    /** @type {Set<string>} figurerna som har vinkat när han kom nära, tills han har gått därifrån */
    this.naraVinkat = new Set();
    /** @type {Set<string>} ljudslingorna som går i rummet (103.3.4) */
    this.ljudSlingor = new Set();
    this.livKlocka = 0;
    /** @type {string | null} platserna som har en ring nu (104.7) */
    this.ringarNu = null;
    /** @type {any} */
    this.ringSlinga = null;
    /** piltangenter medan världen stod still (104.5), och om en hålls nu */
    this.pilarFrysta = 0;
    this.pilFryst = false;
    /** @type {(() => void)[]} väntar på att han börjar gå (lappen, 104.5) */
    this.gangVantare = [];
    /** @type {number} hjältens tut i hornet: det senaste (blas) */
    this.blasNr = 0;
    this.fryst = false;
    this.frysSteg = false;
    this.pausad = false;
    this.harRum = false;
    this.inomhus = false;
    /** väggarnas mått i rummet (kartan) */
    this.vagg = VAGG;
    /** @type {{ x: number, y: number, b: number, h: number, vatten?: boolean }[]} väggar inne i rummet, och ute vatten och hus (kartans vagg) */
    this.massiv = [];
    /** @type {{ x: number, y: number, b: number, h: number }[]} ridåns rutor som hinder (kartans overHinder) */
    this.overHinder = [];
    /** @type {{ bredd: number, hojd: number, rader: number[][] } | null} rummets fält (82.8, vassen vid fötterna) */
    this.falt = null;
    /** @type {any} */ this.vassHjalte = null;
    /** @type {any} */ this.vassUnge = null;
    /** @type {{ x: number, y: number } | null} */ this.forraUngePos = null;
    /** hur många gånger vasstopparna har kommit fram vid hjältens fötter (för testerna) */ this.vassSedd = 0;
    /** @type {any[]} lyktornas bilder längs lyktor_udden */ this.lyktBilder = [];
    /** @type {Set<number>} lyktorna som LJUS har tänt (tills rummet byts) */ this.lyktorTanda = new Set();
    /** @type {{ x: number, y: number }[]} lampor som lyser när rummet är mörkt */
    this.lampor = [];
    /** @type {number | null} hur mörkt rummet är på natten (kartans morker) */
    this.morkerNatt = null;
    /** @type {any} */
    this.inkom = null;
    this.klattrar = false;
    this.synliga = '';
    this.visaUnge = false;
    /** @type {{ x: number, y: number, mot: number } | null} dit ungen går för att peka (knuff), annars följer den hjälten */
    this.ungeMal = null;
    /** @type {Set<string>} stigar som är spärrade med en gren (förenklingen): man kan inte gå på dem */
    this.sparrade = new Set();
    /** @type {any[]} saker som hjälten har lagt ifrån sig i rummet */
    this.lagda = [];
    /** @type {any} luftskeppet i rummet (regi, s22): bilden, läget och dess timrar */
    this.luft = null;
    /** @type {Duellfigur | null} motståndaren i ordduellen (91.5) */
    this.duellFig = null;
    /** @type {any[] | null} baronen och Herr Skata vid bryggan uppifrån (92.4) */
    this.bryggFig = null;
    /** världen är täckt av startskärmen eller introt och ritas inte (92.15) */
    this.vilar = false;
    /** @type {any} sidovyn som kommer när luftskeppet har flugit åt fel håll */
    this.sidovyVantar = null;
    /** @type {any} Farfar i dörren (regi, 67.2), tills han går ut eller rummet byts */
    this.farfarRegi = null;
    /** @type {Record<string, { x: number, y: number }>} kartans punkter för regin (regi_farfar) */
    this.regiPunkter = {};
    /** @type {string | null} den senaste sidovyn som visades (för testerna) */
    this.senasteSidovy = null;
    /** @type {{ id: string, img: any, tex: string, ram: string } | null} föremålet han sitter i (34.4) */
    this.sitter = null;
    /** @type {any} han kliver ur sängen just nu (vakna), och syns inte bredvid den förrän han är ute (56.2) */
    this.vaknar = null;
    /** @type {Set<string>} föremål som inte syns just nu (boken han bär), tills rummet byts */
    this.dolda = new Set();
    /** @type {Map<string, string>} föremål som regin har gett en annan bild (ägget), tills rummet byts */
    this.ramFor = new Map();
    /** @type {Map<string, Phaser.Time.TimerEvent>} bilder som byts i en slinga (ägget som lyser) */
    this.ramSlinga = new Map();
    /** @type {Map<string, Phaser.Time.TimerEvent[]>} bildbyten som väntar (en serie) */
    this.ramTimrar = new Map();
    /** @type {string[]} luftskeppets lägen i den ordning de visades (för testerna) */
    this.regiLogg = [];
    // kapitel 3 i gråbox (100.4): ungen är i floden (unge_simmar), sköldpaddans huvud och mjölet i hornet
    /** @type {boolean} */ this.k3UngeIVattnet = false;
    /** @type {any} */ this.k3Huvud = null;
    /** @type {any} */ this.k3Mjol = null;
    /** @type {boolean} hjälten och ungen har åkt säckhissen ut ur rummet (101.3) */ this.k3IHissen = false;
    /** @type {any} skuggan eller ön i floden (102.3) */ this.k3Skugga = null;
    /** @type {any} ungen som simmar i floden (102.3) */ this.k3Simmar = null;
    /** @type {Phaser.GameObjects.Image | null} ankaret i luften (109.5) */ this.k3Ankare = null;
    /** @type {Phaser.GameObjects.Image | null} SKÖLD-bubblan som står kvar (109.5) */ this.k3Bubbla = null;
    /** @type {{x:number,y:number} | null} där ankaret och SKÖLD räknas från (113.2): hjälten och ungen när regin börjar */ this.k3AnkareMitt = null;
    /** @type {any} bokstavsstigen som visas (P18, 114.6) */ this.stig = null;
    /** @type {string | null} en hel bild av hjälten i stället för gången (kartbiten upp mot luftskeppet, s22) */
    this.hjaltePose = null;
    /** @type {{ talare: string, riktning: string } | null} det senaste samtalet (testkroken) */
    this.samtal = null;
    /** @type {{ x: number, y: number, till: number } | null} där ungen tittar när den står still (den som talar), en stund */
    this.ungeTittarPa = null;
    this.tillstand = /** @type {string | null} */ (null);
    /** @type {{ ids: string[], klar: (id: string) => void } | null} */
    this.vantar = null;
    this.markerade = new Set();
    /** @type {Record<string, { farg: number | null, storlek: string | null, bild?: string | null, egen?: boolean, form?: string | null, monster?: string | null }[]>} föremål som visar ett pussels alternativ */
    this.delar = {};
    /** @type {Map<string, any[]>} */
    this.ritadeDelar = new Map();
    /** @type {((id: string) => void) | null} anropas när spelaren trycker på föremålet hjälten står vid */
    /** @type {((id: string) => boolean) | null} ett tryck på ett föremål hjälten står vid; true = det användes */
    this.tryckPa = null;
    /** Åt vilket håll hjälten är vänd (senaste rörelsen). Avgör vilken sak som är aktiv när två står lika nära. */
    this.vand = { x: 0, y: 1 };
    /** @type {((o: any) => { x: number, y: number } | null) | null} var ett tryck på ett föremål leder (val med dörrar) */
    this.malFor = null;
    /** @type {((id: string) => void) | null} ett tryck på ett föremål långt bort: han går dit (109.2, skyltar) */
    this.tryckPaVag = null;
    /** @type {((o: any) => boolean) | null} ett tryck på en figur: upprepa dess senaste instruktion */
    this.fragaIgen = null;
    /** @type {((id: string) => void) | null} steget tryck: ett tryck på ett föremål, och han går inte (2.47) */
    this.tryckFri = null;
    /** @type {any} saken hjälten bär (filten), som svävar efter honom */
    this.buren = null;
    /** @type {string[]} föremål som går att använda just nu */
    this.interaktiva = [];
    /** @type {string | null} föremålet hjälten står vid och kan använda */
    this.naraId = null;
    this.redo = new Promise((r) => { this._redo = r; });
    this.hinder = skapaHinder([]);
    /** Höjdnivåerna i rummet (kullen, trappan), och nivån hjälten är på (0 = marken). */
    this.nivaer = skapaNivaer([]);
    this.niva = 0;
    /** @type {Map<number, ReturnType<typeof skapaHinder>>} hindren på varje nivå */
    this.hinderPer = new Map([[0, this.hinder]]);
    /** Något har ändrats som inte syns i figurernas lägen (en ram, en låda som öppnas): rita nästa bildruta. */
    this.smutsig = true;
    this.forraSig = '';
    this.senastRitad = 0;
    /** @type {Set<any>} tweens som pågår hela tiden (glimten): de ritas i lugn takt, inte i varje bildruta */
    this.oandliga = new Set();
    /** @type {{ x: number, y: number, t: number } | null} ett tryck medan världen stod still, som görs när den går igen */
    this.sparatTryck = null;
    /** Står han på en stege mellan nivåerna (styrbar klättring)? */
    this.paStege = false;
    /** @type {{ x: number, y: number }[]} vägen hjälten går just nu */
    this.vag = [];
    /** @type {{ x: number, y: number } | null} målet som vägen räknades till */
    this.vagMal = null;
  }

  preload() {
    laddaGrafik(this);
  }

  create() {
    // rummets bild (inomhus) eller marken av rutor (utomhus), annars gråboxens golv
    this.golvBild = this.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false);
    this.golv = this.add.graphics();
    this.lagerObjekt = this.add.container(0, 0);
    // trädridån (rutlagret over), ritad en gång per rum till en egen bild (Teknik 3). Den ligger under figurerna,
    // och fötterna står aldrig i den (kartans overHinder), så en figur framför ridån skyms aldrig av den (56.3)
    this.overBild = this.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false);
    // platsernas ringar (104.7): ovanpå föremålen och under figurerna
    this.lagerRingar = this.add.container(0, 0);
    // bokstavsstigens isflak (P18, 114.6): ovanpå golvet och föremålen, under figurerna
    this.lagerStig = this.add.container(0, 0);
    this.ljusboll = this.add.graphics().setVisible(false);
    // mörkret i isgrottan (kapitel 4, tillståndet mork, 113.8): under figurerna, så att bara hjälten, ungen och
    // stavens glimt syns. LJUS byter tillståndet, och då är det borta
    this.grottMorker = this.add.graphics();
    this.lagerFigurer = this.add.container(0, 0);
    // liv i skogen (fåglar, löv, fjärilen, ekorren) i världens pixlar
    this.livet = new Livet(this, this.lagerFigurer);
    /** @type {{ img: any, ramar: string[], ms: number, i: number, senast: number }[]} figurer som rör sig i tomgång (bild_anim) */
    this.animerade = [];
    /** @type {{ img: any, skugga: any }[]} figurernas skuggor (kartans `skugga`), som följer bilden när en regi flyttar den */
    this.figurSkuggor = [];
    /** @type {Set<any>} höga föremålsbilder (trädkronor) som ritas bland figurerna, i ordning efter fötterna */
    this.hogaBilder = new Set();
    // det som är i luften (luftskeppet i s22) syns ovanför figurerna
    this.lagerLuft = this.add.container(0, 0);
    this.morker = this.add.graphics();
    // det som lyser (kartans lyser: vindsfönstret med månarna och Herr Skata) ligger ovanför mörkret (beslut 28.3, Stil 06:55)
    this.lagerLjust = this.add.container(0, 0);
    this.hjalte = this.add.container(0, 0);
    this.unge = this.add.container(0, 0).setVisible(false);
    this.lagerFigurer.add([this.unge, this.hjalte]);
    // det som går att använda: en glimt på avstånd, ljus ram och glänt lock när hjälten står vid det
    this.glimtar = this.add.graphics();
    this.oandliga.add(this.tweens.add({ targets: this.glimtar, alpha: { from: 1, to: 0.25 }, duration: 700, yoyo: true, repeat: -1 }));
    this.naraRam = this.add.graphics();
    this.oandliga.add(this.tweens.add({ targets: this.naraRam, alpha: { from: 1, to: 0.55 }, duration: 450, yoyo: true, repeat: -1 }));
    if (this.b.mjukvara) this.events.on('postupdate', () => this.valjRitning());
    this.malKors = this.add.graphics().setVisible(false);
    this.malKors.fillStyle(FARG.markerad).fillRect(-3, 0, 7, 1).fillRect(0, -3, 1, 7);
    // sidovyn (en mellanscen från sidan, t.ex. in i skogen) täcker hela skärmen ovanför allt i rummet
    this.sidovy = this.add.container(0, 0).setVisible(false);
    // tryck på ett objekt = gå fram till det
    this.b.inmatning.lyssna((h) => {
      if (h.typ !== 'tryck') return;
      // steget tryck (2.47, resan): han går inte, och ett tryck på föremålet räcker
      if (this.tryckFri) { this.b.inmatning.rensaGaTill(); const o = this.traff(h); if (o) this.tryckFri(o.id); return; }
      // ett tryck medan världen står still (rummet tonas in, en reaktion, han går tillbaka från kurvan) sparas
      // en kort stund och görs när världen går igen, som ett vanligt tryck. Annars skulle han senare gå till
      // själva tryckpunkten i stället för till föremålet.
      if (this.fryst || this.klattrar) { this.b.inmatning.rensaGaTill(); this.sparatTryck = { x: h.x, y: h.y, t: performance.now() }; return; }
      this.sparatTryck = null;
      this.trycktPa(h);
    });
    /** @type {{ hjalmdekor: string | null, ryggsack: string | null, drakt?: string | null }} det han har på sig */
    this.lager = this.lager || { hjalmdekor: null, ryggsack: null, drakt: null };
    this.sattUtseende({});
    this.ritaUnge();
    this.ritaGolv(false);
    this._redo?.();
  }

  /** Ett tryck i rummet: på ett föremål går han dit (eller använder det), på golvet går han dit. @param {{ x: number, y: number }} h */
  /**
   * Närmaste objekt vars ruta (med lite marginal) innehåller trycket. En yta (kullen, trappan) är golv: ett tryck där
   * går dit, som på golvet. Dekor (52.2) har inget samspel: ett tryck på den är ett tryck på marken.
   * @param {{ x: number, y: number }} h
   */
  traff(h) {
    const traffar = this.objekt.filter((x) => x.sort !== 'yta' && !x.dekor && h.x >= x.x - 4 && h.x <= x.x + x.b + 4 && h.y >= x.y - 4 && h.y <= x.y + x.h + 4);
    const avst = (/** @type {any} */ x) => Math.hypot(h.x - (x.x + x.b / 2), h.y - (x.y + x.h / 2));
    return traffar.sort((a, c) => avst(a) - avst(c))[0] ?? null;
  }

  trycktPa(h) {
    if (!this.harRum) return;
    const o = this.traff(h);
    if (!o) return;
    // står hjälten redan vid föremålet, och det är det aktiva, räknas trycket som att använda det.
    // Är det en annan sak än den aktiva går han närmare den, så att den blir aktiv.
    if (vidObjekt(this.pos, o) && this.tryckPa && this.tryckPa(o.id)) return;
    // dialogregeln: ett tryck på en figur upprepar dess senaste instruktion (fråga igen)
    if (o.sort === 'figur' && this.fragaIgen?.(o)) return;
    const f = this.malFor?.(o) ?? this.standplats(o); this.b.inmatning.sattGaTill(f.x, f.y);
    // ett tryck på en skylt på avstånd räknas när han är framme (109.2)
    this.tryckPaVag?.(o.id);
  }


  /**
   * Golvdatorn (canvas i mjukvara): en bildruta ritas bara när något har ändrats. Figurerna, kameran och tweens som
   * tar slut syns direkt. Glimten (som pågår hela tiden) ritas fyra gånger per sekund, men bara när något glimtar.
   * Annat som ändras (en ram, en låda, ljuset) sätter smutsig. Utan ändringar ritas världen två gånger per sekund,
   * för säkerhets skull. Med läsplattan öppen ritas den högst fyra gånger per sekund. Varje gång duken ritas lägger webbläsaren ihop hela skärmen igen, och det är det som kostar
   * mest utan grafikkort (2c: ca 4 ms per gång på en snabb dator, flera gånger mer på golvdatorn).
   */
  valjRitning() {
    this.antalSteg = (this.antalSteg || 0) + 1;
    // startskärmen och introt täcker hela rummet (92.15): världen ritas inte alls bakom dem, så att golvdatorn inte
    // målar om skrivbordet ovanpå en duk som ingen ser. När de stängs ritas världen direkt
    if (this.vilar) { this.sys.settings.visible = false; this.smutsig = true; return; }
    const nu = this.time.now, h = this.hjalte, u = this.unge, k = this.cameras.main, bu = this.buren;
    const sig = `${this.kropp?.frame.name},${this.ungeBild?.frame.name},${h.x},${h.y},${h.visible},${u.x},${u.y},${u.visible},${k.scrollX},${k.scrollY},${bu ? bu.x + ',' + bu.y : ''}`;
    const rorlig = this.tweens.getTweens().some((t) => !this.oandliga.has(t) && t.isPlaying());
    // med läsplattan öppen står världen still bakom texten: den ritas i lugn takt (åtta gånger per sekund), så att
    // datorn inte målar om plattans skuggor över en värld som rör sig (golvdatorn, trädgården i s22)
    const lugn = !!this.b.plattaOppen?.();
    const glimtar = (this.glimtar.visible && this.glimtar.commandBuffer.length > 0) || (this.naraRam.visible && this.naraRam.commandBuffer.length > 0);
    const sedan = nu - this.senastRitad;
    // med läsplattan öppen ritas världen högst fyra gånger per sekund, också när något rör sig bakom texten
    // (luftskeppet i s22). Annars ritas det som rör sig direkt, glimten fyra gånger per sekund, och resten var 500:e ms.
    const rita = lugn
      ? sedan >= 250 && (this.smutsig || rorlig || sig !== this.forraSig || glimtar || sedan >= 500)
      : this.smutsig || rorlig || sig !== this.forraSig || sedan >= (glimtar ? 250 : 500);
    this.sys.settings.visible = rita;
    if (rita) { this.smutsig = false; this.forraSig = sig; this.senastRitad = nu; this.antalRitade = (this.antalRitade || 0) + 1; }
  }

  /** @param {boolean} rum */
  ritaGolv(rum) {
    this.smutsig = true;
    const g = this.golv; g.clear();
    this.golvBild.setVisible(false); this.overBild.setVisible(false); this.markAnim = null;
    if (!rum) { g.fillStyle(0x1a1410).fillRect(0, 0, RUM.bredd, RUM.hojd); return; }
    const B = this.storlek.bredd, H = this.storlek.hojd;
    // grafiken: rummets bild (beslut 27.6) eller marken av rutor, ritad en gång till en egen bild (golvdatorn)
    // ett rum som bild kan ha en bild per tillstånd (rum_byn_kvall, 82.7) och den höga vassen ovanför figurerna
    // (rum_<rum>_over), som ridån i skogen
    const iTillstand = this.rumsbild && this.tillstand ? `rum_${this.rumsbild}_${this.tillstand}` : null;
    const bild = this.rumsbild ? (iTillstand && this.textures.exists(iTillstand) ? iTillstand : `rum_${this.rumsbild}`) : this.mark ? this.ritaMark() : null;
    if (bild && this.textures.exists(bild)) {
      this.golvBild.setTexture(bild).setVisible(true);
      const over = this.rumsbild ? `rum_${this.rumsbild}_over` : null;
      if (over && this.textures.exists(over)) this.overBild.setTexture(over).setVisible(true);
      return;
    }
    g.fillStyle(FARG.golv).fillRect(0, 0, B, H);
    g.fillStyle(FARG.rutnat);
    for (let x = RUM.ruta; x < B; x += RUM.ruta) g.fillRect(x, 0, 1, H);
    for (let y = RUM.ruta; y < H; y += RUM.ruta) g.fillRect(0, y, B, 1);
    g.fillStyle(FARG.kant).fillRect(0, 0, B, 2).fillRect(0, H - 2, B, 2).fillRect(0, 0, 2, H).fillRect(B - 2, 0, 2, H);
    if (!this.inomhus) {
      // ute i gråboxen (kapitel 2): vatten blått med en ljus strandkant, och hus mörka med ett tak
      for (const m of this.massiv) {
        if (m.vatten) { g.fillStyle(0x3d6e9e).fillRect(m.x, m.y, m.b, m.h); g.fillStyle(0x8fb3cf).fillRect(m.x, m.y, m.b, 1).fillRect(m.x, m.y + m.h - 1, m.b, 1); continue; }
        g.fillStyle(0x6a5544).fillRect(m.x, m.y, m.b, m.h); g.fillStyle(0x8a3b2e).fillRect(m.x, m.y, m.b, Math.min(8, m.h));
      }
      return;
    }
    // väggramen: bakvägg 3 rutor, sidoväggar 2 med sneda hörn, främre kant 1, och en ljus list överst
    const { bak, sida, fram } = this.vagg;
    g.fillStyle(0x7a6a58).fillRect(sida, 0, B - 2 * sida, bak);
    g.fillStyle(0x5e5244);
    g.fillTriangle(0, 0, sida, bak, 0, H).fillTriangle(0, 0, sida, 0, sida, bak);
    g.fillTriangle(B, 0, B - sida, bak, B, H).fillTriangle(B, 0, B - sida, 0, B - sida, bak);
    g.fillRect(0, bak, sida, H - bak - fram).fillRect(B - sida, bak, sida, H - bak - fram);
    g.fillTriangle(0, H, sida, H - fram, sida, H).fillTriangle(B, H, B - sida, H - fram, B - sida, H);
    g.fillStyle(0x6a5c4c).fillRect(sida, H - fram, B - 2 * sida, fram);
    g.fillStyle(0xcbb894).fillRect(0, 0, B, 3).fillRect(0, 0, 3, H).fillRect(B - 3, 0, 3, H).fillRect(0, H - 3, B, 3);
    g.fillStyle(0x4a3f34).fillRect(sida, bak - 2, B - 2 * sida, 2);
    // väggar inne i rummet (hallens form): massiv vägg, med den främre kanten mot golvet ovanför och sidoväggen mot golvet bredvid
    for (const m of this.massiv) {
      g.fillStyle(0x5e5244).fillRect(m.x, m.y, m.b, m.h);
      if (m.y > bak) g.fillStyle(0x6a5c4c).fillRect(m.x, m.y, m.b, Math.min(fram, m.h));
      g.fillStyle(0xcbb894);
      if (m.y > bak) g.fillRect(m.x, m.y, m.b, 2);
      if (m.x > sida) g.fillRect(m.x, m.y, 2, m.h);
      if (m.x + m.b < B - sida) g.fillRect(m.x + m.b - 2, m.y, 2, m.h);
    }
  }

  /**
   * Kartans rutlager (Teknik 3, skogen): golvet och de lager som syns med ett föremål (visas_med: den hemliga stigen
   * längs bäcken) ritas till en bild per vattenbild, och ridån (over) till en egen bild ovanför figurerna. Allt ritas
   * en gång per rum och läge, så att golvdatorn bara ritar bilderna (dokument 02). Vattnet (rutsetets animation, tre
   * bilder på 250 ms) byter bild bara när det syns, högst fyra gånger per sekund.
   * @param {string} zon @param {HTMLImageElement} src @param {number} kol @param {number} B @param {number} H
   * @returns {string} golvets bild
   */
  ritaRutlager(zon, src, kol, B, H) {
    const visade = new Set(this.synligaIds || []);
    const lager = (this.rutlager || []).filter((l) => l.namn === 'golv' || (l.visasMed && visade.has(l.visasMed)));
    const over = (this.rutlager || []).find((l) => l.namn === 'over');
    const sig = `${zon}_${this.rumId}_${lager.map((l) => l.namn).join('+')}`;
    const anim = rutanimation(zon);
    const bredd = Math.ceil(B / 16);
    const animerade = new Set(lager.flatMap((l) => l.data).filter((id) => anim.has(id)));
    const antal = Math.max(1, ...[...animerade].map((id) => /** @type {any} */ (anim.get(id)).rutor.length));
    /** @param {number[]} data @param {CanvasRenderingContext2D} c @param {number} bild */
    const ritaLager = (data, c, bild) => data.forEach((id, i) => {
      if (id < 0) return;
      const a = anim.get(id), r = a ? a.rutor[bild % a.rutor.length] : id;
      c.drawImage(src, (r % kol) * 16, Math.floor(r / kol) * 16, 16, 16, (i % bredd) * 16, Math.floor(i / bredd) * 16, 16, 16);
    });
    const nycklar = [];
    for (let bild = 0; bild < antal; bild++) {
      const ut = `rutlager_${sig}_${bild}`;
      nycklar.push(ut);
      if (this.textures.exists(ut)) continue;
      const duk = document.createElement('canvas'); duk.width = B; duk.height = H;
      const c = /** @type {CanvasRenderingContext2D} */ (duk.getContext('2d'));
      for (const l of lager) ritaLager(l.data, c, bild);
      this.textures.addCanvas(ut, duk);
    }
    if (over) {
      const ut = `rutlager_${zon}_${this.rumId}_over`;
      if (!this.textures.exists(ut)) {
        const duk = document.createElement('canvas'); duk.width = B; duk.height = H;
        ritaLager(over.data, /** @type {CanvasRenderingContext2D} */ (duk.getContext('2d')), 0);
        this.textures.addCanvas(ut, duk);
      }
      this.overBild.setTexture(ut).setVisible(true);
    }
    // vattnets ruta i världen (för att se om det syns)
    if (antal > 1) {
      let x0 = B, y0 = H, x1 = 0, y1 = 0;
      for (const l of lager) l.data.forEach((id, i) => { if (!anim.has(id)) return; const x = (i % bredd) * 16, y = Math.floor(i / bredd) * 16; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 16); y1 = Math.max(y1, y + 16); });
      this.markAnim = { nycklar, i: 0, ms: /** @type {any} */ (anim.get([...animerade][0])).ms, senast: 0, ruta: { x: x0, y: y0, b: x1 - x0, h: y1 - y0 } };
    }
    return nycklar[0];
  }

  /** Tomgång (Teknik 3): vattnets rutor och figurernas bild_anim byter bild, bara när de syns och högst fyra gånger per sekund. */
  /** Skuggorna följer sina figurer: läge, synlighet och genomskinlighet (en regi kan flytta eller dölja figuren). */
  foljSkuggor() {
    for (const { img, skugga } of this.figurSkuggor) {
      if (!img.active || !skugga.active) continue;
      if (skugga.x !== img.x || skugga.y !== img.y || skugga.visible !== img.visible || skugga.alpha !== img.alpha) {
        skugga.setPosition(img.x, img.y).setVisible(img.visible).setAlpha(img.alpha);
        this.smutsig = true;
      }
    }
  }

  tomgang() {
    const nu = performance.now(), v = this.cameras.main.worldView;
    const syns = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ b, /** @type {number} */ h) => x < v.right && x + b > v.x && y < v.bottom && y + h > v.y;
    const a = this.markAnim;
    if (a && this.golvBild.visible && nu - a.senast >= a.ms) {
      a.senast = nu;
      if (syns(a.ruta.x, a.ruta.y, a.ruta.b, a.ruta.h)) { a.i = (a.i + 1) % a.nycklar.length; this.golvBild.setTexture(a.nycklar[a.i]); this.smutsig = true; }
    }
    // allt som rör sig utan att man kan göra något med det står stilla när han läser (10e, Liv i skogen)
    if (this.livet?.steg(this.pos, this.fryst || !!this.b.plattaOppen?.(), v)) this.smutsig = true;
    this.ungeKlattrarSteg(); // också medan världen står still
    this.ungeSangSteg();
    this.foljSkuggor();
    if (this.fryst) return;
    for (const t of this.animerade) {
      if (nu - t.senast < t.ms || !t.img.active) continue;
      t.senast = nu;
      const bx = t.img.getBounds();
      if (!syns(bx.x, bx.y, bx.width, bx.height)) continue;
      t.i = (t.i + 1) % t.ramar.length; t.img.setFrame(t.ramar[t.i]); this.smutsig = true;
    }
  }

  /** Höga bilder (trädkronor) och figurerna i ordning efter fötterna: den som står längre ned ritas framför. */
  sorteraFigurer() {
    if (!this.hogaBilder.size && !this.farfarRegi?.active) return;
    const fot = (/** @type {any} */ g) => (g === this.hjalte ? this.pos.y : g === this.unge ? this.ungePos.y : g.fot ?? g.y + (g.height || 0));
    const lista = /** @type {any[]} */ (this.lagerFigurer.list);
    const fore = lista.slice();
    lista.sort((a, b) => fot(a) - fot(b));
    if (lista.some((g, i) => g !== fore[i])) this.smutsig = true;
  }

  /**
   * Marken utomhus av rutor (kartans `mark`, t.ex. skog): gräs i fyra varianter, lite blommor, och stigens rutor under
   * stigarna. Ritas en gång per rum till en egen bild, så att golvdatorn bara ritar en bild. @returns {string | null}
   */
  ritaMark() {
    const zon = /** @type {string} */ (this.mark), nyckel = `rutor_${zon}`;
    if (!this.textures.exists(nyckel)) return null;
    const B = this.storlek.bredd, H = this.storlek.hojd, ut = `mark_${zon}_${this.rumId}_${B}x${H}`;
    if (this.textures.exists(ut) && !this.rutlager?.length) return ut;
    const n = rutnamn(zon), tex = this.textures.get(nyckel), src = /** @type {HTMLImageElement} */ (tex.getSourceImage());
    const kol = Math.floor(src.width / 16);
    // kartans rutlager (Teknik 3): golvet, de lager som syns med ett föremål (den hemliga stigen), och ridån ovanför
    if (this.rutlager?.some((l) => l.namn === 'golv')) return this.ritaRutlager(zon, src, kol, B, H);
    const duk = document.createElement('canvas'); duk.width = B; duk.height = H;
    const c = /** @type {CanvasRenderingContext2D} */ (duk.getContext('2d'));
    const rita = (/** @type {number | undefined} */ id, /** @type {number} */ x, /** @type {number} */ y) => { if (id !== undefined) c.drawImage(src, (id % kol) * 16, Math.floor(id / kol) * 16, 16, 16, x, y, 16, 16); };
    // samma mönster varje gång (ett tal ur rutans läge), mest vanligt gräs
    const gras = ['gras_1', 'gras_2', 'gras_3', 'gras_4', 'gras_1', 'gras_2', 'gras_3', 'gras_4', 'gras_blommor_1', 'gras_flack_1', 'gras_2', 'gras_blommor_2'];
    for (let y = 0; y < H; y += 16) for (let x = 0; x < B; x += 16) rita(n.get(gras[((x * 7 + y * 13) / 16 + (x * y) / 256) % gras.length | 0]), x, y);
    // stigarna (utgångar på marken): stigens helruta under dem
    for (const o of (this.markObjekt || []).filter((x) => x.sort === 'utgang' && x.golv)) {
      for (let y = Math.floor(o.y / 16) * 16; y < o.y + o.h; y += 16) for (let x = Math.floor(o.x / 16) * 16; x < o.x + o.b; x += 16) rita(n.get('stig_1111'), x, y);
    }
    this.textures.addCanvas(ut, duk);
    return ut;
  }

  /** Figurernas atlas som just nu har kvällens bild (testerna, 84.2). @returns {string[]} */
  kvallFigurer() { return kvallsAtlas(this); }

  /**
   * En hjälte i andra färger som bild (startskärmens spelarkort, F1), utan att rummets hjälte ändras.
   * @param {Record<string, number>} val @param {string} [ram] @returns {string | null}
   */
  hjalteBildFor(val, ram = 'hjalte_ga_ner_01') {
    if (!this.textures.exists('hjalte') || !this.textures.get('hjalte').has(ram)) return null;
    const hud = HJALTE_FARGER.hudfarg[val.hudfarg ?? 0] ?? HJALTE_FARGER.hudfarg[0];
    const drakt = HJALTE_FARGER.drakt[val.drakt ?? 0] ?? HJALTE_FARGER.drakt[0];
    const nyckel = fargad(this, 'hjalte', hjaltensByten(hud, drakt));
    try { return this.textures.getBase64(nyckel, ram) || null; } catch { return null; }
  }

  /** Ungen som bild (startskärmen). @param {string} [ram] @returns {string | null} */
  /** En bild ur en figurs atlas som data-URL (introts ordkraft), eller null. @param {string} nyckel @param {string} ram */
  figurUrl(nyckel, ram) {
    if (!this.textures.exists(nyckel) || !this.textures.get(nyckel).has(ram)) return null;
    try { return this.textures.getBase64(nyckel, ram) || null; } catch { return null; }
  }

  ungeBildUrl(ram = 'unge1_glad_ner_01') {
    if (!this.textures.exists('unge') || !this.textures.get('unge').has(ram)) return null;
    try { return this.textures.getBase64('unge', ram) || null; } catch { return null; }
  }

  /**
   * Hjälten i spelarens färger som en bild (data-URL) för textlagret, t.ex. när han väljer hjälte i s00 (10f).
   * null när bilden inte finns. @param {string} [ram]
   */
  hjalteBild(ram = 'hjalte_ga_ner_01') {
    const nyckel = this.hjalteTextur || 'hjalte';
    if (!this.textures.exists(nyckel) || !this.textures.get(nyckel).has(ram)) return null;
    try { return this.textures.getBase64(nyckel, ram) || null; } catch { return null; }
  }

  /**
   * Hjälten i spelarens färger (valen i skapa hjälten): bilderna av hjälte A med hud och dräkt bytta, staven ovanpå
   * när han har den, och det han har på sig. @param {Record<string, number>} val
   */
  sattUtseende(val) {
    this.utseende = val; this.smutsig = true;
    const hud = HJALTE_FARGER.hudfarg[val.hudfarg ?? 0] ?? HJALTE_FARGER.hudfarg[0];
    const gava = this.lager?.drakt ? DRAKT_GAVOR[/** @type {keyof DRAKT_GAVOR} */ (this.lager.drakt)] : undefined;
    const drakt = gava ?? HJALTE_FARGER.drakt[val.drakt ?? 0] ?? HJALTE_FARGER.drakt[0];
    this.draktFarg = drakt;
    this.hjalte.removeAll(true);
    this.hjalteTextur = fargad(this, 'hjalte', hjaltensByten(hud, drakt));
    const finns = (/** @type {string} */ ram) => this.textures.exists('hjalte') && this.textures.get('hjalte').has(ram);
    const farg = (/** @type {string} */ id) => LAGER_FARG[/** @type {keyof LAGER_FARG} */ (id)] ?? 0x9a8f80;
    // skuggan under (står still), ryggsäcken bakom (från sidan), kroppen, ryggsäcken framför (remmarna framifrån,
    // säcken bakifrån), taggkammen på hjälmen och staven överst (10b)
    this.skugga = this.textures.exists('skugga') ? this.add.image(0, 0, 'skugga', 'skugga_16x24').setOrigin(0, 0) : null;
    const sack = this.lager?.ryggsack;
    // en ryggsäck som Stil har ritat (ryggsack_rosa_*, del 3b) har egna bilder, annars den bruna, tonad (72.11)
    this.sackNamn = sack && finns(`${sack}_ner_01`) ? sack : 'ryggsack';
    const sackBild = sack && finns(`${this.sackNamn}_ner_01`);
    this.sackBak = sackBild ? this.add.image(0, 0, 'hjalte', `${this.sackNamn}_hoger_01`).setOrigin(0, 0) : null;
    this.kropp = this.add.image(0, 0, this.hjalteTextur, 'hjalte_ga_ner_01').setOrigin(0, 0);
    this.sackFram = sackBild ? this.add.image(0, 0, 'hjalte', `${this.sackNamn}_ner_01`).setOrigin(0, 0) : null;
    const ton = sack && this.sackNamn === 'ryggsack' ? SACK_TON[/** @type {keyof SACK_TON} */ (sack)] : undefined;
    if (ton) { this.sackBak?.setTint(ton); this.sackFram?.setTint(ton); }
    // Stils bild finns bara för taggkammen. Annan hjälmdekor (drakvimpeln, 76.4) är gråbox tills den är ritad
    // hjälmdekoren i Stils bilder: taggkammen och drakvimpeln (del 3b), <dekor>_<håll>_01
    const dekorNamn = this.lager?.hjalmdekor;
    this.kam = dekorNamn && finns(`${dekorNamn}_ner_01`) ? this.add.image(0, 0, 'hjalte', `${dekorNamn}_ner_01`).setOrigin(0, 0) : null;
    this.stav = this.add.image(0, 0, fargad(this, 'stav', hjaltensByten(hud)), 'stav_hand_ner_01').setOrigin(0, 0).setVisible(!!this.harStav);
    this.hjalte.add(/** @type {any[]} */ ([this.skugga, this.sackBak, this.kropp, this.sackFram, this.kam, this.stav].filter(Boolean)));
    // gråbox för det som inte har bilder än
    if (sack && !sackBild) this.hjalte.addAt(this.add.rectangle(11, 12, 4, 8, farg(sack)).setOrigin(0, 0), this.skugga ? 1 : 0);
    const dekor = this.lager?.hjalmdekor;
    // drakvimpeln: en pinne på hjälmen med en liten flagga. Annars tre taggar
    if (dekor === 'drakvimpel' && !this.kam) { this.hjalte.add(this.add.rectangle(9, -6, 1, 6, 0x5a4a3a).setOrigin(0, 0)); this.hjalte.add(this.add.triangle(10, -6, 0, 0, 5, 2, 0, 4, farg(dekor)).setOrigin(0, 0)); }
    else if (dekor && !this.kam) for (const x of [4, 7, 10]) this.hjalte.add(this.add.rectangle(x, -3, 2, 3, farg(dekor)).setOrigin(0, 0));
    // vasstopparna vid fötterna (82.8), överst: 24 × 8 mitt under fötterna, syns bara i rummets fält
    this.vassHjalte = this.vassVidFotter(8, 24);
    if (this.vassHjalte) this.hjalte.add(this.vassHjalte);
    this.ritaHjalte();
  }

  /**
   * Vasstopparna vid fötterna (82.8, som det höga gräset i A Link to the Past): en bild på 24 × 8 som ligger överst i
   * figurens behållare, mitt under fötterna, och syns när fötterna står i rummets fält (kartans mask, <rum>_falt).
   * @param {number} fx fötternas x i behållaren @param {number} fy fötternas y i behållaren @returns {any}
   */
  vassVidFotter(fx, fy) {
    if (!this.textures.exists('omgivning') || !this.textures.get('omgivning').has('vass_fotter_01')) return null;
    return this.add.image(fx - 12, fy - 8, 'omgivning', 'vass_fotter_01').setOrigin(0, 0).setVisible(false);
  }

  /** Står en fot i rummets fält (82.8)? @param {number} x @param {number} y fötternas punkt i världen */
  iFalt(x, y) {
    const f = this.falt, rad = f?.rader[Math.floor(y)];
    if (!rad) return false;
    const px = Math.floor(x);
    for (let i = 0; i < rad.length; i += 2) if (px >= rad[i] && px < rad[i] + rad[i + 1]) return true;
    return false;
  }

  /**
   * Vasstopparna vid hjältens och ungens fötter (82.8): syns i fältet, och vajar (två bilder, ca 300 ms) när figuren går.
   */
  ritaVassVidFotter() {
    const nu = this.time.now;
    const satt = (/** @type {any} */ img, /** @type {boolean} */ i, /** @type {boolean} */ gar) => {
      if (!img) return;
      const ram = `vass_fotter_0${gar ? 1 + (Math.floor(nu / 300) % 2) : 1}`;
      if (img.visible !== i || (i && img.frame.name !== ram)) {
        if (i && !img.visible && img === this.vassHjalte) this.vassSedd = (this.vassSedd || 0) + 1;
        img.setVisible(i); if (i) img.setFrame(ram); this.smutsig = true;
      }
    };
    const ungeGar = !!this.forraUngePos && (this.forraUngePos.x !== this.ungePos.x || this.forraUngePos.y !== this.ungePos.y);
    this.forraUngePos = { x: this.ungePos.x, y: this.ungePos.y };
    satt(this.vassHjalte, !!this.falt && this.hjalte.visible && this.iFalt(this.pos.x, this.pos.y - 1), !!this.gar);
    satt(this.vassUnge, !!this.falt && this.unge.visible && !this.ungeLyft && this.iFalt(this.ungePos.x, this.ungePos.y - 1), ungeGar);
  }

  /**
   * Ordkraftens ljus (beslut 39.2, 10b Effekter): efx_ordkraft_01–04 i ordningen 1, 2, 3, 3, 4, ca 100 ms var (händelsetakten i 10e §7, beslut 46.5 och 48.3), med mitten på stavens kalla ände
   * (överst i handen, och 8 pixlar högre med svärdet). Bara bildbyten i världens pixlar, inget filter (golvdatorn).
   * Ligger ovanför mörkret, så att ljuset syns på vinden. Ger false när bilderna saknas.
   */
  ordkraft() {
    if (!this.harRum || !this.textures.exists('effekter') || !this.textures.get('effekter').has('efx_ordkraft_01')) return false;
    this.ordkraftBild?.destroy();
    const x = Math.round(this.pos.x), y = Math.round(this.pos.y - FIGUR.hojd - (this.harSvard ? 8 : 0) + 2);
    const b = this.add.image(x, y, 'effekter', 'efx_ordkraft_01').setOrigin(0.5, 0.5);
    this.lagerLjust.add(b); this.ordkraftBild = b; this.smutsig = true;
    // bild 1, 2, 3, 3 och 4: ringen står en bild längre i stället för att gå runt två gånger (Stil, beslut 48.3)
    let i = 0;
    this.time.addEvent({ delay: ORDKRAFT_MS, repeat: ORDKRAFT_BILDER.length - 1, callback: () => {
      i++;
      if (!b.active) return;
      if (i >= ORDKRAFT_BILDER.length) { b.destroy(); if (this.ordkraftBild === b) this.ordkraftBild = null; } else b.setFrame(`efx_ordkraft_0${ORDKRAFT_BILDER[i]}`);
      this.smutsig = true;
    } });
    return true;
  }

  /** Har han staven? Den syns i handen från att han har en formel (LJUS). @param {boolean} pa */
  sattStav(pa) {
    if (this.harStav === pa) return;
    this.harStav = pa; this.smutsig = true;
    this.stav?.setVisible(pa);
  }

  /** Det han har på sig (hjältens lager: hjälmdekor, ryggsäck och dräkt). @param {{ hjalmdekor: string | null, ryggsack: string | null, drakt?: string | null }} lager */
  sattLager(lager) {
    this.lager = { ...lager };
    this.sattUtseende(this.utseende || {});
  }

  /** Ryggen mot kameran (på stegen). @param {boolean} pa */
  sattRygg(pa) {
    this.rygg = pa; this.smutsig = true;
    this.ritaHjalte();
  }

  /**
   * Hjältens bild just nu: åt det håll han är vänd (ryggen mot oss på stegen), och i gången en ny bild var
   * GANG_STEG:e pixel. Står han still är det gångens första bild.
   */
  ritaHjalte() {
    if (!this.kropp) return;
    if (this.hjalteLeraImg?.visible) return; // i leran: Stils bild visar honom (hjalteLeraBild)
    // vinka (51.4) är en bild i gångens storlek (16 × 24) åt ett håll: staven och ryggsäcken ritas som när han går
    // vinka och blåsa i hornet (103.3.2) är bilder i gångens storlek: ryggsäcken ritas som när han går. När han blåser
    // håller han hornet med båda händerna, så staven syns inte
    const liten = /^hjalte_(?:vinka|blaser)_(ner|upp|hoger|vanster)_/.exec(this.hjaltePose || '');
    const blaser = !!liten && /^hjalte_blaser_/.test(this.hjaltePose || '');
    const r = liten ? /** @type {'ner' | 'upp' | 'hoger' | 'vanster'} */ (liten[1]) : this.rygg || this.hjaltePose ? 'upp' : riktningFor(this.vand);
    const i = this.gar ? Math.floor((this.gang || 0) / GANG_STEG) % 4 : 0;
    // på stegen: klättra med ryggen mot oss (två bilder som växlar medan han klättrar)
    const klattrar = this.klattrar && this.textures.get('hjalte').has('hjalte_klattra_upp_01');
    const helPose = !klattrar && !liten && this.hjaltePose;
    const pose = !klattrar && this.hjaltePose;
    const namn = pose || (klattrar ? `hjalte_klattra_upp_0${1 + (Math.floor(this.pos.y / 6) % 2)}` : `hjalte_ga_${r}_0${i + 1}`);
    if (this.kropp.frame.name !== namn) { this.kropp.setFrame(namn); this.smutsig = true; }
    // en hel bild (32 × 40) står med fötterna där gångens bild (16 × 24) har dem
    const px = helPose ? -8 : 0, py = helPose ? -16 : 0;
    if (this.kropp.x !== px || this.kropp.y !== py) { this.kropp.setPosition(px, py); this.smutsig = true; }
    this.stav?.setVisible(!!this.harStav && !klattrar && !helPose && !blaser);
    if (this.stav && !helPose) {
      // svärdet i handen (16 × 32) ritas 8 pixlar högre än hjälten, eftersom klingan sticker upp (10b)
      const svard = this.harSvard && this.textures.get(this.stav.texture.key).has(`svard_hand_${r}_01`);
      const ram = svard ? `svard_hand_${r}_01` : `stav_hand_${r}_01`;
      if (this.stav.frame.name !== ram) { this.stav.setFrame(ram); this.smutsig = true; }
      const y = svard ? -8 : 0;
      if (this.stav.x !== 0 || this.stav.y !== y) { this.stav.setPosition(0, y); this.smutsig = true; }
    }
    const sida = r === 'hoger' || r === 'vanster';
    this.sackBak?.setVisible(sida).setFrame(`${this.sackNamn}_${r}_01`);
    this.sackFram?.setVisible(!sida).setFrame(`${this.sackNamn}_${r}_01`);
    this.kam?.setFrame(`${this.lager?.hjalmdekor}_${r}_01`);
  }

  /**
   * Hjälten sover i sängen (scenens `hjalte: "sover"`): sängen i kartan med `sovplats` visas med honom i, och han
   * andas. Hjälten själv syns inte. @returns {boolean} om det gick (rummet har en säng och bilderna finns)
   */
  sov() {
    const o = this.objekt.find((x) => x.sovplats), img = o ? this.ritade.get(o.id) : null;
    if (!o || !img || !img.setFrame || !this.textures.get('hjalte').has('hjalte_sang_03')) return false;
    if (this.sover) { this.sover.andas?.remove(); this.sover = null; } // han hade redan lagt sig (laggSig)
    this.ungeSang = null; this.ungeLyft = 0;
    // sängens egen bild ur kartan, inte den som står nu: har han lagt sig i samma rum står bilden med honom redan
    // där, och då låg en kopia kvar i sängen när han vaknade (56.2)
    const s = (this.sover = { id: o.id, img, ...this.egenBild(o, img), ungeGomd: false, andas: /** @type {any} */ (null) });
    img.setTexture(this.hjalteTextur || 'hjalte', 'hjalte_sang_03');
    this.hjalte.setVisible(false);
    s.andas = this.andas(s);
    this.smutsig = true;
    return true;
  }

  /** Han andas i sängen (bild 03 och 04). @param {{ img: any }} s */
  andas(s) {
    return this.time.addEvent({ delay: 900, loop: true, callback: () => { if (!s.img.active) return; s.img.setFrame(s.img.frame.name === 'hjalte_sang_03' ? 'hjalte_sang_04' : 'hjalte_sang_03'); this.smutsig = true; } });
  }

  /**
   * Föremålets egen bild ur kartan just nu (nattens bild på natten, bytt bild när den är bytt), utan hjälten i: den
   * som fåtöljen och sängen får tillbaka när han reser sig eller kliver ur (56.2).
   * @param {import('../karna/rumslayout.js').Objekt} o @param {any} img bilden som står nu (om kartan inte har någon)
   * @returns {{ tex: string, ram: string }}
   */
  egenBild(o, img) {
    const natt = this.tillstand === 'natt' || this.tillstand === 'natt_upplyst';
    const namn = o.bildSedan && this.bytta?.has(o.id) ? o.bildSedan : o.bildNatt && natt ? o.bildNatt : o.bildTillstand?.[this.tillstand] ?? (o.bildKvall && this.tillstand === 'kvall' ? o.bildKvall : o.bild);
    const fb = namn ? foremalsbild(this, namn) : null;
    return fb ? { tex: fb.nyckel, ram: fb.ram } : { tex: img.texture.key, ram: img.frame.name };
  }

  /**
   * Hur många hjältar syns: hjälten själv och föremål som visar honom (sängen, fåtöljen). Aldrig fler än en (56.2).
   * @returns {number}
   */
  hjaltarSomSyns() {
    const hans = (/** @type {any} */ g) => g?.visible && g.active && /^hjalte(:|$)/.test(g.texture?.key || '');
    return (this.hjalte.visible ? 1 : 0) + [...this.ritade.values()].filter(hans).length;
  }

  /**
   * Sängdags (51.4, 10f v0.3): hjälten lägger sig med hjälmen på (hjalte_sang_01 sätter sig, 02 kryper ned, sedan
   * sover han och andas som i `sov`), och ungen hoppar upp på sängens fotända, trampar runt tre varv och somnar.
   * @param {string} id sängen @param {number} [ms] per bild @returns {boolean} om det gick
   */
  laggSig(id, ms = 250) {
    const o = this.objekt.find((x) => x.id === id), img = /** @type {any} */ (this.ritade.get(id));
    if (!o?.sovplats || !img?.setTexture || !this.textures.get('hjalte').has('hjalte_sang_01')) return false;
    // han ligger i sängen från första bilden: ritas rummet om medan han kryper ned, syns han inte på golvet (56.2)
    const s = (this.sover = { id: o.id, img, ...this.egenBild(o, img), ungeGomd: false, andas: /** @type {any} */ (null) });
    this.hjalte.setVisible(false);
    img.setTexture(this.hjalteTextur || 'hjalte', 'hjalte_sang_01');
    this.time.delayedCall(ms * 2, () => { if (this.sover === s && s.img.active) { s.img.setFrame('hjalte_sang_02'); this.smutsig = true; } });
    this.time.delayedCall(ms * 4, () => {
      if (this.sover !== s || !s.img.active || s.andas) return;
      s.img.setFrame('hjalte_sang_03'); s.andas = this.andas(s); this.smutsig = true;
    });
    // ungen: ett hopp i en kort båge upp på fotändan, tre varv på stället (ner, höger, upp, vänster), och sedan sover den
    if (this.unge.visible && this.ungeBild && this.textures.get('unge').has('unge1_sover_ner_01')) {
      const till = { x: Math.round(o.x + o.b * 0.55), y: o.y + o.h - 6 };
      this.ungeSang = { fas: 'hopp', start: this.time.now + ms * 2, fran: { ...this.ungePos }, till, ms };
    }
    this.smutsig = true;
    return true;
  }

  /**
   * En figur går själv till sin plats när den visas (kartans `kommer_fran`, 51.4): från utgången den kommer ut ur
   * (Farfar från köket i hallen) runt hindren, med sina gångbilder (<namn>_<håll>_01–04, ca 150 ms var), och står
   * sedan som förut. Vinkar den (`bild_vinka`) gör den det när den är framme, tills rummet byts.
   * @param {string} id @returns {Promise<boolean>} om den gick
   */
  async figurKommer(id) {
    const o = this.ruta(id), r = /** @type {any} */ (this.ritade.get(id));
    const fran = o?.kommerFran ? this.ruta(o.kommerFran) : null;
    if (!o || !fran || !r?.setTexture) return false;
    const bas = String(r.frame?.name || '').replace(/_(ner|upp|hoger|vanster)_\d\d$/, '');
    const har = (/** @type {string} */ h) => !!foremalsbild(this, `${bas}_${h}_02`);
    const mal = { x: r.x, y: r.y }, start = this.hinder.narmasteFria(framfor(fran));
    const vag = [start, ...this.hinder.vag(start, mal), mal];
    let p = { ...start }, gatt = 0;
    r.setPosition(p.x, p.y); this.smutsig = true;
    for (const nasta of vag.slice(1)) {
      const dx = nasta.x - p.x, dy = nasta.y - p.y, l = Math.hypot(dx, dy);
      if (l < 0.5) continue;
      const h = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'hoger' : 'vanster') : dy > 0 ? 'ner' : 'upp';
      const steg = Math.max(1, Math.round(l / 2));
      for (let i = 1; i <= steg; i++) {
        if (!r.active) return false;
        gatt += l / steg;
        const ram = har(h) ? `${bas}_${h}_0${1 + (Math.floor(gatt / 6) % 4)}` : null;
        const fb = ram ? foremalsbild(this, ram) : null;
        if (fb) r.setTexture(fb.nyckel, fb.ram);
        r.setPosition(Math.round(p.x + (dx * i) / steg), Math.round(p.y + (dy * i) / steg)); this.smutsig = true;
        await new Promise((k) => setTimeout(k, 50)); // ca 40 pixlar per sekund, som en lugn promenad
      }
      p = { ...nasta };
    }
    r.setPosition(mal.x, mal.y);
    const ner = o.bild ? foremalsbild(this, o.bild) : null;
    if (ner && r.active) r.setTexture(ner.nyckel, ner.ram);
    this.smutsig = true;
    // han vinkar mot hjälten (34.2: han vänder sig mot den han talar med), åt sidan eller framåt
    const dx = this.pos.x - mal.x, dy = this.pos.y - mal.y;
    const mot = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'hoger' : 'vanster') : 'ner';
    const vinka = (o.bildVinka || []).map((n) => n.replace(/_(ner|hoger|vanster)_(\d\d)$/, `_${mot}_$2`)).map((n, i) => (foremalsbild(this, n) ? n : (o.bildVinka || [])[i])).filter((n) => foremalsbild(this, n));
    if (vinka.length > 1 && r.active) this.slingaRamar(id, vinka, 300);
    return true;
  }

  /**
   * Hjälten blåser i hornet (103.3.2, Stils hjalte_blaser_<håll>_01–02): fulla kinder (bild 2) under tutet, och
   * händerna vid munstycket (bild 1) emellan. Efter en stund utan tut, eller när han går, står han som vanligt.
   * Bara vid ett föremål med kartans `blas` (det stora hornet). @param {string} id @returns {boolean} om han blåste
   */
  blas(id) {
    const o = this.ruta(id);
    if (!o?.blas || !this.kropp) return false;
    // platsen vid munstycket (109.1): han ställer sig där med munnen vid hornet, när han står i närheten
    const vid = o.blasVid && Math.hypot(o.blasVid.x - this.pos.x, o.blasVid.y - this.pos.y) <= 24 && this.hinder.fri?.(o.blasVid) !== false ? o.blasVid : null;
    if (vid && (vid.x !== this.pos.x || vid.y !== this.pos.y)) { this.pos = { x: vid.x, y: vid.y }; this.vand = { x: 1, y: 0 }; this.placera(); }
    const hall = vid ? 'hoger' : riktningFor({ x: o.x + o.b / 2 - this.pos.x, y: o.y + o.h / 2 - this.pos.y });
    if (!this.textures.get('hjalte').has(`hjalte_blaser_${hall}_02`)) return false;
    const nr = (this.blasNr = (this.blasNr || 0) + 1);
    this.sattPose(`hjalte_blaser_${hall}_02`);
    this.time.delayedCall(900, () => { if (this.blasNr === nr && this.hjaltePose?.startsWith('hjalte_blaser_')) this.sattPose(`hjalte_blaser_${hall}_01`); });
    this.time.delayedCall(2600, () => { if (this.blasNr === nr && this.hjaltePose?.startsWith('hjalte_blaser_')) this.sattPose(null); });
    return true;
  }

  /** Hjälten vinkar (51.4, hjalte_vinka_<håll>_01–02, ca 300 ms var) ett par gånger, och står sedan som förut. @param {'upp' | 'ner' | 'hoger' | 'vanster'} [hall] */
  vinkaHjalte(hall = 'upp') {
    if (!this.kropp || !this.textures.get('hjalte').has(`hjalte_vinka_${hall}_01`)) return false;
    const kvar = this.hjaltePose;
    for (let i = 0; i < 6; i++) this.time.delayedCall(300 * i, () => { this.sattPose(`hjalte_vinka_${hall}_0${1 + (i % 2)}`); this.smutsig = true; });
    this.time.delayedCall(1800, () => { this.sattPose(kvar); this.ritaHjalte(); });
    return true;
  }

  /** Ungen på sängen (laggSig): hoppet, varven och sömnen, också medan världen står still. */
  ungeSangSteg() {
    const u = this.ungeSang; if (!u) return;
    const t = this.time.now - u.start; if (t < 0) return;
    const hopp = 450, varv = u.ms * 12;
    if (t < hopp) {
      const k = t / hopp;
      this.ungePos = { x: Math.round(u.fran.x + (u.till.x - u.fran.x) * k), y: Math.round(u.fran.y + (u.till.y - u.fran.y) * k) };
      this.ungeLyft = Math.round(Math.sin(k * Math.PI) * 10); u.fas = 'hopp';
    } else { this.ungePos = { ...u.till }; this.ungeLyft = 0; u.fas = t < hopp + varv ? 'varv' : 'sover'; }
    this.ritaUngen(); this.placera();
  }

  /**
   * Hjälten sätter sig i föremålet han har gått till (34.4): fåtöljen visas med honom i (kartans `bild_sitter`,
   * `hjalte_fatolj_vanster`), och han själv döljs, tills han ska röra sig igen (`stigUpp`). @param {string} id
   * @returns {boolean} om han satte sig
   */
  sattSig(id) {
    const o = this.objekt.find((x) => x.id === id), img = /** @type {any} */ (this.ritade.get(id));
    const fb = o?.bildSitter ? foremalsbild(this, o.bildSitter) : null;
    if (!fb || !img?.setTexture) return false;
    // fåtöljens egen bild (kartans bild), inte den som står nu: sätter han sig igen i ett rum som inte ritades om
    // står bilden med honom redan där, och då satt en kopia kvar när han reste sig (50.5)
    this.sitter = { id, img, ...this.egenBild(/** @type {any} */ (o), img) };
    img.setTexture(fb.nyckel === 'hjalte' ? this.hjalteTextur || 'hjalte' : fb.nyckel, fb.ram);
    this.hjalte.setVisible(false);
    this.smutsig = true;
    return true;
  }

  /** Han reser sig och står framför fåtöljen. */
  stigUpp() {
    const s = this.sitter; if (!s) return;
    this.sitter = null;
    const o = this.ruta(s.id), img = /** @type {any} */ (this.ritade.get(s.id)) ?? s.img;
    if (img.active) { const e = o ? this.egenBild(o, img) : s; img.setTexture(e.tex, e.ram); }
    this.hjalte.setVisible(this.harRum);
    this.placera(); this.smutsig = true;
  }

  /** Han vaknar och kliver ur sängen: täcket av, han kliver ur, och står framför sängen. @param {number} ms */
  async vakna(ms = 500) {
    const s = this.sover; if (!s) return;
    // han är i sängen tills han har klivit ur: ritas rummet om under tiden, syns han inte bredvid sängen (56.2)
    this.vaknar = s; this.sover = null; this.ungeSang = null; this.ungeLyft = 0;
    s.andas?.remove();
    for (const ram of ['hjalte_sang_02', 'hjalte_sang_01']) { if (s.img.active) s.img.setFrame(ram); this.smutsig = true; await new Promise((k) => this.time.delayedCall(Math.max(1, ms / 2), k)); }
    this.vaknar = null;
    const o = this.ruta(s.id);
    // sängens bild nu (dagens bild på morgonen), på bilden som står nu (rummet kan ha ritats om)
    const img = /** @type {any} */ (this.ritade.get(s.id)) ?? s.img;
    if (img.active) { const e = o ? this.egenBild(o, img) : s; img.setTexture(e.tex, e.ram); }
    if (o) { this.pos = this.hinder.narmasteFria(framforFran(o, { x: o.x + o.b / 2, y: o.y + o.h + 12 }, this.inomhus, this.vagg, this.massiv)); this.vand = { x: 0, y: 1 }; }
    // ungen låg på täcket (morgonen i sängen): den hoppar ned bredvid honom
    if (s.ungeGomd) { this.ungePos = this.hinder.narmasteFria({ x: this.pos.x - 18, y: this.pos.y }); this.unge.setVisible(this.harRum && this.visaUnge); }
    this.hjalte.setVisible(this.harRum);
    this.placera(); this.smutsig = true;
  }

  /**
   * En figur flyger förbi högt uppe i bild (Herr Skata när han skrattar, vid vindsfönstret och i trädgården), med
   * vingarna upp och ned, och är sedan borta. Ingen text, inget att trycka på. @param {string} figur atlasen
   * @param {number} [ms] @returns {Promise<void>}
   */
  flygForbi(figur, ms = 2200) {
    if (!this.harRum || !this.textures.exists(figur)) return Promise.resolve();
    // vindsfönstret (kartans skata_fonster): Herr Skata fladdrar fram, landar, tittar in, skrattar och flyger (Stil)
    const f0 = this.objekt.find((x) => x.skataFonster), img = f0 ? this.ritade.get(f0.id) : null;
    if (img?.setFrame && this.textures.get(figur).has(`runt_fonster_${figur === 'herr_skata' ? 'skata' : figur}_01`)) {
      const forut = { tex: img.texture.key, ram: img.frame.name };
      const bilder = [[1, 150], [2, 150], [3, 350], [4, 700], [5, 200]];
      return (async () => {
        // rummet kan ritas om (ett rumsbyte, en omstart) medan han skrattar: då finns fönstret inte längre
        for (const [n, t] of bilder) { if (!img.active) return; img.setTexture(figur, `runt_fonster_skata_0${n}`); this.smutsig = true; await new Promise((k) => this.time.delayedCall(t, k)); }
        if (img.active) { img.setTexture(forut.tex, forut.ram); this.smutsig = true; }
      })();
    }
    const k = this.kamera, y = k.y + 34; // under knapparna i hörnen
    // luftskeppet är här (s22): Herr Skata kommer från höger och landar på baronens hjälm
    if (this.luft && figur === 'herr_skata' && this.textures.get(figur).has('herr_skata_flyga_vanster_01')) {
      const l = this.luft, mal = { x: l.mal.x + 56, y: l.mal.y + 42 }; // hjälmen i bilden
      const f = this.add.image(k.x + RUM.bredd + 4, y, figur, 'herr_skata_flyga_vanster_01').setOrigin(0.5, 1);
      this.lagerLuft.add(f);
      return new Promise((klar) => {
        const fran = { x: f.x, y: f.y };
        this.tweens.add({
          targets: f, x: mal.x, duration: Math.max(1, ms * 0.6), ease: 'Sine.easeOut',
          onUpdate: (tw) => {
            f.x = Math.round(f.x); f.y = Math.round(fran.y + (mal.y - fran.y) * tw.progress + Math.sin(tw.progress * Math.PI * 3) * 3);
            f.setFrame(`herr_skata_flyga_vanster_0${1 + (Math.floor(this.time.now / 140) % 2)}`); this.smutsig = true;
          },
          onComplete: () => { f.destroy(); if (this.luft === l) this.luftskepp('skata_landar'); klar(); },
        });
      });
    }
    const f = this.add.image(k.x - 20, y, figur, `${figur}_flyga_hoger_01`).setOrigin(0, 0);
    this.lagerFigurer.add(f);
    return new Promise((klar) => {
      this.tweens.add({
        targets: f, x: k.x + RUM.bredd + 4, duration: Math.max(1, ms), ease: 'Linear',
        onUpdate: (tw) => {
          f.y = Math.round(y + Math.sin(tw.progress * Math.PI * 3) * 3); f.x = Math.round(f.x);
          f.setFrame(`${figur}_flyga_hoger_0${1 + (Math.floor(this.time.now / 140) % 2)}`);
        },
        onComplete: () => { f.destroy(); this.smutsig = true; klar(); },
      });
    });
  }

  // ------------------------------------------------------------------ regi: mellanscener med bild (Stil 20:35)

  /**
   * En mellanscen med bild (stegets `bild`): något händer i rummet, utan text. En bild som inte finns gör
   * ingenting, och då visar spelet beskrivningen som i gråboxen.
   * - `hjalte_sang_morgon`: morgonen i sängen, ungen slickar honom på näsan (s19);
   * - `luftskepp_<läge>`: luftskeppet med baronen och Herr Skata (s22), se `luftskepp`;
   * - en sidovy (`assets/sidovyer/<bild>_bakgrund.png`), se `visaSidovy`;
   * - kapitel 2:s gråbox (69.1): `unge_sjunker` (i mellanscenens `unge_till`), `unge_dras_upp`,
   *   `luftskepp_river_brevet`, och i vassen `bubblor_fran_blommorna` och `halvan_flyger_till_handen` (69.5);
   * - kapitel 2 efter beslut 71 (Teknik 34): formlernas effekter (svärdet i vassen, stocken, lyktorna) och
   *   mellanscenerna med stocken, Tant Rosa och elden, se tabellen `k2` nedan;
   * - kapitel 3 i gråbox (100.4): kartbiten, hornet, skuggan, ungen som simmar, sköldpaddans huvud, tecknen,
   *   berget och kvällen på floden, också i tabellen `k2`.
   * @param {string} bild @param {string} [mal] mellanscenens unge_till, om den har ett
   * @returns {number} hur länge mellanscenen visas (ms), 0 = ingen bild
   */
  regi(bild, mal) {
    if (!this.harRum || !bild) return 0;
    if (bild === 'hjalte_sang_morgon') return this.morgonISangen() ? 2400 : 0;
    if (bild === 'unge_sjunker') return this.ungeSjunker(mal);
    if (bild === 'unge_dras_upp') return this.ungeDrasUpp();
    if (bild === 'luftskepp_river_brevet') return this.luftskeppRiverBrevet();
    if (bild === 'bubblor_fran_blommorna') return this.bubblorFranBlommorna();
    if (bild === 'halvan_flyger_till_handen') return this.halvanFlygerTillHanden();
    // ungen biter i det som unge_till pekar på (vassen, 72.3): den springer dit först och biter sedan
    if (bild === 'unge_biter' && mal && this.ruta(mal) && this.unge.visible) {
      this.biterMal = mal;
      const m = this.ungeMal, vant = m ? Math.min(1500, Math.round(Math.hypot(m.x - this.ungePos.x, m.y - this.ungePos.y) * 14)) : 0;
      this.time.delayedCall(vant, () => { this.stilsRegi('unge_biter'); this.regiLogg.push(`ungen biter i ${mal}`); });
      return vant + 1600;
    }
    // kapitel 2 efter beslut 71 (Teknik 34): formlernas effekter och mellanscenerna
    const k2 = /** @type {Record<string, () => number>} */ ({
      svard_hugger_genom_vassen: () => this.stavenBlirSvard(),
      staven_blir_svard: () => this.stavenBlirSvard(),
      litet_svard_kittlar_vassen: () => this.litetSvardKittlar(),
      unge_hoppar_pa_stocken: () => this.ungeHopparPaStocken(),
      unge_piper_pa_stocken: () => this.ungePiperPaStocken(),
      trollslanda_landar: () => this.trollslandaLandar(),
      stocken_flyger_till_stranden: () => this.stockenIland('flyg'),
      rep_till_ungen: () => this.stockenIland('rep'),
      bro_till_stocken: () => this.tillStocken('bro'),
      stege_till_stocken: () => this.tillStocken('stege'),
      unge_hoppar_i_land: () => this.ungeHopparILand(),
      ljuset_hoppar_mellan_lyktorna: () => this.ljusetHopparMellanLyktorna(),
      rosa_vid_lyktorna: () => this.rosaVidLyktorna(),
      en_liten_ljusprick: () => this.litenLjusprick(),
      tant_rosa_nar_inte: () => this.tantRosaNarInte(),
      elden_tands: () => this.eldenTands(),
      draken_flyger_ner_till_barnet: () => this.drakenFlygerNer(),
      byborna_jublar: () => this.byborJublar(),
      bryggan_avslojad: () => this.brygganAvslojad(),
      // 72.8: lerpölen i vassen
      hjalte_sjunker: () => this.hjalteSjunker(),
      unge_drar_upp_hjalten: () => this.ungeDrarUppHjalten(),
      // 92.4: baronen och Herr Skata vid bryggan uppifrån, som i sidovyn, och när de ger sig iväg
      skata_ramlar_av_palen: () => this.bryggfigurer('skata_ramlar'),
      baronen_lyfter: () => this.bryggfigurer('lyfter'),
      // kapitel 3 i gråbox (100.4, manus 19 v0.4.1): gråboxens former tills Stil har ritat
      kartbit3_on: () => this.kartbit3On(),
      loftet_horn: () => this.loftetHorn(),
      skuggan_lyssnar: () => this.skugganLyssnar(),
      unge_simmar: () => this.ungeSimmar(),
      skoldpadda_huvud: () => this.skoldpaddaHuvud(),
      skylt_tecken: () => this.skyltTecken(),
      skoldpadda_visar_berget: () => this.skoldpaddaVisarBerget(),
      // 109.5: ankaret faller och stannar i luften, och SKÖLD tänds så att ankaret studsar och borrar ned sig
      // 113.4: luftskeppet glider in över sandbanken, och baronen tittar i kikaren (åt rätt håll den här gången)
      baronen_kommer: () => this.baronenKommer(),
      // 113.3: hjälten håller upp flaskan, och den glimtar (närbilden visas sedan på läsplattan, spel.js)
      flaskan_hittad: () => this.flaskanHittad(),
      ankaret_faller: () => this.ankaretFaller(),
      skold_ankaret: () => this.skoldAnkaret(),
      resan_kvall: () => this.resanKvall(),
      // 106: början, duellens ram och slutet (gråbox tills Stils bilder finns)
      ankomst_floden: () => this.ankomstFloden(),
      skoldpadda_simmar: () => this.skoldpaddaSimmar(),
      ordduell_start: () => this.ordduellStart(),
      ordduell_seger: () => this.ordduellSeger(),
      kartbit4_berget: () => this.kartbit4Berget(),
      resan_slut: () => this.resanSlut(),
      // säckhissen (101.3): upp genom hålet i taket i kvarnen, och ned genom golvet i loftet
      frukost: () => this.frukost(),
      skepparen_pekar: () => this.skepparenPekar(),
      tallrikar: () => this.tallrikar(),
      skuggan_stiger: () => this.skugganStiger(),
      skuggan_dyker: () => this.skugganDyker(),
      on_stiger: () => this.onStiger(),
      sackhiss_upp: () => this.sackhiss(-1),
      // kapitel 4 i gråbox (118.4): gråboxens former tills Stil har ritat (Rum.js, kapitel 4 i gråbox)
      ankomst_berget: () => this.ankomstBerget(),
      baronen_kikare_berg: () => this.baronenKikareBerg(),
      blocket_lyfts: () => this.blocketLyfts(),
      stor_skold_ras: () => this.storSkoldRas(),
      mynningen_stangs: () => this.mynningenStangs(),
      ungens_ogon: () => this.ungensOgon(),
      grottan_glittrar: () => this.grottanGlittrar(),
      grottan_visar_vaggen: () => this.grottanVisarVaggen(),
      isblock_svavar: () => this.isblockSvavar(),
      fotavtryck_stor: () => this.isblockSvavar(),
      ungen_fot_avtryck: () => this.ungenFotAvtryck(),
      ungen_slar_isen: () => this.ungenSlarIsen(),
      blocket_driva: () => this.blocketDriva(),
      fossil_svans: () => this.fossilSvans(),
      svansarna: () => this.svansarna(),
      ladan_oppnas: () => this.ladanOppnas(),
      gatan_i_boken: () => this.gatanIBoken(),
      // 121.4: klippan, formeln blir det han skrev (och de nästan rätta orden blir för korta)
      stege_klippan: () => this.klippanUpp('stege'),
      rep_klippan: () => this.klippanUpp('rep'),
      trappa_klippan: () => this.klippanUpp('trappa'),
      ett_trappsteg_klippan: () => this.klippanNastan('trappa'),
      en_kort_stege_klippan: () => this.klippanNastan('stege'),
      ett_kort_rep_klippan: () => this.klippanNastan('rep'),
      kartbit5_molnkant: () => this.kartbit5Molnkant(),
      skata_harmar_molnkant: () => this.skataHarmarMolnkant(),
      resan_molnkant: () => this.resanMolnkant(),
      sackhiss_ner: () => this.sackhiss(1),
    });
    if (k2[bild]) return k2[bild]();
    if (bild.startsWith('luftskepp_')) {
      const lage = bild.slice('luftskepp_'.length);
      return this.luftskepp(lage) ? ({ glider: 2800, skata_putsar: 2200, trasslar: 2000 })[lage] ?? 1400 : 0;
    }
    const agg = AGGET[bild];
    if (agg) return this.aggRegi(agg) ? agg.ms : 0;
    if (bild === 'farfar_i_dorren' || bild === 'farfar_gar_ut') return this.farfarIDorren(bild === 'farfar_i_dorren' ? 'in' : 'ut');
    const lage = this.stilsRegi(bild);
    if (lage) return lage;
    if (this.textures.exists(`sidovy_${bild}_bakgrund`)) {
      // luftskeppet flyger först iväg åt fel håll, mot SKOLAN (Stil 21:20), sedan kommer sidovyn
      const ms = this.luft && this.flygFel() ? 1600 : 0;
      // inte bland luftskeppets timrar: skeppet tas bort när det har flugit ut ur bild (92.1), före sidovyn
      if (ms) this.sidovyVantar = this.time.delayedCall(ms, () => { this.sidovyVantar = null; this.visaSidovy(bild); }); else this.visaSidovy(bild);
      return ms + 4200;
    }
    return 0;
  }

  /**
   * Farfar i dörren (67.2, med Farfars bilder som finns): `in` ställer honom i rummets dörr (kartans punkt
   * `regi_farfar`), och han tar två steg in och står vänd mot hjälten. `ut` vänder honom, och han går ut genom dörren
   * och försvinner. På natten har han morgonrocken (`farfar_natt_`), annars `farfar_morgon_`. Han står kvar tills han
   * går ut eller rummet byts. @param {'in' | 'ut'} vad @returns {number} hur länge berättelsen väntar (ms), 0 = går inte
   */
  farfarIDorren(vad) {
    const p = this.regiPunkter?.farfar;
    const bas = this.tillstand === 'natt' || this.tillstand === 'natt_upplyst' ? 'farfar_natt' : 'farfar_morgon';
    const bild = (/** @type {string} */ h) => foremalsbild(this, `${bas}_${h}_01`);
    if (!p || !bild('ner') || !bild('upp')) return 0;
    const satt = (/** @type {any} */ img, /** @type {string} */ h) => { const fb = bild(h); if (fb) img.setTexture(fb.nyckel, fb.ram); };
    if (vad === 'in') {
      this.farfarRegi?.destroy();
      const img = /** @type {any} */ (this.add.image(p.x, p.y - 8, bild('ner')?.nyckel ?? 'farfar', bild('ner')?.ram).setOrigin(0.5, 1).setAlpha(0));
      img.fot = p.y; this.farfarRegi = img;
      this.lagerFigurer.add(img); this.sorteraFigurer();
      // ut ur dörröppningen: han tonas fram och tar två steg in (ett litet gung, han har bara en bild åt varje håll)
      this.tweens.add({ targets: img, alpha: 1, duration: 200, onUpdate: () => { this.smutsig = true; } });
      this.tweens.add({ targets: img, y: p.y, duration: 500, ease: 'Linear', onUpdate: () => { this.smutsig = true; } });
      this.tweens.add({ targets: img, scaleY: 0.94, duration: 125, yoyo: true, repeat: 1, onUpdate: () => { this.smutsig = true; } });
      return 900;
    }
    const img = this.farfarRegi;
    if (!img?.active) return 0;
    satt(img, 'upp');
    this.tweens.add({ targets: img, y: p.y - 12, duration: 600, ease: 'Linear', onUpdate: () => { this.smutsig = true; } });
    this.tweens.add({ targets: img, scaleY: 0.94, duration: 150, yoyo: true, repeat: 1, onUpdate: () => { this.smutsig = true; } });
    this.tweens.add({ targets: img, alpha: 0, delay: 350, duration: 350, onUpdate: () => { this.smutsig = true; }, onComplete: () => { img.destroy(); if (this.farfarRegi === img) this.farfarRegi = null; this.smutsig = true; } });
    return 800;
  }

  /**
   * Stils mellanscener (Teknik 31, beslut 68.5, Stils tabell 8/11): figurerna i rummet byter bild en stund och står
   * sedan som förut. Ingen text. Saknas figuren eller bilderna händer ingenting (0), och då visar spelet beskrivningen.
   * - `unge_gaspar`, `unge_fnissar`, `unge_fnissar_mun`, `unge_kryper_ihop`, `unge_lyssnar` (åt det håll ungen tittar)
   *   och `unge_lyssnar_<upp|ner|hoger|vanster>`: ungens lägen (rad 27, 35, 43, 44, 46 och 47);
   * - `unge_biter`: ungen biter i närmaste lian och drar (rad 24);
   * - `farfar_skriver` och `farfar_gaspar` (med ungen): Farfar i fåtöljen (rad 12 och 18);
   * - `buske_prasslar`: det prasslar i en av buskarna, och löv yr (rad 28);
   * - `apa_suckar`: apan i nätet suckar (rad 31);
   * - `ekorre_knacker`: ekorren på grenen skakar, skalet regnar ner på ungen, som nyser (rad 48);
   * - `ugglor_vrider`: ugglorna vrider huvudet (rad 49);
   * - `stav_ristas`: närbilden när SVÄRD ristas i staven (rad 25). Ordet visar textlagret ovanför.
   * @param {string} bild @returns {number} hur länge berättelsen väntar (ms), 0 = finns inte
   */
  stilsRegi(bild) {
    const m = /^unge_(gaspar|fnissar_mun|fnissar|kryper_ihop|lyssnar|biter)(?:_(upp|ner|hoger|vanster))?$/.exec(bild);
    if (m) {
      const [, lage, hall] = m;
      const takt = /** @type {Record<string, [number, number]>} */ ({ gaspar: [450, 1], fnissar: [250, 3], fnissar_mun: [250, 3], kryper_ihop: [200, 4], lyssnar: [400, 2], biter: [250, 3] })[lage];
      return this.ungeLage(lage, hall || this.ungeHallFor(lage), takt[0], takt[1]);
    }
    if (bild === 'farfar_skriver' || bild === 'farfar_gaspar') {
      const o = this.objekt.find((x) => String(x.bild || '').startsWith('farfar_fatolj') && this.ritade.has(x.id));
      if (!o || !foremalsbild(this, `${bild.replace('farfar_', 'farfar_fatolj_')}_01`)) return 0;
      if (bild === 'farfar_skriver') return this.regiRamar(o.id, Array.from({ length: 10 }, (_, i) => `farfar_fatolj_skriver_0${1 + (i % 2)}`), 250);
      const ms = this.regiRamar(o.id, ['farfar_fatolj_gaspar_01', 'farfar_fatolj_gaspar_02'], 900);
      this.ungeLage('gaspar', 'ner', 450, 2);
      return ms;
    }
    if (bild === 'buske_prasslar') {
      const buskar = this.objekt.filter((x) => this.ritade.has(x.id) && foremalsbild(this, `${x.bild}_prassel_01`));
      const o = buskar[Math.floor(Math.random() * buskar.length)];
      if (!o) return 0;
      this.lovYr(o.id);
      return this.regiRamar(o.id, Array.from({ length: 6 }, (_, i) => `${o.bild}_prassel_0${1 + (i % 2)}`), 250);
    }
    if (bild === 'apa_suckar') {
      const o = this.objekt.find((x) => String(x.bild || '').startsWith('apa_') && this.ritade.has(x.id) && !this.dolda.has(x.id));
      if (!o || !foremalsbild(this, 'apa_sucka_01')) return 0;
      return this.regiRamar(o.id, ['apa_sucka_01', 'apa_sucka_02', 'apa_sucka_01', 'apa_sucka_02'], 400);
    }
    if (bild === 'ekorre_knacker') {
      const o = this.objekt.find((x) => String(x.bild || '').startsWith('ekorre_') && this.ritade.has(x.id));
      if (!o) return 0;
      const h = this.ungePos.x >= o.x + o.b / 2 ? 'hoger' : 'vanster';
      if (!foremalsbild(this, `ekorre_skaka_${h}_01`)) return 0;
      const ms = this.regiRamar(o.id, Array.from({ length: 6 }, (_, i) => `ekorre_skaka_${h}_0${1 + (i % 2)}`), 250);
      // skalet regnar ner över ungen, och ungen nyser
      if (this.unge.visible && this.textures.exists('effekter') && this.textures.get('effekter').has('efx_skal_01')) {
        const skal = this.add.image(Math.round(this.ungePos.x), Math.round(this.ungePos.y - 34), 'effekter', 'efx_skal_01').setOrigin(0.5, 0.5);
        this.lagerLjust.add(skal);
        for (let i = 2; i <= 4; i++) this.time.delayedCall(140 * (i - 1), () => { if (!skal.active) return; if (i === 4) skal.destroy(); else { skal.setFrame(`efx_skal_0${i}`); skal.y += 8; } this.smutsig = true; });
        this.time.delayedCall(560, () => this.ungeLage('nysa', 'ner', 300, 2));
      }
      return Math.max(ms, 1800);
    }
    if (bild === 'ugglor_vrider') {
      const rad = /** @type {any} */ (this.ritade.get('ugglor'));
      const ram = (/** @type {string} */ n) => { for (const x of rad?.list || []) if (x.setFrame && x.texture?.has(n)) x.setFrame(n); this.smutsig = true; };
      if (!rad?.list?.length || !rad.list.some((/** @type {any} */ x) => x.texture?.has?.('uggla_vrid_01'))) return 0;
      const forut = rad.list.map((/** @type {any} */ x) => x.frame?.name);
      ram('uggla_01');
      for (let i = 0; i < 6; i++) this.time.delayedCall(500 + 250 * i, () => ram(`uggla_vrid_0${1 + (i % 2)}`));
      this.time.delayedCall(2000, () => { rad.list.forEach((/** @type {any} */ x, /** @type {number} */ i) => { if (x.active && forut[i]) x.setFrame(forut[i]); }); this.smutsig = true; });
      return 2000;
    }
    if (bild === 'stav_ristas') return this.stavRistas();
    return 0;
  }

  /** Åt vilket håll ungen gör sitt läge: biter mot närmaste lian, annars dit den tittar. @param {string} lage */
  ungeHallFor(lage) {
    if (lage === 'biter') {
      const mal = this.biterMal ? this.ruta(this.biterMal) : null;
      this.biterMal = null;
      const lian = mal ?? this.objekt.filter((x) => /lian|vass/.test(x.id) && this.ritade.has(x.id) && !this.dolda.has(x.id))
        .sort((a, c) => Math.hypot(a.x + a.b / 2 - this.ungePos.x, a.y + a.h - this.ungePos.y) - Math.hypot(c.x + c.b / 2 - this.ungePos.x, c.y + c.h - this.ungePos.y))[0];
      if (!lian) return 'upp';
      const dx = lian.x + lian.b / 2 - this.ungePos.x, dy = lian.y + lian.h - this.ungePos.y;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'hoger' : 'vanster') : 'upp';
    }
    if (lage === 'lyssnar') return riktningFor(this.ungeVand || { x: 0, y: 1 });
    return 'ner';
  }

  /**
   * Ungen gör ett läge (Stils bilder unge1_<läge>_<håll>_01–02 i en slinga). @param {string} lage @param {string} hall
   * @param {number} ms per bild @param {number} varv gånger genom bilderna @returns {number} hur länge (ms), 0 = går inte
   */
  ungeLage(lage, hall, ms, varv) {
    if (!this.unge.visible || !this.ungeBild || !this.textures.get('unge').has(`unge1_${lage}_${hall}_01`)) return 0;
    let bilder = 1;
    while (bilder < 9 && this.textures.get('unge').has(`unge1_${lage}_${hall}_0${bilder + 1}`)) bilder++;
    const nu = this.time.now, tid = ms * bilder * varv;
    this.ungeReaktion = { namn: lage, hall, sida: false, start: nu, ms, bilder, slut: nu + tid };
    // bilden byts också när världen står still (en replik står kvar medan ungen gäspar)
    this.ritaUngen();
    this.time.addEvent({ delay: ms, repeat: bilder * varv, callback: () => { if (this.unge.visible) this.ritaUngen(); } });
    this.smutsig = true;
    return tid;
  }

  /**
   * Ett föremål byter bild i tur och ordning, steg ms var, och står sedan som förut (dess tomgång väntar under tiden).
   * @param {string} id @param {string[]} ramar @param {number} steg @returns {number} hur länge (ms)
   */
  // ------------------------------------------------------------------ kapitel 2:s mellanscener i gråboxen (69.1)

  /**
   * Ungen skuttar ut i ett föremål (leran) och sjunker ned till magen: ett hopp en bit in i föremålet från kanten
   * närmast ungen, sedan sjunker bilden 12 px (den skärs av vid marken, och leran ringar sig runt den), och ungen
   * tittar på hjälten. Den sitter fast tills `unge_dras_upp` eller rummet byts. @param {string | undefined} id
   * @returns {number}
   */
  ungeSjunker(id) {
    const o = id ? this.ruta(id) : null;
    if (!o || !this.unge.visible || !this.ungeBild) return 0;
    const fran = { ...this.ungePos };
    // närmaste punkt i föremålet, och sedan 8 px in mot mitten
    const nx = Math.max(o.x, Math.min(o.x + o.b, fran.x)), ny = Math.max(o.y, Math.min(o.y + o.h, fran.y));
    const cx = o.x + o.b / 2, cy = o.y + o.h / 2, dl = Math.hypot(cx - nx, cy - ny) || 1, in8 = Math.min(8, dl);
    const mal = { x: nx + ((cx - nx) / dl) * in8, y: ny + ((cy - ny) / dl) * in8 };
    this.ungeMal = { x: mal.x, y: mal.y, mot: Math.atan2(this.pos.y - mal.y, this.pos.x - mal.x) };
    const fast = { djup: 0, start: this.time.now };
    this.ungeFast = fast;
    const t = { p: 0 };
    this.tweens.add({
      targets: t, p: 1, duration: 550, ease: 'Sine.easeInOut',
      onUpdate: () => { this.ungePos = { x: fran.x + (mal.x - fran.x) * t.p, y: fran.y + (mal.y - fran.y) * t.p }; this.ungeLyft = Math.round(Math.sin(t.p * Math.PI) * 14); this.placera(); this.smutsig = true; },
      onComplete: () => {
        this.ungeLyft = 0;
        this.tweens.add({ targets: fast, djup: 12, duration: 900, ease: 'Sine.easeOut', onUpdate: () => { this.placera(); this.smutsig = true; } });
      },
    });
    this.regiLogg.push(`ungen sjunker i ${o.id}`);
    return 1900;
  }

  /** Har Stil ritat ungen i leran (del 3b), och sitter den i lera (inte i vatten)? */
  ungeLeraBilder() {
    return !!this.ungeFast && this.ungeFast.farg !== 'vatten' && this.textures.exists('unge') && this.textures.get('unge').has('unge1_lera_ner_01');
  }

  /** Ungens sjunkna läge i bilden: skuren vid marken, och leran som en ring runt den. Anropas av placera(). */
  ritaUngeFast() {
    const u = this.ungeBild; if (!u) return;
    const f = this.ungeFast, d = f ? Math.round(f.djup) : 0;
    this.ungeSkugga?.setVisible(!f);
    // med Stils bilder står pölen och det som är under ytan i bilden: ingen beskärning och ingen ring
    if (this.ungeLeraBilder()) { if (u.isCropped) u.setCrop(); this.ungeLera?.setVisible(false); return; }
    if (d > 0) u.setCrop(0, 0, 24, 24 - d); else if (u.isCropped) u.setCrop();
    if (!f) { this.ungeLera?.setVisible(false); return; }
    if (!this.ungeLera || !this.ungeLera.active) { this.ungeLera = this.add.graphics(); this.unge.add(this.ungeLera); }
    const g = this.ungeLera; g.clear().setVisible(true);
    const vatten = f.farg === 'vatten';
    g.fillStyle(vatten ? 0x3f6e9e : 0x5b4630, 1).fillEllipse(12, 24 - d, 22, 6);
    g.fillStyle(vatten ? 0x8fc3e8 : 0x7a5f40, 1).fillEllipse(12, 23 - d, 16, 3);
  }

  /**
   * Hjälten drar upp ungen: den flyger upp ur leran i en båge och landar bredvid honom, och leran stänker, en klick
   * på hjälmen. Sedan följer den honom igen. @returns {number}
   */
  ungeDrasUpp() {
    const f = this.ungeFast;
    if (!f || !this.ungeBild) return 0;
    this.tweens.killTweensOf(f);
    const fran = { ...this.ungePos }, till = this.hinder.narmasteFria({ x: this.pos.x + (fran.x < this.pos.x ? -16 : 16), y: this.pos.y });
    // leran stänker: små klickar ut åt sidorna, och en på hjälmen
    for (let i = 0; i < 7; i++) {
      const v = (i / 6) * Math.PI + Math.PI, r = 14 + (i % 3) * 5;
      const klick = this.add.rectangle(Math.round(fran.x), Math.round(fran.y - 2), 2, 2, 0x5b4630).setOrigin(0.5, 0.5);
      this.lagerLjust.add(klick);
      this.tweens.add({ targets: klick, x: fran.x + Math.cos(v) * r, y: fran.y - 6 + Math.sin(v) * r * 0.6 + 10, duration: 500, ease: 'Quad.easeOut', onUpdate: () => { this.smutsig = true; }, onComplete: () => { this.tweens.add({ targets: klick, alpha: 0, duration: 400, delay: 300, onComplete: () => klick.destroy() }); } });
    }
    const hjalm = this.add.rectangle(Math.round(fran.x), Math.round(fran.y - 4), 3, 2, 0x5b4630).setOrigin(0.5, 0.5);
    this.lagerLjust.add(hjalm);
    this.tweens.add({ targets: hjalm, x: this.pos.x + 1, y: this.pos.y - FIGUR.hojd + 3, duration: 450, ease: 'Quad.easeOut', onUpdate: () => { this.smutsig = true; }, onComplete: () => { this.tweens.add({ targets: hjalm, alpha: 0, duration: 500, delay: 900, onComplete: () => hjalm.destroy() }); } });
    // upp ur leran och i en båge till hjälten
    this.tweens.add({ targets: f, djup: 0, duration: 180, onUpdate: () => { this.placera(); this.smutsig = true; } });
    const t = { p: 0 };
    this.tweens.add({
      targets: t, p: 1, duration: 650, delay: 120, ease: 'Sine.easeInOut',
      onUpdate: () => { this.ungePos = { x: fran.x + (till.x - fran.x) * t.p, y: fran.y + (till.y - fran.y) * t.p }; this.ungeLyft = Math.round(Math.sin(t.p * Math.PI) * 20); this.placera(); this.smutsig = true; },
      onComplete: () => {
        this.ungeLyft = 0; this.ungeFast = null; this.ungeMal = null;
        this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 };
        this.placera(); this.ungeReagerar(true); this.smutsig = true;
      },
    });
    this.regiLogg.push('ungen dras upp');
    return 1500;
  }

  /**
   * Luftskeppet river brevet (k2s02): det glider in högt uppe med brevet under gondolen, baronen och Herr Skata
   * drar i var sin ände (brevet ryckar), och det går sönder. En halva far mot bryggan och en mot vassen, Herr Skatas
   * fjäder dalar ned vid hjältens fötter, och luftskeppet sjunker mot bryggan och ut ur bild. Skeppet glider in över
   * hjälten där han står, och föremålet `fjader` flyttas dit fjädern landade (75.4).
   * @returns {number}
   */
  luftskeppRiverBrevet() {
    // luftskeppet glider in över hjälten där han står, och fjädern landar vid hans fötter (75.4)
    const k = this.kamera;
    const landning = landningNara(this.pos, { x: k.x, y: k.y, b: RUM.bredd, h: RUM.hojd }, (q) => this.hinder.narmasteFria(q));
    if (!this.luftskepp('glider', this.pos.x)) return 0;
    const l = /** @type {any} */ (this.luft), img = l.img;
    const under = () => ({ x: Math.round(img.x + img.width / 2), y: Math.round(img.y + img.height + 1) });
    const papper = 0xf4ecd8, kant = 0x8a7a5a;
    // Stils bilder (del 3, 13/11): dragkampen mellan baronen och Herr Skata, och RITS. Utan dem: gråboxens brev
    const stils = ['luftskepp_river_brevet_01', 'luftskepp_brevet_rivet'].every((r) => this.textures.get('baronen').has(r));
    const brev = this.add.rectangle(under().x, under().y, 10, 7, papper).setStrokeStyle(1, kant).setOrigin(0.5, 0).setVisible(!stils);
    this.lagerLuft.add(brev);
    if (stils) l.tider.push(this.time.delayedCall(1900, () => { if (this.luft !== l) return; l.glider = false; this.luftskepp('river_brevet'); }));
    const folj = this.time.addEvent({ delay: 40, loop: true, callback: () => { if (!brev.active) return; const u = under(); brev.setPosition(u.x + (l.rycker ? (Math.floor(this.time.now / 90) % 2 ? 1 : -1) : 0), u.y); this.smutsig = true; } });
    l.tider.push(folj);
    const mitt = (/** @type {string} */ id, /** @type {{ x: number, y: number }} */ annars) => { const o = this.ruta(id); return o ? { x: o.x + o.b / 2, y: o.y + o.h / 2 } : annars; };
    this.time.delayedCall(2000, () => { l.rycker = true; });
    this.time.delayedCall(2700, () => {
      if (!brev.active) return;
      l.rycker = false; folj.remove();
      const p = { x: brev.x, y: brev.y };
      brev.destroy();
      // två halvor, åt var sitt håll, och de fladdrar
      const flyg = (/** @type {number} */ dx, /** @type {{ x: number, y: number }} */ mot, /** @type {number} */ ms) => {
        const h = this.add.rectangle(p.x + dx, p.y, 5, 7, papper).setStrokeStyle(1, kant).setOrigin(0.5, 0);
        this.lagerLuft.add(h);
        const d = Math.hypot(mot.x - p.x, mot.y - p.y) || 1, langd = Math.min(d, 220);
        const till = { x: p.x + ((mot.x - p.x) / d) * langd, y: p.y + ((mot.y - p.y) / d) * langd };
        const t = { p: 0 };
        this.tweens.add({ targets: t, p: 1, duration: ms, ease: 'Sine.easeIn', onUpdate: () => { if (!h.active) return; h.setPosition(Math.round(p.x + dx + (till.x - p.x) * t.p + Math.sin(t.p * 14) * 3), Math.round(p.y + (till.y - p.y) * t.p)); h.setAngle(Math.sin(t.p * 18) * 25); this.smutsig = true; }, onComplete: () => h.destroy() });
      };
      if (stils) {
        // RITS: baronen håller upp sin halva, och den andra fladdrar från Herr Skatas plats ned mot vassen
        this.luftskepp('brevet_rivet');
        const fb = foremalsbild(this, 'brev_halva_faller_01');
        // från Herr Skata (skeppets x + 88, y + 40) och nedåt, åt vassens håll (Stils granskning 13/11, 87.2)
        const fran = { x: img.x + 88, y: img.y + 40 }, vass = mitt('stig_vassen', { x: fran.x - 80, y: fran.y });
        const mot = { x: fran.x + Math.max(-120, Math.min(120, vass.x - fran.x)), y: fran.y + 110 };
        const h = fb ? this.add.image(fran.x, fran.y, fb.nyckel, 'brev_halva_faller_01').setOrigin(0.5, 0.5) : null;
        if (h) {
          this.lagerLuft.add(h);
          const byt = this.time.addEvent({ delay: 250, loop: true, callback: () => { if (h.active) { h.setFrame(h.frame.name.endsWith('_01') ? 'brev_halva_faller_02' : 'brev_halva_faller_01'); this.smutsig = true; } } });
          const till = mot;
          const t = { p: 0 };
          this.tweens.add({ targets: t, p: 1, duration: 1900, ease: 'Sine.easeIn', onUpdate: () => { if (!h.active) return; h.setPosition(Math.round(fran.x + (till.x - fran.x) * t.p + Math.sin(t.p * 12) * 4), Math.round(fran.y + (till.y - fran.y) * t.p)); this.smutsig = true; }, onComplete: () => { byt.remove(); h.destroy(); } });
        } else flyg(-3, mot, 1700);
      } else {
        flyg(-3, mitt('stig_vassen', { x: p.x, y: p.y - 200 }), 1700);
        flyg(3, mitt('brygga_fran_torget', { x: p.x + 220, y: p.y }), 1500);
      }
      // Herr Skatas fjäder dalar ned vid hjältens fötter
      const fo = this.ruta('fjader') ?? { b: 10, h: 10 };
      const flytt = { x: landning.x - Math.round(fo.b / 2), y: landning.y - Math.round(fo.h / 2) };
      this.flyttade.set('fjader', flytt);
      const syns = this.ruta('fjader');
      if (syns) { syns.x = flytt.x; syns.y = flytt.y; }
      const fj = landning;
      const fjader = this.add.rectangle(p.x, p.y, 2, 6, 0x1e1e24).setOrigin(0.5, 0.5);
      this.lagerLuft.add(fjader);
      const t2 = { p: 0 };
      this.tweens.add({ targets: t2, p: 1, duration: 1800, onUpdate: () => { if (!fjader.active) return; fjader.setPosition(Math.round(p.x + (fj.x - p.x) * t2.p + Math.sin(t2.p * 9) * 6), Math.round(p.y + (fj.y - p.y) * t2.p)); fjader.setAngle(Math.sin(t2.p * 9) * 40); this.smutsig = true; }, onComplete: () => { this.tweens.add({ targets: fjader, alpha: 0, duration: 300, onComplete: () => fjader.destroy() }); } });
      // luftskeppet sjunker mot bryggan och ut ur bild
      const bryggan = mitt('brygga_fran_torget', { x: img.x + 300, y: img.y + 60 });
      const fran = { x: img.x + img.width / 2, y: img.y + img.height / 2 }, dd = Math.hypot(bryggan.x - fran.x, bryggan.y - fran.y) || 1;
      if (!stils && this.textures.get('baronen').has('luftskepp_flyger_fel_01')) this.luftskepp('flyger_fel');
      l.glider = true;
      // ut ur bild, och sedan borta ur rummet (92.1): skeppet står inte kvar öster om bilden
      this.tweens.add({ targets: img, x: img.x + ((bryggan.x - fran.x) / dd) * 380, y: img.y + Math.max(20, ((bryggan.y - fran.y) / dd) * 380), duration: 1900, ease: 'Sine.easeIn', onUpdate: () => { img.x = Math.round(img.x); img.y = Math.round(img.y); this.smutsig = true; }, onComplete: () => this.luftskeppBort(l) });
    });
    this.regiLogg.push('luftskeppet river brevet');
    return 4700;
  }

  /** En bubbla (gråbox): en ring med lite blått i och en glans. @param {any} g @param {number} x @param {number} y @param {number} r */
  ritaBubbla(g, x, y, r) {
    g.clear();
    if (r <= 0) return;
    g.fillStyle(0xbfe3f5, 0.28).fillCircle(x, y, r);
    g.lineStyle(1, 0xf2fbff, 0.9).strokeCircle(x, y, r);
    g.fillStyle(0xffffff, 0.9).fillRect(Math.round(x - r * 0.5), Math.round(y - r * 0.6), 2, 2);
  }

  /**
   * De gula blommorna blåser bubblor (vassen, 69.5): en liten bubbla stiger var 0,5 s och svävar omkring en stund.
   * Det fortsätter tills rummet byts, så att ungens bubbla är planterad. @returns {number}
   */
  bubblorFranBlommorna() {
    const o = this.ruta('bubbelblommor');
    if (!o) return 0;
    this.blomBubblor?.remove();
    const blas = () => {
      const g = this.add.graphics(); this.lagerLjust.add(g);
      const x0 = o.x + 4 + Math.random() * (o.b - 8), y0 = o.y + 2, r = 2 + Math.round(Math.random()), hojd = 24 + Math.random() * 28, fas = Math.random() * 6;
      const t = { p: 0 };
      this.tweens.add({ targets: t, p: 1, duration: 2600, onUpdate: () => { if (!g.active) return; this.ritaBubbla(g, Math.round(x0 + Math.sin(fas + t.p * 7) * 5), Math.round(y0 - hojd * t.p), r); g.setAlpha(t.p < 0.8 ? 1 : (1 - t.p) * 5); this.smutsig = true; }, onComplete: () => g.destroy() });
    };
    blas();
    this.blomBubblor = this.time.addEvent({ delay: 500, loop: true, callback: blas });
    // ungen jagar bubblorna (72.5): ett skutt med huvudet upp och ett nafs i luften, och en bubbla spricker vid nosen.
    // Bara när den går fritt efter honom (inte på stocken, i leran eller på väg till ett mål)
    let forsta = true;
    this.bubbelJakt?.remove();
    this.bubbelJakt = this.time.addEvent({ delay: 2200, loop: true, callback: () => {
      if (!this.unge.visible || this.ungeSvavar || this.ungeFast || this.ungeMal || this.hjalteFast || (this.ungeReaktion && this.ungeReaktion.slut > this.time.now)) return;
      const t = { p: 0 }, x = Math.round(this.ungePos.x + (this.ungeVand?.x ?? 0 >= 0 ? 4 : -4)), y = Math.round(this.ungePos.y - 24);
      // Stils bilder (del 3b): den nafsar efter bubblan och smäller ihop munnen
      const h = riktningFor(this.ungeVand || { x: 0, y: 1 });
      this.ungeLage('nafsar', h === 'upp' ? 'ner' : h, 180, 1);
      this.tweens.add({ targets: t, p: 1, duration: 360, onUpdate: () => { this.ungeLyft = Math.round(Math.sin(t.p * Math.PI) * 9); this.placera(); this.smutsig = true; }, onComplete: () => { this.ungeLyft = 0; this.placera(); } });
      this.time.delayedCall(180, () => { for (let i = 0; i < 5; i++) { const v = (i / 5) * Math.PI * 2, d = this.add.rectangle(x, y, 1, 1, 0xf2fbff); this.lagerLjust.add(d); this.tweens.add({ targets: d, x: x + Math.cos(v) * 6, y: y + Math.sin(v) * 6, alpha: 0, duration: 260, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() }); } });
      if (forsta) { this.regiLogg.push('ungen jagar bubblor'); forsta = false; }
    } });
    this.regiLogg.push('blommorna blåser bubblor');
    return 1600;
  }

  /**
   * FLYG får brevets halva att flyga ur vattnet till hjältens hand (69.5): den fladdrar i en båge, som fjädern, och
   * droppar. Föremålet göms. @returns {number}
   */
  halvanFlygerTillHanden() {
    const o = this.ruta('brev_halva_vatten');
    if (!o) return 0;
    this.gomForemal('brev_halva_vatten', true);
    const h = this.add.rectangle(o.x + o.b / 2, o.y + o.h / 2, 6, 8, 0xe9e1cc).setStrokeStyle(1, 0x7a8a9a).setOrigin(0.5, 0.5);
    this.lagerLuft.add(h);
    const fran = { x: h.x, y: h.y }, till = { x: this.pos.x + 7, y: this.pos.y - FIGUR.hojd + 14 };
    const t = { p: 0 };
    this.tweens.add({
      targets: t, p: 1, duration: 1500, ease: 'Sine.easeInOut',
      onUpdate: () => { if (!h.active) return; h.setPosition(Math.round(fran.x + (till.x - fran.x) * t.p + Math.sin(t.p * 12) * 3), Math.round(fran.y + (till.y - fran.y) * t.p - Math.sin(t.p * Math.PI) * 26)); h.setAngle(Math.sin(t.p * 16) * 20); this.smutsig = true; },
      onComplete: () => {
        // blött: två droppar faller från papperet
        for (const dx of [-2, 2]) { const d = this.add.rectangle(h.x + dx, h.y + 4, 1, 2, 0x8fc3e8); this.lagerLjust.add(d); this.tweens.add({ targets: d, y: d.y + 10, alpha: 0, duration: 400, delay: dx > 0 ? 150 : 0, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() }); }
        this.tweens.add({ targets: h, alpha: 0, delay: 500, duration: 200, onComplete: () => h.destroy() });
      },
    });
    this.regiLogg.push('halvan flyger till handen');
    return 2100;
  }

  /** Ungen i en bubbla (r > 0): bubblan runt den. På stocken (r = 0) ritas ingen bubbla. Anropas av placera(). */
  ritaUngeBubbla() {
    const sv = this.ungeSvavar;
    if (!sv) return;
    if (!sv.r) { if (sv.g.active) sv.g.clear(); return; }
    if (!sv.g.active) { sv.g = this.add.graphics(); this.lagerLjust.add(sv.g); }
    this.ritaBubbla(sv.g, Math.round(this.ungePos.x), Math.round(this.ungePos.y - 11 - (this.ungeLyft || 0)), Math.round(sv.r));
  }

  // ------------------------------------------------------------------ kapitel 2 efter beslut 71 (Teknik 34)

  /** Föremålets bild och dess plats i kartan. @param {string} id */
  foremalOchBild(id) {
    const o = this.ruta(id) || (this.markObjekt || []).find((x) => x.id === id);
    return { o, r: /** @type {any} */ (this.ritade.get(id)) };
  }

  /** Ungen hålls på en plats av regin (stocken): ungeSvavar utan bubbla. @param {number} x @param {number} y @param {number} [lyft] */
  hallUngen(x, y, lyft = 3) {
    if (this.ungeSvavar) this.ungeSvavar.g?.destroy();
    const sv = { x, y, foljer: false, styrd: true, r: 0, lyft, g: this.add.graphics() };
    this.lagerLjust.add(sv.g);
    this.ungeSvavar = sv;
    return sv;
  }

  /** Flytta ungen i en båge (styrd). @param {{x:number,y:number}} till @param {number} ms @param {number} hojd @param {() => void} [klar] */
  ungeBage(till, ms, hojd, klar) {
    const fran = { ...this.ungePos }, t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: ms, ease: 'Sine.easeInOut', onUpdate: () => { this.ungePos = { x: fran.x + (till.x - fran.x) * t.p, y: fran.y + (till.y - fran.y) * t.p }; this.ungeLyft = Math.round(Math.sin(t.p * Math.PI) * hojd); this.placera(); this.smutsig = true; }, onComplete: () => { this.ungeLyft = 0; klar?.(); this.placera(); this.smutsig = true; } });
  }

  /**
   * Lerpölen (72.8): hjälten kliver ut i leran och sjunker till knäna. Bilden skärs av vid marken, och leran ringar sig
   * runt honom, som ungen i leran (69.1). Han står kvar tills ungen drar upp honom. @returns {number}
   */
  hjalteSjunker() {
    if (!this.harRum || !this.hjalte.visible) return 0;
    const f = { djup: 0 };
    this.hjalteFast = f;
    this.tweens.add({ targets: f, djup: 9, duration: 700, ease: 'Quad.easeIn', onUpdate: () => { this.placera(); this.smutsig = true; } });
    this.regiLogg.push('hjälten sjunker i leran');
    return 1000;
  }

  /**
   * Ungen drar upp hjälten (72.8, omsorgen åt andra hållet): den skuttar fram, biter tag i ärmen och drar, och hjälten
   * flyger upp i en liten båge till platsen han kom ifrån (`zonUt`), lerig om benen en stund. @returns {number}
   */
  ungeDrarUppHjalten() {
    const f = this.hjalteFast;
    if (!f) return 0;
    const ut = this.zonUt ?? this.hinder.narmasteFria({ x: this.pos.x - 24, y: this.pos.y });
    const sida = Math.sign(ut.x - this.pos.x) || -1;
    const vid = this.hinder.narmasteFria({ x: this.pos.x + sida * 14, y: this.pos.y });
    if (this.unge.visible) {
      this.ungeMal = null;
      this.ungeBage(vid, 350, 6, () => { this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 }; this.stilsRegi('unge_biter'); });
    }
    this.time.delayedCall(1100, () => {
      const fran = { ...this.pos }, t = { p: 0 };
      this.tweens.add({ targets: t, p: 1, duration: 500, ease: 'Sine.easeOut', onUpdate: () => {
        f.djup = 9 * (1 - t.p);
        this.pos = { x: fran.x + (ut.x - fran.x) * t.p, y: fran.y + (ut.y - fran.y) * t.p - Math.sin(t.p * Math.PI) * 10 };
        this.placera(); this.smutsig = true;
      }, onComplete: () => {
        this.hjalteFast = null; this.pos = { ...ut }; this.lerig = this.time.now + 4000; this.placera(); this.smutsig = true;
        // leran stänker
        for (let i = 0; i < 4; i++) { const d = this.add.rectangle(fran.x, fran.y - 2, 2, 2, 0x5b4630); this.lagerLjust.add(d); this.tweens.add({ targets: d, x: fran.x + (i - 1.5) * 8, y: fran.y - 10 + (i % 2) * 4, alpha: 0, duration: 400, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() }); }
      } });
    });
    this.regiLogg.push('ungen drar upp hjälten');
    return 1800;
  }

  /**
   * Hjälten i leran i Stils bilder (del 3b, 24 × 24 med fötterna mitt på nederkanten): sjunker i tre steg och viftar
   * sedan med armarna, i hans egna färger. De vanliga lagren (kroppen, staven, ryggsäcken, hjälmdekoren) döljs under
   * tiden. @param {number} d hur djupt han står (0–9) @returns {boolean} om bilderna används
   */
  hjalteLeraBild(d) {
    const tex = this.hjalteTextur;
    if (!tex || !this.textures.exists(tex) || !this.textures.get(tex).has('hjalte_lera_ner_01')) return false;
    const vanliga = /** @type {any[]} */ (this.hjalte.list).filter((x) => x !== this.hjalteLeraImg && x !== this.hjalteLera && x !== this.vassHjalte);
    if (d <= 0) {
      if (this.hjalteLeraImg?.visible) { this.hjalteLeraImg.setVisible(false); for (const x of vanliga) if (x !== this.stav || this.harStav) x.setVisible(true); this.ritaHjalte(); }
      return false;
    }
    if (!this.hjalteLeraImg || !this.hjalteLeraImg.active) { this.hjalteLeraImg = this.add.image(-4, 0, tex, 'hjalte_lera_ner_01').setOrigin(0, 0); this.hjalte.add(this.hjalteLeraImg); }
    const ram = d >= 9 ? `hjalte_lera_ner_0${1 + (Math.floor(this.time.now / 300) % 2)}` : `hjalte_sjunker_ner_0${Math.min(3, 1 + Math.floor(d / 3))}`;
    if (this.hjalteLeraImg.texture.key !== tex) this.hjalteLeraImg.setTexture(tex, ram);
    if (this.hjalteLeraImg.frame.name !== ram) { this.hjalteLeraImg.setFrame(ram); this.smutsig = true; }
    this.hjalteLeraImg.setVisible(true);
    for (const x of vanliga) x.setVisible(false);
    this.hjalteLera?.setVisible(false);
    return true;
  }

  /** Hjälten i leran: bilderna skärs av vid marken och leran ringar sig runt honom, och lerig om benen efteråt. Anropas av placera(). */
  ritaHjalteFast() {
    const d = this.hjalteFast ? Math.round(this.hjalteFast.djup) : 0;
    if (this.hjalteLeraBild(d)) return; // samma avrundade djup som resten (CI: en rest på 0,3 lämnade lerbilden kvar)
    for (const x of /** @type {any[]} */ (this.hjalte.list)) {
      if (x === this.hjalteLera || !x.setCrop) continue;
      if (d > 0) x.setCrop(0, 0, x.width, Math.max(0, FIGUR.hojd - d - (x.y || 0))); else if (x.isCropped) x.setCrop();
    }
    this.skugga?.setVisible(!d);
    const lerig = !d && (this.lerig ?? 0) > this.time.now;
    if (!d && !lerig) { this.hjalteLera?.setVisible(false); return; }
    if (!this.hjalteLera || !this.hjalteLera.active) { this.hjalteLera = this.add.graphics(); this.hjalte.add(this.hjalteLera); }
    const g = this.hjalteLera; g.clear().setVisible(true);
    this.hjalte.bringToTop(g);
    if (d) { g.fillStyle(0x5b4630, 1).fillEllipse(8, FIGUR.hojd - d, 18, 6); g.fillStyle(0x7a5f40, 1).fillEllipse(8, FIGUR.hojd - d - 1, 12, 3); }
    else g.fillStyle(0x5b4630, 1).fillRect(4, FIGUR.hojd - 6, 3, 4).fillRect(9, FIGUR.hojd - 5, 3, 3);
  }

  /**
   * Det närmaste han kan hugga i rummet: ett föremål som kartan delar (`delas: hela` eller `djup`), eller en del av ett
   * sådant som redan är delat. @returns {import('../karna/rumslayout.js').Objekt | null}
   */
  narmastHuggbart() {
    const huggbara = this.objekt.filter((x) => x.delasHela || x.delasDjup || /** @type {any} */ (x).delAv);
    let basta = null, d = Infinity;
    for (const x of huggbara) { const dd = Math.hypot(x.x + x.b / 2 - this.pos.x, x.y + x.h / 2 - this.pos.y); if (dd < d) { d = dd; basta = x; } }
    return basta;
  }

  /**
   * SVÄRD vid vassväggen (k2_svard, 72.3): stavens ände blir ett svärd av guld, och han vänder sig mot vassen. Han
   * hugger sig igenom själv efteråt (k2_vassvaggen, P26 med verb hugga), så svärdet står kvar. Effekten heter fortfarande
   * `svard_hugger_genom_vassen` i datan, och `staven_blir_svard` gör samma sak. Han vänder sig mot det närmaste han
   * kan hugga i rummet (kartans `delas`), så att inget föremåls id står i koden (76.5). @returns {number}
   */
  stavenBlirSvard() {
    const o = this.narmastHuggbart();
    if (o) this.vand = { x: Math.sign(o.x + o.b / 2 - this.pos.x) || 1, y: 0 };
    this.svard(true);
    this.svinga(120, 'uppifran');
    this.regiLogg.push('staven blir ett svärd');
    return 800;
  }

  /** Nästan rätt vid vassen: ett litet svärd kittlar den, och vassen darrar. @returns {number} */
  litetSvardKittlar() {
    const o = this.narmastHuggbart();
    const { r } = o ? this.foremalOchBild(o.id) : { r: null };
    if (!r) return 0;
    const x0 = r.x;
    this.svard(true);
    this.tweens.add({ targets: r, x: x0 + 1, duration: 60, yoyo: true, repeat: 4, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.x = x0; this.svard(false); this.smutsig = true; } });
    return 700;
  }

  /**
   * Ungens jättehopp efter en stor bubbla, upp på stocken i strandkanten, och stocken glider ut (71.3). Ungen sitter
   * kvar på stocken tills en formel tar den i land och unge_hoppar_i_land. @returns {number}
   */
  ungeHopparPaStocken() {
    const { o, r } = this.foremalOchBild('stock_vassen');
    if (!o || !this.unge.visible || !this.ungeBild) return 0;
    const pa = { x: o.x + o.b / 2, y: o.y + o.h / 2 + 2 };
    // den stora bubblan svävar ut över vattnet, framför ungen
    const g = this.add.graphics(); this.lagerLjust.add(g);
    const b0 = { x: this.ungePos.x, y: this.ungePos.y - 16 }, b1 = { x: pa.x + 4, y: pa.y - 22 }, tb = { p: 0 };
    this.tweens.add({ targets: tb, p: 1, duration: 900, onUpdate: () => { if (g.active) this.ritaBubbla(g, Math.round(b0.x + (b1.x - b0.x) * tb.p), Math.round(b0.y + (b1.y - b0.y) * tb.p + Math.sin(tb.p * 8) * 2), 6); this.smutsig = true; } });
    this.hallUngen(this.ungePos.x, this.ungePos.y);
    this.time.delayedCall(500, () => { this.ungeLage('hopp', pa.x >= this.ungePos.x ? 'hoger' : 'vanster', 217, 1); }); // jättehoppet i Stils bilder (del 3b)
    this.time.delayedCall(500, () => this.ungeBage(pa, 650, 26, () => {
      // bubblan spricker när ungen landar, och stocken glider ut med ungen
      g.destroy();
      for (let i = 0; i < 6; i++) { const v = (i / 6) * Math.PI * 2, d = this.add.rectangle(b1.x, b1.y, 2, 2, 0xf2fbff); this.lagerLjust.add(d); this.tweens.add({ targets: d, x: b1.x + Math.cos(v) * 10, y: b1.y + Math.sin(v) * 10, alpha: 0, duration: 300, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() }); }
      const ut = this.stockUt(o), t = { p: 0 }, rx = r?.x, ry = r?.y;
      this.tweens.add({ targets: t, p: 1, duration: 2600, ease: 'Sine.easeOut', onUpdate: () => {
        if (r?.active) { r.x = Math.round(rx + ut.dx * t.p); r.y = Math.round(ry + ut.dy * t.p); }
        this.ungePos = { x: pa.x + ut.dx * t.p, y: pa.y + ut.dy * t.p }; this.placera(); this.smutsig = true;
      }, onComplete: () => { const sv = this.ungeSvavar; if (sv) { sv.x = this.ungePos.x; sv.y = this.ungePos.y; sv.styrd = false; } } });
    }));
    this.regiLogg.push('ungen hoppar på stocken');
    return 3000;
  }

  /**
   * Trollsländan (Stil 13/11, den frivilliga scenen i träskkanten): den surrar tre varv runt hjälmen i små steg, med
   * vingarna som slår var 120:e ms, och landar på ungens nos. Då blir ungen skelögd (`unge1_trollslanda_ner_01–02`),
   * och trollsländan ritas inte för sig. Sedan flyger den tillbaka till sin plats. @returns {number}
   */
  trollslandaLandar() {
    const { o, r } = this.foremalOchBild('trollslanda');
    if (!o || !r?.active || typeof r.setFrame !== 'function' || !foremalsbild(this, 'trollslanda_02')) return 0;
    const hem = { x: r.x, y: r.y }, STEG = 120, VARV = 3, PER_VARV = 8, lager = r.parentContainer;
    // i luften ovanför figurerna medan den surrar
    this.lagerLuft.add(r);
    const mitt = () => ({ x: Math.round(this.pos.x), y: Math.round(this.pos.y - 24) });
    let i = 0;
    const surr = this.time.addEvent({ delay: STEG, repeat: VARV * PER_VARV + 4, callback: () => {
      if (!r.active) return;
      i++;
      r.setFrame(i % 2 ? 'trollslanda_02' : 'trollslanda_01');
      if (i <= VARV * PER_VARV) {
        const v = (i / PER_VARV) * Math.PI * 2, c = mitt();
        r.setPosition(c.x + Math.round(Math.cos(v) * 12), c.y + Math.round(Math.sin(v) * 5));
      } else {
        // mot ungens nos, i fyra steg
        const n = i - VARV * PER_VARV, u = { x: Math.round(this.ungePos.x), y: Math.round(this.ungePos.y - 12) };
        r.setPosition(Math.round(r.x + (u.x - r.x) * n / 4), Math.round(r.y + (u.y - r.y) * n / 4));
      }
      this.smutsig = true;
    } });
    const landar = STEG * (VARV * PER_VARV + 5);
    this.time.delayedCall(landar, () => {
      surr.remove();
      if (this.ungeLage('trollslanda', 'ner', 300, 3)) r.setVisible(false);
      this.smutsig = true;
    });
    this.time.delayedCall(landar + 1900, () => {
      if (!r.active) return;
      r.setVisible(true).setFrame('trollslanda_01').setPosition(hem.x, hem.y);
      lager?.add(r);
      this.smutsig = true;
    });
    this.regiLogg.push('trollsländan landar på ungens nos');
    return landar + 2000;
  }

  /** Ungen sitter på stocken och piper: små skutt, och den tittar på vattnet och på hjälten. @returns {number} */
  ungePiperPaStocken() {
    const sv = this.ungeSvavar;
    if (!sv) return 0;
    sv.styrd = true;
    const y0 = this.ungePos.y;
    this.ungeVand = { x: 0, y: 1 };
    // med Stils bilder (del 3b) piper den med stora ögon; annars små skutt
    if (!this.ungeLage('piper', 'ner', 280, 4)) for (let i = 0; i < 3; i++) this.time.delayedCall(350 * i, () => this.ungeBage({ x: this.ungePos.x, y: y0 }, 200, 4));
    // 72.5: den tittar mot land, långt bort, och skakar på huvudet (vänder sig fram och tillbaka), sedan på hjälten
    const land = Math.sign(this.pos.x - this.ungePos.x) || -1;
    for (let i = 0; i < 4; i++) this.time.delayedCall(1150 + 220 * i, () => { this.ungeVand = { x: i % 2 ? -land : land, y: 0.01 }; this.placera(); this.smutsig = true; });
    this.time.delayedCall(2200, () => { this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 }; sv.styrd = false; this.placera(); });
    this.regiLogg.push('ungen piper på stocken');
    return 2500;
  }

  /**
   * Hur långt stocken driver ut (72.5): mycket längre än ungens hopp, ut i vattnet bort från stranden, men inom rummet.
   * Kartans punkt `regi_stock_ute` säger var den stannar, annars 64 pixlar ut. @param {{ x: number, y: number, b: number, h: number }} o
   */
  stockUt(o) {
    const p = this.regiPunkter?.stock_ute;
    if (p) return { dx: p.x - (o.x + o.b / 2), dy: p.y - (o.y + o.h / 2) };
    return { dx: Math.min(64, this.storlek.bredd - o.x - o.b - 4), dy: 8 };
  }

  /** Stocken med ungen tas till stranden (FLYG flyger, REP drar): tillbaka till sin plats i kartan. @param {'flyg' | 'rep'} hur */
  stockenIland(hur) {
    const { o, r } = this.foremalOchBild('stock_vassen');
    const sv = this.ungeSvavar;
    if (!o || !r?.active || !sv) return 0;
    sv.styrd = true;
    const fran = { x: r.x, y: r.y }, till = { x: o.x + (r.originX ?? 0) * o.b, y: o.y + (r.originY ?? 0) * o.h }, t = { p: 0 };
    const rep = hur === 'rep' ? this.add.graphics() : null;
    if (rep) this.lagerLjust.add(rep);
    const dU = { x: this.ungePos.x - fran.x, y: this.ungePos.y - fran.y };
    this.tweens.add({ targets: t, p: 1, delay: hur === 'rep' ? 400 : 0, duration: 1300, ease: 'Sine.easeInOut', onUpdate: () => {
      r.x = Math.round(fran.x + (till.x - fran.x) * t.p); r.y = Math.round(fran.y + (till.y - fran.y) * t.p - (hur === 'flyg' ? Math.sin(t.p * Math.PI) * 18 : 0));
      this.ungePos = { x: r.x + dU.x, y: r.y + dU.y + (hur === 'flyg' ? Math.sin(t.p * Math.PI) * 18 : 0) };
      this.ungeLyft = hur === 'flyg' ? Math.round(Math.sin(t.p * Math.PI) * 18) : 3;
      if (rep) rep.clear().lineStyle(1, 0xc9a66b, 1).lineBetween(this.pos.x + 6, this.pos.y - 14, this.ungePos.x, this.ungePos.y - 8);
      this.placera(); this.smutsig = true;
    }, onComplete: () => { rep?.destroy(); sv.x = this.ungePos.x; sv.y = this.ungePos.y; sv.styrd = false; this.ungeLyft = 3; this.placera(); } });
    if (rep) rep.lineStyle(1, 0xc9a66b, 1).lineBetween(this.pos.x + 6, this.pos.y - 14, this.ungePos.x, this.ungePos.y - 8);
    this.regiLogg.push(hur === 'flyg' ? 'stocken flyger till stranden' : 'repet drar in stocken');
    return hur === 'rep' ? 1900 : 1500;
  }

  /** En bro eller en stege läggs ut till stocken, och ungen går i land på den. @param {'bro' | 'stege'} vad */
  tillStocken(vad) {
    const { r } = this.foremalOchBild('stock_vassen');
    const sv = this.ungeSvavar;
    if (!r?.active || !sv) return 0;
    sv.styrd = true;
    const fran = { x: this.pos.x + 8, y: this.pos.y - 4 }, till = { x: this.ungePos.x, y: this.ungePos.y - 2 };
    const g = this.add.graphics(); this.lagerObjekt.add(g); this.lagda.push(g);
    // en planka eller ett steg var 10:e pixel, hela vägen ut till stocken (den driver långt ut, 72.5)
    const n = Math.max(6, Math.round(Math.hypot(till.x - fran.x, till.y - fran.y) / 10));
    for (let i = 0; i < n; i++) this.time.delayedCall(140 * i, () => {
      if (!g.active) return;
      const p = (i + 0.5) / n, x = fran.x + (till.x - fran.x) * p, y = fran.y + (till.y - fran.y) * p;
      if (vad === 'bro') g.fillStyle(0x9a7a4e, 1).fillRect(Math.round(x - 3), Math.round(y - 5), 6, 10);
      else { g.fillStyle(0xb08a58, 1).fillRect(Math.round(x - 1), Math.round(y - 5), 2, 10); g.lineStyle(1, 0xb08a58, 1).lineBetween(Math.round(x - 4), Math.round(y - 5), Math.round(x + 4), Math.round(y - 5)).lineBetween(Math.round(x - 4), Math.round(y + 5), Math.round(x + 4), Math.round(y + 5)); }
      this.smutsig = true;
    });
    this.time.delayedCall(140 * n + 200, () => {
      const iland = this.hinder.narmasteFria({ x: fran.x, y: fran.y + 4 });
      this.ungeBage(iland, vad === 'stege' ? 1200 : 800, vad === 'stege' ? 2 : 0, () => { sv.x = this.ungePos.x; sv.y = this.ungePos.y; sv.lyft = 0; sv.styrd = false; });
    });
    this.regiLogg.push(vad === 'bro' ? 'en bro till stocken' : 'en stege till stocken');
    return 140 * n + 200 + (vad === 'stege' ? 1300 : 900);
  }

  /** Ungen hoppar i land bredvid hjälten och skakar sig, så att hjälten blir blöt (71.3). @returns {number} */
  ungeHopparILand() {
    const sv = this.ungeSvavar;
    if (!this.ungeBild || !this.unge.visible) return 0;
    const till = this.hinder.narmasteFria({ x: this.pos.x + (this.ungePos.x < this.pos.x ? -16 : 16), y: this.pos.y });
    const skaka = () => {
      if (this.ungeSvavar) { this.ungeSvavar.g?.destroy(); this.ungeSvavar = null; }
      this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 };
      for (let i = 0; i < 6; i++) { const v = (i / 6) * Math.PI * 2, d = this.add.rectangle(this.ungePos.x, this.ungePos.y - 10, 1, 2, 0x8fc3e8); this.lagerLjust.add(d); this.tweens.add({ targets: d, x: this.ungePos.x + Math.cos(v) * 14, y: this.ungePos.y - 10 + Math.sin(v) * 8, alpha: 0, duration: 400, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() }); }
      // Stils bilder (del 3b): den skakar sig torr, annars en glad reaktion
      if (!this.ungeLage('skakar', 'ner', 150, 2)) this.ungeReagerar(true);
      this.placera(); this.smutsig = true;
    };
    if (sv) { sv.styrd = true; this.ungeLage('hopp', till.x >= this.ungePos.x ? 'hoger' : 'vanster', 233, 1); this.ungeBage(till, 700, 18, skaka); } else skaka();
    this.regiLogg.push('ungen hoppar i land');
    return sv ? 1500 : 800;
  }

  /**
   * Lyktorna längs lyktor_udden i Stils bilder (steg 5 del 1): släckt på dagen, släckt i kvällsljuset, och tänd med
   * sitt ljus när LJUS har tänt den (tills rummet byts). Lyktans fot står på punkten. Utan bilderna ritas inget.
   */
  ritaLyktor() {
    this.lyktBilder = [];
    const p = this.lyktPunkter();
    if (!p.length || !foremalsbild(this, 'lykta_slackt')) return;
    p.forEach((q, i) => {
      const tand = this.lyktorTanda?.has(i);
      const fb = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, tand ? 'lykta_tand_kvall' : this.tillstand === 'kvall' ? 'lykta_slackt_kvall' : 'lykta_slackt'));
      const img = this.add.image(Math.round(q.x), Math.round(q.y), fb.nyckel, fb.ram).setOrigin(0.5, 1);
      this.lagerObjekt.add(img);
      this.lyktBilder.push(img);
      if (tand) this.lyktLjus(i);
    });
  }

  /** Ljuset runt en tänd lykta (lykta_ljus), i ljusets lager. @param {number} i lyktans nummer i lyktPunkter() */
  lyktLjus(i) {
    const q = this.lyktPunkter()[i], fb = foremalsbild(this, 'lykta_ljus');
    if (!q || !fb) return false;
    const img = this.lyktBilder?.[i];
    const l = this.add.image(Math.round(q.x), Math.round(q.y - (img ? img.height / 2 : 6)), fb.nyckel, fb.ram).setOrigin(0.5, 0.5);
    this.lagerLjust.add(l);
    return true;
  }

  /** Lyktornas platser längs lyktor_udden (en var 24:e pixel längs den långa sidan). */
  lyktPunkter() {
    const o = this.ruta('lyktor_udden');
    if (!o) return [];
    const lodrat = o.h >= o.b, n = Math.max(2, Math.floor((lodrat ? o.h : o.b) / 24) + 1);
    return Array.from({ length: n }, (_, i) => (lodrat ? { x: o.x + o.b / 2, y: o.y + (i * (o.h - 1)) / (n - 1) } : { x: o.x + (i * (o.b - 1)) / (n - 1), y: o.y + o.h / 2 }));
  }

  /** LJUS: en ljusboll flyger från staven och tänder lyktorna en i taget (71.6). De lyser tills rummet byts. @returns {number} */
  ljusetHopparMellanLyktorna() {
    const p = this.lyktPunkter().map((q, n) => ({ ...q, n })); // n: lyktans plats i raden, också när ordningen vänds
    if (!p.length) return 0;
    // ljuset börjar vid lyktan närmast hjälten och går längs raden (från udden upp till torget, 78.4)
    if (Math.hypot(p[p.length - 1].x - this.pos.x, p[p.length - 1].y - this.pos.y) < Math.hypot(p[0].x - this.pos.x, p[0].y - this.pos.y)) p.reverse();
    const boll = this.add.graphics(); this.lagerLjust.add(boll);
    let fran = { x: this.pos.x + 6, y: this.pos.y - 26 };
    const steg = 360, slut = steg * p.length + 900;
    this.regiFokus = { x: this.pos.x, y: this.pos.y };
    p.forEach((q, i) => this.time.delayedCall(steg * i, () => {
      const a = { ...fran }, t = { p: 0 };
      this.regiFokus = { x: q.x, y: q.y };
      this.tweens.add({ targets: t, p: 1, duration: steg - 20, onUpdate: () => { if (!boll.active) return; boll.clear().fillStyle(0xfff2a8, 0.5).fillCircle(Math.round(a.x + (q.x - a.x) * t.p), Math.round(a.y + (q.y - 6 - a.y) * t.p - Math.sin(t.p * Math.PI) * 10), 4).fillStyle(0xffffff, 1).fillCircle(Math.round(a.x + (q.x - a.x) * t.p), Math.round(a.y + (q.y - 6 - a.y) * t.p - Math.sin(t.p * Math.PI) * 10), 2); this.smutsig = true; },
        onComplete: () => {
          // med Stils bilder tänds lyktan och får sitt ljus, och den lyser när rummet ritas om (tills rummet byts)
          const lykta = this.lyktBilder?.[q.n], tand = foremalsbild(this, 'lykta_tand_kvall');
          this.lyktorTanda?.add(q.n);
          if (lykta?.active && tand) { lykta.setTexture(tand.nyckel, tand.ram); this.lyktLjus(q.n); this.smutsig = true; return; }
          const l = this.add.graphics(); this.lagerLjust.add(l); this.lagda.push(l); l.fillStyle(0xffd34d, 0.35).fillCircle(Math.round(q.x), Math.round(q.y - 6), 5).fillStyle(0xffe680, 1).fillRect(Math.round(q.x - 1), Math.round(q.y - 8), 3, 4); this.smutsig = true;
        } });
      fran = { x: q.x, y: q.y - 6 };
    }));
    this.time.delayedCall(steg * p.length + 100, () => boll.destroy());
    this.time.delayedCall(slut, () => { this.regiFokus = null; });
    this.regiLogg.push('ljuset hoppar mellan lyktorna');
    return slut;
  }

  /**
   * Lyktorna visas innan han ska tända dem (79.3): Tant Rosa går till lyktan längst från hjälten (vid torget) och
   * lyfter på den, och kameran glider från henne ned längs raden av släckta lyktor till hjälten. Sedan går hon
   * tillbaka dit hon stod. I gråboxen bara figuren som går och en liten gungning. @returns {number}
   */
  rosaVidLyktorna() {
    const p = this.lyktPunkter();
    const { o, r } = this.foremalOchBild('tant_rosa');
    if (!p.length || !o || !r?.active) return 0;
    const hjalte = { x: this.pos.x, y: this.pos.y };
    const avst = (/** @type {{ x: number, y: number }} */ q) => Math.hypot(q.x - hjalte.x, q.y - hjalte.y);
    const rad = avst(p[0]) > avst(p[p.length - 1]) ? p : [...p].reverse(); // från torget till udden
    const lykta = rad[0];
    const start = { x: r.x, y: r.y, ox: o.x, oy: o.y };
    // hon ställer sig till vänster om lyktan, med fötterna vid lyktans fot
    const dx = Math.round(lykta.x - 10 - (o.x + o.b / 2)), dy = Math.round(lykta.y + 4 - (o.y + o.h));
    const ga = 1200, lyft = 600, glid = 3200, vila = 900;
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: ga, onUpdate: () => {
      if (!r.active) return;
      r.x = Math.round(start.x + dx * t.p); r.y = Math.round(start.y + dy * t.p);
      this.regiFokus = { x: start.ox + o.b / 2 + dx * t.p, y: start.oy + o.h / 2 + dy * t.p };
      this.smutsig = true;
    } });
    // hon lyfter på lyktan: en liten gungning
    this.time.delayedCall(ga, () => { if (r.active) this.tweens.add({ targets: r, y: r.y - 2, duration: 150, yoyo: true, repeat: 1, onUpdate: () => { this.smutsig = true; } }); });
    // kameran glider längs raden ned till udden, där veden ligger (pass 92, 93.5), och sedan tillbaka till hjälten.
    // Hon går tillbaka under tiden
    const eld = this.ruta('lagereld');
    const udden = eld ? { x: eld.x + eld.b / 2, y: eld.y + eld.h / 2 } : rad[rad.length - 1];
    // kameran stannar en stund vid elden (vila), så att han hinner se var pinnarna ska ligga
    this.time.delayedCall(ga + lyft, () => {
      const fran = { x: lykta.x, y: lykta.y };
      const langd = Math.hypot(udden.x - fran.x, udden.y - fran.y), langd2 = Math.hypot(hjalte.x - udden.x, hjalte.y - udden.y);
      const t1 = Math.round(glid * langd / Math.max(1, langd + langd2)), t2 = glid - t1;
      const glida = (a, b, ms, sen) => { const g = { p: 0 }; this.tweens.add({ targets: g, p: 1, duration: Math.max(1, ms), delay: sen, ease: 'Sine.easeInOut', onUpdate: () => { this.regiFokus = { x: a.x + (b.x - a.x) * g.p, y: a.y + (b.y - a.y) * g.p }; } }); };
      glida(fran, udden, t1, 0);
      glida(udden, hjalte, t2, t1 + vila);
      const b2 = { p: 0 }, nu = { x: r.x, y: r.y };
      this.tweens.add({ targets: b2, p: 1, duration: ga, onUpdate: () => { if (!r.active) return; r.x = Math.round(nu.x + (start.x - nu.x) * b2.p); r.y = Math.round(nu.y + (start.y - nu.y) * b2.p); this.smutsig = true; } });
    });
    this.time.delayedCall(ga + lyft + glid + vila + 100, () => { this.regiFokus = null; });
    this.regiLogg.push('Tant Rosa vid lyktorna');
    return ga + lyft + glid + vila + 100;
  }

  /** Nästan LJUS: en liten ljusprick vid stavens ände som slocknar. @returns {number} */
  litenLjusprick() {
    const d = this.add.circle(Math.round(this.pos.x + 6), Math.round(this.pos.y - 26), 2, 0xfff2a8); this.lagerLjust.add(d);
    this.tweens.add({ targets: d, alpha: 0, duration: 500, delay: 200, onUpdate: () => { this.smutsig = true; }, onComplete: () => d.destroy() });
    return 700;
  }

  /** Tant Rosa sträcker upp dammvippan mot tavlan, men den räcker inte (71.4). @returns {number} */
  tantRosaNarInte() {
    const { o } = this.foremalOchBild('tant_rosa');
    if (!o) return 0;
    // Stils bild (steg 5 del 1): hon sträcker upp dammvippan bakifrån, på tå
    if (foremalsbild(this, 'tant_rosa_strack_upp_01') && foremalsbild(this, 'tant_rosa_strack_upp_02')) {
      this.regiRamar('tant_rosa', [1, 2, 1, 2, 1, 2].map((n) => `tant_rosa_strack_upp_0${n}`), 260);
      this.regiLogg.push('Tant Rosa når inte');
      return 1600;
    }
    const g = this.add.graphics(); this.lagerLjust.add(g);
    const x = o.x + o.b / 2 + 4, y0 = o.y + 4, t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: 1400, onUpdate: () => {
      const upp = Math.min(1, t.p * 2.5) * 22, vick = Math.sin(t.p * 18) * 2;
      g.clear().lineStyle(1, 0x8a6a48, 1).lineBetween(x, y0, x + vick, y0 - upp).fillStyle(0xd9c7a0, 1).fillCircle(Math.round(x + vick), Math.round(y0 - upp), 3);
      this.smutsig = true;
    }, onComplete: () => { g.destroy(); this.smutsig = true; } });
    this.regiLogg.push('Tant Rosa når inte');
    return 1600;
  }

  /**
   * FLYG tar ned draken från taket (76.4, B10): draken lossnar, flyger en sväng över byn och landar hos barnet, som
   * hoppar. I gråboxen en röd romb med svans. Föremålet på taket döljs, och kartan tar bort det (forsvinner_efter).
   * @returns {number}
   */
  drakenFlygerNer() {
    const { o } = this.foremalOchBild('drake_tak');
    const barn = this.ruta('barnet_drake');
    if (!o || !barn) return 0;
    const bild = this.ritade.get(o.id); if (bild) /** @type {any} */ (bild).setVisible?.(false);
    // Stils drake (del 3a): drake_flyger_01–02 som fladdrar, och barnet håller den sedan (barnet_drake_ner_01–02)
    const flyger = foremalsbild(this, 'drake_flyger_01') && foremalsbild(this, 'drake_flyger_02');
    const g = /** @type {any} */ (flyger ? this.add.image(0, 0, flyger.nyckel, 'drake_flyger_01').setOrigin(0.5, 0.5) : this.add.graphics()); this.lagerLuft.add(g);
    const fran = { x: o.x + o.b / 2, y: o.y + o.h / 2 }, till = { x: barn.x + barn.b / 2, y: barn.y - 6 };
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: 1800, ease: 'Sine.easeInOut', onUpdate: () => {
      // en sväng uppåt och åt sidan innan den dalar ned till barnet
      const x = Math.round(fran.x + (till.x - fran.x) * t.p + Math.sin(t.p * Math.PI * 2) * 30);
      const y = Math.round(fran.y + (till.y - fran.y) * t.p - Math.sin(t.p * Math.PI) * 40);
      if (flyger) g.setPosition(x, y).setFrame(`drake_flyger_0${1 + (Math.floor(t.p * 12) % 2)}`);
      else g.clear().fillStyle(0xe0503a, 1).fillTriangle(x, y - 5, x + 4, y, x, y + 5).fillTriangle(x, y - 5, x - 4, y, x, y + 5)
        .lineStyle(1, 0x5a4a3a, 1).lineBetween(x, y + 5, x - 2 + Math.round(Math.sin(t.p * 20) * 2), y + 11);
      this.smutsig = true;
    }, onComplete: () => {
      g.destroy(); this.smutsig = true;
      if (foremalsbild(this, 'barnet_drake_ner_01') && foremalsbild(this, 'barnet_drake_ner_02')) { this.slingaRamar('barnet_drake', ['barnet_drake_ner_01', 'barnet_drake_ner_02'], 400); return; }
      const r = /** @type {any} */ (this.ritade.get('barnet_drake')); if (r?.active) { const y0 = r.y; this.tweens.add({ targets: r, y: y0 - 3, duration: 150, yoyo: true, repeat: 3, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.y = y0; this.smutsig = true; } }); }
    } });
    this.regiLogg.push('draken flyger ned till barnet');
    return 2200;
  }

  /** Elden tänds på udden, gnistor stiger, och byborna runt elden skuttar och jublar (71.5). @returns {number} */
  eldenTands() {
    const { o } = this.foremalOchBild('lagereld');
    if (!o) return 0;
    // hjälten står bredvid elden, väster om den, inte i den eller bakom den (Stils granskning 13/11, 87.2)
    // (precis söder om elden täcker lågorna ansiktet, och väster om den står fiskaren): snett söder om den
    const vid = { x: Math.round(o.x - 4), y: Math.round(o.y + o.h + 22) };
    // 93.5: med pinnarna i valfri ordning kan han komma österifrån (ved_2) och stå i ungen: han går dit också då
    const nara = Math.abs(this.pos.x - (o.x + o.b / 2)) < o.b / 2 + 50 && this.pos.y > o.y - 24 && this.pos.y < o.y + o.h + 28;
    if (nara && Math.hypot(this.pos.x - vid.x, this.pos.y - vid.y) > 3) {
      this.ga(vid, 350).then(() => { this.vand = { x: 1, y: 0.01 }; this.ritaHjalte(); this.placera(); });
    }
    // Stils eld (steg 5 del 1): lågorna i tre bilder och ljuset runt elden, tills rummet ritas om
    if (foremalsbild(this, 'lagereld_tand_kvall_01')) {
      this.slingaRamar('lagereld', ['lagereld_tand_kvall_01', 'lagereld_tand_kvall_02', 'lagereld_tand_kvall_03'], 150);
      const ljus = foremalsbild(this, 'lagereld_ljus');
      if (ljus) this.lagerLjust.add(this.add.image(Math.round(o.x + o.b / 2), Math.round(o.y + o.h - 8), ljus.nyckel, ljus.ram).setOrigin(0.5, 0.5));
    }
    for (let i = 0; i < 12; i++) this.time.delayedCall(90 * i, () => {
      const g = this.add.rectangle(Math.round(o.x + 4 + Math.random() * (o.b - 8)), o.y + 4, 2, 2, i % 2 ? 0xffb347 : 0xffe680); this.lagerLjust.add(g);
      this.tweens.add({ targets: g, y: g.y - 18 - Math.random() * 10, alpha: 0, duration: 700, onUpdate: () => { this.smutsig = true; }, onComplete: () => g.destroy() });
    });
    this.byborJublar(400);
    this.regiLogg.push('elden tänds');
    return 2000;
  }

  /**
   * Skylten om bryggan är avslöjad (92.3, 93.5): byborna jublar, och fiskaren går ut på bryggan och fiskar, ca 4 s.
   * Fiskaren bor på andra sidan torget, så han kommer in i bild nedifrån, nära hjälten, går ut på bryggans början
   * (`brygga_fran_torget`) och kastar åt höger. Han står kvar och fiskar tills rummet ritas om. @returns {number}
   */
  brygganAvslojad() {
    this.byborJublar();
    const { o, r } = this.foremalOchBild('fiskaren');
    const bryggan = this.ruta('brygga_fran_torget') || this.ruta('stig_bryggan');
    if (!o || !r?.active || !bryggan || !foremalsbild(this, 'fiskaren_ga_hoger_01')) { this.regiLogg.push('bryggan avslöjad'); return 1400; }
    const k = this.kamera;
    const mal = { x: Math.round(bryggan.x + 8), y: Math.round(bryggan.y + bryggan.h) };
    // in i bild nedifrån, en bit till vänster om bryggan (där han inte står nu om han är långt bort)
    const iBild = r.x > k.x && r.x < k.x + RUM.bredd && r.y > k.y && r.y < k.y + RUM.hojd + 24;
    const start = iBild ? { x: r.x, y: r.y } : { x: Math.round(Math.max(k.x + 16, mal.x - 70)), y: Math.round(k.y + RUM.hojd + 26) };
    r.setPosition(start.x, start.y);
    const ga = Math.min(2600, Math.max(1200, (Math.hypot(mal.x - start.x, mal.y - start.y) / 45) * 1000));
    const rikt = Math.abs(mal.x - start.x) > Math.abs(mal.y - start.y) ? (mal.x > start.x ? 'hoger' : 'vanster') : (mal.y > start.y ? 'ner' : 'upp');
    const fore = 500; // han jublar en kort stund med de andra först
    const t = { p: 0 };
    this.time.delayedCall(fore, () => {
      if (!r.active) return;
      this.regiRamar('fiskaren', [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4].slice(0, Math.max(4, Math.round(ga / 150))).map((n) => `fiskaren_ga_${rikt}_0${n}`), 150);
      this.tweens.add({ targets: t, p: 1, duration: ga, onUpdate: () => { if (!r.active) return; r.x = Math.round(start.x + (mal.x - start.x) * t.p); r.y = Math.round(start.y + (mal.y - start.y) * t.p); r.fot = r.y; this.smutsig = true; } });
    });
    // på bryggan: han kastar ut reven och står och fiskar
    this.time.delayedCall(fore + ga + 50, () => {
      if (!r.active) return;
      const fb = foremalsbild(this, 'fiskaren_fiskar_hoger_01');
      if (fb) { r.setPosition(mal.x, mal.y); this.slingaRamar('fiskaren', ['fiskaren_fiskar_hoger_01', 'fiskaren_fiskar_hoger_02'], 500); }
      this.smutsig = true;
    });
    this.regiLogg.push('bryggan avslöjad');
    return Math.max(4000, fore + ga + 900);
  }

  // ------------------------------------------------------------------ kapitel 3 i gråbox (beslut 100.4, manus 19 v0.4.1)

  /**
   * En ring som växer och tonas bort: ett tut, ett rop eller ett plask. @param {number} x @param {number} y
   * @param {number} r0 @param {number} r1 @param {number} farg @param {number} ms @param {number} [sen] @param {any} [lager]
   */
  k3Ring(x, y, r0, r1, farg, ms, sen = 0, lager = this.lagerLjust) {
    const g = this.add.graphics(); lager.add(g);
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: ms, delay: sen, onUpdate: () => {
      if (!g.active) return;
      g.clear().lineStyle(1, farg, 1 - t.p).strokeCircle(Math.round(x), Math.round(y), r0 + (r1 - r0) * t.p); this.smutsig = true;
    }, onComplete: () => { g.destroy(); this.smutsig = true; } });
  }

  /**
   * Stils bilder i följd på en plats (mjölmolnet, plasket), nederkanten mitt på (x, y), ms per bild. Den sista står
   * kvar om `kvar`, annars tas bilden bort. Saknas en bild händer inget. @param {number} x @param {number} y
   * @param {string[]} ramar @param {number} ms @param {{ kvar?: boolean, lager?: any, sen?: number }} [v] @returns {any} bilden eller null
   */
  k3Ramar(x, y, ramar, ms, v = {}) {
    const fb = ramar.map((r) => foremalsbild(this, r));
    if (!fb.length || !fb.every(Boolean)) return null;
    const f0 = /** @type {{ nyckel: string, ram: string }} */ (fb[0]);
    const img = this.add.image(Math.round(x), Math.round(y), f0.nyckel, f0.ram).setOrigin(0.5, 1).setVisible(!v.sen);
    (v.lager || this.lagerLjust).add(img);
    const sen = v.sen || 0;
    fb.forEach((f, i) => this.time.delayedCall(sen + i * ms, () => { if (img.active && f) { img.setVisible(true).setTexture(f.nyckel, f.ram); this.smutsig = true; } }));
    if (!v.kvar) this.time.delayedCall(sen + fb.length * ms, () => { if (img.active) img.destroy(); this.smutsig = true; });
    return img;
  }

  /**
   * Kartbit 3 i närbild (k3s01): ett papper mitt i bilden med floden och en liten ö som ringas in. Sedan floden igen:
   * på vattnet där ön borde ligga sprider sig bara två tomma ringar. @returns {number}
   */
  kartbit3On() {
    const k = this.kamera, mx = Math.round(k.x + RUM.bredd / 2), my = Math.round(k.y + RUM.hojd / 2);
    const smuts = () => { this.smutsig = true; };
    const c = this.add.container(mx, my).setAlpha(0); this.lagerLuft.add(c);
    const g = this.add.graphics();
    g.fillStyle(0xe8d9b0, 1).fillRect(-66, -42, 132, 84).lineStyle(1, 0x8a6a48, 1).strokeRect(-66, -42, 132, 84);
    g.fillStyle(0x6f9fc8, 1).fillRect(-66, -12, 132, 24).fillStyle(0x5f9a4a, 1).fillCircle(0, 0, 7);
    const ring = this.add.graphics();
    c.add([g, ring]);
    const t = { p: 0 };
    this.tweens.add({ targets: c, alpha: 1, duration: 300, onUpdate: smuts });
    this.tweens.add({ targets: t, p: 1, duration: 1600, delay: 300, onUpdate: () => { if (ring.active) ring.clear().lineStyle(1, 0xc0392b, 1).strokeCircle(0, 0, 11 + Math.sin(t.p * Math.PI * 4) * 2); smuts(); } });
    this.tweens.add({ targets: c, alpha: 0, duration: 300, delay: 2100, onUpdate: smuts, onComplete: () => { c.destroy(); smuts(); } });
    const vatten = { x: mx, y: Math.round(Math.min(this.storlek.hojd - 28, k.y + RUM.hojd - 32)) };
    this.k3Ring(vatten.x, vatten.y, 3, 24, 0xf2fbff, 900, 2500);
    this.k3Ring(vatten.x, vatten.y, 3, 24, 0xf2fbff, 900, 2950);
    this.regiLogg.push('kartbit 3 visar ön');
    return 3900;
  }

  /** Loftet (k3s02_loftet): kameran på hornet, som är fullt av mjöl, och mässingen blänker en gång. @returns {number} */
  loftetHorn() {
    const h = this.ruta('hornet');
    if (!h) return 0;
    if (!this.ruta('lucka_floden')) return this.hornetNarbild(h);
    const smuts = () => { this.smutsig = true; };
    this.regiFokus = { x: h.x + h.b / 2, y: h.y + h.h / 2 };
    this.k3Mjol?.destroy();
    const g = this.add.graphics(); this.lagerLjust.add(g); this.k3Mjol = g;
    g.fillStyle(0xf4f1e8, 1);
    for (let i = 0; i < 14; i++) g.fillRect(h.x + 4 + ((i * 7) % (h.b - 8)), h.y + 4 + ((i * 5) % (h.h - 8)), 2, 2);
    const b = this.add.rectangle(h.x + 2, h.y + 2, 3, h.h - 4, 0xfff6c8, 0.9).setOrigin(0, 0); this.lagerLjust.add(b);
    this.tweens.add({ targets: b, x: h.x + h.b - 5, alpha: 0, duration: 900, delay: 300, onUpdate: smuts, onComplete: () => b.destroy() });
    this.time.delayedCall(1700, () => { this.regiFokus = null; });
    this.regiLogg.push('hornet fullt av mjöl');
    return 1800;
  }

  /**
   * Det första tutet (k3s02_loftet): ringar från hornet, mjölet blåser ut genom luckan i ett vitt moln, det bubblar
   * långt ute, och en jättelik skugga glider fram under vattnet i luckan, stannar och sjunker. @returns {number}
   */
  skugganLyssnar() {
    const h = this.ruta('hornet'), l = this.ruta('lucka_floden');
    if (h && !l && this.utsiktsPunkt('hornet')) return this.skugganIFloden(h);
    if (!h || !l) return 0;
    const smuts = () => { this.smutsig = true; };
    this.k3Mjol?.destroy(); this.k3Mjol = null;
    const hx = h.x + h.b / 2, hy = h.y + h.h / 2;
    // Stils mjölmoln ur klockan (hornets högra ände, mot luckan), om det finns
    const moln = this.k3Ramar(h.x + h.b - 14, h.y + h.h - 6, ['mjolmoln_01', 'mjolmoln_02', 'mjolmoln_03'], 220, { lager: this.lagerLuft });
    for (let i = 0; i < 3; i++) this.k3Ring(hx, hy, 6, 44, 0xfff2a8, 900, i * 260);
    for (let i = 0; i < (moln ? 0 : 16); i++) {
      const d = this.add.rectangle(hx + (i % 4) * 3 - 6, hy + Math.floor(i / 4) * 3 - 6, 2, 2, 0xf4f1e8); this.lagerLuft.add(d);
      this.tweens.add({ targets: d, x: l.x + 8 + ((i * 13) % (l.b - 16)), y: l.y + 6 + ((i * 7) % 16), alpha: 0, duration: 900 + (i % 5) * 80, delay: 150 + i * 20, onUpdate: smuts, onComplete: () => d.destroy() });
    }
    const vy = l.y + l.h - 14;
    for (let i = 0; i < 4; i++) this.k3Ring(l.x + l.b * 0.7 + (i % 2) * 5, vy - (i % 2) * 3, 1, 4, 0xf2fbff, 500, 1300 + i * 220);
    const s = this.add.ellipse(l.x + 8, vy, 30, 9, 0x1b2b3a, 0); this.lagerLjust.add(s);
    this.tweens.add({ targets: s, x: l.x + l.b / 2, fillAlpha: 0.75, duration: 1400, delay: 1900, ease: 'Sine.easeOut', onUpdate: smuts });
    this.tweens.add({ targets: s, fillAlpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 900, delay: 4200, onUpdate: smuts, onComplete: () => { s.destroy(); smuts(); } });
    this.regiLogg.push('skuggan lyssnar');
    return 5200;
  }

  /**
   * Ungen tror att det är mamma (k3s03_hornet): den spetsar öronen, tar sats och hoppar ut genom luckan, PLASK, och ett
   * litet huvud simmar ut mot bubblorna. Ungen syns inte i loftet efteråt (den är i floden) tills rummet byts.
   * @returns {number}
   */
  ungeSimmar() {
    if (!this.ruta('lucka_floden') && this.utsiktsPunkt('hornet')) return this.ungeHopparFranAvsatsen();
    const l = this.ruta('lucka_floden');
    if (!l || !this.ungeBild || !this.unge.visible) return 0;
    const kant = { x: Math.round(l.x + l.b / 2), y: Math.round(l.y + l.h + 2) }, vy = l.y + l.h - 12;
    this.hallUngen(this.ungePos.x, this.ungePos.y);
    this.ungeReagerar(true);
    this.time.delayedCall(600, () => {
      this.ungeLage('hopp', kant.x >= this.ungePos.x ? 'hoger' : 'vanster', 217, 1);
      this.ungeBage(kant, 600, 22, () => {
        this.k3UngeIVattnet = true; this.unge.setVisible(false);
        // PLASK (Stils effekt_plask_01–03), och ungen som simmar ut mot bubblorna (unge1_simmar_hoger_01–02)
        if (!this.k3Ramar(kant.x, vy + 6, ['effekt_plask_01', 'effekt_plask_02', 'effekt_plask_03'], 140)) { this.k3Ring(kant.x, vy, 2, 10, 0xf2fbff, 500); this.k3Ring(kant.x, vy, 2, 15, 0xf2fbff, 600, 120); }
        const sim = ['unge1_simmar_hoger_01', 'unge1_simmar_hoger_02'].map((r) => foremalsbild(this, r));
        const u = sim.every(Boolean)
          ? this.add.image(kant.x, vy + 8, /** @type {any} */ (sim[0]).nyckel, /** @type {any} */ (sim[0]).ram).setOrigin(0.5, 1).setVisible(false)
          : this.add.circle(kant.x, vy, 3, 0x7fbf5a);
        this.lagerLjust.add(u);
        this.time.delayedCall(400, () => { if (u.active) u.setVisible(true); });
        const y0 = u.y;
        this.tweens.add({ targets: u, x: l.x + l.b - 12, duration: 1800, delay: 400, ease: 'Sine.easeInOut', onUpdate: () => {
          u.y = y0 + Math.round(Math.sin(u.x / 4));
          const f = sim[Math.floor(this.time.now / 250) % 2];
          if (f && /** @type {any} */ (u).setTexture) /** @type {any} */ (u).setTexture(f.nyckel, f.ram);
          this.smutsig = true;
        } });
      });
    });
    this.regiLogg.push('ungen simmar');
    return 3200;
  }

  /**
   * Sköldpaddans huvud (k3s04_on): vattnet forsar, och ett stort rynkigt huvud lyfts upp ur floden vid öns södra kant.
   * Det vänder sig långsamt mot ungen och står kvar tills rummet byts. @returns {number}
   */
  skoldpaddaHuvud() {
    const smuts = () => { this.smutsig = true; };
    this.regiLjud('skoldpadda_rop', 600);
    const x = Math.round(Math.min(this.storlek.bredd - 40, Math.max(40, this.pos.x + 30))), y0 = this.storlek.hojd + 22, y1 = this.storlek.hojd - 14;
    this.k3Huvud?.destroy();
    const c = this.add.container(x, y0); this.lagerLuft.add(c); this.k3Huvud = c;
    // Stils huvud ur vattnet (skoldpadda_huvud_vatten_01–02, 44 × 40) om det finns, annars gråboxens ellips
    const vatten = ['skoldpadda_huvud_vatten_01', 'skoldpadda_huvud_vatten_02'].map((r) => foremalsbild(this, r));
    const g = this.add.graphics();
    const ogon = this.add.graphics();
    if (vatten.every(Boolean)) {
      // Stils läge (LASMIG, 106.3): övre vänstra hörnet i (−40, 64) vid skalets västra kant, aldrig på gräset.
      // Halva huvudet syns i bild. Det stiger de sista 16 px ur vattnet och växlar mellan bilderna med krusningarna.
      const v0 = /** @type {any} */ (vatten[0]), v1 = /** @type {any} */ (vatten[1]);
      c.destroy(); this.k3Huvud = null;
      const bild = this.add.image(-40, 80, v0.nyckel, v0.ram).setOrigin(0, 0).setAlpha(0);
      this.lagerLuft.add(bild); this.k3Huvud = bild;
      const vaxla = this.time.addEvent({ delay: 450, loop: true, callback: () => { if (!bild.active) { vaxla.remove(); return; } bild.setTexture(bild.frame.name === v0.ram ? v1.nyckel : v0.nyckel, bild.frame.name === v0.ram ? v1.ram : v0.ram); this.smutsig = true; } });
      for (let i = 0; i < 3; i++) this.k3Ring(12, 110, 6, 40, 0xf2fbff, 800, i * 250);
      this.regiFokus = { x: 12, y: 92 };
      this.tweens.add({ targets: bild, y: 64, alpha: 1, duration: 1300, ease: 'Sine.easeOut', onUpdate: () => { bild.y = Math.round(bild.y); smuts(); } });
      this.time.delayedCall(3300, () => { this.regiFokus = null; });
      this.regiLogg.push('sköldpaddans huvud');
      return 3400;
    } else {
      g.fillStyle(0x6b7a4a, 1).fillEllipse(0, 0, 46, 30).fillStyle(0x4f5c36, 1).fillEllipse(-10, -7, 12, 6).fillEllipse(11, 5, 9, 5);
      ogon.fillStyle(0x111111, 1).fillCircle(-9, -5, 2).fillCircle(9, -5, 2);
      c.add([g, ogon]);
    }
    for (let i = 0; i < 3; i++) this.k3Ring(x, y1 + 6, 6, 40, 0xf2fbff, 800, i * 250);
    this.regiFokus = { x, y: y1 - 30 };
    this.tweens.add({ targets: c, y: y1, duration: 1300, ease: 'Sine.easeOut', onUpdate: smuts });
    const mot = Math.sign(this.ungePos.x - x) || 1;
    this.tweens.add({ targets: c, x: x + mot * 6, duration: 1000, delay: 1600, ease: 'Sine.easeInOut', onUpdate: smuts });
    this.tweens.add({ targets: ogon, x: mot * 2, duration: 600, delay: 1700, onUpdate: smuts });
    this.time.delayedCall(3300, () => { this.regiFokus = null; });
    this.regiLogg.push('sköldpaddans huvud');
    return 3400;
  }

  /** Farfars tecken under snäckorna (k3s04_on): en rad med elva tecken som syns ett i taget, kompassrosen först. @returns {number} */
  skyltTecken() {
    // under snäckorna, eller under skylten om snäckorna inte står i rummet
    const sn = ['snacka_1', 'snacka_2', 'snacka_3', 'snacka_4'].map((id) => this.ruta(id)).filter(Boolean);
    const s = sn.length ? { x: Math.min(...sn.map((o) => o.x)), y: Math.min(...sn.map((o) => o.y)), b: 0, h: 0 } : this.ruta('skylt_skal');
    if (!s) return 0;
    if (sn.length) { s.b = Math.max(...sn.map((o) => o.x + o.b)) - s.x; s.h = Math.max(...sn.map((o) => o.y + o.h)) - s.y; }
    const y = Math.round(s.y + s.h + 4);
    const platser = [0, 7, 13, 19, 25, 31, 40, 46, 52, 58, 64], x0 = Math.round(s.x + s.b / 2 - 34);
    const g = this.add.graphics(); this.lagerLjust.add(g);
    const t = { n: 0 };
    this.regiFokus = { x: s.x + s.b / 2, y };
    this.tweens.add({ targets: t, n: platser.length, duration: 1400, onUpdate: () => {
      if (!g.active) return;
      g.clear();
      for (let i = 0; i < Math.floor(t.n); i++) {
        const px = x0 + platser[i];
        if (i === 0) g.lineStyle(1, 0xb8862b, 1).strokeCircle(px + 2, y + 2, 3).lineBetween(px + 2, y - 2, px + 2, y + 6).lineBetween(px - 2, y + 2, px + 6, y + 2);
        else g.fillStyle(0x3a3129, 1).fillRect(px, y, 4, 5);
      }
      this.smutsig = true;
    } });
    this.time.delayedCall(1800, () => { this.regiFokus = null; });
    this.regiLogg.push('Farfars tecken');
    return 1900;
  }

  /**
   * Sköldpaddan visar berget (k3s05_sandbanken): huvudet puffar försiktigt på ungen, vänder sig sedan nedströms, och
   * långt borta syns ett berg som ryker. Ungen reser sig och viftar. @returns {number}
   */
  /** En bild till en regi: föremålens och figurernas atlas, och effekterna (SKÖLD, 109.5). @param {string} n */
  regiram(n) {
    return foremalsbild(this, n) ?? (this.textures.exists('effekter') && this.textures.get('effekter').has(n) ? { nyckel: 'effekter', ram: n } : null);
  }

  /** Var hjälten och ungen står tillsammans: mitt emellan dem, på marken. */
  mittMellan() {
    const u = this.unge.visible ? this.ungePos : this.pos;
    return { x: Math.round((this.pos.x + u.x) / 2), y: Math.round(Math.max(this.pos.y, u.y)) };
  }

  /**
   * En bild i världen som byter bild i en följd (Stils bilder i en regi). @param {string[]} namn bilderna i ordning
   * @param {number} x @param {number} y nederkanten mitt @param {number} ms per bild @param {Phaser.GameObjects.Container} [lager]
   * @returns {Phaser.GameObjects.Image | null}
   */
  regibild(namn, x, y, ms, lager = this.lagerFigurer) {
    const b = namn.map((n) => this.regiram(n));
    if (!b.every(Boolean)) return null;
    const b0 = /** @type {any} */ (b[0]);
    const img = this.add.image(Math.round(x), Math.round(y), b0.nyckel, b0.ram).setOrigin(0.5, 1); lager.add(img);
    b.slice(1).forEach((f, i) => this.time.delayedCall(ms * (i + 1), () => { if (img.active) { img.setTexture(/** @type {any} */ (f).nyckel, /** @type {any} */ (f).ram); this.smutsig = true; } }));
    this.smutsig = true;
    return img;
  }

  /**
   * Ankaret faller (109.5, Stils ankare_faller_01–02 och ankare): från luftskeppet ned mot hjälten och ungen, och
   * stannar i luften ovanför dem. Ankaret i sanden syns inte förrän det har borrat ned sig (skold_ankaret).
   * @returns {number}
   */
  /**
   * Baronen kommer (113.4): luftskeppet glider in över hjälten, och baronen håller kikaren åt rätt håll och tittar
   * (Stils luftskepp_glider och luftskepp_ser_hjalten). Skeppet står kvar tills duellens skepp med repstegen tar över.
   * @returns {number}
   */
  baronenKommer() {
    if (!this.luftskepp('glider', this.pos.x)) return 0;
    // ankaret hänger under skeppet tills det faller: det ligger inte i sanden förrän det har borrat ned sig
    if (this.ruta('ankare')) this.gomForemal('ankare', true);
    const l = /** @type {any} */ (this.luft);
    // han håller kikaren rätt (Stils luftskepp_ser_kartan, kikaren ned mot det han ser), också medan skeppet glider in:
    // i glider_01–02 håller han den åt fel håll, och det skämtet kommer bara ibland (38.5)
    if (this.textures.get('baronen').has('luftskepp_ser_kartan')) { for (const t of l.tider) t.remove(); l.tider = []; l.img.setFrame('luftskepp_ser_kartan'); this.smutsig = true; }
    this.regiLjud('luftskepp');
    this.regiLogg.push('baronen kommer och tittar i kikaren');
    return 3200;
  }

  /**
   * Flaskan är ett fynd (113.3): hjälten håller upp den över huvudet (Stils hjalte_fira_ner_02 och flaskan ur rummet),
   * och den glimtar. Närbilden med kartbiten genom glaset (bildkortet flaska_kartbit) visar spel.js på läsplattan.
   * @returns {number}
   */
  flaskanHittad() {
    const f = foremalsbild(this, 'flaska');
    if (!this.harRum || !f) return 0;
    const kvar = this.hjaltePose;
    this.sattPose('hjalte_fira_ner_02');
    const img = this.add.image(Math.round(this.pos.x), Math.round(this.pos.y - 25), f.nyckel, f.ram).setOrigin(0.5, 1);
    this.lagerLjust.add(img); this.lagda.push(img);
    this.regiLjud('glitter');
    this.tweens.add({ targets: img, alpha: { from: 1, to: 0.55 }, duration: 160, yoyo: true, repeat: 3, delay: 300, onUpdate: () => { this.smutsig = true; } });
    this.time.delayedCall(1300, () => { img.destroy(); if (this.hjaltePose === 'hjalte_fira_ner_02') this.sattPose(kvar); this.smutsig = true; });
    this.regiLogg.push('hjälten håller upp flaskan');
    return 1300;
  }

  ankaretFaller() {
    if (!foremalsbild(this, 'ankare_faller_01') || !foremalsbild(this, 'ankare')) return 0;
    this.gomForemal('ankare', true);
    this.k3Ankare?.destroy();
    // 113.2: ankaret räknas från där hjälten står när regin börjar. Står ungen långt bort (den följer inte medan världen
    // står still) går den fram till honom först, så att ankaret och bubblan hamnar över dem båda och inte mittemellan
    const vant = this.ungePos.x <= this.pos.x ? -14 : 14;
    const intill = { x: this.pos.x + vant, y: this.pos.y };
    const langt = this.unge.visible && Math.hypot(this.ungePos.x - this.pos.x, this.ungePos.y - this.pos.y) > 28;
    const vanta = langt ? this.ungeGarTill(intill) : 0;
    const u = langt ? intill : (this.unge.visible ? this.ungePos : this.pos);
    const m = { x: Math.round((this.pos.x + u.x) / 2), y: Math.round(Math.max(this.pos.y, u.y)) };
    this.k3AnkareMitt = m;
    const stopp = m.y - 34;
    const img = this.regibild(['ankare_faller_01', 'ankare_faller_02', 'ankare_faller_01', 'ankare_faller_02', 'ankare_faller_01', 'ankare_faller_02'], m.x, this.kamera.y - 4, 120);
    if (!img) return 0;
    this.k3Ankare = img; this.lagda.push(img);
    img.setVisible(!vanta);
    this.time.delayedCall(vanta, () => {
      if (!img.active) return;
      img.setVisible(true);
      this.regiLjud('sus');
      this.tweens.add({ targets: img, y: stopp, duration: 700, ease: 'Quad.easeIn', onUpdate: () => { this.smutsig = true; },
        onComplete: () => { const f = /** @type {any} */ (foremalsbild(this, 'ankare')); if (img.active) { img.setTexture(f.nyckel, f.ram); this.smutsig = true; } } });
      // ankaret hänger och gungar lite i repet
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 700, delay: 800, yoyo: true, repeat: 2, onUpdate: () => { this.smutsig = true; } });
    });
    this.regiLogg.push(langt ? 'ankaret faller och stannar (ungen går först fram till hjälten)' : 'ankaret faller och stannar');
    this.b.logg?.handelse('regi', `ankaret över ${m.x},${m.y}`, { hjalte: { x: Math.round(this.pos.x), y: Math.round(this.pos.y) } });
    return 1600 + vanta;
  }

  /**
   * Ungen går till en plats medan världen står still (113.2), med sin gång. @param {{x:number,y:number}} till
   * @returns {number} hur länge det tar (ms)
   */
  ungeGarTill(till) {
    const fran = { ...this.ungePos }, l = Math.hypot(till.x - fran.x, till.y - fran.y);
    if (l < 1) return 0;
    const ms = Math.round((l / 90) * 1000), t = { p: 0 };
    let forra = 0;
    this.ungeVand = { x: (till.x - fran.x) / l, y: (till.y - fran.y) / l };
    this.tweens.add({ targets: t, p: 1, duration: ms, onUpdate: () => {
      this.ungePos = { x: fran.x + (till.x - fran.x) * t.p, y: fran.y + (till.y - fran.y) * t.p };
      this.ungeGang = (this.ungeGang || 0) + (t.p - forra) * l; forra = t.p; this.ungeGar = true;
      if (this.ungeBild && this.unge.visible) this.ritaUngen();
      this.placera(); this.smutsig = true;
    }, onComplete: () => {
      this.ungeGar = false; this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 };
      if (this.ungeBild && this.unge.visible) this.ritaUngen();
      this.placera(); this.smutsig = true;
    } });
    return ms;
  }

  /**
   * SKÖLD tänds (109.5): regnbågsgnistan, ringen och bubblan runt hjälten och ungen (skold_tands_01–03), sedan står
   * bubblan kvar (skold_bubbla_01–02). Ankaret faller igen och slår i bubblan (skold_pang), studsar åt sidan
   * (ankare_studsar_01–03) och borrar ned sig vid kartans ankare (ankare_borrar_01–02, sedan ankaret i sanden).
   * @returns {number}
   */
  skoldAnkaret() {
    if (!this.regiram('skold_tands_01') || !this.regiram('skold_bubbla_01')) return 0;
    // 113.2: samma plats som ankaret räknades från, där han stod när det föll
    const m = this.k3AnkareMitt || this.mittMellan();
    const tand = this.regibild(['skold_tands_01', 'skold_tands_02', 'skold_tands_03'], m.x, m.y + 2, 150, this.lagerLjust);
    if (!tand) return 0;
    this.lagda.push(tand);
    this.regiLjud('glitter');
    // bubblan står kvar och skimrar (minst 400 ms per bild) tills rummet byts eller duellen är vunnen
    this.time.delayedCall(450, () => {
      tand.destroy();
      this.k3Bubbla?.destroy();
      const b = this.regibild(['skold_bubbla_01'], m.x, m.y + 2, 0, this.lagerLjust);
      if (!b) return;
      this.k3Bubbla = b; this.lagda.push(b);
      let nr = 0;
      const ev = this.time.addEvent({ delay: 450, loop: true, callback: () => {
        if (!b.active) { ev.remove(); return; }
        nr = 1 - nr; const f = /** @type {any} */ (this.regiram(nr ? 'skold_bubbla_02' : 'skold_bubbla_01')); b.setTexture(f.nyckel, f.ram); this.smutsig = true;
      } });
    });
    // ankaret: från där det hänger (eller ovanför bilden) ned på bubblans topp
    const topp = m.y + 2 - 44;
    let a = this.k3Ankare?.active ? this.k3Ankare : null;
    if (!a) { a = this.regibild(['ankare'], m.x, this.kamera.y - 4, 0); if (!a) return 1200; this.lagda.push(a); }
    this.k3Ankare = a;
    const anka = /** @type {Phaser.GameObjects.Image} */ (a);
    this.tweens.killTweensOf(anka); anka.setAngle(0);
    const mal = this.ruta('ankare');
    const ut = mal ? { x: mal.x + mal.b / 2, y: mal.y + mal.h } : { x: m.x - 48, y: m.y };
    this.tweens.add({ targets: anka, y: topp + 4, duration: 260, delay: 700, ease: 'Quad.easeIn', onUpdate: () => { this.smutsig = true; }, onComplete: () => {
      const pang = this.regibild(['skold_pang_01', 'skold_pang_02'], m.x, topp + 10, 120, this.lagerLjust);
      if (pang) { this.lagda.push(pang); this.time.delayedCall(320, () => pang.destroy()); }
      this.regiLjud('boing');
      // studsar i en båge åt sidan, ett kvarts varv per bild
      const st = ['ankare_studsar_01', 'ankare_studsar_02', 'ankare_studsar_03'].map((n) => foremalsbild(this, n));
      st.forEach((f, i) => this.time.delayedCall(100 * i, () => { if (f && anka.active) { anka.setTexture(/** @type {any} */ (f).nyckel, /** @type {any} */ (f).ram); this.smutsig = true; } }));
      const fran = { x: anka.x, y: anka.y };
      this.tweens.addCounter({ from: 0, to: 1, duration: 600, onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        anka.x = fran.x + (ut.x - fran.x) * t; anka.y = fran.y + (ut.y - fran.y) * t - Math.sin(Math.PI * t) * 30; this.smutsig = true;
      }, onComplete: () => {
        // borrar ned sig, och sedan är det kartans ankare i sanden
        const bor = ['ankare_borrar_01', 'ankare_borrar_02'].map((n) => foremalsbild(this, n));
        anka.setAngle(0);
        bor.forEach((f, i) => this.time.delayedCall(140 * i, () => { if (f && anka.active) { anka.setTexture(/** @type {any} */ (f).nyckel, /** @type {any} */ (f).ram); this.smutsig = true; } }));
        this.regiLjud('duns');
        this.time.delayedCall(320, () => { anka.destroy(); this.k3Ankare = null; this.gomForemal('ankare', false); this.smutsig = true; });
      } });
    } });
    this.regiLogg.push('SKÖLD tänds, och ankaret studsar och borrar ned sig');
    return 2200;
  }

  /**
   * SKÖLD parerar baronens paraply i duellen (109.7): bubblan blänker till om den står kvar, annars tänds den en kort
   * stund runt hjälten och ungen (skold_tands_01–03).
   */
  skoldParerar() {
    const b = this.k3Bubbla;
    if (b?.active) { this.tweens.add({ targets: b, alpha: { from: 0.4, to: 1 }, duration: 250, onUpdate: () => { this.smutsig = true; } }); this.regiLogg.push('SKÖLD parerar'); return; }
    const m = this.mittMellan();
    const img = this.regibild(['skold_tands_01', 'skold_tands_02', 'skold_tands_03'], m.x, m.y + 2, 120, this.lagerLjust);
    if (!img) return;
    this.lagda.push(img);
    this.tweens.add({ targets: img, alpha: 0, duration: 250, delay: 400, onUpdate: () => { this.smutsig = true; }, onComplete: () => img.destroy() });
    this.regiLogg.push('SKÖLD parerar');
  }

  skoldpaddaVisarBerget() {
    const { o, r } = this.foremalOchBild('skoldpadda_huvud');
    if (!o || !r?.active) return 0;
    const smuts = () => { this.smutsig = true; };
    // kramen (Stils hjalte_kramar_unge_ner_01–02, 24 × 28): hjälten och ungen blir en bild en stund
    const kram = ['hjalte_kramar_unge_ner_01', 'hjalte_kramar_unge_ner_02'].map((n) => foremalsbild(this, n));
    if (kram.every(Boolean) && this.unge.visible) {
      const k0 = /** @type {any} */ (kram[0]), k1 = /** @type {any} */ (kram[1]);
      const tex = k0.nyckel === 'hjalte' ? this.hjalteTextur || 'hjalte' : k0.nyckel;
      const img = this.add.image(Math.round((this.pos.x + this.ungePos.x) / 2), Math.round(Math.max(this.pos.y, this.ungePos.y)), tex, k0.ram).setOrigin(0.5, 1);
      this.lagerFigurer.add(img);
      this.hjalte.setVisible(false); this.unge.setVisible(false);
      this.time.delayedCall(500, () => { if (img.active) { img.setTexture(tex, k1.ram); smuts(); } });
      this.time.delayedCall(1300, () => { img.destroy(); this.hjalte.setVisible(true); this.unge.setVisible(this.harRum && this.visaUnge); smuts(); });
      this.regiLogg.push('kramen');
    }
    const hem = { x: r.x, y: r.y };
    const dx = Math.sign(this.ungePos.x - (o.x + o.b / 2)) * 6, dy = Math.sign(this.ungePos.y - (o.y + o.h / 2)) * 4;
    this.tweens.add({ targets: r, x: hem.x + dx, y: hem.y + dy, duration: 400, yoyo: true, hold: 250, onUpdate: smuts });
    this.tweens.add({ targets: r, x: hem.x - 6, duration: 700, delay: 1400, onUpdate: smuts });
    const k = this.kamera, bx = Math.round(k.x + 26), by = Math.round(k.y + 34);
    // berget som ryker långt bort (109.8, Stils berget_ryker_01–03, 48 × 40): foten där gråboxens triangel hade sin
    // bas, och röken stiger i bilderna (ca 400 ms per bild). Utan Stils bild står gråboxens triangel och rök
    const bergBilder = ['berget_ryker_01', 'berget_ryker_02', 'berget_ryker_03'].map((n) => foremalsbild(this, n));
    if (bergBilder.every(Boolean)) {
      const b0 = /** @type {any} */ (bergBilder[0]);
      // 112.2: foten i vattnet uppe till vänster, längre ut i hörnet än gråboxens triangel (toppen ryms fortfarande i bild)
      const img = this.add.image(Math.round(k.x + 13), Math.round(k.y + 40), b0.nyckel, b0.ram).setOrigin(0.5, 1).setAlpha(0); this.lagerLuft.add(img); this.lagda.push(img); // står kvar tills rummet byts
      this.tweens.add({ targets: img, alpha: 1, duration: 600, delay: 1600, onUpdate: smuts });
      let nr = 0;
      const ev = this.time.addEvent({ delay: 400, loop: true, callback: () => { if (!img.active) { ev.remove(); return; } nr = (nr + 1) % 3; const b = /** @type {any} */ (bergBilder[nr]); img.setTexture(b.nyckel, b.ram); smuts(); } });
      this.regiLogg.push('berget: Stils bild');
      this.time.delayedCall(2700, () => this.ungeReagerar(true));
      this.time.delayedCall(3300, () => this.ungeReagerar(true));
      this.regiLogg.push('sköldpaddan visar berget');
      return 4000;
    }
    const berg = this.add.graphics().setAlpha(0); this.lagerLuft.add(berg); this.lagda.push(berg);
    berg.fillStyle(0x6d6a72, 1).fillTriangle(bx - 16, by + 12, bx + 16, by + 12, bx, by - 8).fillStyle(0x3a3129, 1).fillRect(bx - 3, by - 8, 6, 2);
    this.tweens.add({ targets: berg, alpha: 1, duration: 600, delay: 1600, onUpdate: smuts });
    for (let i = 0; i < 6; i++) {
      const d = this.add.circle(bx, by - 10, 3, 0x9a979e).setAlpha(0); this.lagerLuft.add(d);
      this.tweens.add({ targets: d, y: by - 30, x: bx + 4 + (i % 2) * 3, alpha: { from: 0.8, to: 0 }, duration: 1200, delay: 1900 + i * 300, onUpdate: smuts, onComplete: () => d.destroy() });
    }
    this.time.delayedCall(2700, () => this.ungeReagerar(true));
    this.time.delayedCall(3300, () => this.ungeReagerar(true));
    this.regiLogg.push('sköldpaddan visar berget');
    return 4000;
  }

  /**
   * Säckhissen (101.3): hjälten och ungen kliver upp på hissens plattform, och den lyfter dem upp genom hålet i taket
   * (kvarnen, riktning -1) eller sänker dem ned genom golvet (loftet, 1). De tonas bort på vägen, och repen syns. Efter
   * regin står de inte kvar i rummet: nästa scen är i det andra rummet, där de syns igen. @param {number} riktning
   * @returns {number}
   */
  sackhiss(riktning) {
    // på avsatsen i flodrummet (102.3) står hissen inne i kvarnen bakom dörren ut till avsatsen (regi_hiss)
    if (riktning > 0 && this.regiPunkter.hiss) return this.hissGenomDorren(this.regiPunkter.hiss);
    this.regiLjud('sackhiss');
    const h = this.ruta('sackhiss');
    if (!h) return 0;
    const smuts = () => { this.placera(); this.smutsig = true; };
    const mitt = { x: Math.round(h.x + h.b / 2), y: Math.round(h.y + h.h - 3) };
    const fran = { ...this.pos }, ufran = { ...this.ungePos };
    // nästa scen kan vara i ett annat rum innan hissen är framme (snabbläget i testerna): då flyttas han inte mer
    const rummet = this.rumId, kvar = () => this.rumId === rummet;
    const visas = this.unge.visible;
    if (visas) this.hallUngen(this.ungePos.x, this.ungePos.y);
    // 1. de kliver upp på plattformen (0,6 s)
    const t1 = { p: 0 };
    this.tweens.add({ targets: t1, p: 1, duration: 600, ease: 'Sine.easeInOut', onUpdate: () => {
      if (!kvar()) return;
      this.pos = { x: fran.x + (mitt.x - 5 - fran.x) * t1.p, y: fran.y + (mitt.y - fran.y) * t1.p };
      if (visas) this.ungePos = { x: ufran.x + (mitt.x + 8 - ufran.x) * t1.p, y: ufran.y + (mitt.y - ufran.y) * t1.p };
      smuts();
    } });
    // plattformen och repen i gråbox (Stils `sackhiss` står i kartan när rummen är ritade)
    const g = this.add.graphics(); this.lagerLjust.add(g);
    const vag = 52 * riktning;
    const rita = (/** @type {number} */ dy) => {
      if (!g.active) return;
      const y = Math.round(mitt.y + 1 + dy);
      g.clear().fillStyle(0x8a6a48, 1).fillRect(h.x + 2, y, h.b - 4, 4).lineStyle(1, 0xd8c79a, 1)
        .lineBetween(h.x + 4, h.y - 60, h.x + 4, y).lineBetween(h.x + h.b - 4, h.y - 60, h.x + h.b - 4, y);
    };
    rita(0);
    // 2. hissen åker (1,4 s), och de tonas bort sista halvan
    const t2 = { p: 0 };
    this.tweens.add({ targets: t2, p: 1, duration: 1400, delay: 650, ease: 'Sine.easeIn', onUpdate: () => {
      if (!kvar()) { g.destroy(); return; }
      const dy = vag * t2.p;
      this.pos = { x: mitt.x - 5, y: mitt.y + dy };
      if (visas) this.ungePos = { x: mitt.x + 8, y: mitt.y + dy };
      const a = t2.p < 0.5 ? 1 : Math.max(0, 1 - (t2.p - 0.5) * 2);
      this.hjalte.setAlpha(a); this.unge.setAlpha(a); g.setAlpha(a);
      rita(dy); smuts();
    } });
    // han åker med hissen ut ur rummet: i nästa rum kommer han ut där hissen kommer upp (regi_hiss)
    this.k3IHissen = true;
    this.regiLogg.push(riktning < 0 ? 'säckhissen upp' : 'säckhissen ner');
    return 2100;
  }

  /**
   * Punkten kameran glider till när föremålet används (kartans utsikt, 102.3: hornet på avsatsen ser ut över floden
   * där ön ligger). @param {string} id @returns {{ x: number, y: number } | null}
   */
  utsiktsPunkt(id) {
    const o = this.objekt.find((x) => x.id === id);
    return (o?.utsikt && this.regiPunkter[o.utsikt]) || null;
  }

  /**
   * Kameran glider ut över floden när han tutar (102.3), så att han ser verkan. Den står kvar tills utsiktSlut eller
   * en regi tar den. @param {string} id @returns {boolean} om föremålet har en utsikt
   */
  utsikt(id) {
    const p = this.utsiktsPunkt(id);
    if (!p) return false;
    this.regiFokus = { x: p.x, y: p.y - 20 };
    this.regiLogg.push('kameran ut över floden');
    return true;
  }

  /** Kameran tillbaka till hjälten efter utsikten. */
  utsiktSlut() { this.regiFokus = null; }

  /**
   * Kameran glider till ett föremål medan en replik talar om det (2.49, 104.6), som när han tutar. I ett rum på en
   * skärm syns det redan. @param {string} id @returns {boolean} om kameran flyttades
   */
  visaForemal(id) {
    const o = this.ruta(id);
    if (!o || enSkarm(this.storlek)) return false;
    // en bild som står på en annan ruta (bild_pa: hornet på avsatsen) visas där den står
    const b = (o.bildPa && this.ruta(o.bildPa)) || o;
    this.regiFokus = { x: b.x + b.b / 2, y: b.y + b.h / 2 };
    this.regiLogg.push(`kameran visar ${id}`);
    return true;
  }

  /** Kameran tillbaka till hjälten efter repliken. */
  visaForemalSlut() { this.regiFokus = null; }

  /**
   * Hornet i närbild (102.3): på avsatsen ritas hornet ovanifrån, och Stils horn från sidan (hornet_mjol eller
   * hornet_rent efter tillståndet) visas en stund ovanför det, i en ram. @param {{ x: number, y: number, b: number, h: number }} h
   * @returns {number}
   */
  hornetNarbild(h) {
    const smuts = () => { this.smutsig = true; };
    this.regiFokus = { x: h.x + h.b / 2, y: h.y + 20 };
    const namn = this.tillstand === 'rent' || this.tillstand === 'on' || this.tillstand === 'kvall' ? 'hornet_rent' : 'hornet_mjol';
    const fb = foremalsbild(this, namn);
    const cx = Math.round(Math.min(this.storlek.bredd - 54, h.x + h.b / 2)), y1 = Math.round(h.y - 6);
    const c = this.add.container(0, 0).setAlpha(0); this.lagerLuft.add(c);
    const bild = fb ? this.add.image(cx, y1 - 4, fb.nyckel, fb.ram).setOrigin(0.5, 1) : null;
    const bb = bild ? bild.width : 60, bh = bild ? bild.height : 30;
    c.add(this.add.rectangle(cx - bb / 2 - 4, y1 - bh - 8, bb + 8, bh + 8, 0xf6ead0, 1).setOrigin(0, 0).setStrokeStyle(2, 0x6b4f2a, 1));
    if (bild) c.add(bild); else c.add(this.add.rectangle(cx - 26, y1 - 24, 52, 14, 0xc89b3c, 1).setOrigin(0, 0));
    this.tweens.add({ targets: c, alpha: 1, duration: 250, onUpdate: smuts });
    this.tweens.add({ targets: c, alpha: 0, duration: 300, delay: 1500, onUpdate: smuts, onComplete: () => { c.destroy(); smuts(); } });
    this.time.delayedCall(1800, () => { this.regiFokus = null; });
    this.regiLogg.push('hornet i närbild');
    return 1900;
  }

  /**
   * Sköldpaddans bild i floden (103.2): Stils bilder är 480 × 320 med skalets mitt i (250, 150), som läggs på punkten.
   * @param {string} ram @param {{ x: number, y: number }} p @returns {Phaser.GameObjects.Image | null}
   */
  k3Skalbild(ram, p) {
    const fb = foremalsbild(this, ram);
    if (!fb) return null;
    const img = this.add.image(p.x, p.y, fb.nyckel, fb.ram);
    img.setOrigin(250 / img.width, 150 / img.height);
    this.lagerObjekt.add(img);
    return img;
  }

  /**
   * En skugga under vattnet vid ön (102.3), i skalets storlek: Stils första bild av ön som stiger (det mörka skalet
   * under ytan, 103.2), annars gråboxens ellips. Den ligger kvar tills rummet ritas om eller en regi tar bort den.
   * @param {number} alfa @returns {any}
   */
  k3NySkugga(alfa) {
    const p = this.utsiktsPunkt('hornet');
    if (!p) return null;
    this.k3Skugga?.destroy();
    const sk = this.k3Skalbild('on_stiger_01', p) ?? this.add.ellipse(p.x, p.y, 264, 168, 0x0a1830, 1);
    if (!sk.parentContainer) this.lagerObjekt.add(sk);
    sk.setAlpha(alfa);
    this.k3Skugga = sk;
    return sk;
  }

  /**
   * Det första tutet på avsatsen (102.3): ringar från hornet och mjölmolnet, kameran glider ut över floden, det
   * bubblar, och en jättelik skugga glider fram under vattnet, stannar som om den lyssnar och sjunker. Sedan tillbaka
   * till hjälten. @param {{ x: number, y: number, b: number, h: number }} h @returns {number}
   */
  skugganIFloden(h) {
    const smuts = () => { this.smutsig = true; };
    const p = /** @type {{ x: number, y: number }} */ (this.utsiktsPunkt('hornet'));
    this.k3Mjol?.destroy(); this.k3Mjol = null;
    const hx = h.x + h.b / 2, hy = h.y + h.h / 2;
    this.k3Ramar(h.x + h.b, h.y + h.h + 6, ['mjolmoln_01', 'mjolmoln_02', 'mjolmoln_03'], 220, { lager: this.lagerLuft });
    for (let i = 0; i < 3; i++) this.k3Ring(hx, hy + 12, 6, 44, 0xfff2a8, 900, i * 260);
    // kameran glider ut över floden när mjölet har blåst (loggen säger det direkt, så att snabbläget ser det)
    this.time.delayedCall(700, () => { const q = this.utsiktsPunkt('hornet'); if (q) this.regiFokus = { x: q.x, y: q.y - 20 }; });
    this.regiLogg.push('kameran ut över floden');
    for (let i = 0; i < 5; i++) this.k3Ring(p.x - 30 + (i % 3) * 24, p.y - 10 + (i % 2) * 12, 1, 6, 0xf2fbff, 500, 1500 + i * 200);
    const sk = this.k3NySkugga(0);
    if (sk) {
      sk.x = p.x - 70;
      this.tweens.add({ targets: sk, x: p.x, alpha: 0.45, duration: 1600, delay: 1800, ease: 'Sine.easeOut', onUpdate: smuts });
      this.tweens.add({ targets: sk, alpha: 0, scaleX: 0.7, scaleY: 0.7, duration: 1000, delay: 4300, onUpdate: smuts, onComplete: () => { sk.destroy(); if (this.k3Skugga === sk) this.k3Skugga = null; smuts(); } });
    }
    this.regiLjud('skuggan', 1500);
    // efter det första tutet: en mystisk ton när skuggan glider fram (stycke_skuggan, 103.3.5)
    this.regiStycke('stycke_skuggan', 1700);
    this.time.delayedCall(5400, () => { this.regiFokus = null; });
    this.regiLogg.push('skuggan lyssnar');
    return 5600;
  }

  /**
   * Ungen tror att det är mamma (k3s03_hornet, 102.3): den tar sats på avsatsen, hoppar över räcket och kajen rakt ner
   * i floden, PLASK, och simmar ut mot bubblorna där ön ligger. Kameran följer ungen. @returns {number}
   */
  ungeHopparFranAvsatsen() {
    if (!this.ungeBild || !this.unge.visible) return 0;
    const smuts = () => { this.smutsig = true; };
    const p = /** @type {{ x: number, y: number }} */ (this.utsiktsPunkt('hornet'));
    const vatten = { x: Math.round(Math.max(360, Math.min(this.storlek.bredd - 30, this.ungePos.x - 30))), y: 214 };
    this.hallUngen(this.ungePos.x, this.ungePos.y);
    this.ungeReagerar(true);
    this.regiFokus = { x: this.ungePos.x, y: this.ungePos.y };
    this.time.delayedCall(600, () => {
      this.ungeLage('hopp', vatten.x >= this.ungePos.x ? 'hoger' : 'vanster', 217, 1);
      const fran = { ...this.ungePos }, t = { p: 0 };
      this.tweens.add({ targets: t, p: 1, duration: 900, onUpdate: () => { this.regiFokus = { x: fran.x + (vatten.x - fran.x) * t.p, y: fran.y + (vatten.y - fran.y) * t.p }; } });
      this.ungeBage(vatten, 900, 34, () => {
        this.k3UngeIVattnet = true; this.unge.setVisible(false);
        this.regiLjud('plask');
        if (!this.k3Ramar(vatten.x, vatten.y + 6, ['effekt_plask_01', 'effekt_plask_02', 'effekt_plask_03'], 140)) { this.k3Ring(vatten.x, vatten.y, 2, 10, 0xf2fbff, 500); this.k3Ring(vatten.x, vatten.y, 2, 15, 0xf2fbff, 600, 120); }
        const sim = ['unge1_simmar_hoger_01', 'unge1_simmar_hoger_02', 'unge1_simmar_vanster_01', 'unge1_simmar_vanster_02'].map((r) => foremalsbild(this, r));
        const mal = { x: p.x - 40, y: p.y - 40 };
        const at = mal.x >= vatten.x ? 0 : 2;
        const u = sim.every(Boolean)
          ? this.add.image(vatten.x, vatten.y + 8, /** @type {any} */ (sim[at]).nyckel, /** @type {any} */ (sim[at]).ram).setOrigin(0.5, 1).setVisible(false)
          : this.add.circle(vatten.x, vatten.y, 3, 0x7fbf5a);
        this.lagerLjust.add(u); this.k3Simmar = u;
        this.time.delayedCall(400, () => { if (u.active) u.setVisible(true); });
        const t2 = { p: 0 };
        this.tweens.add({ targets: t2, p: 1, duration: 2000, delay: 400, ease: 'Sine.easeInOut', onUpdate: () => {
          if (!u.active) return;
          u.x = vatten.x + (mal.x - vatten.x) * t2.p; u.y = vatten.y + 8 + (mal.y - vatten.y) * t2.p + Math.round(Math.sin(u.x / 4));
          const f = sim[at + (Math.floor(this.time.now / 250) % 2)];
          if (f && /** @type {any} */ (u).setTexture) /** @type {any} */ (u).setTexture(f.nyckel, f.ram);
          this.regiFokus = { x: u.x, y: u.y };
          smuts();
        } });
      });
    });
    this.time.delayedCall(3600, () => { this.regiFokus = { x: p.x, y: p.y - 20 }; });
    this.regiLogg.push('ungen simmar');
    return 3700;
  }

  /**
   * Tre tut är frukost (k3_hornet, 102.3): flodfolket springer fram med tallrikarna en gång till och tittar sig
   * omkring. Kameran visar pråmarna (regi_pramar). @returns {number}
   */
  tallrikar() {
    const p = this.regiPunkter.pramar;
    if (p) this.regiFokus = { x: p.x, y: p.y };
    for (const id of ['flodman', 'flodbo_frukost', 'flodbo_skrattar']) {
      if (foremalsbild(this, `${id}_tallrik_ner_01`) && foremalsbild(this, `${id}_tallrik_ner_02`)) this.regiRamar(id, [1, 2, 1, 2, 1, 2, 1, 2].map((n) => `${id}_tallrik_ner_0${n}`), 220);
      else { const r = /** @type {any} */ (this.ritade.get(id)); if (r?.active) { const y0 = r.y; this.tweens.add({ targets: r, y: y0 - 3, duration: 150, yoyo: true, repeat: 3, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.y = y0; this.smutsig = true; } }); } }
    }
    this.time.delayedCall(2200, () => { this.regiFokus = null; });
    this.regiLogg.push('tallrikarna');
    return 2000;
  }

  /**
   * Skepparen pekar (105.4): kameran glider till det stora hornet på avsatsen, stannar, glider ned till hjulet med
   * tången, stannar, och tillbaka till hjälten. Skepparen pekar upp mot kvarnen under tiden. @returns {number}
   */
  skepparenPekar() {
    const ruta = (/** @type {string} */ id) => { const o = this.ruta(id); const b = (o?.bildPa && this.ruta(o.bildPa)) || o; return b ? { x: b.x + b.b / 2, y: b.y + b.h / 2 } : null; };
    const horn = ruta('hornet'), hjul = ruta('hjul');
    if (!horn || !hjul) return 0;
    const s = this.ruta('skepparen');
    if (s) {
      const hall = horn.x >= s.x + s.b / 2 ? 'hoger' : 'vanster';
      const ramar = [`skepparen_pekar_upp_${hall}_01`, `skepparen_pekar_upp_${hall}_02`];
      if (ramar.every((r) => foremalsbild(this, r))) this.regiRamar('skepparen', [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1].map((i) => ramar[i]), 400);
    }
    this.regiFokus = horn;
    this.regiLogg.push('kameran visar hornet');
    this.time.delayedCall(2600, () => { this.regiFokus = hjul; this.regiLogg.push('kameran visar hjulet'); });
    this.time.delayedCall(4800, () => { this.regiFokus = null; });
    this.regiLogg.push('skepparen pekar');
    return 5600;
  }

  /**
   * Ett ljud i en regi (103.3.4), om ms, och raden i regiloggen direkt (testerna hör inget, och snabbläget väntar
   * inte). @param {string} id @param {number} [om] ms
   */
  regiLjud(id, om = 0) {
    if (om > 0) this.time.delayedCall(om, () => this.b.ljud?.spela(id)); else this.b.ljud?.spela(id);
    this.regiLogg.push(`ljud:${id}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
  }

  /** Ett av kapitel 3:s korta stycken (103.3.5), efter rätt svar, om ms. @param {string} namn @param {number} [om] ms */
  regiStycke(namn, om = 0) {
    if (om > 0) this.time.delayedCall(om, () => this.b.ljud?.stycke(namn)); else this.b.ljud?.stycke(namn);
    this.regiLogg.push(`stycke:${namn}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
  }

  /**
   * Frukosten i början av kapitlet (103.3.1): kvinnan på pråmen blåser tre korta tut i frukosthornet, ett i taget med
   * en ring från hornet, och sedan springer flodborna fram med tallrikarna (som tallrikar). Kameran visar pråmarna.
   * @returns {number}
   */
  frukost() {
    const p = this.regiPunkter.pramar;
    if (p) this.regiFokus = { x: p.x, y: p.y };
    // ringarna kommer från hornet hon blåser i (i hennes bild, vid munnen), inte från frukosthornet på däcket
    const f = this.ruta('flodbo_frukost'), h = this.ruta('frukosthorn');
    const blas = ['flodbo_frukost_blaser_ner_01', 'flodbo_frukost_blaser_ner_02'];
    const kan = blas.every((r) => foremalsbild(this, r));
    // tre korta tut: bild 2 är tutet, med en ring från hornet
    if (kan) this.regiRamar('flodbo_frukost', ['flodbo_frukost_blaser_ner_01', 'flodbo_frukost_blaser_ner_02', 'flodbo_frukost_blaser_ner_01', 'flodbo_frukost_blaser_ner_02', 'flodbo_frukost_blaser_ner_01', 'flodbo_frukost_blaser_ner_02', 'flodbo_frukost_blaser_ner_01'], 300);
    const ut = kan && f ? { x: f.x + f.b / 2 + 8, y: f.y + 8 } : h ? { x: h.x + h.b / 2, y: h.y + h.h / 2 } : null;
    if (ut) for (let i = 0; i < 3; i++) this.k3Ring(ut.x, ut.y, 3, 16, 0xfff2a8, 400, 300 + i * 600);
    for (let i = 0; i < 3; i++) this.regiLjud('frukosthorn', 300 + i * 600);
    // 104.6: hornet hon blåser i är frukosthornet, så det ligger inte kvar på däcket under tiden (två horn i bild)
    const fh = /** @type {any} */ (this.ritade.get('frukosthorn'));
    if (kan && fh?.active) {
      fh.setVisible(false); this.regiLogg.push('frukosthornet i hennes hand');
      this.time.delayedCall(2100, () => { if (fh.active) { fh.setVisible(true); this.smutsig = true; } });
    }
    this.time.delayedCall(2200, () => { this.tallrikar(); });
    this.regiLogg.push('frukosten');
    return 4300;
  }

  /** För få tut (k3_hornet, 102.3): skuggan stiger en bit och stannar under vattnet. @returns {number} */
  skugganStiger() {
    const smuts = () => { this.smutsig = true; };
    this.utsikt('hornet');
    const sk = this.k3NySkugga(0);
    if (!sk) return 0;
    sk.setScale(0.75);
    this.tweens.add({ targets: sk, alpha: 0.5, scaleX: 0.85, scaleY: 0.85, duration: 1400, delay: 600, ease: 'Sine.easeOut', onUpdate: smuts });
    this.tweens.add({ targets: sk, alpha: 0, duration: 800, delay: 3200, onUpdate: smuts, onComplete: () => { sk.destroy(); if (this.k3Skugga === sk) this.k3Skugga = null; smuts(); } });
    this.regiLjud('skuggan', 600);
    this.regiLogg.push('skuggan stiger en bit');
    return 2200;
  }

  /** För många tut (k3_hornet, 102.3): skuggan dyker. @returns {number} */
  skugganDyker() {
    const smuts = () => { this.smutsig = true; };
    this.utsikt('hornet');
    const p = this.utsiktsPunkt('hornet');
    const sk = this.k3NySkugga(0.45);
    if (!sk || !p) return 0;
    for (let i = 0; i < 3; i++) this.k3Ring(p.x, p.y, 10, 70, 0xf2fbff, 800, 300 + i * 200);
    this.tweens.add({ targets: sk, alpha: 0, scaleX: 0.4, scaleY: 0.4, duration: 1400, delay: 500, ease: 'Sine.easeIn', onUpdate: smuts, onComplete: () => { sk.destroy(); if (this.k3Skugga === sk) this.k3Skugga = null; smuts(); } });
    this.regiLjud('skuggan');
    this.regiLogg.push('skuggan dyker');
    return 2000;
  }

  /**
   * Ön stiger (k3s03_hornet, 102.3): ringar sprider sig, och skalet stiger ur floden vid kvarnens brygga med vatten
   * som forsar av kanten och skum runt. Ungen som simmar klättrar upp. Gråboxens ellips tills Stils 4–6 bilder
   * finns. Ön ligger kvar tills rummet ritas om. @returns {number}
   */
  onStiger() {
    const smuts = () => { this.smutsig = true; };
    const p = this.utsiktsPunkt('hornet') ?? this.regiPunkter.on;
    if (!p) return 0;
    this.regiFokus = { x: p.x, y: p.y - 20 };
    this.k3Skugga?.destroy(); this.k3Skugga = null;
    const u = this.k3Simmar;
    // Stils sex bilder (103.2): skuggan, vattnet som välver sig, ryggen som bryter ytan och forsar, strömmar som rinner
    // av, och droppbilderna 5 och 6 tre gånger, sedan ön som den ligger. Uppbyggnaden följer Stils stycke_on (103.3.5):
    // ryggen och huvudet bryter ytan (bild 3) på slaget vid 7,0 s. Ljudet on_stiger följer bild 2–4, droppar 5–6
    const ramar = ['on_stiger_01', 'on_stiger_02', 'on_stiger_03', 'on_stiger_04', 'on_stiger_05', 'on_stiger_06', 'on_stiger_05', 'on_stiger_06', 'on_stiger_05', 'on_stiger_06', 'on_floden'];
    const tider = [0, 4000, 7000, 7600, 8200, 8580, 8960, 9340, 9720, 10100, 10480];
    const img = ramar.every((r) => foremalsbild(this, r)) ? this.k3Skalbild(ramar[0], p) : null;
    if (img) {
      this.k3Skugga = img;
      this.regiStycke('stycke_on');
      this.regiLjud('on_stiger', 3500);
      this.regiLjud('droppar', 8200);
      ramar.forEach((r, i) => {
        if (i > 0) this.time.delayedCall(tider[i], () => { const fb = foremalsbild(this, r); if (img.active && fb) { img.setTexture(fb.nyckel, fb.ram); smuts(); } });
      });
      const t = tider[tider.length - 1];
      if (u?.active) this.tweens.add({ targets: u, x: p.x - 30, y: p.y - 60, duration: 700, delay: 7600, onUpdate: smuts, onComplete: () => { u.destroy(); smuts(); } });
      this.time.delayedCall(t + 300, () => { this.regiFokus = null; });
      this.regiLogg.push('ön stiger');
      return t + 400;
    }
    for (let i = 0; i < 3; i++) this.k3Ring(p.x, p.y, 120, 190, 0xf2fbff, 1400, i * 350);
    const on = this.add.ellipse(p.x, p.y + 10, 280, 192, 0x6f8a4a, 1).setStrokeStyle(3, 0x4a3a28, 1).setAlpha(0).setScale(0.9); this.lagerObjekt.add(on);
    this.k3Skugga = on;
    this.tweens.add({ targets: on, alpha: 1, y: p.y, scaleX: 1, scaleY: 1, duration: 1600, delay: 300, ease: 'Sine.easeOut', onUpdate: smuts });
    if (u?.active) this.tweens.add({ targets: u, x: p.x - 30, y: p.y - 50, duration: 900, delay: 1600, onUpdate: smuts, onComplete: () => { u.destroy(); smuts(); } });
    this.time.delayedCall(3600, () => { this.regiFokus = null; });
    this.regiLogg.push('ön stiger');
    return 3800;
  }

  /**
   * Säckhissen ned från avsatsen (102.3): hjälten och ungen går in genom dörren där hissen står (regi_hiss) och tonas
   * bort, och efter hissens tid kommer de ut genom kvarnens dörr på bottenvåningen (utgången till kvarnen).
   * @param {{ x: number, y: number }} p dörren ut till avsatsen @returns {number}
   */
  hissGenomDorren(p) {
    // mellanscenen med hissen ner (k3s03_hornet) börjar med att ön stiger, där ungen simmar: det som händer i floden
    // före hissen (102.3), så att han ser det från avsatsen
    const forst = this.k3Simmar?.active ? this.onStiger() : 0;
    if (forst) { this.time.delayedCall(forst, () => this.hissGenomDorren(p)); return forst + 2200; }
    this.regiLjud('sackhiss');
    const smuts = () => { this.placera(); this.smutsig = true; };
    const fran = { ...this.pos }, ufran = { ...this.ungePos };
    const visas = this.unge.visible;
    if (visas) this.hallUngen(this.ungePos.x, this.ungePos.y);
    const ut = this.objekt.find((o) => o.sort === 'utgang' && o.till === 'kvarnen');
    const t1 = { p: 0 };
    this.tweens.add({ targets: t1, p: 1, duration: 700, ease: 'Sine.easeInOut', onUpdate: () => {
      this.pos = { x: fran.x + (p.x - fran.x) * t1.p, y: fran.y + (p.y - 6 - fran.y) * t1.p };
      if (visas) this.ungePos = { x: ufran.x + (p.x + 6 - ufran.x) * t1.p, y: ufran.y + (p.y - 6 - ufran.y) * t1.p };
      const a = t1.p < 0.6 ? 1 : 1 - (t1.p - 0.6) / 0.4;
      this.hjalte.setAlpha(a); this.unge.setAlpha(a); smuts();
    } });
    // hissen åker ned inne i kvarnen (1 s), och de kommer ut genom dörren nere vid kajen
    this.time.delayedCall(1700, () => {
      if (!ut) { this.hjalte.setAlpha(1); this.unge.setAlpha(1); return; }
      // 109.4: han kommer ut en bit ut på kajen, inte på tröskeln i dörröppningen (där han stod kvar i dörren medan
      // molnet sa "Gå upp på ön!"), och ungen bredvid honom på kajen, inte inne i kvarnens vägg
      const f = framfor(ut);
      this.pos = this.hinder.narmasteFria({ x: f.x, y: f.y + 10 });
      this.ungePos = this.hinder.narmasteFria({ x: this.pos.x + 16, y: this.pos.y });
      this.vand = { x: 0, y: 1 };
      // 109.4 (det riktiga felet, den vuxnes logg på 0.99.0): regin höll ungen (hallUngen) och släppte den aldrig. Då
      // slutade rummet att flytta hjältens bild (update väntar medan ungen är styrd), och hjälten stod kvar i dörren
      // medan han gick osynlig mot ön. Förut bytte hissen rum, och då släpptes ungen när rummet byttes
      if (this.ungeSvavar) { this.ungeSvavar.g?.destroy(); this.ungeSvavar = null; }
      this.ungeLyft = 0;
      const t2 = { a: 0 };
      this.tweens.add({ targets: t2, a: 1, duration: 400, onUpdate: () => { this.hjalte.setAlpha(t2.a); this.unge.setAlpha(t2.a); smuts(); } });
    });
    this.regiLogg.push('säckhissen ner');
    return 2200;
  }

  /**
   * Kvällen på floden (k3s07_resan): skepparen blåser fem långa tut vid hornet, sköldpaddan svarar under hjälten,
   * ljusbåtarna tänds och gungar på vattnet, och två månar stiger. @returns {number}
   */
  resanKvall() {
    const smuts = () => { this.smutsig = true; };
    // skepparen blåser i hornet på avsatsen (102.3), eller där han står
    const s = this.ruta('hornet') ?? this.ruta('skepparen'), k = this.kamera;
    if (s) for (let i = 0; i < 5; i++) this.k3Ring(s.x + s.b / 2, s.y - 4, 4, 34, 0xfff2a8, 700, i * 420);
    for (let i = 0; i < 2; i++) this.k3Ring(this.pos.x, this.pos.y, 6, 56, 0xb8e0c8, 1200, 2300 + i * 320);
    for (let i = 0; i < 6; i++) {
      const lx = Math.round(k.x + 30 + i * 48), ly = Math.round(Math.min(this.storlek.hojd - 10, k.y + 150 + (i % 2) * 14));
      const lb = foremalsbild(this, i % 2 ? 'ljusbat_02' : 'ljusbat_01');
      const d = (lb ? this.add.image(lx, ly, lb.nyckel, lb.ram).setOrigin(0.5, 1) : this.add.circle(lx, ly, 2, 0xffd27a)).setAlpha(0); this.lagerLuft.add(d);
      this.tweens.add({ targets: d, alpha: 1, duration: 400, delay: 2000 + i * 150, onUpdate: smuts });
      this.tweens.add({ targets: d, y: ly - 2, duration: 500, delay: 2000 + i * 150, yoyo: true, repeat: 4, onUpdate: smuts });
    }
    [k.x + 248, k.x + 276].forEach((mx, i) => {
      const m = this.add.circle(Math.round(mx), Math.round(k.y + 34), 5 - i, 0xf4f1e8).setAlpha(0); this.lagerLuft.add(m);
      this.tweens.add({ targets: m, y: Math.round(k.y + 16 - i * 4), alpha: 1, duration: 1600, delay: 3600 + i * 400, onUpdate: smuts });
    });
    this.regiLogg.push('kvällen på floden');
    return 5600;
  }

  // ---- 106: kapitel 3 får en början, en duell som syns och ett slut (gråbox tills Stils bilder finns) ----

  /** Har regin spelats för mindre än ms sedan? Ordduellens ram spelas en gång också om både motorn och en mellanscen ber om den. @param {string} namn @param {number} [ms] */
  regiNyss(namn, ms = 5000) { const t = this.regiSenast?.get(namn); return t !== undefined && this.time.now - t < ms; }

  /** @param {string} namn */
  regiSpelas(namn) { (this.regiSenast ??= new Map()).set(namn, this.time.now); }

  /**
   * Ankomsten (106.8): hjälten och ungen kommer gående på stigen in i rummet, stannar, och kameran visar floden och
   * glider tillbaka. Ingen text, och bara bilder som redan finns. @returns {number}
   */
  ankomstFloden() {
    const mal = { ...this.pos }, fran = { x: mal.x, y: Math.max(6, mal.y - 48) };
    const ga = 1500, vila = 300, glid = 1200, se = 1300, tillbaka = 700;
    this.pos = { ...fran }; this.vand = { x: 0, y: 1 };
    this.ungePos = { x: fran.x + 14, y: fran.y - 12 };
    this.placera(); this.ritaHjalte();
    const p = { ...fran };
    this.tweens.add({ targets: p, y: mal.y, duration: ga, onUpdate: () => {
      this.pos = { x: Math.round(p.x), y: Math.round(p.y) };
      this.ungePos = { x: this.pos.x + 14, y: this.pos.y - 12 };
      this.gar = true; this.gang = (this.gang || 0) + 2; this.ritaHjalte(); this.placera(); this.smutsig = true;
    }, onComplete: () => { this.pos = { ...mal }; this.ungePos = { x: mal.x + 14, y: mal.y - 4 }; this.gar = false; this.ritaHjalte(); this.placera(); } });
    // floden: där ön stiger (kartans regipunkt), annars mitt i rummets nedre del
    const f = this.regiPunkter?.on ?? { x: Math.round(this.storlek.bredd / 2), y: Math.round(this.storlek.hojd - 80) };
    const fokus = (/** @type {{x:number,y:number}} */ a, /** @type {{x:number,y:number}} */ b, /** @type {number} */ ms, /** @type {number} */ sen, /** @type {() => void} */ klar = () => {}) => {
      const g = { p: 0 };
      this.tweens.add({ targets: g, p: 1, duration: ms, delay: sen, ease: 'Sine.easeInOut', onUpdate: () => { this.regiFokus = { x: a.x + (b.x - a.x) * g.p, y: a.y + (b.y - a.y) * g.p }; }, onComplete: klar });
    };
    const slut = ga + vila + glid + se + tillbaka;
    this.ankomstPagar = true;
    // kameran släpps när den är tillbaka hos hjälten (i tweenens slut, så att ingen sen uppdatering låser den)
    this.time.delayedCall(ga + vila, () => { this.regiFokus = { x: mal.x, y: mal.y }; fokus(mal, f, glid, 0); fokus(f, mal, tillbaka, glid + se, () => { this.regiFokus = null; this.ankomstPagar = false; }); });
    this.regiLogg.push('ankomsten till floden');
    return slut;
  }

  /**
   * Sköldpaddan simmar till sandbanken (106.4): floden i en egen bild över rummet, sköldpaddan med hjälten och
   * ungen på skalet (Stils `skoldpadda_simmar_01–02`, som i resan), och ön glider ut ur bild. Högst ca 4 s.
   * @returns {number}
   */
  skoldpaddaSimmar() {
    const smuts = () => { this.smutsig = true; };
    this.rensaSidovy();
    const k = this.kamera, c = this.sidovy, B = RUM.bredd, H = RUM.hojd;
    c.setPosition(k.x, k.y).setVisible(true).setAlpha(0);
    const vatten = this.add.graphics();
    vatten.fillStyle(0x4f86b0, 1).fillRect(0, 0, B, H).fillStyle(0x6f9fc8, 1);
    for (let i = 0; i < 9; i++) vatten.fillRect((i * 53) % B, 14 + i * 20, 22, 1);
    c.add(vatten);
    const skal = this.add.container(Math.round(B / 2 + 30), Math.round(H / 2 + 6));
    const fb = foremalsbild(this, 'skoldpadda_simmar_01'), fb2 = foremalsbild(this, 'skoldpadda_simmar_02');
    if (fb) {
      // bilden är 480 × 320 med skalets mitt ca (250, 160): skalet hamnar mitt i bild
      const img = this.add.image(-250 + 240, -160 + 160, fb.nyckel, fb.ram).setOrigin(0.5, 0.5);
      skal.add(img);
      if (fb2) { let n = 0; const t = this.time.addEvent({ delay: 600, loop: true, callback: () => { if (!img.active) { t.remove(); return; } n++; img.setTexture((n % 2 ? fb2 : fb).nyckel, (n % 2 ? fb2 : fb).ram); smuts(); } }); }
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x5f7a4a, 1).fillEllipse(0, 0, 150, 96).fillStyle(0x6f9a4a, 1).fillEllipse(0, -4, 126, 76).fillStyle(0x4f6a5a, 1).fillEllipse(-92, -2, 30, 22);
      skal.add(g);
    }
    // hjälten och ungen sitter på skalet
    const hj = this.hjalteTextur && this.textures.exists(this.hjalteTextur) && this.textures.get(this.hjalteTextur).has('hjalte_ga_vanster_01')
      ? this.add.image(-8, -6, this.hjalteTextur, 'hjalte_ga_vanster_01').setOrigin(0.5, 1) : this.add.rectangle(-8, -6, 10, 18, 0x3a5fa0).setOrigin(0.5, 1);
    const un = this.textures.exists('unge') && this.textures.get('unge').has('unge1_glad_vanster_01')
      ? this.add.image(10, -4, 'unge', 'unge1_glad_vanster_01').setOrigin(0.5, 1) : this.add.rectangle(10, -4, 10, 10, 0x5fae6a).setOrigin(0.5, 1);
    skal.add([hj, un]);
    c.add(skal);
    this.tweens.add({ targets: c, alpha: 1, duration: 250, onUpdate: smuts });
    // sköldpaddan simmar åt vänster (huvudet först), och ön glider ut ur bild
    this.tweens.add({ targets: skal, x: -260, duration: 2900, delay: 500, ease: 'Sine.easeIn', onUpdate: () => { skal.x = Math.round(skal.x); smuts(); } });
    this.regiLjud('plask', 300);
    const ms = 3700;
    this.time.delayedCall(ms - 250, () => this.tweens.add({ targets: c, alpha: 0, duration: 250, onUpdate: smuts, onComplete: () => { if (c.alpha === 0) this.rensaSidovy(); smuts(); } }));
    this.regiLogg.push('sköldpaddan simmar');
    return ms;
  }

  /**
   * Baronen i gråboxen (106.5, tills Stils baron på repstegen finns): luftskeppet uppe i bild, repstegen ned och
   * baronen längst ned på den, mittemot hjälten. Står kvar under duellen. @returns {{ x: number, y: number }}
   */
  duellGrabox() {
    this.duellGra?.destroy(); this.duellGra = null;
    const k = this.kamera, x = Math.round(this.pos.x), topp = Math.round(Math.max(k.y + 10, this.pos.y - 150));
    const y = Math.round(Math.max(topp + 30, this.pos.y - 56));
    const c = this.add.container(0, 0); this.lagerLuft.add(c);
    const skepp = this.add.ellipse(x + 10, topp, 64, 18, 0xd9822b).setStrokeStyle(1, 0x7a3f12);
    const stege = this.add.graphics();
    const baron = this.add.container(x, y);
    baron.add([this.add.rectangle(0, 0, 12, 18, 0x5a3a6a).setOrigin(0.5, 1), this.add.rectangle(0, -18, 14, 4, 0x2b2230).setOrigin(0.5, 1), this.add.circle(0, -12, 2, 0xe8c070)]);
    c.add([skepp, stege, baron]);
    const rita = () => { if (!stege.active) return; stege.clear().lineStyle(1, 0x8a6a48, 1).lineBetween(x - 4, topp + 8, x - 4, baron.y - 4).lineBetween(x + 4, topp + 8, x + 4, baron.y - 4); for (let yy = topp + 12; yy < baron.y - 4; yy += 6) stege.lineBetween(x - 4, yy, x + 4, yy); };
    rita();
    this.duellGra = Object.assign(c, { skepp, baron, rita, topp });
    this.smutsig = true;
    return { x, y: y - 9 };
  }

  /**
   * Ordduellens början (106.5): samma ram i varje duell (kapitel 3, finalen i kapitel 5 och testrummet). Hjälten och
   * motståndaren står mittemot varandra, kameran mellan dem, och startljudet. Rubriken ORDDUELL! står i textlagret
   * (spel.js). Motståndaren är figuren med Stils bilder, annars gråboxens baron på repstegen. @returns {number}
   */
  ordduellStart() {
    if (this.regiNyss('ordduell_start')) return 0;
    this.regiSpelas('ordduell_start');
    const smuts = () => { this.smutsig = true; };
    const fig = /** @type {any} */ (this.duellFig);
    let mot;
    if (fig?.img?.active) mot = fig instanceof BaronStege ? { x: fig.img.x + 12, y: fig.img.y + 14 } : { x: fig.img.x, y: fig.img.y - 12 };
    else if (harBaronStege(this)) { const b = /** @type {any} */ (this.duellfigur('baronen')); mot = { x: b.img.x + 12, y: b.img.y + 14 }; }
    else mot = this.duellGrabox();
    this.vand = { x: 0, y: -1 }; this.ritaHjalte();
    const mitt = { x: Math.round((this.pos.x + mot.x) / 2), y: Math.round((this.pos.y - 12 + mot.y) / 2) };
    this.regiFokus = mitt;
    // två gnistor mellan dem, som när två svärd möts
    const g = this.add.graphics(); this.lagerLuft.add(g);
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: 900, delay: 400, onUpdate: () => {
      if (!g.active) return;
      const r = Math.round(3 + Math.sin(t.p * Math.PI) * 7);
      g.clear().lineStyle(1, 0xfff2a8, 1 - t.p * 0.6).lineBetween(mitt.x - r, mitt.y - r, mitt.x + r, mitt.y + r).lineBetween(mitt.x - r, mitt.y + r, mitt.x + r, mitt.y - r);
      smuts();
    }, onComplete: () => { g.destroy(); smuts(); } });
    this.regiLjud(DUELL_LJUD.start);
    const ms = 2200;
    this.time.delayedCall(ms, () => { this.regiFokus = null; });
    this.regiLogg.push('ordduellen börjar');
    return ms;
  }

  /**
   * Segern (106.5): baronen tappar greppet, repstegen rullar upp honom i gondolen, luftskeppet far och Herr Skata
   * flaxar efter (gråboxen, eller figurens egen vinst med Stils bilder), ungen jublar och segerstycket spelas.
   * Raden "Du vann ordduellen!" är Innehålls och kommer efter. @returns {number}
   */
  ordduellSeger() {
    if (this.regiNyss('ordduell_seger')) return 0;
    this.regiSpelas('ordduell_seger');
    const smuts = () => { this.smutsig = true; };
    // SKÖLD-bubblan (109.5) har stått kvar genom duellen, och nu tonas den bort
    const bubbla = this.k3Bubbla;
    if (bubbla?.active) { this.k3Bubbla = null; this.tweens.add({ targets: bubbla, alpha: 0, duration: 900, delay: 600, onUpdate: smuts, onComplete: () => bubbla.destroy() }); }
    const gb = /** @type {any} */ (this.duellGra);
    const baron = this.duellFig instanceof BaronStege ? this.duellFig : null;
    if (baron) {
      // Stils baron: han har redan landat i gondolen (vinsten), och nu far luftskeppet med Herr Skata efter
      // hänger han kvar på stegen (en duell utan vinstens bilder, eller regin för sig), tappar han greppet först
      const forst = baron.img.visible ? baron.vinst() : 0;
      this.regiFokus = { x: baron.skepp.x + 56, y: Math.round((baron.skepp.y + 60 + this.pos.y) / 2) };
      this.time.delayedCall(forst, () => { baron.far(); this.regiLjud('luftskepp'); });
      this.time.delayedCall(forst + 2800, () => { if (this.duellFig === baron) { baron.taBort(); this.duellFig = null; } this.regiFokus = null; smuts(); });
      this.time.delayedCall(500, () => this.ungeReagerar(true));
      this.time.delayedCall(1300 + forst, () => this.ungeReagerar(true));
      this.regiStycke(DUELL_LJUD.seger, 200 + forst);
      this.regiLogg.push('ordduellen är vunnen');
      return 2800 + forst;
    } else if (gb?.active) {
      const k = this.kamera;
      this.regiFokus = { x: gb.skepp.x, y: Math.round((gb.skepp.y + this.pos.y) / 2) };
      this.tweens.add({ targets: gb.baron, angle: 20, duration: 120, yoyo: true, repeat: 1 });
      this.tweens.add({ targets: gb.baron, y: gb.topp + 10, duration: 900, delay: 400, ease: 'Quad.easeIn', onUpdate: () => { gb.rita(); smuts(); }, onComplete: () => { gb.baron.setVisible(false); gb.rita(); } });
      this.tweens.add({ targets: gb.skepp, x: k.x + RUM.bredd + 50, duration: 1300, delay: 1400, ease: 'Sine.easeIn', onUpdate: smuts });
      const skata = this.add.circle(gb.skepp.x - 30, gb.topp + 6, 3, 0x2b2b2b); gb.add(skata);
      this.tweens.add({ targets: skata, x: k.x + RUM.bredd + 20, y: gb.topp - 4, duration: 1300, delay: 1700, onUpdate: smuts });
      this.regiLjud('rull', 400); this.regiLjud('luftskepp', 1400);
      this.time.delayedCall(2800, () => { gb.destroy(); if (this.duellGra === gb) this.duellGra = null; this.regiFokus = null; smuts(); });
    }
    this.time.delayedCall(500, () => this.ungeReagerar(true));
    this.time.delayedCall(1300, () => this.ungeReagerar(true));
    this.time.delayedCall(2100, () => this.ungeReagerar(true));
    this.regiStycke(DUELL_LJUD.seger, 200);
    this.regiLogg.push('ordduellen är vunnen');
    return 2800;
  }

  /**
   * Kartbit 4 i närbild (106.6), som kartbit 3: bilden visas i textlagret (spel.js, Stils kartbit 4), och i rummet ryker
   * det inget. Regin säger bara hur länge. @returns {number}
   */
  kartbit4Berget() {
    this.regiLogg.push('kartbit 4 visar berget');
    return 3600;
  }

  /**
   * Slutbilden (106.7): hjälten och ungen på sköldpaddans skal nedför floden mot solnedgången. De tre solarna går
   * ned en i taget, skepparens fem tut hörs bakom dem, ljusbåtarna tänds och de två månarna stiger. Högst ca 8 s, och
   * ett tryck hoppar över den (spel.js, `slutbildSlut`). Gråbox tills Stils slutbild finns, med bara bildbyten och
   * enkla rörelser. @returns {number}
   */
  /**
   * En slutbild från sidan med Stils bilder (109.10 och 115.7): en bred bakgrund (640 × 192, växlar var 600:e ms) och en
   * figur som rör sig åt höger (byter bild var figurMs). Kameran glider från x 0 till 320 på ca 7,5 s, och figuren går
   * från `fran` till `till`, lite fortare än kameran. Bilden står kvar på sin sista bild, och slutrutan visas över den
   * (113.6). Bara bildbyten och läge (golvdatorn). @returns {number} ms, 0 om Stils bilder saknas
   * @param {{ bak: string[], figur: string[], figurY: number, fran: number, till: number, figurMs: number }} o
   */
  slutbildFranSidan(o) {
    if (![...o.bak, ...o.figur].every((n) => this.textures.exists(n))) return 0;
    const smuts = () => { this.smutsig = true; };
    this.rensaSidovy();
    const k = this.kamera, c = this.sidovy;
    c.setPosition(k.x, k.y).setVisible(true).setAlpha(0);
    const GLID = 7500, ms = GLID + 600;
    const bild = this.add.image(0, 0, o.bak[0]).setOrigin(0, 0);
    const fig = this.add.image(o.fran, o.figurY, o.figur[0]).setOrigin(0, 0);
    c.add([bild, fig]);
    this.tweens.add({ targets: c, alpha: 1, duration: 300, onUpdate: smuts });
    let nb = 0, nf = 0;
    const byten = [
      this.time.addEvent({ delay: 600, loop: true, callback: () => { if (!bild.active) return; nb = 1 - nb; bild.setTexture(o.bak[nb]); smuts(); } }),
      this.time.addEvent({ delay: o.figurMs, loop: true, callback: () => { if (!fig.active) return; nf = 1 - nf; fig.setTexture(o.figur[nf]); smuts(); } }),
    ];
    const lage = (/** @type {number} */ t) => { const kx = Math.round(320 * t); bild.x = -kx; fig.x = Math.round(o.fran + (o.till - o.fran) * t) - kx; smuts(); };
    const glid = this.tweens.addCounter({ from: 0, to: 1, duration: GLID, onUpdate: (tw) => {
      if (!bild.active) { tw.stop(); return; }
      lage(tw.getValue() ?? 0);
    } });
    this.slutbild = { c, solar: [], byten, tillSlut: () => { glid.stop(); lage(1); c.setAlpha(1); } };
    return ms;
  }

  resanSlut() {
    const smuts = () => { this.smutsig = true; };
    this.rensaSidovy();
    const k = this.kamera, c = this.sidovy, B = RUM.bredd, H = RUM.hojd, hav = Math.round(H * 0.58);
    c.setPosition(k.x, k.y).setVisible(true).setAlpha(0);
    // Stils slutbild (109.10): en bred bild av floden mot berget i kvällsljus (k3_slut_bakgrund_01–02, 640 × 192, vattnet
    // rör sig var 600:e ms), och sköldpaddan med hjälten och ungen som egen figur (k3_slut_skoldpadda_01–02, 128 × 72,
    // ett simtag var 500:e ms). Kameran glider längs bilden från x 0 till 320 på ca 7,5 s, och sköldpaddan simmar lite
    // fortare, från x 40 till 380, så att den kommer närmare berget. Bara bildbyten och läge (golvdatorn).
    const ms0 = this.slutbildFranSidan({ bak: ['sidovy_k3_slut_bakgrund_01', 'sidovy_k3_slut_bakgrund_02'], figur: ['sidovy_k3_slut_skoldpadda_01', 'sidovy_k3_slut_skoldpadda_02'],
      figurY: 74, fran: 40, till: 380, figurMs: 500 });
    if (ms0) {
      for (let i = 0; i < 5; i++) this.regiLjud('horn_tut', 600 + i * 700);
      this.regiLogg.push('slutbilden: kameran glider mot berget');
      return ms0;
    }
    const himmel = this.add.graphics();
    const band = [0xf4b860, 0xe8945a, 0xc8665a, 0x8a4a6a, 0x4a3a6a];
    band.forEach((f, i) => himmel.fillStyle(f, 1).fillRect(0, Math.round((hav * i) / band.length), B, Math.ceil(hav / band.length) + 1));
    c.add(himmel);
    // solarna bakom horisonten (vattnet ritas ovanpå), en i taget
    const solar = [['sol_stor', 70, 9, 0xffd27a], ['sol_mellan', 160, 6, 0xffe6a0], ['sol_liten', 240, 4, 0xfff2c8]].map(([namn, x, r, f], i) => {
      const sb = foremalsbild(this, /** @type {string} */ (namn));
      const s = sb ? this.add.image(/** @type {number} */ (x), hav - 30, sb.nyckel, sb.ram).setOrigin(0.5, 0.5) : this.add.circle(/** @type {number} */ (x), hav - 30, /** @type {number} */ (r), /** @type {number} */ (f));
      c.add(s);
      this.tweens.add({ targets: s, y: hav + 14, duration: 1400, delay: 500 + i * 1100, ease: 'Sine.easeIn', onUpdate: () => { s.y = Math.round(s.y); smuts(); } });
      return s;
    });
    const vatten = this.add.graphics();
    vatten.fillStyle(0x3a4f7a, 1).fillRect(0, hav, B, H - hav).fillStyle(0x5a6f9a, 1);
    for (let i = 0; i < 8; i++) vatten.fillRect((i * 47) % B, hav + 8 + i * 9, 18, 1);
    c.add(vatten);
    // sköldpaddan simmar bort från oss, med hjälten och ungen på skalet
    const skal = this.add.container(Math.round(B / 2), H - 22);
    skal.add([this.add.ellipse(0, 0, 70, 22, 0x4f5a3a), this.add.ellipse(0, -3, 56, 14, 0x5f7a4a),
      this.add.rectangle(-6, -6, 6, 12, 0x2b2b3a).setOrigin(0.5, 1), this.add.rectangle(6, -5, 6, 7, 0x2b3a2b).setOrigin(0.5, 1)]);
    c.add(skal);
    this.tweens.add({ targets: skal, y: hav + 24, scaleX: 0.55, scaleY: 0.55, duration: 6500, delay: 300, onUpdate: () => { skal.y = Math.round(skal.y); smuts(); } });
    // ljusbåtarna tänds längs vattnet
    for (let i = 0; i < 6; i++) {
      const lb = foremalsbild(this, i % 2 ? 'ljusbat_02' : 'ljusbat_01');
      const x = 26 + i * 54, y = hav + 18 + (i % 2) * 10;
      const d = (lb ? this.add.image(x, y, lb.nyckel, lb.ram).setOrigin(0.5, 1) : this.add.circle(x, y, 2, 0xffd27a)).setAlpha(0);
      c.add(d);
      this.tweens.add({ targets: d, alpha: 1, duration: 300, delay: 3600 + i * 180, onUpdate: smuts });
    }
    // de två månarna stiger
    [[250, 6], [280, 4]].forEach(([x, r], i) => {
      const m = this.add.circle(x, hav + 6, r, 0xf4f1e8).setAlpha(0); c.add(m);
      this.tweens.add({ targets: m, y: 30 - i * 8, alpha: 1, duration: 2200, delay: 4800 + i * 400, ease: 'Sine.easeOut', onUpdate: () => { m.y = Math.round(m.y); smuts(); } });
    });
    this.tweens.add({ targets: c, alpha: 1, duration: 400, onUpdate: smuts });
    // skepparens fem tut bakom dem, långa och djupa
    for (let i = 0; i < 5; i++) this.regiLjud('horn_tut', 600 + i * 700);
    const ms = 7800;
    // 113.6: bilden står kvar på sin sista bild, och slutrutan visas över den
    this.slutbild = { c, solar, tillSlut: () => { c.each((/** @type {any} */ x) => { for (const tw of this.tweens.getTweensOf(x)) tw.complete(); }); for (const tw of this.tweens.getTweensOf(c)) tw.complete(); c.setAlpha(1); } };
    this.regiLogg.push('slutbilden mot solnedgången');
    return ms;
  }

  /**
   * Ett tryck hoppar över slutbilden (106.7): den hoppar till sin sista bild, som står kvar under slutrutan (113.6).
   */
  slutbildSlut() {
    const s = this.slutbild; if (!s) return;
    s.tillSlut(); this.smutsig = true;
    this.regiLogg.push('slutbilden hoppades över');
  }

  /** Står kapitlets slutbild kvar (113.6)? Då visas slutrutan över den. */
  get harSlutbild() { return !!this.slutbild; }

  /** Byborna (och Tant Rosa) skuttar och jublar där de står. @param {number} [fore] */
  byborJublar(fore = 0) {
    for (const id of ['fiskaren', 'tvatterskan', 'barnet_drake', 'tant_rosa']) {
      const r = /** @type {any} */ (this.ritade.get(id));
      if (!r?.active) continue;
      // Stils jubel (<namn>_jubel_ner_01–02, steg 5 del 1), annars ett skutt
      const bas = String(r.frame?.name || '').replace(/_(ner|upp|hoger|vanster)_\d\d$/, '').replace(/_drake$/, '');
      if (bas && foremalsbild(this, `${bas}_jubel_ner_01`) && foremalsbild(this, `${bas}_jubel_ner_02`)) {
        this.time.delayedCall(fore + Math.random() * 200, () => this.regiRamar(id, [1, 2, 1, 2, 1, 2].map((n) => `${bas}_jubel_ner_0${n}`), 200));
        continue;
      }
      const y0 = r.y;
      this.tweens.add({ targets: r, y: y0 - 3, delay: fore + Math.random() * 200, duration: 150, yoyo: true, repeat: 3, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.y = y0; this.smutsig = true; } });
    }
    return 1400;
  }

  regiRamar(id, ramar, steg) {
    const r = /** @type {any} */ (this.ritade.get(id));
    if (!r?.setTexture) return 0;
    const forut = { nyckel: r.texture.key, ram: r.frame.name, satt: this.ramFor.get(id) };
    // en slinga som går (Farfar som läser) startas om efteråt
    const slinga = /** @type {any} */ (this.ramSlinga.get(id))?.slinga;
    const anim = this.animerade.find((t) => t.img === r);
    if (anim) this.animerade = this.animerade.filter((t) => t !== anim);
    this.spelaRamar(id, ramar, steg);
    const ms = steg * ramar.length;
    this.ramTimrar.get(id)?.push(this.time.delayedCall(ms, () => {
      if (forut.satt) this.ramFor.set(id, forut.satt); else this.ramFor.delete(id);
      if (r.active) r.setTexture(forut.nyckel, forut.ram);
      if (anim && r.active) this.animerade.push(anim);
      if (slinga && r.active) this.slingaRamar(id, slinga.ramar, slinga.steg);
      this.smutsig = true;
    }));
    return ms;
  }

  /**
   * Närbilden när SVÄRD ristas i staven (rad 25, Stils efx_stav_ristas): bild 1–6 en gång (120 ms), sedan 7–8 växelvis
   * (300 ms) medan ordet står kvar. Bilden står i två gånger storleken, mitt på skärmen under ordet. @returns {number}
   */
  stavRistas() {
    if (!this.textures.exists('effekter') || !this.textures.get('effekter').has('efx_stav_ristas_08')) return 0;
    this.rensaSidovy();
    const k = this.kamera, c = this.sidovy;
    c.setPosition(k.x, k.y).setVisible(true).setAlpha(0);
    c.add(this.add.rectangle(0, 0, RUM.bredd, RUM.hojd, 0x1b1712, 0.72).setOrigin(0, 0));
    const img = this.add.image(Math.round(RUM.bredd / 2), Math.round(RUM.hojd * 0.62), 'effekter', 'efx_stav_ristas_01').setOrigin(0.5, 0.5).setScale(2);
    c.add(img);
    this.tweens.add({ targets: c, alpha: 1, duration: 200, onUpdate: () => { this.smutsig = true; } });
    const ram = (/** @type {string} */ n) => { if (img.active) { img.setFrame(n); this.smutsig = true; } };
    for (let i = 2; i <= 6; i++) this.time.delayedCall(120 * (i - 1), () => ram(`efx_stav_ristas_0${i}`));
    for (let i = 0; i < 6; i++) this.time.delayedCall(720 + 300 * i, () => ram(`efx_stav_ristas_0${7 + (i % 2)}`));
    const ms = 720 + 300 * 6;
    this.time.delayedCall(ms, () => { this.tweens.add({ targets: c, alpha: 0, duration: 200, onUpdate: () => { this.smutsig = true; }, onComplete: () => { if (c.alpha === 0) this.rensaSidovy(); } }); });
    return ms + 200;
  }

  /**
   * En bild ur grafiken som en bild-URL, för textlagret (ekorren på kortet). @param {string} ram @returns {string | null}
   */
  ramUrl(ram) {
    const fb = foremalsbild(this, ram);
    const f = fb ? /** @type {any} */ (this.textures.getFrame(fb.nyckel, fb.ram)) : null;
    if (!f?.source?.image) return null;
    const c = document.createElement('canvas');
    c.width = f.cutWidth; c.height = f.cutHeight;
    c.getContext('2d')?.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
    return c.toDataURL();
  }

  /**
   * Motståndaren i ordduellen som figur (91.5): Stils bilder <figur>_grund_01_hel osv. Den står mittemot hjälten, ovanför
   * honom, och flyttas ett steg i taget. null om figuren inte har bilderna (baronen i kapitel 3:s gråbox), och då står
   * det som händer som text för den vuxne. Ett nytt anrop tar bort den förra figuren och sakerna den tappade.
   * @param {string | null | undefined} figur @returns {Duellfigur | null}
   */
  duellfigur(figur) {
    // baronen på repstegen (106.5): står han redan där (mellanscenen ordduell_start före pusslet), står han kvar
    if (figur && this.duellFig instanceof BaronStege && figur === 'baronen') return this.duellFig;
    this.duellFig?.taBort(); this.duellFig = null;
    if (!figur) return null;
    if (figur === 'baronen' && harBaronStege(this)) {
      this.duellGra?.destroy(); this.duellGra = null;
      // 113.4: skeppet från baronen_kommer lämnar plats för duellens skepp med repstegen, så att det aldrig står två
      if (this.luft) { const l = this.luft; for (const t of l.tider) t.remove(); l.gung.remove(); this.tweens.killTweensOf(l.img); l.img.destroy(); this.luft = null; }
      this.duellFig = new BaronStege(this, this.pos, foremalsbild(this, 'baron_medalj_01')?.nyckel ?? null);
      return this.duellFig;
    }
    const fb = foremalsbild(this, `${figur}_grund_01_hel`);
    const info = fb ? figurensBilder(figur, this.textures.get(fb.nyckel).getFrameNames()) : null;
    if (!fb || !info) return null;
    const maxY = Math.round(this.pos.y - 30), minY = 36;
    const y = Math.max(minY + 20, Math.min(maxY - 20, this.pos.y - 56));
    // gråboxens baron (106.5) behövs inte när figuren har Stils bilder
    this.duellGra?.destroy(); this.duellGra = null;
    this.duellFig = new Duellfigur(this, fb.nyckel, figur, info, { x: this.pos.x, y, minY, maxY });
    return this.duellFig;
  }

  /** Luftskeppet, hjälmen och sidovyn tas bort (nytt rum). */
  rensaRegi() {
    this.sidovyVantar?.remove(false); this.sidovyVantar = null;
    this.duellFig?.taBort(); this.duellFig = null;
    this.duellGra?.destroy(); this.duellGra = null; this.slutbild = null;
    this.bryggFig?.forEach((f) => { this.tweens.killTweensOf(f); f.destroy(); }); this.bryggFig = null;
    this.farfarRegi?.destroy(); this.farfarRegi = null;
    this.blomBubblor?.remove(); this.blomBubblor = null;
    this.bubbelJakt?.remove(); this.bubbelJakt = null;
    if (this.luft) { for (const t of this.luft.tider) t.remove(); this.luft.gung.remove(); this.tweens.killTweensOf(this.luft.img); this.luft = null; }
    this.sattPose(null);
    this.lagerLuft?.each((/** @type {any} */ x) => this.tweens.killTweensOf(x));
    this.lagerLuft?.removeAll(true);
    if (this.sidovy) this.rensaSidovy();
  }

  /**
   * En figur klättrar ned för stegen (kartans `klattrar_fran`, 56.4): apan från plattformen till sin plats vid
   * stegens fot, med <namn>_klattra_ned_01–02 (annars <namn>_klattra_01–02) växelvis ca 180 ms, och sedan står den
   * som förut (och vinkar). Det går också medan en replik står. Finns inga klätterbilder står den där direkt.
   * @param {string} id @returns {boolean} om den klättrar
   */
  figurKlattrar(id) {
    const o = this.ruta(id), r = /** @type {any} */ (this.ritade.get(id)), stege = o?.klattrarFran ? this.ruta(o.klattrarFran) : null;
    if (!o || !stege || !r?.setFrame || !r.texture) return false;
    const bas = String(o.bild || '').replace(/_[a-z]+_\d\d$/, '');
    const ramar = [`${bas}_klattra_ned_01`, `${bas}_klattra_ned_02`].every((n) => r.texture.has(n)) ? [`${bas}_klattra_ned_01`, `${bas}_klattra_ned_02`]
      : [`${bas}_klattra_01`, `${bas}_klattra_02`].every((n) => r.texture.has(n)) ? [`${bas}_klattra_01`, `${bas}_klattra_02`] : null;
    if (!ramar) return false;
    const slut = { x: r.x, y: r.y, ram: r.frame.name };
    const anim = this.animerade.find((t) => t.img === r);
    if (anim) this.animerade = this.animerade.filter((t) => t !== anim);
    // från stegens topp (plattformen) till dess fot, mitt på stegen, och sedan ett kliv till sin plats
    const x = Math.round(stege.x + stege.b / 2), y0 = stege.y + 6, y1 = stege.y + stege.h;
    const ms = Math.round(((y1 - y0) / 40) * 1000);
    r.setPosition(x, y0).setFrame(ramar[0]);
    let i = 0;
    const byt = this.time.addEvent({ delay: 180, loop: true, callback: () => { if (!r.active) return; i++; r.setFrame(ramar[i % 2]); this.smutsig = true; } });
    this.tweens.add({ targets: r, y: y1, duration: ms, onUpdate: () => { r.y = Math.round(r.y); this.smutsig = true; }, onComplete: () => {
      byt.remove();
      if (!r.active) return;
      r.setFrame(slut.ram);
      this.tweens.add({ targets: r, x: slut.x, y: slut.y, duration: 200, onComplete: () => { if (anim && r.active) this.animerade.push(anim); this.smutsig = true; } });
    } });
    this.b.logg?.handelse('figur', `${id} klättrar ned från ${stege.id}`);
    this.smutsig = true;
    return true;
  }

  /** Morgonen i sängen (s19): han är vaken och skrattar, och ungen på täcket slickar honom på näsan. @returns {boolean} */
  morgonISangen() {
    const s = this.sover;
    if (!s || !s.img.active || !s.img.texture.has('hjalte_sang_morgon_01')) return false;
    s.andas?.remove();
    s.ungeGomd = true; this.unge.setVisible(false);
    s.img.setFrame('hjalte_sang_morgon_01');
    s.andas = this.time.addEvent({ delay: 260, loop: true, callback: () => { if (!s.img.active) return; s.img.setFrame(s.img.frame.name === 'hjalte_sang_morgon_01' ? 'hjalte_sang_morgon_02' : 'hjalte_sang_morgon_01'); this.smutsig = true; } });
    this.smutsig = true;
    return true;
  }

  /**
   * Luftskeppet (s22): hela bilder i baronens atlas (Stil 20:35), som byts och flyttas. Lägena kommer i
   * berättelsens ordning, men vart och ett går att visa direkt (efter en omstart mitt i scenen).
   * - glider: glider in från vänster med snurrande propeller, kikaren åt fel håll, och svävar sedan stilla;
   * - skata_landar: Herr Skata på hjälmen, fjädern på sned;
   * - ser_hjalten: kikaren vänd, han ser hjälten;
   * - ser_kartan: kikaren ned mot kartbiten, ögat blir stort, och hjälten håller upp kartbiten (till nästa läge
   *   som inte är talar);
   * - talar: munnen öppen och stängd (medan baronen talar, se `talar`);
   * - skata_putsar: Herr Skata putsar sig och snor en medalj;
   * - trasslar: baronen trasslar in sig i repstegen, och hjälmen trillar ned på gräset;
   * - laser_skyltarna: utan hjälm läser han skyltarna med kikaren åt fel håll (munnen rör sig när han talar);
   * - flyger_fel: se `flygFel`.
   * @param {string} lage @param {number | null} [overX] glida in över den här punkten (hjälten, 75.4) i stället för till vänster i bild
   * @returns {boolean}
   */
  luftskepp(lage, overX = null) {
    if (!this.textures.exists('baronen') || !this.textures.get('baronen').has('luftskepp_glider_01')) return false;
    const k = this.kamera, mal = { x: Math.round(k.x + 64), y: k.y + 2 };
    if (!this.luft) {
      const img = this.add.image(lage === 'glider' ? k.x - 112 : mal.x, mal.y, 'baronen', 'luftskepp_glider_01').setOrigin(0, 0);
      // över en punkt (hjälten, 75.4): skeppets mitt där, men hela skeppet inom skärmen
      if (overX !== null) mal.x = Math.round(Math.max(k.x, Math.min(k.x + RUM.bredd - img.width, overX - img.width / 2)));
      this.lagerLuft.add(img);
      // det svävar: upp och ned en pixel
      const gung = this.time.addEvent({ delay: 700, loop: true, callback: () => { if (this.luft && !this.luft.glider) { img.y = mal.y + (img.y === mal.y ? 1 : 0); this.smutsig = true; } } });
      this.luft = { img, lage: '', tider: /** @type {Phaser.Time.TimerEvent[]} */ ([]), gung, glider: false, mal };
    }
    const l = this.luft, img = l.img;
    this.regiLogg.push(lage); if (this.regiLogg.length > 160) this.regiLogg.shift();
    for (const t of l.tider) t.remove();
    l.tider = []; l.lage = lage;
    // hjälten håller upp kartbiten från att baronen ser den tills han har talat klart om den (Stil 21:20)
    if (lage === 'ser_kartan') this.sattPose('hjalte_kartbit_upp_01'); else if (lage !== 'talar') this.sattPose(null);
    const ram = (/** @type {string} */ r) => { img.setFrame(`luftskepp_${r}`); this.smutsig = true; };
    // två bilder om vartannat tills läget byts
    const vaxla = (/** @type {string[]} */ ramar, /** @type {number} */ ms) => {
      let i = 0; ram(ramar[0]);
      l.tider.push(this.time.addEvent({ delay: ms, loop: true, callback: () => { i++; ram(ramar[i % ramar.length]); } }));
    };
    const sedan = (/** @type {number} */ ms, /** @type {() => void} */ f) => l.tider.push(this.time.delayedCall(ms, () => { for (const t of l.tider) t.remove(); l.tider = []; f(); }));
    if (lage === 'glider') {
      vaxla(['glider_01', 'glider_02'], 140);
      if (img.x !== mal.x) {
        l.glider = true;
        this.tweens.add({ targets: img, x: mal.x, duration: 2600, ease: 'Sine.easeOut', onUpdate: () => { img.x = Math.round(img.x); this.smutsig = true; }, onComplete: () => { l.glider = false; } });
      }
      return true;
    }
    if (l.glider) { this.tweens.killTweensOf(img); img.x = mal.x; l.glider = false; }
    if (lage === 'skata_putsar') { vaxla(['skata_putsar_01', 'skata_putsar_02'], 260); sedan(1700, () => ram('skata_snor')); return true; }
    if (lage === 'talar') { vaxla(['talar_01', 'talar_02'], 180); return true; }
    if (lage === 'trasslar') {
      ram('trasslar_01');
      sedan(700, () => { ram('trasslar_02'); this.tappaHjalmen(); });
      return true;
    }
    if (lage === 'flyger_fel') { vaxla(['flyger_fel_01', 'flyger_fel_02'], 140); return true; }
    if (lage === 'river_brevet' && this.textures.get('baronen').has('luftskepp_river_brevet_02')) { vaxla(['river_brevet_01', 'river_brevet_02'], 200); return true; }
    if (this.textures.get('baronen').has(`luftskepp_${lage}`)) { ram(lage); return true; }
    return false;
  }

  /**
   * Baronen flyger åt fel håll (efter "Till skolan!"): propellern snurrar, och luftskeppet glider ned åt höger mot
   * stigen till byn (SKOLAN) och ut ur bild. @returns {boolean} om det finns bilder
   */
  flygFel() {
    const l = this.luft;
    if (!l || !this.textures.get('baronen').has('luftskepp_flyger_fel_01')) return false;
    this.luftskepp('flyger_fel');
    const img = l.img, byn = this.ruta('stig_byn');
    const fran = { x: img.x + img.width / 2, y: img.y + img.height / 2 };
    const mot = byn ? { x: byn.x + byn.b / 2, y: byn.y + byn.h / 2 } : { x: fran.x + 200, y: fran.y + 80 };
    const d = Math.hypot(mot.x - fran.x, mot.y - fran.y) || 1;
    const ut = 360; // långt nog för att lämna bilden
    l.glider = true;
    this.tweens.add({
      targets: img, x: img.x + ((mot.x - fran.x) / d) * ut, y: img.y + ((mot.y - fran.y) / d) * ut, duration: 1500, ease: 'Sine.easeIn',
      onUpdate: () => { img.x = Math.round(img.x); img.y = Math.round(img.y); this.smutsig = true; },
      onComplete: () => this.luftskeppBort(l),
    });
    return true;
  }

  /**
   * Luftskeppet har flugit iväg och tas bort ur rummet (92.1). Det syns igen först när en regi tar dit det.
   * @param {any} [l] bara om det är samma skepp som flög iväg
   */
  luftskeppBort(l = this.luft) {
    if (!l || this.luft !== l) return;
    for (const t of l.tider) t.remove();
    l.gung.remove();
    this.tweens.killTweensOf(l.img);
    l.rep?.destroy();
    l.img.destroy();
    this.luft = null;
    this.regiLogg.push('luftskeppet borta'); if (this.regiLogg.length > 160) this.regiLogg.shift();
    this.smutsig = true;
  }

  /**
   * En hel bild av hjälten i stället för gången (32 × 40 som svingen, fötterna där gångens fötter är), eller null.
   * Staven göms så länge. @param {string | null} bild
   */
  sattPose(bild) {
    const ny = bild && this.textures.exists('hjalte') && this.textures.get('hjalte').has(bild) ? bild : null;
    if (ny === this.hjaltePose) return;
    this.hjaltePose = ny; this.smutsig = true;
    this.regiLogg.push(`pose:${ny ?? '-'}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
    this.ritaHjalte();
  }

  /** Baronens tropikhjälm trillar ur gondolen och landar i gräset, där den ligger kvar. */
  tappaHjalmen() {
    const l = this.luft; if (!l || !this.textures.get('baronen').has('baronen_hjalm')) return;
    const fran = { x: l.img.x + 70, y: l.img.y + 48 }; // där hjälmen sitter i trasslar_01
    const h = this.add.image(fran.x, fran.y, 'baronen', 'baronen_hjalm').setOrigin(0.5, 1);
    this.lagerLuft.add(h);
    const golv = Math.min(this.kamera.y + RUM.hojd - 30, fran.y + 96);
    this.tweens.add({
      targets: h, y: golv, duration: 900, ease: 'Bounce.easeOut',
      // den driver lite åt sidan och studsar i gräset (pixelbilden vrids inte)
      onUpdate: (tw) => { h.x = Math.round(fran.x + tw.progress * 10); h.y = Math.round(h.y); this.smutsig = true; },
    });
  }

  /**
   * Baronen talar från luftskeppet: munnen rör sig medan repliken läses, och stängs sedan. Gäller bara när han
   * har sett hjälten (före det tittar han i kikaren). @param {string} talare @param {boolean} pa
   */
  talar(talare, pa) {
    const l = this.luft;
    if (talare !== 'baronen' || !l) return;
    // han läser skyltarna: munnen rör sig i samma bild (kikaren kvar)
    if (l.lage === 'laser_skyltarna') {
      for (const t of l.tider) t.remove(); l.tider = [];
      const img = l.img, ram = (/** @type {string} */ r) => { img.setFrame(r); this.smutsig = true; };
      if (!pa || !img.texture.has('luftskepp_laser_skyltarna_talar')) { ram('luftskepp_laser_skyltarna'); return; }
      let i = 0;
      l.tider.push(this.time.addEvent({ delay: 180, loop: true, callback: () => { i++; ram(i % 2 ? 'luftskepp_laser_skyltarna_talar' : 'luftskepp_laser_skyltarna'); } }));
      return;
    }
    if (!['ser_hjalten', 'ser_kartan', 'talar'].includes(l.lage)) return;
    if (pa) this.luftskepp('talar');
    else { for (const t of l.tider) t.remove(); l.tider = []; l.img.setFrame('luftskepp_talar_02'); this.smutsig = true; }
  }

  /**
   * Ett samtal börjar (beslut 34.2): hjälten vänder sig mot den som talar, den som talar vänder sig mot hjälten (om
   * figuren har bilder åt det hållet, `_ner_` byts mot `_upp_`, `_vanster_` eller `_hoger_`), och ungen tittar på
   * den som talar. Baronen talar från luftskeppet: då tittar hjälten och ungen dit. Inte när hjälten sover eller
   * klättrar. @param {string} talare @returns {boolean} om någon vände sig
   */
  vandMotTalare(talare) {
    if (!this.harRum || this.sover || this.klattrar || !talare) return false;
    const o = this.objekt.find((x) => x.talare === talare && this.ritade.has(x.id));
    let mal = null;
    if (o) mal = { x: o.x + o.b / 2, y: o.y + o.h - 2 };
    else if (talare === 'baronen' && this.luft) mal = { x: this.luft.img.x + this.luft.img.width / 2, y: this.luft.img.y + this.luft.img.height };
    if (!mal) return false;
    const dx = mal.x - this.pos.x, dy = mal.y - this.pos.y, l = Math.hypot(dx, dy) || 1;
    this.vand = { x: dx / l, y: dy / l };
    this.ritaHjalte();
    // figuren mot hjälten: bara bildens riktning byts, och bara om bilden finns
    const img = o ? /** @type {any} */ (this.ritade.get(o.id)) : null;
    const bild = img?.frame?.name;
    if (bild && /_(ner|upp|vanster|hoger)_/.test(bild)) {
      const ny = bild.replace(/_(ner|upp|vanster|hoger)_/, `_${riktningFor({ x: -dx / l, y: -dy / l })}_`);
      if (img.texture.has(ny) && ny !== bild) { img.setFrame(ny); this.smutsig = true; }
    }
    // ungen tittar på den som talar, också om den kommer gående just nu (den vänder sig när den stannar)
    this.ungeTittarPa = { ...mal, till: this.time.now + 6000 };
    if (this.unge.visible && !this.ungeMal) {
      const ux = mal.x - this.ungePos.x, uy = mal.y - this.ungePos.y, ul = Math.hypot(ux, uy) || 1;
      this.ungeVand = { x: ux / ul, y: uy / ul };
      this.ritaUngen();
    }
    this.samtal = { talare, riktning: riktningFor(this.vand) };
    this.smutsig = true;
    return true;
  }

  /**
   * Hur ser talaren ut i pratrutan just nu (porträttets min)? Baronen är förvånad innan han ser hjälten och när han
   * får syn på kartbiten, och annars stolt. null = som vanligt. Den sura minen (Stil) används inte än: efter
   * trasslet säger han bara något stolt ("Till skolan!"). @param {string} talare
   * @returns {string | null}
   */
  uttryck(talare) {
    if (this.duellFig && talare === this.duellFig.figur) return portrattUttryck(this.duellFig.lage);
    if (talare !== 'baronen' || !this.luft) return null;
    return ['glider', 'skata_landar', 'ser_kartan'].includes(this.luft.lage) ? 'forvanad' : 'stolt';
  }

  /**
   * En sidovy (mellanscen från sidan): bakgrunden täcker skärmen, och det som rör sig läggs ovanpå. In i skogen:
   * det lilla luftskeppet glider åt vänster ovanför träden (åt fel håll), och hjälten och ungen springer åt
   * höger in i skogen. Sidovyn står kvar tills nästa rum. @param {string} bild @param {number} [ms]
   */
  visaSidovy(bild, ms = 3600) {
    this.rensaSidovy();
    this.senasteSidovy = bild;
    const k = this.kamera, c = this.sidovy;
    c.setPosition(k.x, k.y).setVisible(true).setAlpha(0);
    c.add(this.add.image(0, 0, `sidovy_${bild}_bakgrund`).setOrigin(0, 0));
    this.tweens.add({ targets: c, alpha: 1, duration: 300, onUpdate: () => { this.smutsig = true; } });
    if (this.textures.exists(`sidovy_${bild}_luftskepp`)) {
      const ls = this.add.image(RUM.bredd - 70, 8, `sidovy_${bild}_luftskepp`).setOrigin(0, 0);
      c.add(ls);
      this.tweens.add({ targets: ls, x: -60, duration: ms * 2.2, onUpdate: () => { ls.x = Math.round(ls.x); this.smutsig = true; } });
    }
    // under bryggan (Stil del 3b, sidovy/bryggan.py): de står på däcket (fötterna på y 74) i stället för att springa
    if (bild === 'under_bryggan') { this.underBryggan(bild, c, ms); return; }
    // hjälten och ungen springer på stigen (stigen går tvärs över bilden, fötterna på y 162)
    const fot = 162, figurer = [];
    const skugga = this.textures.exists('skugga');
    const hjalte = this.add.container(-24, fot - 24);
    if (skugga) hjalte.add(this.add.image(0, 0, 'skugga', 'skugga_16x24').setOrigin(0, 0));
    const kropp = this.add.image(0, 0, this.hjalteTextur || 'hjalte', 'hjalte_ga_hoger_01').setOrigin(0, 0);
    hjalte.add(kropp);
    if (this.harStav && this.stav) hjalte.add(this.add.image(0, 0, this.stav.texture.key, 'stav_hand_hoger_01').setOrigin(0, 0));
    figurer.push({ c: hjalte, img: kropp, ram: 'hjalte_ga_hoger_0', start: -24 });
    if (this.textures.exists('unge') && this.visaUnge) {
      const unge = this.add.container(-60, fot - 24);
      if (skugga) unge.add(this.add.image(0, 0, 'skugga', 'skugga_24x24').setOrigin(0, 0));
      const ub = this.add.image(0, 0, 'unge', 'unge1_ga_hoger_01').setOrigin(0, 0);
      unge.add(ub);
      figurer.push({ c: unge, img: ub, ram: 'unge1_ga_hoger_0', start: -60 });
    }
    for (const f of figurer) {
      c.add(f.c);
      this.tweens.add({
        targets: f.c, x: RUM.bredd + 40 + f.start, duration: ms, delay: 300,
        onUpdate: () => { f.c.x = Math.round(f.c.x); f.img.setFrame(`${f.ram}${1 + (Math.floor(this.time.now / 110) % 4)}`); this.smutsig = true; },
      });
    }
    // vid bron (k1s13, 10b): baronen sitter bakom busken vid brons östra fäste, på andra stranden (5d: 48 × 40 på
    // x 252, y 86, busken i bilden), och läser sin lapp upp och ned. Herr Skata flyger in från höger och landar på
    // tropikhjälmen (x 265, y 93), så att hjälmen åker ner över ögonen (bild 3). Han ser dem aldrig.
    if (this.textures.exists(`sidovy_${bild}_baronen_01`)) {
      const stor = this.textures.getFrame(`sidovy_${bild}_baronen_01`)?.width >= 48;
      const bx = stor ? 252 : 160, by = stor ? 86 : 112, hjalm = stor ? { x: 265 - 9, y: 93 - 11 } : { x: 169, y: 105 };
      const baron = this.add.image(bx, by, `sidovy_${bild}_baronen_01`).setOrigin(0, 0);
      c.addAt(baron, 1);
      const las = this.time.addEvent({ delay: 400, loop: true, callback: () => { if (!baron.active) return; baron.setTexture(`sidovy_${bild}_baronen_0${baron.texture.key.endsWith('01') ? 2 : 1}`); this.smutsig = true; } });
      if (this.textures.exists(`sidovy_${bild}_skata_01`)) {
        const skata = this.add.image(RUM.bredd + 4, 60, `sidovy_${bild}_skata_01`).setOrigin(0, 0);
        c.add(skata);
        this.tweens.add({
          targets: skata, x: hjalm.x, y: hjalm.y, duration: 800, delay: 1500, ease: 'Sine.easeOut',
          onUpdate: () => { skata.x = Math.round(skata.x); skata.y = Math.round(skata.y); skata.setTexture(`sidovy_${bild}_skata_0${1 + (Math.floor(this.time.now / 120) % 2)}`); this.smutsig = true; },
          onComplete: () => { las.remove(); skata.destroy(); if (baron.active && this.textures.exists(`sidovy_${bild}_baronen_03`)) baron.setTexture(`sidovy_${bild}_baronen_03`); this.smutsig = true; },
        });
      }
    }
  }

  /**
   * Under bryggan (k2s04, Stil del 3b): baronen sitter i leran mellan pålarna och gräver (bild 01–02), och till sist
   * håller han upp bit 7 (bild 03). Herr Skata sitter på förtöjningspålen, en fisk sprattlar upp ur leran och plumsar
   * tillbaka, och hjälten och ungen går in på däcket ovanför och stannar. Platserna är Stils (övre vänstra hörnet).
   * @param {string} bild @param {Phaser.GameObjects.Container} c @param {number} ms
   */
  underBryggan(bild, c, ms) {
    const tid = (/** @type {number} */ d, /** @type {() => void} */ f) => this.time.delayedCall(d, () => { if (c.visible) { f(); this.smutsig = true; } });
    if (this.textures.exists(`sidovy_${bild}_baronen_01`)) {
      const baron = this.add.image(150, 128, `sidovy_${bild}_baronen_01`).setOrigin(0, 0);
      c.add(baron);
      const grav = this.time.addEvent({ delay: 300, loop: true, callback: () => { if (!baron.active) return grav.remove(); baron.setTexture(`sidovy_${bild}_baronen_0${baron.texture.key.endsWith('01') ? 2 : 1}`); this.smutsig = true; } });
      if (this.textures.exists(`sidovy_${bild}_baronen_03`)) tid(ms - 600, () => { grav.remove(); if (baron.active) baron.setTexture(`sidovy_${bild}_baronen_03`); });
    }
    if (this.textures.exists('herr_skata') && this.textures.get('herr_skata').has('herr_skata_sitta_vanster_01')) {
      const skata = this.add.image(95, 49, 'herr_skata', 'herr_skata_sitta_vanster_01').setOrigin(0, 0);
      c.add(skata);
      const putsa = this.time.addEvent({ delay: 700, loop: true, callback: () => { if (!skata.active) return putsa.remove(); skata.setFrame(`herr_skata_sitta_vanster_0${skata.frame.name.endsWith('01') ? 2 : 1}`); this.smutsig = true; } });
    }
    if (this.textures.exists(`sidovy_${bild}_fisk_01`)) {
      const fisk = this.add.image(226, 150, `sidovy_${bild}_fisk_01`).setOrigin(0, 0).setVisible(false);
      c.add(fisk);
      tid(ms * 0.55, () => fisk.setVisible(true));
      for (let i = 1; i < 6; i++) tid(ms * 0.55 + 150 * i, () => fisk.active && fisk.setTexture(`sidovy_${bild}_fisk_0${1 + (i % 2)}`));
      tid(ms * 0.55 + 950, () => fisk.active && fisk.setVisible(false));
    }
    // hjälten och ungen går in på däcket från vänster och stannar (Stils prov: ungen x 40, hjälten x 66)
    const fot = 74;
    const figurer = [];
    const hjalte = this.add.container(-24, fot - 24);
    const kropp = this.add.image(0, 0, this.hjalteTextur || 'hjalte', 'hjalte_ga_hoger_01').setOrigin(0, 0);
    hjalte.add(kropp);
    if (this.harStav && this.stav) hjalte.add(this.add.image(0, 0, this.stav.texture.key, 'stav_hand_hoger_01').setOrigin(0, 0));
    figurer.push({ c: hjalte, img: kropp, ram: 'hjalte_ga_hoger_0', till: 66, stilla: 'hjalte_ga_hoger_01' });
    if (this.textures.exists('unge') && this.visaUnge) {
      const unge = this.add.container(-52, fot - 24);
      const ub = this.add.image(0, 0, 'unge', 'unge1_ga_hoger_01').setOrigin(0, 0);
      unge.add(ub);
      figurer.push({ c: unge, img: ub, ram: 'unge1_ga_hoger_0', till: 36, stilla: 'unge1_tomgang_hoger_01' });
    }
    for (const f of figurer) {
      c.add(f.c);
      this.tweens.add({
        targets: f.c, x: f.till, duration: Math.round(ms * 0.4), delay: 200,
        onUpdate: () => { f.c.x = Math.round(f.c.x); f.img.setFrame(`${f.ram}${1 + (Math.floor(this.time.now / 110) % 4)}`); this.smutsig = true; },
        onComplete: () => { if (f.img.active && f.img.texture.has(f.stilla)) f.img.setFrame(f.stilla); this.smutsig = true; },
      });
    }
    this.regiLogg.push('under bryggan');
    // 92.4: samma plats uppifrån. När sidovyn tonas bort står baronen och Herr Skata där sidovyn visade dem
    this.bryggfigurer('sitter');
  }

  /**
   * Baronen och Herr Skata vid bryggan, uppifrån (92.4), där sidovyn under bryggan visar dem. Sidovyns x (0–320)
   * motsvarar bryggans längd uppifrån (kartans föremål `brygga`): baronen i leran söder om däcket, och Herr Skata på
   * pålen norr om det. Stil har ingen bild av baronen i leran uppifrån än: han står i sin stillbild, avskuren vid
   * knäna. `skata_ramlar`: Herr Skata skrattar och ramlar av pålen (och sitter sedan på bryggan). `lyfter`: baronen
   * klättrar upp mot luftskeppet vid bryggans ände och är borta, och Herr Skata flyger efter. Rummet byts: borta.
   * @param {'sitter' | 'skata_ramlar' | 'lyfter'} lage @returns {number} ms
   */
  bryggfigurer(lage) {
    const b = this.ruta('brygga');
    if (!b) return 0;
    const x = (/** @type {number} */ sx) => Math.round(b.x + (sx * b.b) / RUM.bredd);
    if (lage === 'sitter') {
      this.bryggFig?.forEach((f) => f.destroy());
      this.bryggFig = [];
      const tex = this.textures.exists('baronen') ? this.textures.get('baronen') : null;
      if (tex?.has('baronen_lera_ner_01')) {
        // Stils baron till knäna i leran (93.7), i två bilder som växlar långsamt (golvets gränser, minst 400 ms).
        // Sidovyns baron står på x 150–198: mitten 174, i leran strax söder om däcket
        const baron = this.add.image(x(174), b.y + b.h + 14, 'baronen', 'baronen_lera_ner_01').setOrigin(0.5, 1);
        /** @type {any} */ (baron).fot = baron.y;
        this.lagerFigurer.add(baron); this.bryggFig.push(baron);
        if (tex.has('baronen_lera_ner_02')) {
          const vick = this.time.addEvent({ delay: 600, loop: true, callback: () => { if (!baron.active || !/** @type {any} */ (baron).iLeran) { vick.remove(); return; } baron.setFrame(baron.frame.name.endsWith('_01') ? 'baronen_lera_ner_02' : 'baronen_lera_ner_01'); this.smutsig = true; } });
          /** @type {any} */ (baron).iLeran = true;
        }
      } else if (tex?.has('baronen_ga_ner_01')) {
        // utan Stils bild: hans stillbild, avskuren vid knäna
        const baron = this.add.image(x(174), b.y + b.h + 14, 'baronen', 'baronen_ga_ner_01').setOrigin(0.5, 1);
        baron.setCrop(0, 0, baron.width, baron.height - 7);
        baron.y += 7; /** @type {any} */ (baron).fot = baron.y;
        this.lagerFigurer.add(baron); this.bryggFig.push(baron);
      }
      if (this.textures.exists('herr_skata') && this.textures.get('herr_skata').has('herr_skata_sitta_hoger_01')) {
        // sidovyns påle på x ca 100: Herr Skata på pålen vid däckets norra kant
        const skata = this.add.image(x(100), b.y - 1, 'herr_skata', 'herr_skata_sitta_hoger_01').setOrigin(0.5, 1);
        /** @type {any} */ (skata).fot = skata.y; /** @type {any} */ (skata).skata = true;
        this.lagerFigurer.add(skata); this.bryggFig.push(skata);
      }
      // 95.6: luftskeppet är förtöjt vid bryggans mast så länge baronen är här, med repstegen nere på däcket
      this.luftskeppFortojt(b);
      this.smutsig = true;
      return 0;
    }
    const figurer = this.bryggFig ?? [];
    const skata = figurer.find((f) => /** @type {any} */ (f).skata && f.active);
    const baron = figurer.find((f) => !(/** @type {any} */ (f).skata) && f.active);
    if (lage === 'skata_ramlar') {
      if (!skata) return 0;
      const ram = (/** @type {number} */ n) => this.textures.get('herr_skata').has(`herr_skata_krascha_hoger_0${n}`) && skata.setFrame(`herr_skata_krascha_hoger_0${n}`);
      for (let n = 1; n <= 4; n++) this.time.delayedCall((n - 1) * 150, () => { if (skata.active) { ram(n); this.smutsig = true; } });
      this.tweens.add({ targets: skata, y: skata.y + 10, duration: 500, delay: 150, ease: 'Bounce.easeOut', onUpdate: () => { skata.y = Math.round(skata.y); this.smutsig = true; }, onComplete: () => { /** @type {any} */ (skata).fot = skata.y; if (skata.active) skata.setFrame('herr_skata_sitta_hoger_01'); this.smutsig = true; } });
      this.regiLogg.push('Herr Skata ramlar av pålen');
      return 900;
    }
    // lyfter (95.6): baronen går ur leran till repstegen, klättrar upp i gondolen, och Herr Skata flyger efter. Sedan
    // lossnar skeppet från masten, lyfter och flyger ut ur bild, och först då tas det bort (92.1)
    const l = this.luft, fortojt = l?.fortojt ? l : null;
    const stege = fortojt ? { x: fortojt.img.x + STEGE.x, y: fortojt.img.y + STEGE.nedre } : { x: b.x + b.b - 12, y: b.y - 40 };
    const gondol = fortojt ? { x: fortojt.img.x + STEGE.x, y: fortojt.img.y + STEGE.ovre } : stege;
    const GA = 600, KLATTRA = 700, LYFT = 1400;
    if (baron) {
      /** @type {any} */ (baron).iLeran = false; baron.setCrop();
      const ram = (/** @type {string} */ r) => { if (baron.active && this.textures.get('baronen').has(r)) { baron.setFrame(r); this.smutsig = true; } };
      let n = 0;
      const gang = this.time.addEvent({ delay: 150, loop: true, callback: () => { n++; ram(`baronen_ga_upp_0${(n % 4) + 1}`); } });
      ram('baronen_ga_upp_01');
      this.tweens.add({
        targets: baron, x: stege.x, y: stege.y, duration: GA, ease: 'Linear',
        onUpdate: () => { baron.x = Math.round(baron.x); baron.y = Math.round(baron.y); /** @type {any} */ (baron).fot = baron.y; this.smutsig = true; },
        onComplete: () => {
          if (!baron.active) { gang.remove(); return; }
          // på repstegen: framför stegen, med ryggen mot kameran
          if (fortojt) { this.lagerFigurer.remove(baron); this.lagerLuft.add(baron); }
          this.tweens.add({
            targets: baron, y: gondol.y, duration: KLATTRA, ease: 'Linear',
            onUpdate: () => { baron.y = Math.round(baron.y / 2) * 2; this.smutsig = true; },
            onComplete: () => { gang.remove(); baron.destroy(); if (fortojt && this.luft === fortojt) { fortojt.img.setTexture('baronen', 'luftskepp_glider_01'); this.smutsig = true; } },
          });
        },
      });
    }
    if (skata) {
      if (this.textures.get('herr_skata').has('herr_skata_flyga_hoger_01')) skata.setFrame('herr_skata_flyga_hoger_01');
      const mot = fortojt ? { x: fortojt.img.x + 56, y: fortojt.img.y + 44 } : stege;
      this.tweens.add({
        targets: skata, x: mot.x, y: mot.y, duration: GA + KLATTRA, ease: 'Sine.easeInOut',
        onUpdate: () => { skata.x = Math.round(skata.x); skata.y = Math.round(skata.y); this.smutsig = true; },
        onComplete: () => { skata.destroy(); if (fortojt && this.luft === fortojt && this.textures.get('baronen').has('luftskepp_skata_landar')) { fortojt.img.setTexture('baronen', 'luftskepp_skata_landar'); this.smutsig = true; } else if (!fortojt) this.smutsig = true; },
      });
    }
    // bryggFig står kvar tills figurerna är borta (de tas bort när de har klättrat upp eller flugit dit)
    this.regiLogg.push('baronen lyfter från bryggan');
    if (!fortojt) return 1500;
    // repet till masten släpps, och skeppet lyfter snett uppåt åt höger ut ur bild
    const img = fortojt.img;
    fortojt.tider.push(this.time.delayedCall(GA + KLATTRA + 100, () => {
      if (this.luft !== fortojt) return;
      fortojt.rep?.destroy(); fortojt.rep = null;
      this.regiLogg.push('luftskeppet lossnar från masten');
      const k = this.kamera;
      this.tweens.add({
        targets: img, x: img.x + 90, y: k.y - img.height - 8, duration: LYFT, ease: 'Sine.easeIn',
        onUpdate: () => { img.x = Math.round(img.x); img.y = Math.round(img.y); this.smutsig = true; },
        onComplete: () => this.luftskeppBort(fortojt),
      });
    }));
    return GA + KLATTRA + 100 + LYFT + 100;
  }

  /**
   * Luftskeppet förtöjt vid bryggans mast (95.6), med repstegen nere på däcket, medan baronen sitter i leran. Gondolen
   * är tom: baronen är ju i leran. Stil har ingen bild av den tomma gondolen än, så den görs av skeppets bild med
   * baronen borttagen (gråbox). Ett rep går från skeppets akter till mässingskulan på masten.
   * @param {{ x: number, y: number, b: number, h: number }} b bryggans däck
   */
  luftskeppFortojt(b) {
    if (!this.textures.exists('baronen') || !this.textures.get('baronen').has('luftskepp_glider_01')) return;
    if (this.luft) this.luftskeppBort(this.luft);
    const mast = this.regiPunkter?.mast ?? { x: b.x + b.b - 17, y: 36 };
    const tom = this.tomGondol();
    // repstegens fot mitt på däcket, och aktern en bit väster om masten (repet syns)
    const x0 = Math.round(mast.x - 137), y0 = Math.round(b.y + b.h / 2 - STEGE.nedre);
    const img = this.add.image(x0, y0, tom.nyckel, tom.ram).setOrigin(0, 0);
    this.lagerLuft.add(img);
    const rep = this.add.graphics();
    rep.lineStyle(1, 0x5a4a32, 1);
    rep.lineBetween(x0 + AKTER.x, y0 + AKTER.y, mast.x - 1, mast.y);
    this.lagerLuft.add(rep);
    // förtöjt: det svävar inte (gung gör inget så länge glider är sant)
    const gung = this.time.addEvent({ delay: 100000, loop: true, callback: () => {} });
    this.luft = { img, lage: 'fortojt', tider: /** @type {Phaser.Time.TimerEvent[]} */ ([]), gung, glider: true, mal: { x: x0, y: y0 }, fortojt: true, rep };
    this.regiLogg.push('luftskeppet förtöjt vid bryggan'); if (this.regiLogg.length > 160) this.regiLogg.shift();
    this.smutsig = true;
  }

  /**
   * Skeppet med tom gondol: `luftskepp_tom` om Stil har ritat den, annars skeppets bild med baronen borttagen
   * (rutan mellan repen ovanför gondolen). Görs en gång. @returns {{ nyckel: string, ram: string | undefined }}
   */
  tomGondol() {
    if (this.textures.get('baronen').has('luftskepp_tom')) return { nyckel: 'baronen', ram: 'luftskepp_tom' };
    const nyckel = 'luftskepp_tom_gondol';
    if (!this.textures.exists(nyckel)) {
      const fr = this.textures.getFrame('baronen', 'luftskepp_glider_01');
      const ct = this.textures.createCanvas(nyckel, fr.cutWidth, fr.cutHeight);
      const ctx = /** @type {CanvasRenderingContext2D} */ (ct?.getContext());
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(/** @type {any} */ (fr.source.image), fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
      // baronen sitter mellan repen (x 41–71) ovanför gondolens kant (y 38–59)
      ctx.clearRect(41, 38, 31, 22);
      ct?.refresh();
    }
    return { nyckel, ram: undefined };
  }

  /** Sidovyn tonas bort när han ska röra sig i rummet igen (in i skogen i början av k1s01). */
  doljSidovy() {
    if (!this.sidovy.visible) return;
    this.tweens.killTweensOf(this.sidovy);
    this.tweens.add({ targets: this.sidovy, alpha: 0, duration: 300, onUpdate: () => { this.smutsig = true; }, onComplete: () => this.rensaSidovy() });
  }

  /** @private */
  rensaSidovy() {
    this.sidovy.each((/** @type {any} */ x) => this.tweens.killTweensOf(x));
    this.sidovy.removeAll(true); this.sidovy.setVisible(false);
  }

  /**
   * Hjälten klättrar på stegen: ryggen mot kameran, upp eller ned längs stegen. Ingen styrning på stegen.
   * @param {string} id stegen @param {'upp' | 'ned'} riktning @param {'av' | 'pa'} hur pa = från golvet upp på stegen
   *   (och vidare till luckan), av = från luckan längs stegen ned till golvet (eller upp ur luckan) @param {number} ms
   * @returns {Promise<void>}
   */
  klattra(id, riktning, hur, ms) {
    const o = this.ruta(id); if (!o) return Promise.resolve();
    const f = framfor(o);
    const x = Math.round(o.x + o.b / 2);
    // stegen i hallen står mot bakväggen: toppen är luckan i taket. Luckan på vinden ligger i golvet.
    const topp = { x, y: o.y + FIGUR.hojd - 4 }, golvet = { x: f.x, y: f.y };
    const lucka = { x, y: o.y + o.h + 4 };
    let fran, till;
    if (riktning === 'upp') { fran = hur === 'pa' ? golvet : lucka; till = hur === 'pa' ? topp : golvet; }
    else { fran = hur === 'pa' ? golvet : topp; till = hur === 'pa' ? lucka : golvet; }
    // ungen klättrar inte: den väntar och kommer efter med ett skutt
    this.klattrar = true; this.sattRygg(true); this.b.inmatning.rensaGaTill(); this.unge.setVisible(false);
    this.pos = { ...fran }; this.ungePos = { ...fran }; this.placera();
    return new Promise((klar) => {
      const p = { ...fran };
      this.tweens.add({
        targets: p, x: till.x, y: till.y, duration: Math.max(1, ms), ease: 'Linear',
        onUpdate: () => { this.pos = { x: p.x, y: Math.round(p.y / 2) * 2 }; this.placera(); },
        onComplete: () => {
          this.pos = { ...till }; this.placera();
          if (hur === 'av') {
            this.klattrar = false; this.sattRygg(false);
            this.pos = this.hinder.narmasteFria(this.pos); this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
            this.unge.setVisible(this.harRum && this.visaUnge); this.placera();
          }
          klar();
        },
      });
    });
  }

  /**
   * Föremålets bild som en bild-URL (målet i molnet, beslut 31.2), eller null om föremålet inte har någon bild.
   * @param {string} id @returns {{ url: string, b: number, h: number } | null}
   */
  malBild(id) {
    const o = this.ruta(id);
    const fb = o?.bild ? foremalsbild(this, o.bild) : null;
    if (!fb) return null;
    try {
      const ram = this.textures.getFrame(fb.nyckel, fb.ram);
      const url = this.textures.getBase64(fb.nyckel, fb.ram);
      return url && ram ? { url, b: ram.cutWidth, h: ram.cutHeight } : null;
    } catch (e) { return null; }
  }

  /** En bild av rummet som det ser ut nu (för glidningen mellan rum). @returns {Promise<HTMLImageElement | null>} */
  bild() {
    // en bild i taget: ritningen har bara en väntande bild, så glidningen och fotot (F4) står i kö
    /** @type {Promise<HTMLImageElement | null>} */
    const p = (this.bildKo || Promise.resolve(null)).then(() => new Promise((klar) => {
      this.smutsig = true;
      try { this.game.renderer.snapshot((img) => klar(/** @type {HTMLImageElement} */ (img))); } catch (e) { klar(null); }
      setTimeout(() => klar(null), 500);
    }));
    this.bildKo = p;
    return p;
  }

  /**
   * Startskärmens foto (10e, F4): rummet där han är, 160 × 96 runt hjälten, som PNG. Ingen bild när inget rum
   * syns (en sidovy, en mellanscen) eller när ritningen inte ger någon. Billigt: en bild av hela ytan (320 × 192)
   * som redan finns för glidningen, och en liten duk som skärs ut ur den.
   * @returns {Promise<string | null>}
   */
  async foto() {
    if (!this.harRum || this.sidovy?.visible) return null;
    const sx = this.pos.x - this.kamera.x, sy = this.pos.y - this.kamera.y - 10;
    const img = await this.bild();
    if (!img) return null;
    try {
      const B = 160, H = 96;
      const x = Math.max(0, Math.min(RUM.bredd - B, Math.round(sx - B / 2))), y = Math.max(0, Math.min(RUM.hojd - H, Math.round(sy - H / 2)));
      const c = document.createElement('canvas'); c.width = B; c.height = H;
      const g = c.getContext('2d');
      if (!g) return null;
      g.imageSmoothingEnabled = false;
      // bilden har duken storlek (320 × 192), men räkna om för säkerhets skull
      const k = (img.naturalWidth || img.width || RUM.bredd) / RUM.bredd;
      g.drawImage(img, x * k, y * k, B * k, H * k, 0, 0, B, H);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }

  ritaUnge() {
    this.unge.removeAll(true);
    if (this.textures.exists('unge')) {
      // ungen i en ruta på 24 × 24 med fötterna nere, och skuggan under (10b)
      this.ungeSkugga = this.textures.exists('skugga') ? this.add.image(0, 0, 'skugga', 'skugga_24x24').setOrigin(0, 0) : null;
      this.ungeBild = this.add.image(0, 0, 'unge', 'unge1_ga_ner_01').setOrigin(0, 0);
      // vasstopparna vid fötterna (82.8): ungens fötter står i rutans mitt, en pixel ovanför nederkanten
      this.vassUnge = this.vassVidFotter(12, 23);
      this.unge.add(/** @type {any[]} */ ([this.ungeSkugga, this.ungeBild, this.vassUnge].filter(Boolean)));
      return;
    }
    this.unge.add([this.add.rectangle(0, 0, 12, 12, FARG.unge).setOrigin(0, 0), this.add.rectangle(2, 6, 8, 5, FARG.ungeMage).setOrigin(0, 0)]);
  }

  /**
   * Ungens bild just nu: en reaktion som pågår, annars gången åt det håll den springer, nosandet när den pekar,
   * och andningen när den står still. Bilden byts bara när namnet ändras (golvdatorn).
   */
  ritaUngen() {
    const u = this.ungeBild; if (!u) return;
    const nu = this.time.now, r = riktningFor(this.ungeVand || { x: 0, y: 1 });
    const sida = r === 'upp' ? 'ner' : r; // reaktionerna är ritade framifrån och från sidan
    let namn;
    const re = this.ungeReaktion;
    const us = this.ungeSang, ust = us ? nu - us.start : 0;
    if (us && ust >= 0 && us.fas === 'hopp') namn = `unge1_glad_ner_0${1 + Math.min(2, Math.floor(ust / 150))}`;
    else if (us && us.fas === 'varv') namn = `unge1_tomgang_${['ner', 'hoger', 'upp', 'vanster'][Math.floor((ust - 450) / us.ms) % 4]}_01`;
    else if (us && us.fas === 'sover') namn = `unge1_sover_ner_0${1 + (Math.floor(nu / 900) % 2)}`;
    else if (this.ungeFast && this.ungeLeraBilder()) namn = this.ungeFast.djup < 12 ? `unge1_sjunker_ner_0${Math.min(3, 1 + Math.floor(this.ungeFast.djup / 4))}` : `unge1_lera_ner_0${1 + (Math.floor(nu / 300) % 2)}`; // Stils lera (del 3b): sjunker i tre steg och sprattlar
    else if (this.ungeFast) namn = `unge1_radd_ner_0${1 + (Math.floor((nu - this.ungeFast.start) / 500) % 2)}`; // fast i leran: förvånad
    else if (this.ungeKlattrar) namn = `unge1_klattra_upp_0${1 + (Math.floor((nu - this.ungeKlattrar.start) / 180) % 2)}`;
    else if (re && nu < re.slut && re.hall) namn = `unge1_${re.namn}_${re.hall}_0${1 + (Math.floor((nu - re.start) / re.ms) % re.bilder)}`; // ett läge (31): bilderna i en slinga
    else if (re && nu < re.slut) namn = `unge1_${re.namn}_${re.sida ? sida : 'ner'}_0${1 + Math.min(re.bilder - 1, Math.floor((nu - re.start) / re.ms))}`;
    else if (this.ungeMal && Math.hypot(this.ungeMal.x - this.ungePos.x, this.ungeMal.y - this.ungePos.y) < 3) namn = `unge1_nosar_${riktningFor({ x: Math.cos(this.ungeMal.mot), y: Math.sin(this.ungeMal.mot) })}_0${1 + (Math.floor(nu / 220) % 2)}`;
    else if (this.ungeGar) namn = `unge1_ga_${r}_0${1 + (Math.floor((this.ungeGang || 0) / GANG_STEG) % 4)}`;
    else namn = `unge1_tomgang_${r}_0${1 + (Math.floor(nu / 900) % 2)}`;
    if (!this.textures.get('unge').has(namn)) namn = `unge1_ga_${r}_01`;
    if (u.frame.name !== namn) { u.setFrame(namn); this.smutsig = true; }
  }

  /**
   * Visa ett rum (eller inget rum, för scener utan rum).
   * @param {{ rum: string | null, scen?: string, tillstand: string | null, innehall: (string | { id: string, syns_i?: string[] })[], unge: boolean, nyttRum: boolean,
   *           karta?: import('../karna/karta.js').Karta | null, franRum?: string | null,
   *           delar?: Record<string, { farg: number | null, storlek: string | null }[]>, visade?: string[],
   *           kvar?: import('../karna/rumslayout.js').Objekt[] }} v
   * visade = dolda föremål som ett steg har visat (visa_foremal), kvar = det som står kvar efter hugget (bild_kvar)
   */
  visa(v) {
    this.harRum = !!v.rum;
    let viaHissen = false;
    if (v.nyttRum || !this.harRum) { this.rumsbild = (this.harRum && v.karta?.bild) || null; this.falt = faltFor(this.rumsbild); this.mark = (this.harRum && v.karta?.mark) || null; this.rumId = v.rum; this.markObjekt = v.karta?.objekt || []; }
    this.visaUnge = v.unge;
    if (v.nyttRum) { for (const id of [...this.ramSlinga.keys(), ...this.ramTimrar.keys()]) this.stoppaRamar(id); this.ramFor.clear(); this.dolda.clear(); this.ungeMal = null; this.ungeTittarPa = null; this.ungeKlattrar = null; this.stegeNu = null; this.ungeSang = null; this.ungeLyft = 0; this.ungeFast = null; this.hjalteFast = null; this.lerig = 0; this.undvik = []; this.hinderUndvik = null; this.regiFokus = null; this.forstFokus = false; if (this.ungeSvavar) { this.ungeSvavar.g.destroy(); this.ungeSvavar = null; } for (const g of this.lagda) g.destroy(); this.lagda = []; this.sparrade.clear(); if (this.sover) { this.sover.andas?.remove(); this.sover = null; } this.vaknar = null; this.rensaRegi(); this.k3UngeIVattnet = false; this.k3Huvud = null; this.k3Mjol = null; this.k3Skugga = null; this.k3Simmar = null; this.k3Ankare = null; this.k3Bubbla = null; this.k3AnkareMitt = null; if (this.k4?.fjarran) { this.cameras.main.setZoom(1); this.b.vidFjarrvy?.(false); } this.k4 = null; this.rensaStig(); viaHissen = this.k3IHissen; this.k3IHissen = false; this.hjalte.setAlpha(1); this.unge.setAlpha(1); this.naraVinkat.clear(); this.blasNr++; if (this.hjaltePose?.startsWith('hjalte_blaser_')) this.sattPose(null); }
    this.tillstand = v.tillstand;
    // figurerna på kvällen (84.2): bilderna byggs första gången, sedan byts bara atlasens källa
    sattKvall(this, this.harRum && v.tillstand === 'kvall' ? KVALL_TABELL : null);
    if (v.nyttRum || !this.harRum) this.regiPunkter = (this.harRum && v.karta?.regi) || {};
    if (v.nyttRum || !this.harRum) this.inomhus = !!v.karta?.inomhus;
    this.lampor = v.karta?.lampor || [];
    this.morkerNatt = v.karta?.morker ?? null;
    if (v.nyttRum || !this.harRum) this.vagg = v.karta?.vagg || VAGG;
    if (v.nyttRum || !this.harRum) this.massiv = (this.harRum && v.karta?.massiv) || [];
    if (v.nyttRum || !this.harRum) { this.storlek = (this.harRum && v.karta?.storlek) || { bredd: RUM.bredd, hojd: RUM.hojd }; this.omrade = null; }
    if (v.nyttRum || !this.harRum) { this.rutlager = (this.harRum && v.karta?.rutlager) || []; this.overHinder = (this.harRum && v.karta?.overHinder) || []; this.livet?.bygg((this.harRum && v.karta?.omgivning) || []); }
    // det som syns (de dolda föremål som har visats) styr rutlager som syns med ett föremål (den hemliga stigen)
    this.synligaIds = this.harRum ? synligaIds(v.innehall, v.tillstand, v.visade) : [];
    // det som har bytt bild (bild_sedan: häcken med hålet, stubben med bären)
    this.bytta = new Set(v.bytta || []);
    this.ritaGolv(this.harRum);
    // föremål som bara syns i vissa tillstånd (ägget när ljuset är tänt) gör att rummet byggs om
    const synliga = this.harRum ? [...this.synligaIds, '|', ...[...this.bytta].sort()].join(' ') : '';
    const andrat = synliga !== this.synliga;
    this.synliga = synliga;
    if (v.nyttRum || !this.harRum || andrat) {
      const fore = new Set((this.objekt || []).map((o) => o.id));
      if (v.nyttRum) { this.flyttade.clear(); this.kvarDelar.clear(); }
      this.objekt = this.harRum ? rumsObjekt(v.innehall, v.tillstand, v.karta, v.visade) : [];
      for (const o of this.objekt) { const f = this.flyttade.get(o.id); if (f) { o.x = f.x; o.y = f.y; } }
      // tussarna som står kvar efter fältet (75.3) ersätter det hela föremålet, också i ett annat tillstånd
      if (this.kvarDelar.size) {
        const baser = new Set([...this.kvarDelar.values()].map((d) => d.delAv));
        this.objekt = this.objekt.filter((o) => !baser.has(o.id)).concat([...this.kvarDelar.values()].map((d) => ({ ...d })));
      }
      // en figur som klättrar ned när den visas (apan när den är räddad, 56.4): bara i rummet han redan är i
      const klattrar = v.nyttRum ? [] : this.objekt.filter((o) => o.klattrarFran && !fore.has(o.id)).map((o) => o.id);
      for (const g of this.hogaBilder) g.destroy(); this.hogaBilder.clear(); this.animerade = []; this.figurSkuggor = [];
      this.lagerObjekt.removeAll(true); this.lagerLjust.removeAll(true); this.ritade.clear(); this.markerade.clear(); this.ritadeDelar.clear(); this.markramar?.clear();
      this.sysslaNu = null; // sysslorna startas igen med de nya bilderna (livTick)
      this.ringarNu = null; this.ringSlinga?.remove(); this.ringSlinga = null; this.lagerRingar.removeAll(true);
      this.delar = { ...(v.delar || {}) };
      for (const o of [...this.objekt.filter((x) => x.sort === 'yta'), ...this.objekt.filter((x) => x.sort !== 'yta')]) this.ritaObjekt(o);
      for (const id of this.dolda) /** @type {any} */ (this.ritade.get(id))?.setVisible?.(false);
      for (const id of this.sparrade) { const o = this.ruta(id); if (o) this.ritaGren(o); }
      this.ritaKvar(v.kvar || []);
      if (v.nyttRum) this.lyktorTanda = new Set();
      this.ritaLyktor();
      // han ligger kvar i sängen när rummet ritas om (natt till morgon): den nya bilden av sängen visar honom (56.2)
      for (const s of [this.sover, this.vaknar]) {
        const ny = s && /** @type {any} */ (this.ritade.get(s.id));
        if (!s || !ny?.setTexture || ny === s.img) continue;
        ny.setTexture(this.hjalteTextur || 'hjalte', s.img.active ? s.img.frame.name : 'hjalte_sang_03'); s.img = ny;
      }
      this.byggHinder();
      for (const id of klattrar) this.figurKlattrar(id);
      this.sattInteraktiva(this.interaktiva.filter((id) => this.ruta(id))); this.nara(null);
      if (v.nyttRum || !this.harRum) {
        // hjälten kommer in genom utgången från förra rummet, annars vid kartans startpunkt
        // med säckhissen (102.3) kommer han ut där hissen kommer upp (regi_hiss, dörren ut till avsatsen), inte genom
        // dörren på bottenvåningen
        const hiss = viaHissen && v.karta?.regi?.hiss;
        const dorr = v.franRum && !hiss ? this.objekt.find((o) => o.till === v.franRum) : null;
        /** @type {import('../karna/rumslayout.js').Objekt | null} utgången hjälten kom in genom */
        this.inkom = dorr ?? null;
        // där han står när en viss scen börjar i rummet (102.3, kartans regi_hjalte_<scen>): på avsatsen vid hornet,
        // som bara nås med hissen, och på skalet ute på floden i resan. Platsen är exakt och flyttas inte till närmaste
        // fria punkt (på skalet kan han inte gå)
        const plats = v.scen ? this.regiPunkter?.[`hjalte_${v.scen}`] : null;
        // står han på scenens plats har han inte kommit in genom dörren (122.11: från valvet in i galleriet)
        if (plats) this.inkom = null;
        const start = plats || hiss || (dorr ? framfor(dorr) : (v.franRum && v.karta?.in?.[v.franRum]) || v.karta?.start || { x: this.storlek.bredd / 2, y: this.storlek.hojd - 12 });
        this.niva = 0; this.paStege = false; this.byggHinder(); this.sattNivaVid(start);
        this.pos = plats ? { ...plats } : this.hinder.narmasteFria(start);
        this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
        this.b.inmatning.rensaGaTill();
        // kameran hoppar till hjälten när han kommer in (rummet glider eller tonas in)
        this.sattKamera(enSkarm(this.storlek) ? { x: 0, y: 0 } : centrera(this.pos, this.storlek));
        // kartans visas_forst (76.5, D5): kameran glider till figuren som scenen börjar med (apan i nätet), och
        // tillbaka till hjälten när han ska göra något (slappForst) eller efter högst 20 s
        // visas_forst kan gälla ett enda tillstånd (elden på udden bara på kvällen, 80.2)
        const forst = this.objekt.find((o) => o.visasForst === true || (!!o.visasForst && o.visasForst === v.tillstand));
        if (forst && !enSkarm(this.storlek)) {
          this.regiFokus = { x: forst.x + forst.b / 2, y: forst.y + forst.h / 2 }; this.forstFokus = true;
          this.time.delayedCall(20000, () => this.slappForst());
        }
        // han kommer ut ur huset och vinkar mot det (kartans vinka_fran, 51.4)
        if (v.franRum && v.karta?.vinkaFran === v.franRum) { this.vand = { x: 0, y: -1 }; this.time.delayedCall(400, () => this.vinkaHjalte('upp')); }
      } else this.pos = this.hinder.narmasteFria(this.pos);
    }
    if (!this.harRum && (this.kamera.x || this.kamera.y)) this.sattKamera({ x: 0, y: 0 });
    this.hjalte.setVisible(this.harRum && !this.sover && !this.vaknar);
    this.unge.setVisible(this.harRum && this.visaUnge && !this.sover?.ungeGomd && !this.k3UngeIVattnet);
    // han sitter kvar i fåtöljen när rummet ritas om, men inte i ett nytt rum
    if (this.sitter) { const id = this.sitter.id; this.sitter = null; if (!v.nyttRum) this.sattSig(id); }
    this.ritaLjus();
    this.placera();
    this.b.vidAndring?.();
  }

  /** Föremålen som går att använda just nu får en glimt. @param {string[]} ids */
  sattInteraktiva(ids) {
    this.interaktiva = ids; this.smutsig = true;
    this.platsRingar(ids.filter((id) => this.ruta(id)?.ring));
    const g = this.glimtar; g.clear();
    for (const id of ids) {
      const o = this.ruta(id); if (!o || o.sort === 'utgang') continue;
      // en liten stjärna i övre högra hörnet
      const x = o.x + o.b - 2, y = o.y + 1;
      g.fillStyle(FARG.markerad, 1).fillRect(x - 1, y - 3, 2, 6).fillRect(x - 3, y - 1, 6, 2);
    }
  }

  /**
   * Stils vita ring (plats_ring_01–02, 104.7) mitt på varje plats han kan välja i läsvalet, likadan vid varje plats så
   * att den inte avslöjar något. Den växlar mellan sina två bilder (600 ms, golvet) och tas bort när läsvalet slutar
   * eller platsen har prövats. @param {string[]} ids
   */
  platsRingar(ids) {
    const nyckel = ids.join(',');
    if (nyckel === this.ringarNu) return;
    this.ringarNu = nyckel;
    this.ringSlinga?.remove(); this.ringSlinga = null;
    this.lagerRingar.removeAll(true);
    const ramar = ['plats_ring_01', 'plats_ring_02'].map((r) => foremalsbild(this, r));
    if (!ids.length || !ramar.every(Boolean)) return;
    const bilder = ids.map((id) => { const o = /** @type {any} */ (this.ruta(id)); const fb = /** @type {any} */ (ramar[0]); return this.add.image(o.x + o.b / 2, o.y + o.h / 2, fb.nyckel, fb.ram); });
    this.lagerRingar.add(bilder);
    let i = 0;
    this.ringSlinga = this.time.addEvent({ delay: 600, loop: true, callback: () => { i = 1 - i; const fb = /** @type {any} */ (ramar[i]); for (const b of bilder) if (b.active) b.setTexture(fb.nyckel, fb.ram); this.smutsig = true; } });
    this.b.logg?.handelse('ringar', nyckel);
  }

  /** Hjälten står vid ett föremål som går att använda: ljus ram och locket på glänt. @param {string | null} id */
  nara(id) {
    this.naraId = id; this.smutsig = true;
    const g = this.naraRam; g.clear();
    const o = id ? this.ruta(id) : null;
    if (!o) return;
    g.lineStyle(2, FARG.markerad, 1).strokeRect(o.x - 1, o.y - 1, o.b + 2, o.h + 2);
    // locket lyfts lite (gråboxens tecken för "här kan du göra något")
    if (o.sort === 'sak') g.fillStyle(0xfff2b0, 0.9).fillRect(o.x + 2, o.y - 4, o.b - 4, 2);
  }

  /**
   * Var hjälten ställer sig för att använda föremålet: den närmaste sidan han kan gå till från där han står.
   * @param {import('../karna/rumslayout.js').Objekt} o @returns {{ x: number, y: number }}
   */
  standplats(o) {
    const nar = (/** @type {{ x: number, y: number }} */ p) => { const v = this.hinder.vag(this.pos, p); return v.length > 0 && vidObjekt(v[v.length - 1], o); };
    return framforFran(o, this.pos, this.inomhus, this.vagg, this.massiv, nar);
  }

  byggHinder() {
    const sparrade = this.objekt.filter((o) => this.sparrade.has(o.id));
    const h = rumsHinder(this.objekt, { sparrade, inomhus: this.inomhus, vagg: this.vagg, storlek: this.storlek, massiv: this.massiv, over: this.overHinder });
    this.nivaer = h.nivaer;
    this.hinderPer = h.per;
    this.hinderForbindelse = h.forbindelse;
    // hindren med namn, för krockarna i loggen (97.6): föremålens id, och väggar, vatten och hus med sin plats
    const namn = (/** @type {any} */ r, /** @type {string} */ sort) => r.id ? r : { ...r, id: `${r.vatten ? 'vatten' : sort} ${r.x},${r.y}` };
    this.krockRutor = h.rutor.map((/** @type {any} */ r) => namn(r, this.massiv.includes(r) ? 'vägg' : this.overHinder.includes(r) ? 'över' : 'väggen'));
    if (!this.hinderPer.has(this.niva)) this.niva = 0;
    this.hinder = /** @type {ReturnType<typeof skapaHinder>} */ (this.hinderPer.get(this.niva));
    // en zon han redan har gått i (lerpölen, 72.8): vägen när han trycker någonstans går runt den, så att han inte
    // sjunker gång på gång på väg till samma mål. Med piltangenterna kan han fortfarande gå i den.
    const undvik = (this.undvik || []).map((id) => this.ruta(id)).filter(Boolean);
    this.hinderUndvik = undvik.length ? rumsHinder(this.objekt, { sparrade: [...sparrade, .../** @type {any[]} */ (undvik)], inomhus: this.inomhus, vagg: this.vagg, storlek: this.storlek, massiv: this.massiv, over: this.overHinder }).per.get(this.niva) ?? null : null;
    this.vag = []; this.vagMal = null;
  }

  /** Vägen går runt zonen från och med nu (72.8), tills rummet byts. @param {string} id */
  undvikZon(id) {
    this.undvik = [...new Set([...(this.undvik || []), id])];
    this.byggHinder();
  }

  /** Hjälten är på nivån där punkten ligger (när han kommer in i rummet). @param {{ x: number, y: number }} p */
  sattNivaVid(p) {
    const n = this.nivaer.forbindelse(p) ? this.niva : this.nivaer.nivaVid(p);
    if (n === this.niva || !this.hinderPer.has(n)) return;
    this.niva = n; this.hinder = /** @type {ReturnType<typeof skapaHinder>} */ (this.hinderPer.get(n)); this.vag = []; this.vagMal = null;
    this.b.logg.handelse('nivå', String(n));
  }

  /** Föremål han når från sin nivå (ett föremål på kullen nås bara uppifrån). @param {import('../karna/rumslayout.js').Objekt[]} lista */
  paNivan(lista) {
    return this.nivaer.finns ? lista.filter((o) => o.sort === 'yta' || this.nivaer.nivaFor(o) === this.niva) : lista;
  }

  /** @param {import('../karna/rumslayout.js').Objekt} o */
  ritaObjekt(o) {
    this.smutsig = true;
    // grafiken: kartans bild för föremålet (nattens bild på natten), med bildens nederkant mitt på föremålets
    // nederkant mitt (10b), eller på ett annat föremåls (bild_pa: Farfar i fåtöljen). Pusslets delar (dinomatens
    // lådor) och föremål utan bild ritas som i gråboxen.
    // en rad bilder längs föremålet (lianväggen): bildernas nederkant på föremålets nederkant, en bild per bildbredd
    if (o.bildRad && foremalsbild(this, o.bildRad[0])) {
      const rad = o.delasDjup ? this.bilddjup(o, o.bildRad, Math.max(2, Math.round(o.h / 8))) : this.bildrad(o, o.bildRad);
      (o.ovanpa ? this.lagerLjust : this.lagerObjekt).add(rad);
      this.ritade.set(o.id, /** @type {any} */ (rad));
      return;
    }
    const bildNamn = this.ramFor.has(o.id) ? this.ramFor.get(o.id) : o.bildSedan && this.bytta?.has(o.id) ? o.bildSedan : o.bildNatt && (this.tillstand === 'natt' || this.tillstand === 'natt_upplyst') ? o.bildNatt : o.bildTillstand?.[this.tillstand] ?? (o.bildKvall && this.tillstand === 'kvall' ? o.bildKvall : o.bild);
    // ett föremål som ersätts av ett annat när det syns (109.8: fenan och fenan som trappa är samma fena): en osynlig ruta
    if (o.ersattsAv && this.objekt.some((x) => x.id === o.ersattsAv)) {
      const r = this.add.rectangle(o.x, o.y, o.b, o.h, 0, 0).setOrigin(0, 0);
      this.lagerObjekt.add(r); this.ritade.set(o.id, r); return;
    }
    // en del av ett annat föremåls bild (skriften på hornet): en osynlig ruta när det föremålet har Stils bild
    const agare = o.iBildAv ? this.objekt.find((x) => x.id === o.iBildAv) : null;
    if (agare && (agare.bildTillstand?.[this.tillstand] ?? agare.bild) && foremalsbild(this, /** @type {string} */ (agare.bildTillstand?.[this.tillstand] ?? agare.bild))) {
      const r = this.add.rectangle(o.x, o.y, o.b, o.h, 0, 0).setOrigin(0, 0);
      this.lagerObjekt.add(r); this.ritade.set(o.id, r); return;
    }
    // ett föremål som är ett alternativ i ett läsval i rummet (dinomatens lådor) har alternativets bild, i den
    // variant spelaren får (lada_rod, lada_bla_stor …), när Stil har ritat den. Är föremålet alternativets eget
    // (gläntans träd i L3) visar kartans bild alternativet (66.2).
    const valt = foremaletsBild({ kartbild: bildNamn, delar: this.delar[o.id] }, (n) => !!foremalsbild(this, n));
    const fb = valt ? foremalsbild(this, valt) : null;
    if (fb) {
      const pa = (o.bildPa && this.objekt.find((x) => x.id === o.bildPa)) || o;
      const tex = fb.nyckel === 'hjalte' ? this.hjalteTextur || 'hjalte' : fb.nyckel;
      const img = this.add.image(Math.round(pa.x + pa.b / 2), pa.y + pa.h, tex, fb.ram).setOrigin(0.5, 1);
      // en figur med skugga (kartans `skugga`, byborna i kapitel 2): skuggan i figurens rutstorlek under bilden
      if (o.skugga && o.sort === 'figur' && this.textures.exists('skugga')) {
        const ram = this.textures.get('skugga').has(`skugga_${img.width}x24`) ? `skugga_${img.width}x24` : 'skugga_16x24';
        const sk = this.add.image(img.x, img.y, 'skugga', ram).setOrigin(0.5, 1);
        this.lagerObjekt.add(sk);
        this.figurSkuggor.push({ img, skugga: sk });
      }
      // en hög bild (en trädkrona som sticker upp) ritas bland figurerna, så att hjälten kan gå bakom den
      const hog = !o.lyser && !o.skataFonster && !o.under && o.sort !== 'yta' && img.height > o.h + 6;
      if (hog) { /** @type {any} */ (img).fot = pa.y + pa.h; this.lagerFigurer.add(img); this.hogaBilder.add(img); this.sorteraFigurer(); }
      else (o.lyser || o.skataFonster ? this.lagerLjust : this.lagerObjekt).add(img);
      // tomgång (bild_anim): bilderna byts var animMs, med ett litet slumpat avstånd mellan figurerna
      const ramar = (o.bildAnim || []).filter((r) => foremalsbild(this, r)?.nyckel === fb.nyckel);
      if (ramar.length > 1 && !this.bytta?.has(o.id) && (!o.animI || (!!this.tillstand && o.animI.includes(this.tillstand)))) this.animerade.push({ img, ramar, ms: o.animMs || 500, i: 0, senast: performance.now() + Math.random() * 300 });
      this.ritade.set(o.id, /** @type {any} */ (img));
      return;
    }
    // ett fält som delas när pusslet börjar (vassväggen, 2.43) och har en bild per del: innan dess ritas det som ett
    // rutnät av samma bild, så att det ser ut som tussarna det sedan blir (Stil del 3a)
    if (!o.bild && o.bildDel && foremalsbild(this, o.bildDel)) {
      const fb = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, o.bildDel));
      const f = this.textures.getFrame(fb.nyckel, fb.ram);
      const kol = Math.max(1, Math.round(o.b / (f?.width || 16))), rad = Math.max(1, Math.round(o.h / (f?.height || 16)));
      const c = this.add.container(0, 0);
      for (let j = 0; j < rad; j++) for (let i = 0; i < kol; i++) {
        const x0 = o.x + Math.round((i * o.b) / kol), x1 = o.x + Math.round(((i + 1) * o.b) / kol), y1 = o.y + Math.round(((j + 1) * o.h) / rad);
        c.add(this.add.image(Math.round((x0 + x1) / 2), y1, fb.nyckel, fb.ram).setOrigin(0.5, 1));
      }
      this.lagerObjekt.add(c); this.ritade.set(o.id, /** @type {any} */ (c)); return;
    }
    // en del av rummets bild (82.7: leran, bryggan, vattnet): bara en osynlig ruta, som hindren och tester kan hitta
    if (o.ankare || (o.iBilden && this.rumsbild && this.golvBild.visible)) {
      const r = this.add.rectangle(o.x, o.y, o.b, o.h, 0, 0).setOrigin(0, 0);
      this.lagerObjekt.add(r); this.ritade.set(o.id, r); return;
    }
    // ritat i rutlagret (kullen, krönet, bäcken): bara en osynlig ruta, som hindren och tester kan hitta
    if (o.rutor && this.rutlager?.length) {
      const r = this.add.rectangle(o.x, o.y, o.b, o.h, 0, 0).setOrigin(0, 0);
      this.lagerObjekt.add(r); this.ritade.set(o.id, r); return;
    }
    // en dörr i en sidovägg är en mörk öppning i väggen; dörrbladet, karmen och golvremsan ritas i ritaDetaljer
    // utomhus med mark av rutor: det man går på (stigarna, grinden) syns i marken, inte som en ruta
    if (this.mark && this.golvBild.visible && o.golv) {
      const r = this.add.rectangle(o.x, o.y, o.b, o.h, 0, 0).setOrigin(0, 0);
      this.lagerObjekt.add(r); this.ritade.set(o.id, r); return;
    }
    const sidodorr = arSidodorr(o);
    const fyll = sidodorr ? 0x2b241e : objektFarg(o);
    const delar = this.delar[o.id];
    // rund (102.3): sköldpaddans skal i gråboxen är en ellips, mossgrönt med en mörk kant
    const r = o.rund
      ? this.add.ellipse(o.x + o.b / 2, o.y + o.h / 2, o.b, o.h, 0x6f8a4a, 1).setStrokeStyle(3, 0x4a3a28, 1)
      : this.add.rectangle(o.x, o.y, o.b, o.h, fyll, delar ? 0 : 1).setOrigin(0, 0).setStrokeStyle(1, sidodorr ? 0x3a3129 : FARG.sakKant, delar ? 0 : 1);
    // ovanpa i gråboxen (122.4): snödrivorna ligger över stenarnas nederkant, så att stenarna är halvt gömda
    (o.ovanpa ? this.lagerLuft : this.lagerObjekt).add(r);
    this.ritade.set(o.id, r);
    if (o.ute || o.klattra || (o.sort === 'utgang' && !o.golv) || o.sort === 'yta') this.ritaDetaljer(o);
    this.ritadeDelar.get(o.id)?.forEach((x) => x.destroy());
    this.ritadeDelar.delete(o.id);
    if (!delar) return;
    // föremålet visar ett pussels alternativ (lådorna): i samma färg och storlek som texten säger
    const n = delar.length, steg = o.b / n, bas = Math.min(steg - 3, o.h);
    const ritade = delar.flatMap((d, i) => {
      const k = d.storlek === 'stor' ? 1 : d.storlek === 'liten' ? 0.55 : 0.8;
      const b = Math.round(bas * k), h = Math.round(o.h * k);
      const x = Math.round(o.x + i * steg + (steg - b) / 2), y = o.y + o.h - h;
      // formen (en rund tavla är en ellips) och mönstret (en prickig groda har mörka prickar) syns också (63.4)
      const ruta = d.form === 'rund'
        ? this.add.ellipse(x + b / 2, y + h / 2, b, h, d.farg ?? FARG.sak).setStrokeStyle(1, 0x2b2420)
        : this.add.rectangle(x, y, b, h, d.farg ?? FARG.sak).setOrigin(0, 0).setStrokeStyle(1, 0x2b2420);
      this.lagerObjekt.add(ruta);
      if (d.monster !== 'prickig') return [ruta];
      const prickar = [[0.3, 0.35], [0.68, 0.3], [0.5, 0.68], [0.22, 0.75], [0.8, 0.72]].map(([px, py]) => this.add.rectangle(Math.round(x + px * b) - 1, Math.round(y + py * h) - 1, 2, 2, 0x1d2b1c).setOrigin(0, 0));
      for (const p of prickar) this.lagerObjekt.add(p);
      return [ruta, ...prickar];
    });
    this.ritadeDelar.set(o.id, ritade);
  }

  /**
   * Bilder i rad längs ett föremål, omväxlande ur listan (lian_a, lian_b), med nederkanten på föremålets nederkant.
   * @param {{ x: number, y: number, b: number, h: number }} o @param {string[]} namn @returns {Phaser.GameObjects.Container}
   */
  bildrad(o, namn) {
    const c = this.add.container(0, 0);
    const forsta = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, namn[0]));
    const bredd = this.textures.getFrame(forsta.nyckel, forsta.ram)?.width || 24;
    const antal = Math.max(1, Math.round(o.b / bredd));
    for (let i = 0; i < antal; i++) {
      const fb = foremalsbild(this, namn[i % namn.length]) || forsta;
      c.add(this.add.image(Math.round(o.x + ((i + 0.5) * o.b) / antal), o.y + o.h, fb.nyckel, fb.ram).setOrigin(0.5, 1));
    }
    return c;
  }

  /**
   * Bilder efter varandra på djupet (liangången, 50.2): från norr till söder, så att den södra står främst,
   * omväxlande ur listan (lian_gang_a, lian_gang_b), mitt i föremålets bredd.
   * @param {{ x: number, y: number, b: number, h: number }} o @param {string[]} namn @param {number} antal
   * @returns {Phaser.GameObjects.Container}
   */
  bilddjup(o, namn, antal) {
    const c = this.add.container(0, 0);
    const forsta = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, namn[0]));
    for (let i = 0; i < antal; i++) {
      const fb = foremalsbild(this, namn[i % namn.length]) || forsta;
      c.add(this.add.image(Math.round(o.x + o.b / 2), o.y + Math.round(((i + 1) * o.h) / antal), fb.nyckel, fb.ram).setOrigin(0.5, 1));
    }
    return c;
  }

  /**
   * Det som står kvar efter hugget (bild_kvar: lianernas stubbar), ritat utan att vara ett föremål eller ett hinder.
   * @param {import('../karna/rumslayout.js').Objekt[]} lista
   */
  ritaKvar(lista) {
    for (const o of lista) {
      if (!o.bildKvar || !foremalsbild(this, o.bildKvar)) continue;
      if (o.delasDjup) { this.lagerObjekt.add(this.bilddjup(o, [o.bildKvar], o.delar || Math.max(2, Math.round(o.h / 8)))); continue; }
      if (o.bildRad) { this.lagerObjekt.add(this.bildrad(o, [o.bildKvar])); continue; }
      const fb = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, o.bildKvar));
      this.lagerObjekt.add(this.add.image(Math.round(o.x + o.b / 2), o.y + o.h, fb.nyckel, fb.ram).setOrigin(0.5, 1));
    }
    this.smutsig = true;
  }

  /**
   * Visa ett pussels alternativ i föremålet (t.ex. lådorna i den variant spelaren har). null = som vanligt.
   * @param {string} id @param {{ farg: number | null, storlek: string | null, bild?: string | null, egen?: boolean, form?: string | null, monster?: string | null }[] | null} delar
   */
  visaDelar(id, delar) {
    const o = this.ruta(id); if (!o) return;
    if (delar) this.delar[id] = delar; else delete this.delar[id];
    this.ritade.get(id)?.destroy();
    this.ritaObjekt(o);
  }

  /**
   * Dörrarna får en tydlig karm och ett handtag, utedörren en dörrmatta på insidan, stegen pinnar (gråbox).
   * @param {import('../karna/rumslayout.js').Objekt} o
   */
  ritaDetaljer(o) {
    const g = this.add.graphics();
    if (arSidodorr(o)) {
      // snett uppifrån (som i A Link to the Past): öppningen går genom väggen, karmen syns som två stolpar
      // överst och nederst, dörrbladet står vid väggens insida, och en ljusare golvremsa leder in i rummet
      const inne = o.riktning === 'vanster' ? o.x + o.b : o.x; // väggens insida
      const ut = o.riktning === 'vanster' ? -1 : 1; // åt vilket håll väggen ligger från insidan
      g.fillStyle(0xc9a46a).fillRect(o.x, o.y, o.b, 3).fillRect(o.x, o.y + o.h - 3, o.b, 3);
      const bladX = ut < 0 ? inne - 7 : inne + 2;
      g.fillStyle(FARG.utgang).fillRect(bladX, o.y + 3, 5, o.h - 6);
      g.fillStyle(0x8a7258).fillRect(ut < 0 ? bladX + 4 : bladX, o.y + 3, 1, o.h - 6);
      g.fillStyle(0xe8d38a).fillRect(ut < 0 ? inne - 2 : inne + 1, o.y + Math.round(o.h / 2) - 1, 1, 3); // handtaget mot rummet
      g.fillStyle(0xb4aea2, 0.55).fillRect(ut < 0 ? inne : inne - 8, o.y + 3, 8, o.h - 6); // golvremsan
    } else if (o.sort === 'utgang' && !o.golv && !o.klattra) {
      g.lineStyle(2, o.ute ? 0xf4e6c4 : 0xc9a46a, 1).strokeRect(o.x + 1, o.y + 1, o.b - 2, o.h - 2);
      // handtaget på den sida som vetter in i rummet
      const hx = o.riktning === 'vanster' ? o.x + o.b - 6 : o.riktning === 'hoger' ? o.x + 4 : o.x + o.b - 7;
      const hy = o.riktning === 'ned' || o.riktning === 'upp' ? o.y + o.h / 2 - 1 : o.y + o.h / 2;
      g.fillStyle(0xe8d38a).fillRect(hx, hy, 3, 3);
    }
    // dörrmattan ligger på insidan: ovanför en dörr i främre väggen, nedanför en i bakväggen
    if (o.ute) { const my = o.riktning === 'ned' ? o.y - 7 : o.y + o.h + 1; g.fillStyle(0xa0663a).fillRect(o.x + 2, my, o.b - 4, 6); }
    if (o.klattra || o.forbinder === 'stege') { g.fillStyle(0x5a4f42); for (let y = o.y + 4; y < o.y + o.h - 2; y += 6) g.fillRect(o.x + 2, y, o.b - 4, 2); }
    // kullen: en mörkare kant i söder (branten), och trappans steg
    if (o.sort === 'yta' && !o.forbinder) { g.fillStyle(0x6e685e).fillRect(o.x, o.y + o.h - 5, o.b, 5); g.fillStyle(0xbdb8ae).fillRect(o.x, o.y, o.b, 2); }
    if (o.forbinder === 'trappa') { g.fillStyle(0x6e685e); for (let y = o.y + 3; y < o.y + o.h - 1; y += 4) g.fillRect(o.x + 1, y, o.b - 2, 1); }
    this.lagerObjekt.add(g);
  }

  ritaLjus() {
    this.smutsig = true;
    const g = this.morker; g.clear();
    const t = this.tillstand || '';
    const alfa = !this.harRum ? 0 : t === 'natt' ? (this.morkerNatt ?? 0.72) : t === 'natt_upplyst' ? 0.42 : 0;
    if (alfa) g.fillStyle(0x0a0820, alfa).fillRect(0, 0, this.storlek.bredd, this.storlek.hojd);
    // 122.3: i grottans mörker ligger en slöja också över figurerna, så att hjälten och ungen bara syns mycket svagt
    if (this.harRum && t === 'mork') g.fillStyle(0x04050a, 0.72).fillRect(0, 0, this.storlek.bredd, this.storlek.hojd);
    // en lampa (läslampan vid Farfars plats) lyser varmt i mörkret: ljusare ringar inåt och en glödande punkt
    if (alfa) for (const l of this.lampor) {
      for (const [r, a] of [[60, 0.10], [44, 0.12], [28, 0.16]]) g.fillStyle(FARG.ljus, a).fillCircle(l.x, l.y, r);
      g.fillStyle(FARG.ljus, 1).fillCircle(l.x, l.y - 14, 3);
    }
    this.ljusboll.setVisible(this.harRum && (t === 'natt_upplyst' || t === 'mork'));
    const gm = this.grottMorker; gm.clear();
    if (this.harRum && t === 'mork') { gm.fillStyle(0x04050a, 0.97).fillRect(0, 0, this.storlek.bredd, this.storlek.hojd); this.regiLogg.push('mörkret'); }
  }

  placera() {
    // i leran sjunker bilden, om inte Stils bilder visar det själva (del 3b)
    const leraBild = (/** @type {string} */ nyckel, /** @type {string} */ ram) => !!nyckel && this.textures.exists(nyckel) && this.textures.get(nyckel).has(ram);
    const hjalteDjup = this.hjalteFast && !leraBild(this.hjalteTextur, 'hjalte_lera_ner_01') ? Math.round(this.hjalteFast.djup) : 0;
    this.hjalte.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd + hjalteDjup));
    this.ritaHjalteFast();
    this.ritaHjalte();
    this.sorteraFigurer();
    if (this.buren) this.buren.setPosition(Math.round(this.pos.x + 6), Math.round(this.pos.y - FIGUR.hojd - 6 + Math.sin(this.time.now / 300) * 1.5));
    // pekar ungen nosar den mot föremålet: små ryck åt dess håll
    const m = this.ungeMal;
    const nos = m && Math.hypot(m.x - this.ungePos.x, m.y - this.ungePos.y) < 3 ? Math.max(0, Math.sin(this.time.now / 110)) * 3 : 0;
    if (this.ungeBild) { this.unge.setPosition(Math.round(this.ungePos.x - 12), Math.round(this.ungePos.y - 23 - (this.ungeLyft || 0) + (this.ungeFast && !this.ungeLeraBilder() ? Math.round(this.ungeFast.djup) : 0))); this.ritaUngen(); this.ritaUngeFast(); this.ritaUngeBubbla(); }
    else this.unge.setPosition(Math.round(this.ungePos.x - 6 + (m ? Math.cos(m.mot) * nos : 0)), Math.round(this.ungePos.y - 12 + (m ? Math.sin(m.mot) * nos : 0)));
    this.ritaVassVidFotter();
    const l = this.ljusboll; l.clear();
    if (l.visible && this.tillstand === 'mork') {
      // stavens svaga glimt i mörkret: en liten prick vid stavens topp
      l.fillStyle(0xcfe6ff, 0.25).fillCircle(Math.round(this.pos.x + 6), Math.round(this.pos.y - 26), 6);
      l.fillStyle(0xeaf4ff, 0.9).fillCircle(Math.round(this.pos.x + 6), Math.round(this.pos.y - 26), 1.5);
    } else if (l.visible) {
      const cx = Math.round(this.pos.x), cy = Math.round(this.pos.y - 30);
      l.fillStyle(FARG.ljus, 0.18).fillCircle(cx, cy + 18, 56);
      l.fillStyle(FARG.ljus, 1).fillCircle(cx, cy, 3);
    }
  }

  /** Världen stannar när läsplattan är öppen. @param {boolean} pa */
  frys(pa) { this.frysSteg = pa; this.fryst = pa || !!this.pausad; if (this.fryst) this.b.inmatning.rensaGaTill(); }
  /**
   * Spelet pausas (INSTÄLLNINGAR, fliken dold): världen står still så länge, och sedan står den som stegen vill.
   * Ett steg som släpper världen under pausen (frys(false)) gäller alltså efter pausen. @param {boolean} pa
   */
  sattPaus(pa) { this.pausad = pa; this.fryst = !!this.frysSteg || pa; if (this.fryst) this.b.inmatning.rensaGaTill(); }

  /** @param {string} id @param {boolean} pa */
  markera(id, pa) {
    this.smutsig = true;
    const r = this.ritade.get(id);
    if (!r) return;
    if (pa) this.markerade.add(id); else this.markerade.delete(id);
    if (r.setStrokeStyle) { r.setStrokeStyle(pa ? 2 : 1, pa ? FARG.markerad : FARG.sakKant); return; }
    // en bild: en ram runt föremålet i ett eget lager
    this.markramar = this.markramar || new Map();
    this.markramar.get(id)?.destroy(); this.markramar.delete(id);
    const o = this.ruta(id);
    if (pa && o) { const g = this.add.graphics().lineStyle(2, FARG.markerad, 1).strokeRect(o.x - 1, o.y - 1, o.b + 2, o.h + 2); this.lagerObjekt.add(g); this.markramar.set(id, g); }
  }

  /** Vänta tills hjälten står vid ett av objekten. @param {string[]} ids @returns {Promise<string>} */
  vantaPa(ids) {
    return new Promise((klar) => { this.vantar = { ids, klar }; });
  }

  /** Ersätt ett objekt med flera små (krukorna), jämnt fördelade där objektet stod. @param {string} id @param {number} antal @returns {string[]} */
  dela(id, antal) {
    const nya = [];
    const bas = this.objekt.find((x) => x.id === id);
    this.objekt = this.objekt.filter((x) => x.id !== id);
    this.ritade.get(id)?.destroy(); this.ritade.delete(id);
    // liangången (kartans delas: djup, 50.2): delarna står efter varandra från norr till söder, och den södra står
    // närmast honom. Varje del är en lian med sin egen bild (omväxlande ur bild_rad), som han hugger i tur och ordning
    if (bas?.delasDjup) {
      for (let i = 0; i < antal; i++) {
        const y0 = bas.y + Math.round((i * bas.h) / antal), y1 = bas.y + Math.round(((i + 1) * bas.h) / antal);
        const bild = bas.bildRad?.[i % bas.bildRad.length] ?? bas.bildDel;
        const n = { id: `${id}_${i}`, delAv: id, x: bas.x, y: y0, b: bas.b, h: y1 - y0, sort: /** @type {'sak'} */ ('sak'), sida: /** @type {'under'} */ ('under'), ...(bild ? { bild } : {}),
          ...(bas.bildHugg ? { bildHugg: bas.bildHugg } : {}), ...(bas.bildKvar ? { bildKvar: bas.bildKvar } : {}) };
        this.objekt.push(n); this.ritaObjekt(n); nya.push(n.id);
      }
      this.byggHinder();
      this.b.vidAndring?.();
      return nya;
    }
    // lianväggen (kartans delas: hela): delarna fyller hela föremålet, så att väggen står kvar tills den är huggen
    if (bas?.delasHela) {
      for (let i = 0; i < antal; i++) {
        const x0 = bas.x + Math.round((i * bas.b) / antal), x1 = bas.x + Math.round(((i + 1) * bas.b) / antal);
        const n = { id: `${id}_${i}`, delAv: id, x: x0, y: bas.y, b: x1 - x0, h: bas.h, sort: /** @type {'sak'} */ ('sak'), ...(bas.sida ? { sida: bas.sida } : {}), ...(bas.bildDel ? { bild: bas.bildDel } : {}),
          ...(bas.bildRad ? { bildRad: bas.bildRad } : {}), ...(bas.bildHugg ? { bildHugg: bas.bildHugg } : {}), ...(bas.bildKvar ? { bildKvar: bas.bildKvar } : {}) };
        this.objekt.push(n); this.ritaObjekt(n); nya.push(n.id);
      }
      this.byggHinder();
      this.b.vidAndring?.();
      return nya;
    }
    const ryms = bas && bas.b >= antal * 22;
    // tätt ställda krukor (mindre än en hjältebredd emellan) nås bara framifrån: en plats bredvid en kruka
    // hamnar annars vid grannkrukan, och då blir grannen den aktiva (iPad, tryck två gånger)
    const tatt = !!ryms && !!bas && bas.b / antal - 18 < 24;
    for (let i = 0; i < antal; i++) {
      // inom objektets ruta om de ryms, annars en egen rad mitt i rummet
      // (en egen rad: mitt i det som syns av området)
      const x = ryms && bas ? Math.round(bas.x + ((i + 0.5) * bas.b) / antal) - 9 : this.kamera.x + Math.round(((i + 1) * RUM.bredd) / (antal + 1)) - 9;
      const n = { id: `${id}_${i}`, x, y: ryms && bas ? bas.y : this.kamera.y + 112, b: 18, h: 18, sort: /** @type {'sak'} */ ('sak'), ...(tatt ? { sida: /** @type {'under'} */ ('under') } : bas?.sida ? { sida: bas.sida } : {}), ...(bas?.bildDel ? { bild: bas.bildDel } : {}) };
      this.objekt.push(n); this.ritaObjekt(n); nya.push(n.id);
    }
    this.byggHinder();
    this.b.vidAndring?.();
    return nya;
  }

  /**
   * Ett fält av tussar (2.43, vassväggen 75.3): föremålet delas i `rader` kolumner från väster till öster, med
   * `perRad` tussar i varje från norr till söder. Id:na kommer i den ordningen (som pusslets innehall).
   * @param {string} id @param {number} rader @param {number} perRad @returns {string[]}
   */
  delaFalt(id, rader, perRad) {
    const bas = this.objekt.find((x) => x.id === id);
    if (!bas) return [];
    this.objekt = this.objekt.filter((x) => x.id !== id);
    this.ritade.get(id)?.destroy(); this.ritade.delete(id);
    const nya = [];
    for (let r = 0; r < rader; r++) {
      const x0 = bas.x + Math.round((r * bas.b) / rader), x1 = bas.x + Math.round(((r + 1) * bas.b) / rader);
      for (let j = 0; j < perRad; j++) {
        const y0 = bas.y + Math.round((j * bas.h) / perRad), y1 = bas.y + Math.round(((j + 1) * bas.h) / perRad);
        const i = r * perRad + j;
        const n = { id: `${id}_${i}`, delAv: id, tuss: true, x: x0, y: y0, b: x1 - x0, h: y1 - y0, sort: /** @type {'sak'} */ ('sak'), ...(bas.bildDel ? { bild: bas.bildDel } : {}),
          ...(bas.bildHugg ? { bildHugg: bas.bildHugg } : {}), ...(bas.bildKvar ? { bildKvar: bas.bildKvar } : {}) };
        this.objekt.push(n); this.ritaObjekt(n); nya.push(n.id);
      }
    }
    this.byggHinder();
    this.b.vidAndring?.();
    return nya;
  }

  /**
   * Tussarna som står kvar när pusslet är klart (75.3) står kvar i rummet tills han går därifrån, också när rummets
   * tillstånd byts (vassen är oppen). @param {string[]} ids
   */
  behallDelar(ids) {
    for (const id of ids) { const o = this.objekt.find((x) => x.id === id); if (o) this.kvarDelar.set(id, { ...o }); }
  }

  /** Ett föremål hoppar till (det låter därifrån, t.ex. ägglådan som dunkar). @param {string} id */
  hoppa(id) {
    const r = this.ritade.get(id); if (!r) return;
    const y = r.y;
    this.tweens.add({ targets: r, y: y - 4, duration: 90, yoyo: true, repeat: 1, onComplete: () => { r.y = y; } });
  }

  /**
   * Ett föremål som har kommit fram dalar ned nära hjälten där han står (kartans `landar_nara`, 92.7: kartbiten bakom
   * tavlan). Det flyttas dit, som fjädern (75.4), så att det går att ta med ett tryck, och faller från ovanför och
   * gungar lite. Anropas efter att rummet har ritats med föremålet. @param {string} id @returns {number} ms
   */
  landaNara(id) {
    const o = this.ruta(id);
    if (!o) return 0;
    const k = this.kamera;
    const p = landningNara(this.pos, { x: k.x, y: k.y, b: RUM.bredd, h: RUM.hojd }, (q) => this.hinder.narmasteFria(q));
    const ny = { x: Math.round(p.x - o.b / 2), y: Math.round(p.y - o.h / 2) };
    const dx = ny.x - o.x, dy = ny.y - o.y;
    this.flyttade.set(id, ny);
    o.x = ny.x; o.y = ny.y;
    this.byggHinder();
    const r = /** @type {any} */ (this.ritade.get(id));
    if (!r) return 0;
    const slut = { x: r.x + dx, y: r.y + dy };
    r.setPosition(slut.x, slut.y - 70);
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: 1100, ease: 'Sine.easeOut', onUpdate: () => { if (!r.active) return; r.setPosition(Math.round(slut.x + Math.sin(t.p * 10) * 6 * (1 - t.p)), Math.round(slut.y - 70 * (1 - t.p))); this.smutsig = true; }, onComplete: () => { if (r.active) r.setPosition(slut.x, slut.y); this.smutsig = true; } });
    this.regiLogg.push(`${id} landar nära hjälten`); if (this.regiLogg.length > 160) this.regiLogg.shift();
    return 1200;
  }

  /** Ungen hoppar av glädje (glad = true) eller rycker på axlarna (glad = false). @param {boolean} glad */
  ungeReagerar(glad) {
    const u = this.unge; if (!u.visible) return;
    // med bilderna: glad hopp, eller lutar huvudet och tittar upp (fel svar). Ingen skakning (25.4)
    if (this.ungeBild) {
      const nu = this.time.now, ms = glad ? 140 : 300, bilder = glad ? 3 : 2;
      this.ungeReaktion = { namn: glad ? 'glad' : 'fragar', sida: true, start: nu, ms, bilder, slut: nu + ms * bilder + (glad ? 0 : 500) };
      this.time.delayedCall(ms * bilder + 520, () => { this.smutsig = true; this.placera(); });
      for (let i = 1; i <= bilder; i++) this.time.delayedCall(ms * i, () => this.placera());
      this.placera();
      return;
    }
    const y = u.y, x = u.x;
    if (glad) this.tweens.add({ targets: u, y: y - 8, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.easeOut', onComplete: () => { u.y = y; } });
    else this.tweens.add({ targets: u, x: x + 2, duration: 70, yoyo: true, repeat: 2, onComplete: () => { u.x = x; } });
  }

  /**
   * Ungen pekar på ett föremål eller en utgång: den springer dit, ställer sig vid det och nosar mot det,
   * tills pekningen tas bort (null). Gråboxens sätt att visa "ungen lutar sig mot rätt dörr".
   * @param {string | null} id @returns {boolean} om ungen kunde peka
   */
  ungePekar(id) {
    if (!id) { this.ungeMal = null; this.placera(); return false; }
    const o = this.ruta(id);
    if (!o || !this.unge.visible) return false;
    // ställ ungen en bit in i rummet från föremålet, på sidan mot hjälten, och låt den nosa mot det
    const f = o.sort === 'utgang' ? lasplats(o) : this.standplats(o);
    const p = this.hinder.narmasteFria({ x: f.x, y: f.y });
    const cx = o.x + o.b / 2, cy = o.y + o.h / 2;
    this.ungeMal = { x: p.x, y: p.y, mot: Math.atan2(cy - p.y, cx - p.x) };
    return true;
  }

  /**
   * Hjälten bär en sak som svävar efter honom (som ljusbollen), eller null. @param {number | null} farg
   * @param {string | null} [bild] sakens bild (expeditionsboken)
   */
  bara(farg, bild = null) {
    this.buren?.destroy(); this.buren = null;
    if (farg === null) return;
    // sakens egen bild när Stil har ritat den (boken, 50.5), annars gråboxens filt
    const fb = bild ? foremalsbild(this, bild) : null;
    if (fb) {
      const img = this.add.image(0, 0, fb.nyckel, fb.ram).setOrigin(0, 0);
      this.buren = this.add.container(0, 0, [img]); this.placera();
      return;
    }
    const g = this.add.container(0, 0);
    g.add(this.add.rectangle(0, 0, 12, 8, farg).setOrigin(0, 0).setStrokeStyle(1, 0x4a3f34));
    for (let x = 1; x < 12; x += 3) g.add(this.add.rectangle(x, 8, 1, 2, farg).setOrigin(0, 0)); // fransar
    this.buren = g; this.placera();
  }
  /**
   * Lägg saken hjälten bär på ett föremål (filten om ägget), där den ligger kvar. Är målet en figur (Farfar) tar
   * figuren emot den: saken glider till händerna och är sedan hos figuren (50.5). @param {string} id
   */
  lagg(id) {
    const o = this.ruta(id), g = this.buren; if (!o || !g) return;
    this.buren = null;
    if (o.sort === 'figur') {
      const b = g.getBounds();
      // Farfar tar emot boken och läser (51.4): handen ut, boken i handen, och sedan läser han tills rummet byts
      const fig = o.bildTaEmot?.length ? o.bildTaEmot.filter((r) => foremalsbild(this, r)) : [];
      if (fig.length) {
        this.stoppaRamar(id); this.sattRam(id, fig[0]);
        if (fig[1]) this.time.delayedCall(300, () => this.sattRam(id, fig[1]));
        const las = (o.bildLas || []).filter((r) => foremalsbild(this, r));
        if (las.length) this.time.delayedCall(1100, () => { if (this.ruta(id)) this.slingaRamar(id, las, 1500); });
      }
      this.tweens.add({ targets: g, x: Math.round(o.x + o.b / 2 - b.width / 2), y: Math.round(o.y + o.h * 0.55 - b.height / 2), duration: 250, ease: 'Quad.easeOut',
        onUpdate: () => { this.smutsig = true; },
        onComplete: () => this.tweens.add({ targets: g, alpha: 0, delay: 200, duration: 250, onUpdate: () => { this.smutsig = true; }, onComplete: () => g.destroy() }) });
      return;
    }
    this.tweens.add({ targets: g, x: Math.round(o.x + o.b / 2 - 6), y: Math.round(o.y + o.h / 2 - 4), duration: 250, ease: 'Quad.easeOut' });
    this.lagda.push(g);
  }
  /** Hjälten tittar upp (ryggen mot kameran) en stund, t.ex. när det dunkar ovanifrån. @param {number} ms */
  tittaUpp(ms) {
    if (this.klattrar) return;
    this.sattRygg(true);
    this.time.delayedCall(ms, () => { if (!this.klattrar) this.sattRygg(false); });
  }
  /** En figur vinkar (kallar på hjälten). @param {string} id */
  vinka(id) {
    // med Stils bilder vinkar figuren mot hjälten (<namn>_vinka_<håll>_01–02, steg 5 del 1), annars två skutt
    const r = /** @type {any} */ (this.ritade.get(id)), o = this.ruta(id);
    // grundnamnet ur kartans bild (flodman_ner_01), så att en figur mitt i sin syssla (flodman_lastar_hoger_01) vinkar
    const bas = String(o?.bild || r?.frame?.name || '').replace(/_(ner|upp|hoger|vanster)_\d\d$/, '');
    const mot = o ? riktningFor({ x: this.pos.x - (o.x + o.b / 2), y: this.pos.y - (o.y + o.h) }) : 'ner';
    const ram = (/** @type {number} */ n) => `${bas}_vinka_${mot === 'upp' ? 'ner' : mot}_0${n}`;
    if (bas && foremalsbild(this, ram(1)) && foremalsbild(this, ram(2))) { this.regiRamar(id, [ram(1), ram(2), ram(1), ram(2)], 250); return; }
    this.hoppa(id); this.time.delayedCall(260, () => this.hoppa(id));
  }

  // ---------------------------------------------------------------- bokstavsstigen (P18, 114.6)
  /**
   * Ritar bokstavsstigens rutnät: isflak (gråbox, eller Stils `isflak` när den finns), vakar och isväggar, med vattnet
   * under. Bokstäverna står inte här: de står i Lexend i textlagret (spel.js), eftersom text aldrig är pixlar.
   * @param {{ rader: number, kolumner: number, celler: { sort: string }[][], start: number | null }} g steg (rader) och bredd (kolumner)
   * @param {{ x: number, y: number }} [mitt] rutnätets mitt i rummet (kartans stig_<id>, annars rummets mitt)
   * @returns {{ flak: (r: number, k: number) => { x: number, y: number }, strand: { x: number, y: number }, mal: { x: number, y: number }, skylt: { x: number, y: number } }}
   */
  visaStig(g, mitt, upp = false) {
    this.rensaStig();
    // Innehålls ritning (21b): han kommer från vänster och hoppar en kolumn åt höger. Steget r är kolumnen på skärmen
    // och k raden. Sex kolumner (stig 3) ryms på en skärm med stranden på båda sidor. Med upp (119.4) går stigen
    // uppför: steget r ligger nedifrån och upp (26 pixlar), och raden k från vänster till höger (40 pixlar)
    const B = Math.min(40, Math.floor((RUM.bredd - 64) / Math.max(1, g.rader))), H = 26, FB = 32, FH = 18;
    const m = mitt || { x: Math.round(this.storlek.bredd / 2), y: Math.round(this.storlek.hojd / 2) };
    const x0 = upp ? Math.round(m.x - (g.kolumner * 40) / 2) : Math.round(m.x - (g.rader * B) / 2);
    const y0 = upp ? Math.round(m.y - (g.rader * H) / 2) : Math.round(m.y - (g.kolumner * H) / 2);
    const mittFor = upp
      ? (/** @type {number} */ r, /** @type {number} */ k) => ({ x: x0 + k * 40 + 20, y: y0 + (g.rader - 1 - r) * H + H / 2 })
      : (/** @type {number} */ r, /** @type {number} */ k) => ({ x: x0 + r * B + B / 2, y: y0 + k * H + H / 2 });
    const vatten = this.add.graphics();
    if (upp) {
      const bb = g.kolumner * 40, hh = g.rader * H;
      vatten.fillStyle(0x1e4e6c, 1).fillRect(x0 - 6, y0 - 4, bb + 12, hh + 8);
      vatten.fillStyle(0xdfeaf2, 1).fillRect(x0 - 6, y0 + hh + 4, bb + 12, 20); // stranden nedanför, där han kommer från
      vatten.fillStyle(0xdfeaf2, 1).fillRect(x0 - 6, y0 - 24, bb + 12, 20); // utgången ovanför
    } else {
      vatten.fillStyle(0x1e4e6c, 1).fillRect(x0 - 4, y0 - 6, g.rader * B + 8, g.kolumner * H + 12);
      vatten.fillStyle(0xdfeaf2, 1).fillRect(x0 - 30, y0 - 6, 26, g.kolumner * H + 12); // stranden, där han kommer från
      vatten.fillStyle(0xdfeaf2, 1).fillRect(x0 + g.rader * B + 4, y0 - 6, 26, g.kolumner * H + 12); // utgången
    }
    this.lagerStig.add(vatten);
    /** @type {Map<string, any>} */ const bilder = new Map();
    for (let r = 0; r < g.rader; r++) for (let k = 0; k < g.kolumner; k++) {
      const c = g.celler[r][k], p = mittFor(r, k);
      // Stils vak (vak_01–02, LASMIG_114): mörkt vatten med ringar. Utan den syns bara vattnet under
      if (c.sort === 'vak') { const v = foremalsbild(this, 'vak_01'); if (v) { const img = this.add.image(p.x, p.y, v.nyckel, v.ram); this.lagerStig.add(img); } continue; }
      const f = foremalsbild(this, c.sort === 'flak' ? 'isflak' : 'isvagg');
      let bild;
      if (f) bild = this.add.image(p.x, p.y, f.nyckel, f.ram);
      else {
        bild = this.add.graphics({ x: p.x, y: p.y });
        if (c.sort === 'flak') bild.fillStyle(0x6f8fa8, 1).fillRoundedRect(-FB / 2, -FH / 2 + 2, FB, FH, 5).fillStyle(0xcfe3f0, 1).fillRoundedRect(-FB / 2, -FH / 2, FB, FH - 2, 5);
        else bild.fillStyle(0x8e9fcc, 1).fillRect(-FB / 2, -FH / 2 - 8, FB, FH + 8).fillStyle(0xb4c4e6, 1).fillRect(-FB / 2, -FH / 2 - 8, FB, 6);
      }
      this.lagerStig.add(bild); bilder.set(`${r},${k}`, bild);
    }
    const kant = this.add.graphics().setVisible(false);
    this.lagerStig.add(kant);
    // han står på stranden till vänster, mitt för den rad han börjar vid, och utgången är till höger
    const k0 = g.start ?? Math.floor((g.kolumner - 1) / 2);
    const kMitt = Math.floor((g.kolumner - 1) / 2);
    const strand = upp ? { x: mittFor(0, k0).x, y: y0 + g.rader * H + 17 } : { x: x0 - 17, y: mittFor(0, k0).y + 4 };
    const mal = upp ? { x: mittFor(0, kMitt).x, y: y0 - 13 } : { x: x0 + g.rader * B + 17, y: mittFor(0, kMitt).y + 4 };
    // ordet står där han ska fram: ovanför rutnätet, eller till höger om utgången när stigen går uppför
    const skylt = upp ? { x: x0 + g.kolumner * 40 + 34, y: y0 - 14 } : { x: m.x, y: y0 - 16 };
    this.stig = { g, bilder, kant, kantTw: /** @type {any} */ (null), mittFor, upp, sprickor: this.add.graphics() };
    this.lagerStig.add(this.stig.sprickor);
    this.smutsig = true;
    return { flak: (r, k) => mittFor(r, k), strand, mal, skylt, upp };
  }

  // ------------------------------------------------------------------ kapitel 4 i gråbox (118.4)
  // Gråboxens former tills Stil har ritat: luftskeppet en orange ellips, snön en vit massa, bubblan en ring, isen
  // blå. Allt som står kvar läggs i this.lagda (borta när rummet byts). Regiloggen får regins namn, för testerna.

  /** En punkt i rummet: kartans regi_<namn>, annars mitten av föremålet. @param {string} id */
  k4Punkt(id) {
    const r = this.regiPunkter?.[id];
    if (r) return { x: r.x, y: r.y };
    const o = this.ruta(id);
    return o ? { x: o.x + o.b / 2, y: o.y + o.h / 2 } : null;
  }

  /** Luftskeppet i gråbox (ellips, gondol och rep), i luften. @param {{ x: number, y: number }} p */
  k4Skepp(p) {
    if (this.k4?.skepp?.active) return this.k4.skepp;
    const g = this.add.graphics({ x: p.x, y: p.y });
    g.fillStyle(0xd9782f, 1).fillEllipse(0, 0, 44, 18).fillStyle(0x7a4a26, 1).fillRect(-8, 10, 16, 6).lineStyle(1, 0x5a3a1e, 1).lineBetween(-6, 8, -6, 10).lineBetween(6, 8, 6, 10);
    this.lagerLuft.add(g); this.lagda.push(g);
    this.k4 = { ...(this.k4 || {}), skepp: g };
    return g;
  }

  /** Regins namn i loggen. @param {string} n */
  k4Logg(n) { this.regiLogg.push(n); if (this.regiLogg.length > 160) this.regiLogg.shift(); this.smutsig = true; }

  /** Ett glitter av färgade prickar runt en punkt. @param {{ x: number, y: number }} p @param {number} [r] */
  k4Glitter(p, r = 40) {
    const smuts = () => { this.smutsig = true; };
    const farger = [0xff6b6b, 0xffd34d, 0x6be37a, 0x5ab8ff, 0xc77dff];
    for (let i = 0; i < 18; i++) {
      const v = (i / 18) * Math.PI * 2, g = this.add.graphics({ x: p.x, y: p.y });
      g.fillStyle(farger[i % farger.length], 1).fillRect(-1, -1, 3, 3); this.lagerLjust.add(g);
      this.tweens.add({ targets: g, x: p.x + Math.cos(v) * r, y: p.y + Math.sin(v) * r * 0.6, alpha: 0, duration: 1100, delay: (i % 6) * 60, onUpdate: smuts, onComplete: () => g.destroy() });
    }
  }

  /**
   * Ankomsten (manus 21, pass 1): sköldpaddan lägger till vid bergets fot, kameran glider upp mot toppen som ryker,
   * och luftskeppet hänger över den. Skeppet står kvar tills baronen far med blocket. @returns {number}
   */
  ankomstBerget() {
    const topp = this.k4Punkt('toppen'); if (!topp) return 0;
    const smuts = () => { this.smutsig = true; };
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics({ x: topp.x - 20 + i * 10, y: topp.y + 18 }); g.fillStyle(0x9a9a9a, 0.8).fillCircle(0, 0, 5);
      this.lagerLuft.add(g); this.lagda.push(g);
      this.tweens.add({ targets: g, y: topp.y - 2, alpha: 0.2, duration: 1800, delay: i * 500, repeat: -1, onUpdate: smuts });
    }
    this.k4Skepp({ x: topp.x + 30, y: topp.y + 10 });
    this.regiFokus = topp;
    this.time.delayedCall(2600, () => { this.regiFokus = null; });
    this.k4Logg('ankomst_berget');
    return 3200;
  }

  /** Baronen läser stenen med kikaren (ett blänk i gondolen). @returns {number} */
  baronenKikareBerg() {
    const sk = this.k4Skepp(this.k4Punkt('toppen') || { x: this.pos.x, y: 20 });
    const g = this.add.graphics({ x: sk.x + 6, y: sk.y + 12 }); g.fillStyle(0xfff6b0, 1).fillCircle(0, 0, 2); this.lagerLjust.add(g);
    this.tweens.add({ targets: g, alpha: 0.1, duration: 250, yoyo: true, repeat: 4, onUpdate: () => { this.smutsig = true; }, onComplete: () => g.destroy() });
    this.regiFokus = { x: sk.x, y: sk.y + 30 };
    this.time.delayedCall(2000, () => { this.regiFokus = null; });
    this.k4Logg('baronen_kikare_berg');
    return 2400;
  }

  /**
   * Snöraset i ett svep (119.4, granskning 10 punkt 2): luftskeppet hänger över blocket på sluttningen ovanför
   * grottan (kartans regi_block), repet spänns, blocket rycks loss med ett muller, och en spricka rullar nedför
   * sluttningen. Kameran följer sprickan till snön över mynningen (regi_snon), och snön lossnar. Den stannar i luften
   * (113.8) och hänger kvar tills STOR SKÖLD är skriven, så ingen klocka räknar. Skeppet far iväg med blocket.
   * @returns {number}
   */
  blocketLyfts() {
    const smuts = () => { this.smutsig = true; };
    const m = this.k4Punkt('mynningen') || this.pos;
    const bl = this.k4Punkt('block') || { x: m.x - 30, y: Math.max(16, m.y - 30) };
    const snon = this.k4Punkt('snon') || { x: m.x, y: m.y - 14 };
    const sk = this.k4Skepp(this.k4Punkt('toppen') || { x: bl.x - 60, y: 6 });
    sk.setVisible(true);
    // 121.2: raset är en scen på ca 12 s. Dramat ligger i bilden och ljudet: Stils stycke för raset (om det finns) går
    // under hela scenen, Herr Skata knyter fel först och sedan rätt, och baronen hejar. Sedan som i 0.103.0 (T ms senare)
    const T = 6000;
    this.regiStycke('stycke_raset');
    // 1. skeppet glider fram och sänker sig över blocket, och kameran visar blocket
    this.regiFokus = { x: bl.x, y: bl.y + 30 };
    const skY = Math.max(12, bl.y - 30);
    this.tweens.add({ targets: sk, x: bl.x, y: skY - 8, duration: 700, ease: 'Sine.easeInOut', onUpdate: smuts });
    this.tweens.add({ targets: sk, y: skY, duration: 900, delay: 750, ease: 'Sine.easeOut', onUpdate: smuts });
    this.regiLjud('luftskepp');
    // blocket (Stils LASMIG_114): block_driva i snön, block_hanger med repet i kors när knuten sitter, och
    // block_slits_01–02 är gruset och snön som faller när det slits loss. Utan bilderna en grå sten
    const s1 = this.regiram('block_driva'), hanger = this.regiram('block_hanger');
    /** @type {any} */ const block = s1 ? this.add.image(bl.x, bl.y, s1.nyckel, s1.ram) : this.add.graphics({ x: bl.x, y: bl.y });
    if (!s1) block.fillStyle(0x8c8378, 1).fillRect(-12, -10, 24, 20).lineStyle(1, 0x5a5048, 1).strokeRect(-12, -10, 24, 20);
    const topp = () => block.y - (hanger && block.frame?.name === hanger.ram ? 22 : s1 ? 14 : 10);
    this.lagerLuft.add(block); this.lagda.push(block);
    // Herr Skata: Stils flygande skata, annars en svart prick
    const harSkata = this.textures.exists('herr_skata') && this.textures.get('herr_skata').has('herr_skata_flyga_vanster_01');
    /** @type {any} */ const skata = harSkata ? this.add.image(sk.x, sk.y, 'herr_skata', 'herr_skata_flyga_vanster_01').setOrigin(0.5, 1) : this.add.graphics({ x: sk.x, y: sk.y });
    if (!harSkata) skata.fillStyle(0x1a1a22, 1).fillEllipse(0, -4, 10, 7).fillStyle(0xffffff, 1).fillRect(-3, -5, 2, 2);
    skata.setVisible(false); this.lagerLuft.add(skata); this.lagda.push(skata);
    const flax = this.time.addEvent({ delay: 140, loop: true, callback: () => { if (harSkata && skata.visible) { skata.setFrame(`herr_skata_flyga_vanster_0${1 + (Math.floor(this.time.now / 140) % 2)}`); smuts(); } } });
    // repet: först en slinga som Herr Skata lägger om blocket (fel knut, den glider av), sedan i kors (rätt knut)
    /** @type {'inget' | 'slinga' | 'av' | 'kors'} */ let knut = 'inget';
    const rep = this.add.graphics(); this.lagerLuft.add(rep); this.lagda.push(rep);
    const ritaRep = () => {
      rep.clear(); if (!sk.visible || !block.active || knut === 'inget') return;
      rep.lineStyle(1, 0xd9782f, 1);
      if (knut === 'av') { rep.lineBetween(sk.x, sk.y + 16, block.x + 14, topp() - 8); return; }
      rep.lineBetween(sk.x, sk.y + 16, block.x, topp());
      if (knut === 'slinga') rep.strokeEllipse(block.x, topp() + 1, 18, 6);
      else if (!hanger) rep.lineBetween(block.x - 11, block.y - 9, block.x + 11, block.y + 9).lineBetween(block.x + 11, block.y - 9, block.x - 11, block.y + 9);
    };
    const repTimer = this.time.addEvent({ delay: 30, loop: true, callback: () => { ritaRep(); smuts(); } });
    // 2. Herr Skata flyger ned med repet och lägger en slinga över blocket: fel knut, den glider av
    this.time.delayedCall(1700, () => {
      skata.setPosition(sk.x, sk.y + 12).setVisible(true);
      this.tweens.add({ targets: skata, x: bl.x - 12, y: bl.y - 10, duration: 700, ease: 'Sine.easeInOut', onUpdate: smuts, onComplete: () => { knut = 'slinga'; this.regiLjud('vingflax'); } });
    });
    this.time.delayedCall(2900, () => { knut = 'av'; this.regiLjud('plopp'); this.k4Logg('fel knut'); this.tweens.add({ targets: skata, y: skata.y - 4, duration: 120, yoyo: true, repeat: 2, onUpdate: smuts }); });
    // 3. ett nytt försök: Herr Skata flyger ett varv runt blocket, och repet sitter i kors (rätt knut)
    this.time.delayedCall(3600, () => {
      const varv = { v: Math.PI };
      this.tweens.add({ targets: varv, v: Math.PI * 3, duration: 1100, onUpdate: () => { skata.setPosition(bl.x + Math.cos(varv.v) * 16, bl.y - 4 + Math.sin(varv.v) * 8); smuts(); }, onComplete: () => { knut = 'kors'; if (hanger && block.setTexture) block.setTexture(hanger.nyckel, hanger.ram); this.regiLjud('klick'); this.k4Logg('rätt knut'); } });
    });
    // 4. baronen hejar: skeppet guppar, och Herr Skata flyger upp till gondolen igen
    this.time.delayedCall(4900, () => {
      this.tweens.add({ targets: sk, y: sk.y - 5, duration: 140, yoyo: true, repeat: 3, onUpdate: smuts }); this.regiLjud('vissling'); this.k4Logg('baronen hejar');
      this.tweens.add({ targets: skata, x: sk.x - 8, y: sk.y + 12, duration: 800, delay: 300, ease: 'Sine.easeIn', onUpdate: smuts, onComplete: () => { skata.setVisible(false); flax.remove(); } });
    });
    // 5. repet spänns (skeppet drar uppåt och gungar), och blocket rycks loss med ett muller
    this.time.delayedCall(T + 800, () => { this.tweens.add({ targets: sk, y: sk.y - 6, duration: 160, yoyo: true, repeat: 2, onUpdate: smuts }); this.regiLjud('knarr'); });
    this.time.delayedCall(T + 1500, () => {
      // gruset och snön faller där blocket satt (block_slits_01 och sedan _02)
      const g1 = this.regiram('block_slits_01'), g2 = this.regiram('block_slits_02');
      if (g1) { const grus = this.add.image(bl.x, bl.y + 10, g1.nyckel, g1.ram); this.lagerLuft.add(grus); this.lagda.push(grus);
        this.time.delayedCall(350, () => { if (g2) grus.setTexture(g2.nyckel, g2.ram); smuts(); });
        this.tweens.add({ targets: grus, y: grus.y + 14, alpha: 0, duration: 900, delay: 500, onUpdate: smuts, onComplete: () => grus.destroy() }); }
      this.cameras.main.shake(600, 0.008); this.regiLjud('krasch'); this.k4Logg('blocket rycks loss');
      this.k4Glitter({ x: bl.x, y: bl.y + 8 }, 10);
      const h = this.regiram('block_hanger');
      this.time.delayedCall(200, () => { if (h && block.setTexture) block.setTexture(h.nyckel, h.ram); smuts(); });
      // skeppet far iväg över krönet med blocket i repet
      this.tweens.add({ targets: sk, x: sk.x + 140, y: sk.y - 50, duration: 1600, delay: 300, ease: 'Quad.easeIn', onUpdate: smuts, onComplete: () => sk.setVisible(false) });
      this.tweens.add({ targets: block, x: block.x + 140, y: block.y - 50, duration: 1600, delay: 300, ease: 'Quad.easeIn', onUpdate: smuts, onComplete: () => { block.setVisible(false); repTimer.remove(); rep.clear(); } });
    });
    // 6. en spricka rullar nedför sluttningen från blocket till snön över mynningen, och kameran följer den
    const spricka = this.add.graphics(); this.lagerLuft.add(spricka); this.lagda.push(spricka);
    const steg = 8, t0 = T + 1800, stegMs = 110;
    /** @type {{ x: number, y: number }[]} */ const punkter = [];
    for (let i = 0; i <= steg; i++) { const f = i / steg; punkter.push({ x: Math.round(bl.x + (snon.x - bl.x) * f + (i % 2 ? 5 : -4) * (i && i < steg ? 1 : 0)), y: Math.round(bl.y + 10 + (snon.y - bl.y - 10) * f) }); }
    for (let i = 1; i <= steg; i++) this.time.delayedCall(t0 + i * stegMs, () => {
      spricka.lineStyle(3, 0x1a2430, 1).lineBetween(punkter[i - 1].x, punkter[i - 1].y, punkter[i].x, punkter[i].y);
      this.regiFokus = { x: punkter[i].x, y: punkter[i].y + 40 };
      if (i % 3 === 0) this.cameras.main.shake(120, 0.004);
      smuts();
    });
    this.time.delayedCall(t0, () => this.regiLjud('rassel'));
    // 7. raset (122.2): snön och stenarna rasar nedför hela berget. Fronten rullar från toppen ned till dem, och kameran
    // följer den, så att det syns hur högt upp de är. Stenar studsar och snödammet yr. Bara läge, opacitet och bildbyte
    // (golvdatorn), och en kort skakning. Stils ras_front_01–03, ras_sten_* och ras_damm_01–03 (LASMIG_122) när de
    // finns, annars gråbox. Snön stannar sedan i luften som en vägg över dem (ras_vagg_01–02, 176 × 88)
    const tSno = t0 + steg * stegMs + 150;
    // snön stannar rakt över hjälten och ungen (LASMIG_122), inom rummet
    const stopp = { x: Math.round(Math.min(this.storlek.bredd - 88, Math.max(88, (this.pos.x + this.ungePos.x) / 2))), y: Math.round(Math.min(this.pos.y, this.ungePos.y) - 50) };
    const rasMs = 2200;
    const ramar = (/** @type {string} */ bas, n = 3) => Array.from({ length: n }, (_, i) => `${bas}_0${i + 1}`).filter((r) => this.regiram(r));
    const frontRamar = ramar('ras_front');
    // fronten: Stils ras_front_01–03 (112 × 56, ca 90 ms per bild), tre i rad längs berget (LASMIG_122)
    /** @type {any} */ let front;
    if (frontRamar.length) {
      const f = /** @type {any} */ (this.regiram(frontRamar[0]));
      front = this.add.container(stopp.x, -40);
      for (const dx of [-100, 0, 100]) front.add(this.add.image(dx, (dx === 0 ? 0 : 6), f.nyckel, f.ram));
    } else {
      front = this.add.graphics({ x: stopp.x, y: -40 });
      front.fillStyle(0xf4f8fc, 1).fillEllipse(0, 0, 200, 46).fillStyle(0xdbe6ef, 1).fillEllipse(-50, 10, 80, 22).fillEllipse(46, 12, 70, 20)
        .fillStyle(0x8c8378, 1).fillCircle(-30, 4, 4).fillCircle(20, -6, 3).fillCircle(60, 2, 4);
    }
    front.setAlpha(0); this.lagerLuft.add(front); this.lagda.push(front);
    if (frontRamar.length > 1) { let i = 0; const ev = this.time.addEvent({ delay: 90, loop: true, callback: () => { if (!front.active || !front.visible) { ev.remove(); return; } i = (i + 1) % frontRamar.length; const f = /** @type {any} */ (this.regiram(frontRamar[i])); front.list.forEach((/** @type {any} */ b, k) => { const g = /** @type {any} */ (this.regiram(frontRamar[(i + k) % frontRamar.length])); b.setTexture(g.nyckel, g.ram); }); void f; smuts(); } }); }
    // 126.6: raset i stor skala. Kameran klipper till berget på långt håll (hela rummet på en skärm, figurerna små),
    // och raset dånar nedför hela berget. Ungen kryper bakom hjälten medan snön kommer. När snön stannar klipper
    // kameran tillbaka till dem, och det blir tyst. Bara kamerans skala, läge, opacitet och bildbyte (golvdatorn)
    const fjarr = this.fjarrvy(true, tSno);
    this.time.delayedCall(tSno, () => {
      front.setAlpha(1); this.cameras.main.shake(500, 0.007); this.regiLjud('rassel'); this.k4Logg('raset nedför berget');
      if (!fjarr) this.regiFokus = { x: front.x, y: Math.max(96, front.y + 40) };
    });
    this.time.delayedCall(tSno + 900, () => { this.regiLjud('rassel'); this.cameras.main.shake(400, 0.005); });
    this.time.delayedCall(tSno + Math.round(rasMs * 0.4), () => this.ungeBakomHjalten());
    this.tweens.add({ targets: front, y: stopp.y - 6, duration: rasMs, delay: tSno, ease: 'Quad.easeIn', onUpdate: () => { if (!fjarr) this.regiFokus = { x: front.x, y: Math.max(96, front.y + 50) }; smuts(); } });
    // stenarna studsar nedför framför fronten (bildbyte i stället för att snurra), och snödammet yr upp och tonar bort
    // Stils ras_sten_01–04 (16 × 14) och ras_sten_liten_01–04 (10 × 9), som snurrar med ca 80 ms per bild
    const stora = ['ras_sten_01', 'ras_sten_02', 'ras_sten_03', 'ras_sten_04'].filter((r) => this.regiram(r));
    const sma = ['ras_sten_liten_01', 'ras_sten_liten_02', 'ras_sten_liten_03', 'ras_sten_liten_04'].filter((r) => this.regiram(r));
    for (let i = 0; i < 7; i++) {
      const stenRamar = i % 2 && sma.length ? sma : stora;
      const x = stopp.x - 90 + i * 30, d = tSno + 120 + i * 150;
      /** @type {any} */ let sten;
      if (stenRamar.length) { const f = /** @type {any} */ (this.regiram(stenRamar[i % stenRamar.length])); sten = this.add.image(x, -20, f.nyckel, f.ram); }
      else { sten = this.add.graphics({ x, y: -20 }); sten.fillStyle(0x7d746a, 1).fillCircle(0, 0, 4 + (i % 2) * 2).fillStyle(0x5a5048, 1).fillCircle(1, 1, 2); }
      sten.setAlpha(0); this.lagerLuft.add(sten); this.lagda.push(sten);
      const studs = 4, del = Math.round((rasMs - 200) / studs);
      const tw = []; for (let j = 1; j <= studs; j++) { const y = -20 + ((stopp.y + 10) / studs) * j; tw.push({ y: y - 14, duration: Math.round(del / 2), ease: 'Sine.easeOut' }, { y, duration: Math.round(del / 2), ease: 'Sine.easeIn' }); }
      this.time.delayedCall(d, () => { sten.setAlpha(1); this.tweens.chain({ targets: sten, tweens: [...tw, { alpha: 0, duration: 300 }], onUpdate: smuts }); });
      if (stenRamar.length > 1) this.time.addEvent({ delay: 80, repeat: Math.round(rasMs / 80), startAt: 0, callback: () => { if (!sten.active) return; const f = /** @type {any} */ (this.regiram(stenRamar[(i + Math.floor(this.time.now / 80)) % stenRamar.length])); sten.setTexture(f.nyckel, f.ram); } });
    }
    const dammRamar = ramar('ras_damm');
    for (let i = 0; i < 6; i++) this.time.delayedCall(tSno + 200 + i * 320, () => {
      const x = stopp.x - 80 + ((i * 53) % 160), y = Math.max(10, front.y - 6);
      /** @type {any} */ let damm;
      if (dammRamar.length) { const f = /** @type {any} */ (this.regiram(dammRamar[0])); damm = this.add.image(x, y, f.nyckel, f.ram); dammRamar.slice(1).forEach((r, k) => this.time.delayedCall(180 * (k + 1), () => { const g = /** @type {any} */ (this.regiram(r)); if (damm.active) damm.setTexture(g.nyckel, g.ram); })); }
      else { damm = this.add.graphics({ x, y }); damm.fillStyle(0xffffff, 0.8).fillCircle(0, 0, 8).fillCircle(7, -3, 6).fillCircle(-6, -2, 5); }
      this.lagerLuft.add(damm); this.lagda.push(damm);
      this.tweens.add({ targets: damm, y: y - 14, alpha: 0, duration: 700, onUpdate: smuts, onComplete: () => damm.destroy() });
    });
    // snöväggen: fronten stannar och blir en vägg av snö över dem, som smular (Stils ras_vagg_01–02, annars
    // snomassa_01–02, annars gråbox)
    const vagg = ramar('ras_vagg', 2).length === 2 ? ['ras_vagg_01', 'ras_vagg_02'] : this.regiram('snomassa_01') && this.regiram('snomassa_02') ? ['snomassa_01', 'snomassa_02'] : null;
    /** @type {any} */ let sno;
    if (vagg) {
      const sm = /** @type {any} */ (this.regiram(vagg[0]));
      // väggens fot (y 72 i bilden) står ca 12 px norr om deras huvuden (LASMIG_122), och bilderna växlar var 300:e ms
      sno = vagg[0] === 'ras_vagg_01' ? this.add.image(stopp.x, Math.round(Math.min(this.pos.y, this.ungePos.y) - 36), sm.nyckel, sm.ram).setOrigin(0.5, 72 / 88) : this.add.image(stopp.x, stopp.y, sm.nyckel, sm.ram);
      let nr = 0;
      const ev = this.time.addEvent({ delay: vagg[0] === 'ras_vagg_01' ? 300 : 400, loop: true, callback: () => { if (!sno.active) { ev.remove(); return; } nr = 1 - nr; const f = /** @type {any} */ (this.regiram(vagg[nr])); sno.setTexture(f.nyckel, f.ram); smuts(); } });
    } else {
      sno = this.add.graphics({ x: stopp.x, y: stopp.y });
      sno.fillStyle(0xdbe6ef, 1).fillRect(-88, -34, 176, 50).fillStyle(0xf4f8fc, 1).fillEllipse(0, -34, 184, 30).fillRect(-80, -30, 160, 34)
        .fillStyle(0x8c8378, 1).fillCircle(-50, -10, 4).fillCircle(30, -16, 5).fillCircle(64, -2, 3).fillStyle(0xbfe6ff, 1).fillRect(-14, -4, 8, 6).fillRect(40, -22, 6, 5);
    }
    sno.setAlpha(0); this.lagerLuft.add(sno); this.lagda.push(sno);
    // den igenrasade mynningen (tillståndet ras) syns först när snön har rasat (mynningen_stangs)
    this.k4 = { ...(this.k4 || {}), rasDolt: true };
    const dolj = this.time.addEvent({ delay: 50, loop: true, callback: () => { const r = /** @type {any} */ (this.ritade.get('ras_mynningen')); if (!this.k4?.rasDolt) { dolj.remove(); r?.setVisible?.(true); smuts(); return; } if (r?.visible) { r.setVisible(false); smuts(); } } });
    // fronten stannar en bit ovanför hjälten och ungen och blir väggen, som står kvar tills STOR SKÖLD är skriven
    const tVagg = tSno + rasMs;
    this.time.delayedCall(tVagg, () => {
      this.cameras.main.shake(300, 0.006); this.regiLjud('duns');
      // tillbaka till dem, och tyst (126.6): stycket och slingan tystnar en stund medan snön hänger över dem
      this.regiFokus = { x: stopp.x, y: stopp.y + 30 };
      if (fjarr) this.fjarrvy(false);
      this.b.ljud?.tystnad?.(2600); this.k4Logg('tystnad när snön stannar');
    });
    // ungen kikar fram bakom hjälten och tittar upp på snön
    this.time.delayedCall(tVagg + 700, () => this.ungeKikarFram());
    this.tweens.add({ targets: sno, alpha: 1, duration: 250, delay: tVagg, onUpdate: smuts });
    this.tweens.add({ targets: front, alpha: 0, duration: 300, delay: tVagg + 100, onUpdate: smuts });
    this.k4 = { ...(this.k4 || {}), sno };
    this.time.delayedCall(tVagg + 2400, () => { this.regiFokus = null; });
    this.k4Logg('blocket_lyfts'); this.k4Logg('snöraset i ett svep'); this.k4Logg('snön stannar i luften');
    return tVagg + 2500;
  }

  /**
   * Berget på långt håll (126.6): kameran visar hela rummet på en skärm (skalan hälften), med figurerna små, från ms
   * (eller av direkt). Det går bara i ett rum som är 2 × 2 skärmar eller mindre, och textlagret i världen göms medan
   * skalan inte stämmer med det. @param {boolean} pa @param {number} [om] ms @returns {boolean} om det går
   */
  fjarrvy(pa, om = 0) {
    const k = this.cameras.main;
    if (pa && (this.storlek.bredd > 640 || this.storlek.hojd > 384 || enSkarm(this.storlek))) return false;
    const gor = () => {
      const S = this.storlek;
      this.k4 = { ...(this.k4 || {}), fjarran: pa };
      if (pa) {
        // klipp (ingen glidning): hela rummet mitt på skärmen, i halva skalan
        k.setZoom(0.5);
        this.sattKamera({ x: Math.round(S.bredd / 2 - RUM.bredd / 2), y: Math.round(S.hojd / 2 - RUM.hojd / 2) });
        this.k4Logg('raset på långt håll');
      } else {
        // klipp tillbaka till dem (regiFokus, annars hjälten)
        k.setZoom(1);
        const f = this.regiFokus ?? this.pos;
        this.sattKamera({ x: Math.max(0, Math.min(S.bredd - RUM.bredd, f.x - RUM.bredd / 2)), y: Math.max(0, Math.min(S.hojd - RUM.hojd, f.y - RUM.hojd / 2)) });
      }
      this.b.vidFjarrvy?.(pa);
      this.smutsig = true;
    };
    if (om > 0) this.time.delayedCall(om, gor); else gor();
    return true;
  }

  /** Ungen kryper ihop bakom hjälten, på andra sidan om raset (126.6). */
  ungeBakomHjalten() {
    if (!this.unge.visible) return;
    const fran = { ...this.ungePos }, mal = { x: this.pos.x - 3, y: this.pos.y + 7 };
    this.ungeMal = { x: mal.x, y: mal.y, mot: -Math.PI / 2 };
    const t = { p: 0 };
    this.tweens.add({ targets: t, p: 1, duration: 450, ease: 'Sine.easeOut', onUpdate: () => { this.ungePos = { x: fran.x + (mal.x - fran.x) * t.p, y: fran.y + (mal.y - fran.y) * t.p }; this.placera(); this.smutsig = true; },
      onComplete: () => { this.ungeLage('kryper_ihop', 'ner', 200, 3); } });
    this.k4Logg('ungen kryper bakom hjälten');
  }

  /** Ungen kikar fram bakom hjälten och tittar upp på snön som hänger över dem, och kryper tillbaka (126.6). */
  ungeKikarFram() {
    if (!this.unge.visible) return;
    const hem = { ...this.ungePos }, ut = { x: hem.x + 9, y: hem.y - 2 };
    const t = { p: 0 };
    this.tweens.chain({ targets: t, tweens: [
      { p: 1, duration: 350, ease: 'Sine.easeOut', onUpdate: () => { this.ungePos = { x: hem.x + (ut.x - hem.x) * t.p, y: hem.y + (ut.y - hem.y) * t.p }; this.placera(); this.smutsig = true; },
        onComplete: () => { this.ungeLage('lyssnar', 'upp', 400, 2); } },
      { p: 0, duration: 400, delay: 1400, ease: 'Sine.easeIn', onUpdate: () => { this.ungePos = { x: hem.x + (ut.x - hem.x) * t.p, y: hem.y + (ut.y - hem.y) * t.p }; this.placera(); this.smutsig = true; } },
    ] });
    this.k4Logg('ungen kikar fram');
  }

  /**
   * Luftskeppet glider förbi högt ovanför medan han hoppar en stig (121.2): kartans stig har `luftskepp`. Det säger att
   * något är på väg, utan repliker. Stils luftskepp om det finns (litet, på väg mot toppen), annars gråboxens.
   * @param {{ x: number, y: number }} fran stigens nedre kant @param {{ x: number, y: number }} till dit han ska upp
   */
  skeppForbi(fran, till) {
    const smuts = () => { this.smutsig = true; };
    const y = Math.max(8, Math.min(fran.y, till.y) - 70);
    const x0 = Math.round(Math.min(fran.x, till.x) - 200), x1 = Math.round(Math.max(fran.x, till.x) + 220);
    // hänger skeppet redan kvar efter ankomsten, är det det skeppet som glider förbi och tillbaka mot toppen
    const kvar = this.k4?.skepp?.active && this.k4.skepp.visible ? this.k4.skepp : null;
    if (kvar) {
      const hem = { x: kvar.x, y: kvar.y };
      this.tweens.chain({ targets: kvar, tweens: [
        { x: Math.round((fran.x + till.x) / 2), y, duration: 4000, ease: 'Sine.easeInOut', onUpdate: smuts },
        { x: hem.x, y: hem.y, duration: 5000, ease: 'Sine.easeInOut', onUpdate: smuts },
      ] });
      this.regiLjud('luftskepp'); this.k4Logg('luftskeppet glider förbi över stigen');
      return;
    }
    /** @type {any} */ let sk;
    if (this.textures.exists('baronen') && this.textures.get('baronen').has('luftskepp_glider_01')) sk = this.add.image(x0, y, 'baronen', 'luftskepp_glider_01').setScale(0.5).setOrigin(0.5, 0.5);
    else { sk = this.add.graphics({ x: x0, y }); sk.fillStyle(0xd9782f, 1).fillEllipse(0, 0, 30, 12).fillStyle(0x7a4a26, 1).fillRect(-5, 7, 10, 4); }
    sk.setAlpha(0.9); this.lagerLuft.add(sk); this.lagda.push(sk);
    this.regiLjud('luftskepp');
    this.tweens.add({ targets: sk, x: x1, y: y - 10, duration: 9000, ease: 'Linear', onUpdate: smuts, onComplete: () => sk.destroy() });
    this.k4Logg('luftskeppet glider förbi över stigen');
  }

  /**
   * Något glimtar där en frivillig scen lockar (122.11, istappsgrottan): Stils lockglimt_01–04 tänds och släcks vid
   * föremålet, annars gråboxens glitter, och föremålet glimtar en stund. @param {string} id
   */
  lockGlimt(id) {
    const o = this.ruta(id); if (!o) return;
    const p = { x: o.x + o.b / 2, y: o.y + o.h / 2 };
    const ramar = ['lockglimt_01', 'lockglimt_02', 'lockglimt_03', 'lockglimt_04'].filter((r) => this.regiram(r));
    if (ramar.length) {
      const f = /** @type {any} */ (this.regiram(ramar[0]));
      const img = this.add.image(p.x, p.y, f.nyckel, f.ram); this.lagerLjust.add(img); this.lagda.push(img);
      ramar.slice(1).forEach((r, i) => this.time.delayedCall(200 * (i + 1), () => { const g = /** @type {any} */ (this.regiram(r)); if (img.active) img.setTexture(g.nyckel, g.ram); this.smutsig = true; }));
      this.time.delayedCall(200 * ramar.length + 200, () => img.destroy());
    } else { this.k4Glitter(p, 14); this.time.delayedCall(500, () => this.k4Glitter(p, 10)); }
    this.markera(id, true); this.time.delayedCall(1600, () => this.markera(id, false));
    this.k4Logg(`lockglimt vid ${id}`);
  }

  /** gatan_i_boken (Innehåll pass 119): hjälten skriver av gåtans rader i sin bok, en liten bok över honom och pennan, tills Stils bild finns. @returns {number} */
  gatanIBoken() {
    const smuts = () => { this.smutsig = true; };
    const p = { x: Math.round(this.pos.x), y: Math.round(this.pos.y - 34) };
    const g = this.add.graphics({ x: p.x, y: p.y });
    g.fillStyle(0x6b4a2b, 1).fillRect(-10, -7, 20, 14).fillStyle(0xf5ecd7, 1).fillRect(-9, -6, 8, 12).fillRect(1, -6, 8, 12);
    this.lagerLjust.add(g); this.lagda.push(g);
    const rad = this.add.graphics({ x: p.x, y: p.y }); this.lagerLjust.add(rad); this.lagda.push(rad);
    for (let i = 0; i < 3; i++) this.time.delayedCall(250 + i * 350, () => { rad.lineStyle(1, 0x1a1410, 1).lineBetween(-8, -3 + i * 4, -3, -3 + i * 4).lineBetween(2, -3 + i * 4, 7, -3 + i * 4); this.regiLjud('penndrag'); smuts(); });
    this.time.delayedCall(1500, () => this.tweens.add({ targets: [g, rad], alpha: 0, duration: 300, onUpdate: smuts, onComplete: () => { g.destroy(); rad.destroy(); } }));
    this.k4Logg('gatan_i_boken');
    return 1900;
  }

  /** STOR SKÖLD: en jättebubbla över hjälten och ungen, och snön som hängde dundrar mot den och ligger på den. @returns {number} */
  storSkoldRas() {
    if (this.k4?.bubbla?.active) return 300; // effekten och reaktionen är samma regi
    const smuts = () => { this.smutsig = true; };
    const mx = Math.round((this.pos.x + this.ungePos.x) / 2), my = Math.round(Math.max(this.pos.y, this.ungePos.y) - 12);
    /** @type {any} */ let b;
    if (this.regiram('skold_stor_tands_01') && this.regiram('skold_stor_bubbla_01') && this.regiram('skold_stor_bubbla_02')) {
      const fot = this.mittMellan();
      const tand = this.regibild(['skold_stor_tands_01', 'skold_stor_tands_02', 'skold_stor_tands_03'], fot.x, fot.y + 2, 150, this.lagerLjust);
      if (tand) this.time.delayedCall(450, () => tand.destroy());
      b = this.regibild(['skold_stor_bubbla_01'], fot.x, fot.y + 2, 0, this.lagerLjust); b.setAlpha(0); this.lagda.push(b);
      this.time.delayedCall(450, () => { if (b.active) b.setAlpha(1); smuts(); });
      let nr = 0;
      const ev = this.time.addEvent({ delay: 450, loop: true, callback: () => { if (!b.active) { ev.remove(); return; } nr = 1 - nr; const f = /** @type {any} */ (this.regiram(nr ? 'skold_stor_bubbla_02' : 'skold_stor_bubbla_01')); b.setTexture(f.nyckel, f.ram); smuts(); } });
      this.regiLjud('glitter');
    } else {
      b = this.add.graphics({ x: mx, y: my });
      b.fillStyle(0xbfe6ff, 0.25).fillEllipse(0, 0, 64, 52).lineStyle(2, 0xffffff, 0.9).strokeEllipse(0, 0, 64, 52);
      b.setScale(0.2); this.lagerLjust.add(b); this.lagda.push(b);
      this.tweens.add({ targets: b, scale: 1, duration: 500, ease: 'Back.easeOut', onUpdate: smuts });
    }
    this.k4Glitter({ x: mx, y: my }, 36);
    const sno = this.k4?.sno;
    if (sno?.active) this.tweens.add({ targets: sno, x: mx, y: my - 30, duration: 500, delay: 600, ease: 'Quad.easeIn', onUpdate: smuts, onComplete: () => this.cameras.main.shake(300, 0.005) });
    this.k4 = { ...(this.k4 || {}), bubbla: b };
    this.k4Logg('stor_skold_ras');
    return 1400;
  }

  /**
   * Efter STOR SKÖLD (122.2): bubblan växer runt hjälten och ungen, och bilden byter till grottan inifrån vid ingången.
   * De springer in genom öppningen, snöraset täpper till den och allt blir svart. Pass 1 slutar i det svarta. Bilden
   * inifrån är en egen bild över rummet (Stils mynning_inifran_01–04, ca 250 ms per bild, annars gråbox), och den står
   * kvar svart tills rummet byts. @returns {number}
   */
  mynningenStangs() {
    const smuts = () => { this.smutsig = true; };
    const b = this.k4?.bubbla, sno = this.k4?.sno;
    // 1. bubblan växer fram runt dem, och snöväggen trycker mot den
    if (b?.active) this.tweens.add({ targets: b, scale: (b.scale || 1) * 1.2, duration: 500, ease: 'Back.easeOut', onUpdate: smuts });
    if (sno?.active) this.tweens.add({ targets: sno, y: sno.y + 8, duration: 500, ease: 'Quad.easeIn', onUpdate: smuts });
    this.regiLjud('glitter');
    // 2. bilden byter till grottan inifrån (en svart övertoning, sedan bilden vid ingången)
    const vy = this.cameras.main.worldView;
    const x0 = Math.round(vy.x), y0 = Math.round(vy.y), B = 320, H = 192;
    const lager = this.add.container(0, 0); this.lagerLjust.add(lager); this.lagda.push(lager);
    const svart = this.add.rectangle(x0, y0, B, H, 0x000000, 1).setOrigin(0, 0).setAlpha(0);
    lager.add(svart);
    const vy0 = 700;
    this.tweens.add({ targets: svart, alpha: 1, duration: 300, delay: vy0 - 300, onUpdate: smuts });
    const inne = this.add.container(0, 0).setAlpha(0); lager.add(inne);
    const mitt = { x: x0 + B / 2, y: y0 + H - 28 };
    const ramar = ['mynning_inifran_01', 'mynning_inifran_02', 'mynning_inifran_03', 'mynning_inifran_04'].filter((r) => this.regiram(r));
    /** @type {any} */ let oppning;
    /** @type {any} */ let snoIn = null;
    if (ramar.length === 4) {
      inne.add(this.add.rectangle(x0, y0, B, H, 0x1b2430, 1).setOrigin(0, 0));
      const f = /** @type {any} */ (this.regiram(ramar[0])); oppning = this.add.image(mitt.x, y0 + H, f.nyckel, f.ram).setOrigin(0.5, 1); inne.add(oppning);
    } else {
      // gråbox: isväggar i den smala gången, och öppningen i söder med dagsljus
      const g = this.add.graphics();
      g.fillStyle(0x1b2430, 1).fillRect(x0, y0, B, H).fillStyle(0x3a4a5c, 1).fillRect(x0 + 110, y0, 100, H).fillStyle(0x56687c, 1).fillRect(x0 + 126, y0, 68, H)
        .fillStyle(0xdfeaf2, 1).fillRect(mitt.x - 28, y0 + H - 44, 56, 44).fillStyle(0xf8fbfd, 1).fillRect(mitt.x - 20, y0 + H - 36, 40, 36);
      inne.add(g); oppning = g;
      snoIn = this.add.graphics(); inne.add(snoIn);
    }
    // hjälten och ungen springer in genom öppningen, uppåt in i gången
    const hjTex = this.hjalteTextur, hjUpp = this.textures.get(hjTex).has('hjalte_ga_upp_01') ? ['hjalte_ga_upp_01', 'hjalte_ga_upp_02'] : null;
    const hj = hjUpp ? this.add.image(mitt.x + 6, y0 + H + 4, hjTex, hjUpp[0]).setOrigin(0.5, 1) : this.add.rectangle(mitt.x + 6, y0 + H + 4, 12, 18, 0x3a6ea5, 1).setOrigin(0.5, 1);
    const uTex = this.ungeBild?.texture?.key, uRam = String(this.ungeBild?.frame?.name || '').replace(/_(ner|upp|vanster|hoger)_0\d$/, '_upp_01');
    const un = this.unge.visible && uTex && this.textures.get(uTex).has(uRam) ? this.add.image(mitt.x - 10, y0 + H + 10, uTex, uRam).setOrigin(0.5, 1) : null;
    inne.add(hj); if (un) inne.add(un);
    const t1 = vy0 + 150;
    this.tweens.add({ targets: inne, alpha: 1, duration: 250, delay: vy0, onUpdate: smuts });
    this.tweens.add({ targets: svart, alpha: 0, duration: 250, delay: vy0, onUpdate: smuts });
    const spring = 900;
    this.tweens.add({ targets: hj, y: y0 + H - 70, duration: spring, delay: t1, ease: 'Sine.easeOut', onUpdate: smuts });
    if (un) this.tweens.add({ targets: un, y: y0 + H - 60, duration: spring, delay: t1 + 120, ease: 'Sine.easeOut', onUpdate: smuts });
    if (hjUpp) this.time.delayedCall(t1, () => { let i = 0; this.time.addEvent({ delay: 140, repeat: Math.round(spring / 140), callback: () => { i = 1 - i; if (hj.active) hj.setFrame(hjUpp[i]); smuts(); } }); });
    this.time.delayedCall(t1, () => { this.regiLjud('prassel'); this.k4Logg('de springer in i grottan'); });
    // 3. snöraset täpper till öppningen (Stils bilder, ca 250 ms per bild), och allt blir svart
    const t2 = t1 + spring + 150;
    if (ramar.length === 4) ramar.slice(1).forEach((r, i) => this.time.delayedCall(t2 + i * 250, () => { const f = /** @type {any} */ (this.regiram(r)); if (oppning.active) oppning.setTexture(f.nyckel, f.ram); smuts(); }));
    else for (let i = 1; i <= 4; i++) this.time.delayedCall(t2 + (i - 1) * 250, () => { snoIn?.clear().fillStyle(0xf4f8fc, 1).fillRect(mitt.x - 28, y0 + H - 44 * (i / 4), 56, 44 * (i / 4)).fillStyle(0xdbe6ef, 1).fillEllipse(mitt.x, y0 + H - 44 * (i / 4), 60, 10); smuts(); });
    this.time.delayedCall(t2, () => { this.cameras.main.shake(400, 0.006); this.regiLjud('duns'); this.k4Logg('snön täpper till öppningen'); });
    const t3 = t2 + 4 * 250 + 200;
    this.tweens.add({ targets: svart, alpha: 1, duration: 500, delay: t3, onUpdate: smuts });
    // ute i stigens rum: snön ligger över mynningen (tillståndet ras), när bilden kommer tillbaka efter en omstart
    this.time.delayedCall(t3, () => { if (sno?.active) sno.setVisible(false); if (b?.active) b.setVisible(false); if (this.k4) this.k4.rasDolt = false; });
    // där ungen står inne i grottan, när dess ögon tänds i mörkret (ungens_ogon, 126.7)
    this.k4 = { ...(this.k4 || {}), inne: { lager, x: un ? un.x : mitt.x + 10, y: y0 + H - 60 } };
    this.k4Logg('mynningen_stangs');
    return t3 + 700;
  }

  /**
   * Ungens ögon i mörkret (124.6, 126.7): efter det svarta tänds två små ljus svagt där ungen står, och ungen blinkar en
   * gång med ett litet ljud. Stils bilder `unge_ogon_morker_01–02` (öppna och blinkande) och ljudet `unge_blinkar`
   * när de finns, annars gråbox och `lucka_pip`. Ögonen står kvar till passets slut. @returns {number}
   */
  ungensOgon() {
    const smuts = () => { this.smutsig = true; };
    const inne = this.k4?.inne, vy = this.cameras.main.worldView;
    const p = inne ? { x: Math.round(inne.x), y: Math.round(inne.y) } : { x: Math.round(vy.x + vy.width / 2), y: Math.round(vy.y + vy.height - 60) };
    let lager = inne?.lager;
    if (!lager?.active) {
      // utan scenen före (en omstart): ett svart lager över skärmen
      lager = this.add.container(0, 0); this.lagerLjust.add(lager); this.lagda.push(lager);
      lager.add(this.add.rectangle(Math.round(vy.x), Math.round(vy.y), vy.width, vy.height, 0x000000, 1).setOrigin(0, 0));
    }
    const oppna = this.regiram('unge_ogon_morker_01'), blink = this.regiram('unge_ogon_morker_02');
    /** @type {any} */ let ogon;
    if (oppna) ogon = this.add.image(p.x, p.y, oppna.nyckel, oppna.ram);
    else { ogon = this.add.graphics({ x: p.x, y: p.y }); ogon.fillStyle(0xfff2a8, 1).fillCircle(-3, 0, 1.5).fillCircle(3, 0, 1.5); }
    ogon.setAlpha(0); lager.add(ogon);
    this.tweens.add({ targets: ogon, alpha: 0.75, duration: 700, delay: 300, ease: 'Sine.easeIn', onUpdate: smuts });
    const ljud = this.b.ljud?.har?.('unge_blinkar') ? 'unge_blinkar' : 'lucka_pip';
    this.time.delayedCall(1500, () => {
      if (blink && oppna) { ogon.setTexture(blink.nyckel, blink.ram); this.time.delayedCall(160, () => { if (ogon.active) ogon.setTexture(oppna.nyckel, oppna.ram); smuts(); }); }
      else this.tweens.add({ targets: ogon, scaleY: 0.15, duration: 80, yoyo: true, onUpdate: smuts });
      this.regiLjud(ljud); smuts();
    });
    this.k4Logg('ungens ögon tänds i mörkret');
    return 2400;
  }

  /** LJUS i grottan: ljusbollen tänds, och regnbågsljuset bryts i isen så att hela grottan glittrar. @returns {number} */
  grottanGlittrar() {
    const p = { x: this.pos.x, y: this.pos.y - 24 };
    this.k4Glitter(p, 70);
    this.time.delayedCall(300, () => this.k4Glitter(p, 120));
    this.k4Logg('grottan_glittrar');
    return 1600;
  }

  /** Kameran glider till Farfars skrift som glimmar i isen på andra sidan stigen, och tillbaka. @returns {number} */
  grottanVisarVaggen() {
    // 124.2: i salen glider kameran till Farfars tavla på andra stranden (förut gåtans vägg i den stora grottan)
    const v = this.k4Punkt('tavla_farfar') ?? this.k4Punkt('gata_1'); if (!v) return 0;
    this.regiFokus = v;
    this.time.delayedCall(800, () => this.k4Glitter({ x: v.x, y: v.y + 4 }, 16));
    this.time.delayedCall(2200, () => { this.regiFokus = null; });
    this.k4Logg('grottan_visar_vaggen');
    return 2700;
  }

  /** FLYG vid ishyllan: isblocket svävar upp och åt sidan, och under det syns avtrycket av en stor fot. @returns {number} */
  isblockSvavar() {
    const r = /** @type {any} */ (this.ritade.get('isblock'));
    if (!r || this.k4?.blockFlyttat) return r ? 300 : 0;
    const smuts = () => { this.smutsig = true; };
    this.k4 = { ...(this.k4 || {}), blockFlyttat: true };
    this.tweens.add({ targets: r, y: r.y - 14, duration: 500, ease: 'Sine.easeOut', onUpdate: smuts });
    this.tweens.add({ targets: r, x: r.x + 40, duration: 600, delay: 500, onUpdate: smuts });
    this.tweens.add({ targets: r, y: r.y, duration: 300, delay: 1100, onUpdate: smuts });
    const o = this.ruta('fotavtryck');
    if (o) this.time.delayedCall(1200, () => this.k4Glitter({ x: o.x + o.b / 2, y: o.y + o.h / 2 }, 14));
    this.k4Logg('fotavtryck_stor');
    return 1600;
  }

  /** Ungen ställer sin fot i det stora avtrycket och står stilla en stund. @returns {number} */
  ungenFotAvtryck() {
    const o = this.ruta('fotavtryck'); if (!o || !this.unge.visible) return 0;
    const ms = this.ungeGarTill({ x: o.x + o.b / 2, y: o.y + o.h - 2 });
    this.time.delayedCall(ms + 50, () => this.ungeLage('fot_avtryck', 'ner', 600, 1));
    this.k4Logg('ungen_fot_avtryck');
    return ms + 2400;
  }

  /** Ungen går till sprickan och slår med klubbsvansen två gånger, isen rasar ut och solen strömmar in. @returns {number} */
  ungenSlarIsen() {
    const s = this.k4Punkt('spricka'); if (!s) return 0;
    const smuts = () => { this.smutsig = true; };
    const ms = this.unge.visible ? this.ungeGarTill({ x: s.x - 10, y: s.y + 6 }) : 0;
    // Stils unge1_svansslag_hoger_01–03 (ca 150 ms per bild, två slag), och isväggen spricker och rasar ut
    this.time.delayedCall(ms + 50, () => this.ungeLage('svansslag', 'hoger', 150, 2));
    for (const i of [0, 1]) this.time.delayedCall(ms + 350 + i * 450, () => { this.cameras.main.shake(180, 0.006); this.b.ljud?.spela('knak'); smuts(); });
    this.time.delayedCall(ms + 1300, () => {
      const r = /** @type {any} */ (this.ritade.get('spricka'));
      const r1 = this.regiram('isvagg_rasar_01'), r2 = this.regiram('isvagg_rasar_02');
      if (r?.setTexture && r1 && r2) { r.setTexture(r1.nyckel, r1.ram); this.time.delayedCall(250, () => { if (r.active) r.setTexture(r2.nyckel, r2.ram); smuts(); }); } else r?.setVisible?.(false);
      const g = this.add.graphics(); g.fillStyle(0xfff3c0, 0.5).fillTriangle(s.x + 8, s.y - 24, s.x + 8, s.y + 24, s.x - 60, s.y + 40);
      this.lagerLjust.add(g); this.lagda.push(g); this.k4Glitter(s, 30); smuts();
    });
    this.k4Logg('ungen_slar_isen');
    return ms + 2000;
  }

  /**
   * Formeln vid klippan (121.4) i gråbox: en stege av trä, ett orange rep eller trappsteg av is växer upp längs kartans
   * klippan_uppe, ett efter ett nedifrån. Bilden står kvar tills rummet byts. @param {'stege' | 'rep' | 'trappa'} sort
   * @param {number} andel hur långt upp den når (1 = ända upp) @returns {any} bilden, eller null
   */
  klippanRita(sort, andel = 1) {
    const o = this.ruta('klippan_uppe') || this.ruta('klippa');
    if (!o) return null;
    const x = o.x + o.b / 2, nere = o.y + o.h, uppe = nere - Math.round(o.h * andel);
    // Stils klippa_stege, klippa_rep och klippa_trappa (LASMIG_122): bilden tonas fram nedifrån och upp
    const stil = andel >= 1 ? this.regiram(`klippa_${sort}`) : null;
    if (stil) {
      // klippan är högre än bilden (124.8, ca 120 px): bilderna staplas nedifrån, och den översta når kanten
      const hb = /** @type {any} */ (this.textures.getFrame(stil.nyckel, stil.ram))?.height || 72;
      const img = this.add.container(0, 0).setAlpha(0);
      for (let y = nere; y > uppe; y -= hb) img.add(this.add.image(x, Math.max(y, uppe + hb), stil.nyckel, stil.ram).setOrigin(0.5, 1));
      this.lagerObjekt.add(img); this.lagda.push(img);
      this.tweens.add({ targets: img, alpha: 1, duration: 700, onUpdate: () => { this.smutsig = true; } });
      this.b.ljud?.spela('stege');
      return { g: img, ms: 700, x, uppe, nere };
    }
    const g = this.add.graphics();
    const delar = Math.max(1, Math.round((nere - uppe) / 8));
    for (let i = 0; i < delar; i++) {
      this.time.delayedCall(i * 90, () => {
        const y = nere - (i + 1) * 8;
        if (sort === 'stege') g.fillStyle(0x8a5a2e, 1).fillRect(x - 9, y, 3, 8).fillRect(x + 6, y, 3, 8).fillStyle(0xb07a44, 1).fillRect(x - 8, y + 3, 16, 2);
        else if (sort === 'rep') g.fillStyle(0xd9782f, 1).fillRect(x - 1 + (i % 2 ? 1 : -1), y, 2, 8);
        else g.fillStyle(0x9cc3dc, 1).fillRect(x - 12 + (i % 2) * 2, y + 2, 24, 6).fillStyle(0xe4f1fa, 1).fillRect(x - 12 + (i % 2) * 2, y + 2, 24, 2);
        if (i % 2 === 0) this.b.ljud?.spela('pling');
        this.smutsig = true;
      });
    }
    this.lagerObjekt.add(g); this.lagda.push(g);
    return { g, ms: delar * 90, x, uppe, nere };
  }

  /** Rätt formel vid klippan: den växer upp, hjälten klättrar upp och ungen kommer efter. @param {'stege' | 'rep' | 'trappa'} sort */
  klippanUpp(sort) {
    const r = this.klippanRita(sort); if (!r) return 0;
    const smuts = () => { this.smutsig = true; };
    this.regiFokus = { x: r.x, y: Math.round((r.uppe + r.nere) / 2) };
    const fran = { ...this.pos }, till = { x: r.x, y: r.uppe - 10 }, t = { p: 0 };
    // klättringen tar längre tid uppför en högre klippa (ca 1,4 s för 60 px, 124.8)
    const klattring = Math.round(Math.max(1400, (fran.y - till.y) * 16));
    this.time.delayedCall(r.ms + 300, () => {
      this.tweens.add({ targets: t, p: 1, duration: klattring, ease: 'Sine.easeInOut', onUpdate: () => {
        this.pos = { x: fran.x + (r.x - fran.x) * Math.min(1, t.p * 3), y: fran.y + (till.y - fran.y) * t.p };
        this.vand = { x: 0, y: -1 }; this.placera(); smuts();
      }, onComplete: () => { this.pos = { ...till }; this.placera(); smuts(); } });
    });
    // ungen flyger inte (122.4, spelarens regel): den klamrar sig fast under hjälten och biter i ryggsäcken medan han
    // klättrar. Med Stils hjalte_klattrar_unge_upp_01–02 är ungen med i hjältens bild, annars hänger gråboxens unge
    // tätt under honom hela vägen upp
    const klattrar = this.textures.get(this.hjalteTextur).has('hjalte_klattrar_unge_upp_01') ? ['hjalte_klattrar_unge_upp_01', 'hjalte_klattrar_unge_upp_02'] : null;
    const ungeMed = this.unge.visible;
    this.time.delayedCall(r.ms + 250, () => {
      if (ungeMed && !klattrar) this.ungeGarTill({ x: fran.x, y: fran.y + 6 });
      if (ungeMed && klattrar) this.unge.setVisible(false);
    });
    const halla = this.time.addEvent({ delay: 50, loop: true, startAt: 0, callback: () => {
      if (t.p <= 0 || !ungeMed) return;
      if (klattrar) { this.kropp?.setFrame?.(klattrar[Math.floor(this.time.now / 200) % 2]); }
      else { this.ungePos = { x: this.pos.x - 3, y: this.pos.y + 7 }; this.ungeFast = null; this.placera(); }
      smuts();
    } });
    this.time.delayedCall(r.ms + 300 + klattring + 50, () => {
      halla.remove();
      if (ungeMed) { this.unge.setVisible(true); this.ungePos = { x: till.x - 14, y: till.y + 2 }; this.placera(); }
      if (klattrar) this.ritaHjalte();
      smuts();
    });
    this.time.delayedCall(r.ms + klattring + 700, () => { this.regiFokus = null; });
    this.k4Logg(`klippan: ${sort} upp`);
    return r.ms + klattring + 800;
  }

  /** Nästan rätt vid klippan: det som växer är för kort, gungar och blir borta. @param {'stege' | 'rep' | 'trappa'} sort */
  klippanNastan(sort) {
    const r = this.klippanRita(sort, sort === 'trappa' ? 0.15 : 0.4); if (!r) return 0;
    this.time.delayedCall(r.ms + 500, () => this.tweens.add({ targets: r.g, alpha: 0, duration: 500, onUpdate: () => { this.smutsig = true; } }));
    this.k4Logg(`klippan: ${sort} för kort`);
    return r.ms + 1100;
  }

  /** Blocket glider ur repet under luftskeppet och plumsar ner i en snödriva. @returns {number} */
  blocketDriva() {
    const l = this.k4Punkt('luftskepp'), d = this.k4Punkt('driva'); if (!l || !d) return 0;
    const smuts = () => { this.smutsig = true; };
    const sk = this.k4Skepp(l); sk.setVisible(true);
    const block = this.add.graphics({ x: l.x, y: l.y + 34 });
    block.fillStyle(0x8c8378, 1).fillRect(-10, -8, 20, 16).lineStyle(1, 0xd9782f, 1).lineBetween(0, -8, 0, -24);
    this.lagerLuft.add(block); this.lagda.push(block);
    this.regiFokus = { x: l.x, y: l.y + 40 };
    this.tweens.add({ targets: block, x: d.x, y: d.y, duration: 600, delay: 1000, ease: 'Quad.easeIn', onUpdate: smuts, onComplete: () => {
      block.clear(); block.fillStyle(0x8c8378, 1).fillRect(-10, -2, 20, 8).fillStyle(0xf4f8fc, 1).fillEllipse(0, 4, 34, 12); this.k4Glitter(d, 16); smuts();
    } });
    this.time.delayedCall(2400, () => { this.regiFokus = null; });
    this.k4Logg('blocket_driva');
    return 2800;
  }

  /** Den speciella stenen ångar, och svansen med klubban syns som ett fossil i den. Avtrycket står kvar. @returns {number} */
  fossilSvans() {
    const o = this.ruta('sten_klubba'); if (!o) return 0;
    const g = this.add.graphics({ x: o.x + o.b / 2, y: o.y + o.h / 2 });
    g.lineStyle(2, 0x4a3f36, 1).beginPath(); g.moveTo(-10, 2); g.lineTo(-2, 0); g.lineTo(4, -2); g.strokePath();
    g.fillStyle(0x4a3f36, 1).fillCircle(7, -3, 3);
    this.lagerObjekt.add(g); this.lagda.push(g);
    this.k4Glitter({ x: o.x + o.b / 2, y: o.y }, 14);
    this.k4Logg('fossil_svans');
    return 1600;
  }

  /** Ungen ställer sig bredvid stenen, lägger svansen intill och viftar så att snön yr. @returns {number} */
  svansarna() {
    const o = this.ruta('sten_klubba'); if (!o || !this.unge.visible) return 0;
    const ms = this.ungeGarTill({ x: o.x + o.b + 10, y: o.y + o.h });
    this.time.delayedCall(ms + 300, () => this.k4Glitter({ x: o.x + o.b + 10, y: o.y + o.h - 6 }, 18));
    this.k4Logg('svansarna');
    return ms + 1600;
  }

  /** Locket fjädrar upp, och kartbit fem ligger i lådan. @returns {number} */
  ladanOppnas() {
    const o = this.ruta('lada_farfar') || this.ruta('sten_klubba'); if (!o) return 0;
    // lådan hämtas varje gång: rummet kan ha ritats om under tiden (visa_foremal), och då är den gamla bilden borta
    const bild = (/** @type {string} */ n) => { const r = /** @type {any} */ (this.ritade.get('lada_farfar')), f = this.regiram(n); if (r?.active && r.setTexture && f) { r.setTexture(f.nyckel, f.ram); this.smutsig = true; } };
    bild('lada_farfar_klick');
    this.time.delayedCall(300, () => bild('lada_farfar_oppnas'));
    this.time.delayedCall(450, () => bild('lada_farfar_oppen'));
    this.k4Glitter({ x: o.x + o.b / 2, y: o.y }, 18);
    this.k4Logg('ladan_oppnas');
    return 1200;
  }

  /** Kartbit fem i gråbox: ett papper mitt i bilden där vägen från berget går upp till molnkanten, som lyser. @returns {number} */
  kartbit5Molnkant() {
    const k = this.kamera, cx = Math.round(k.x + RUM.bredd / 2), cy = Math.round(k.y + RUM.hojd / 2);
    const g = this.add.graphics();
    g.fillStyle(0xeadcb4, 1).fillRect(cx - 40, cy - 30, 80, 60).lineStyle(1, 0x8a6a3a, 1).strokeRect(cx - 40, cy - 30, 80, 60);
    g.fillStyle(0x8c8378, 1).fillTriangle(cx - 24, cy + 20, cx - 10, cy - 2, cx + 4, cy + 20);
    g.lineStyle(1, 0xb03030, 1).beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx + 6, cy - 12); g.lineTo(cx + 22, cy - 20); g.strokePath();
    g.fillStyle(0xffffff, 1).fillEllipse(cx + 24, cy - 22, 26, 8);
    this.lagerLjust.add(g);
    const ring = this.add.graphics(); ring.lineStyle(2, 0xb03030, 1).strokeCircle(cx + 24, cy - 22, 14); this.lagerLjust.add(ring);
    this.tweens.add({ targets: ring, alpha: 0.2, duration: 400, yoyo: true, repeat: 4, onUpdate: () => { this.smutsig = true; } });
    this.time.delayedCall(3300, () => { g.destroy(); ring.destroy(); this.smutsig = true; });
    this.k4Logg('kartbit5_molnkant');
    return 3600;
  }

  /** Herr Skata flyger från en sten till luftskeppet, och skeppet vänder mot molnen i norr. @returns {number} */
  skataHarmarMolnkant() {
    const l = this.k4Punkt('luftskepp'), st = this.k4Punkt('sten_varm'); if (!l || !st) return 0;
    const smuts = () => { this.smutsig = true; };
    const sk = this.k4Skepp(l); sk.setVisible(true);
    const f = this.add.graphics({ x: st.x, y: st.y - 12 });
    f.fillStyle(0x1e1e1e, 1).fillEllipse(0, 0, 10, 6).fillStyle(0xf0f0f0, 1).fillRect(-2, -1, 4, 3);
    this.lagerLuft.add(f); this.lagda.push(f);
    this.tweens.add({ targets: f, x: sk.x, y: sk.y + 6, duration: 900, delay: 1200, onUpdate: smuts, onComplete: () => f.setVisible(false) });
    this.tweens.add({ targets: sk, y: sk.y - 60, x: sk.x - 20, duration: 1000, delay: 2200, onUpdate: smuts });
    this.k4Logg('skata_harmar_molnkant');
    return 3200;
  }

  /** Kvällen: hjälten och ungen går längs bergskammen mot molnkanten, som lyser under två månar. @returns {number} */
  resanMolnkant() {
    // Stils slutbild (115.7, LASMIG_115): kammen mot molnkanten i kvällsljus, och hjälten och ungen som går åt höger
    // (fötterna på kammens stig, bilden i y 105), ett steg var 250:e ms
    const ms = this.slutbildFranSidan({ bak: ['sidovy_k4_slut_bakgrund_01', 'sidovy_k4_slut_bakgrund_02'], figur: ['sidovy_k4_slut_vandrar_01', 'sidovy_k4_slut_vandrar_02'],
      figurY: 105, fran: 40, till: 420, figurMs: 250 });
    if (ms) { this.k4Logg('resan_molnkant'); this.k4Logg('slutbilden: kammen mot molnkanten'); return ms; }
    const smuts = () => { this.smutsig = true; };
    const k = this.kamera;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85).fillEllipse(k.x + RUM.bredd / 2, k.y + 6, RUM.bredd * 0.8, 16);
    g.fillStyle(0xf6efc9, 1).fillCircle(k.x + 40, k.y + 22, 6).fillStyle(0xe9d7f5, 1).fillCircle(k.x + 62, k.y + 30, 4);
    g.setAlpha(0); this.lagerLjust.add(g); this.lagda.push(g);
    this.tweens.add({ targets: g, alpha: 1, duration: 1200, onUpdate: smuts });
    const m = this.k4Punkt('stig_molnkanten');
    if (m) {
      const till = { x: m.x, y: m.y + 20 }, fran = { ...this.pos }, t = { p: 0 };
      this.tweens.add({ targets: t, p: 1, duration: 2400, delay: 600, onUpdate: () => { this.pos = { x: fran.x + (till.x - fran.x) * t.p, y: fran.y + (till.y - fran.y) * t.p }; this.placera(); smuts(); } });
      if (this.unge.visible) this.time.delayedCall(800, () => this.ungeGarTill({ x: till.x - 12, y: till.y + 4 }));
    }
    this.k4Logg('resan_molnkant');
    return 4000;
  }

  /** Tar bort stigen. */
  rensaStig() {
    if (!this.stig) return;
    this.stig.kantTw?.remove();
    this.lagerStig.removeAll(true); this.stig = null; this.smutsig = true;
  }

  /**
   * Hjälten hoppar till en punkt på stigen (ca 0,3 s, i en båge). @param {{ x: number, y: number }} till
   * @returns {number} ms
   */
  stigHopp(till) {
    const fran = { ...this.pos }, t = { p: 0 }, ms = 320;
    this.vand = this.stig?.upp ? { x: Math.sign(till.x - fran.x) * 0.3, y: till.y <= fran.y ? -1 : 1 } : { x: till.x >= fran.x ? 1 : -1, y: Math.sign(till.y - fran.y) * 0.3 };
    this.tweens.add({ targets: t, p: 1, duration: ms, ease: 'Sine.easeInOut', onUpdate: () => {
      this.pos = { x: fran.x + (till.x - fran.x) * t.p, y: fran.y + (till.y - fran.y) * t.p };
      this.placera();
      this.hjalte.y -= Math.round(Math.sin(Math.PI * t.p) * 7);
      this.smutsig = true;
    }, onComplete: () => { this.pos = { ...till }; this.placera(); this.smutsig = true; } });
    this.regiLogg.push(`stig: hopp ${Math.round(till.x)},${Math.round(till.y)}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
    return ms;
  }

  /** Flaket knakar och gungar (fel bokstav): han står kvar. @param {number} r @param {number} k */
  /** Byter ett flaks bild till Stils läge (LASMIG_114), om bilden finns. @param {any} b @param {string} namn @returns {boolean} */
  stigBild(b, namn) {
    const f = foremalsbild(this, namn);
    if (!f || !b?.setTexture) return false;
    b.setTexture(f.nyckel, f.ram); this.smutsig = true; return true;
  }

  stigKnak(r, k) {
    const b = this.stig?.bilder.get(`${r},${k}`); if (!b) return;
    // Stils isflak_gungar_01–02: flaket knakar och gungar, och sedan står det som förut
    if (this.stigBild(b, 'isflak_gungar_01')) {
      const fore = b.frame?.name;
      [1, 2, 1, 2].forEach((n, i) => this.time.delayedCall(i * 70, () => this.stigBild(b, `isflak_gungar_0${n}`)));
      this.time.delayedCall(300, () => { const f = foremalsbild(this, 'isflak'); if (b.active && f && !this.stig?.trampade?.has(`${r},${k}`)) b.setTexture(f.nyckel, f.ram); else if (b.active && fore) this.stigBild(b, 'isflak_spricka'); this.smutsig = true; });
    }
    const x = b.x;
    this.tweens.add({ targets: b, x: { from: x - 2, to: x + 2 }, duration: 60, yoyo: true, repeat: 3, onUpdate: () => { this.smutsig = true; }, onComplete: () => { b.x = x; this.smutsig = true; } });
  }

  /** En återvändsgränd: flaken sjunker långsamt och blir mörka. @param {{ r: number, k: number }[]} lista */
  stigSjunk(lista) {
    for (const { r, k } of lista) {
      const b = this.stig?.bilder.get(`${r},${k}`); if (!b) continue;
      this.stig?.trampade?.delete(`${r},${k}`);
      // Stils isflak_sjunker_01–03: flaket sjunker långsamt, och sedan är det borta under ytan
      if (this.stigBild(b, 'isflak_sjunker_01')) {
        this.time.delayedCall(250, () => b.active && this.stigBild(b, 'isflak_sjunker_02'));
        this.time.delayedCall(500, () => b.active && this.stigBild(b, 'isflak_sjunker_03'));
        this.tweens.add({ targets: b, alpha: 0.35, duration: 900, delay: 500, onUpdate: () => { this.smutsig = true; } });
        continue;
      }
      this.tweens.add({ targets: b, alpha: 0.25, y: b.y + 3, duration: 700, ease: 'Sine.easeIn', onUpdate: () => { this.smutsig = true; } });
    }
  }

  /** Ett kort glitter på ett rätt flak (115.8). @param {number} r @param {number} k */
  stigGlitter(r, k) {
    if (!this.stig) return;
    const p = this.stig.mittFor(r, k);
    const g = this.add.graphics({ x: p.x, y: p.y - 4 });
    for (const [dx, dy] of [[-8, -3], [7, -5], [0, 4], [10, 3]]) g.fillStyle(0xffffff, 1).fillRect(dx, dy, 1, 3).fillRect(dx - 1, dy + 1, 3, 1);
    this.lagerStig.add(g);
    this.tweens.add({ targets: g, alpha: 0, y: g.y - 4, duration: 500, onUpdate: () => { this.smutsig = true; }, onComplete: () => g.destroy() });
  }

  /** Flaket han har gått på får en spricka, så att han ser sitt spår. @param {number} r @param {number} k */
  stigSpricka(r, k) {
    if (!this.stig) return;
    (this.stig.trampade ??= new Set()).add(`${r},${k}`);
    // Stils isflak_spricka: ett flak han har gått på, med en spricka men det håller
    if (this.stigBild(this.stig.bilder.get(`${r},${k}`), 'isflak_spricka')) return;
    const p = this.stig.mittFor(r, k);
    this.stig.sprickor.lineStyle(1, 0x6f8fa8, 1).beginPath().moveTo(p.x - 9, p.y - 3).lineTo(p.x - 3, p.y).lineTo(p.x + 2, p.y - 4).lineTo(p.x + 9, p.y + 1).strokePath();
    this.smutsig = true;
  }

  /**
   * Kanten på ett flak lyser svagt (hjälpen efter ett fel), aldrig bokstaven. null släcker.
   * @param {{ r: number, k: number } | null} ruta
   */
  stigKant(ruta) {
    const s = this.stig; if (!s) return;
    s.kantTw?.remove(); s.kantTw = null;
    s.kant.clear().setVisible(!!ruta).setAlpha(1);
    if (ruta) {
      const p = s.mittFor(ruta.r, ruta.k);
      // Stils isflak_kant_01–02 ovanpå flaket: kanten lyser vitt och ljusblått, aldrig guld (LASMIG_114)
      const k1 = foremalsbild(this, 'isflak_kant_01'), k2 = foremalsbild(this, 'isflak_kant_02');
      if (k1 && k2) {
        const img = this.add.image(p.x, p.y, k1.nyckel, k1.ram); this.lagerStig.add(img);
        let i = 0;
        const ev = this.time.addEvent({ delay: 350, loop: true, callback: () => { if (!img.active) return; i ^= 1; const f = i ? k2 : k1; img.setTexture(f.nyckel, f.ram); this.smutsig = true; } });
        s.kantTw = { remove: () => { ev.remove(); img.destroy(); this.smutsig = true; } };
        s.kant.setVisible(false);
        this.smutsig = true;
        return;
      }
      s.kant.lineStyle(2, 0xdff4ff, 1).strokeRoundedRect(p.x - 18, p.y - 11, 36, 22, 6);
      s.kantTw = this.tweens.add({ targets: s.kant, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1, onUpdate: () => { this.smutsig = true; } });
    }
    this.smutsig = true;
  }

  /**
   * Hjälten vinkar till en figur, och den vinkar tillbaka (113.5), om figuren har Stils vinkning
   * (<namn>_vinka_<håll>_01–02). @param {string} id @returns {boolean} om de vinkade
   */
  vinkaTill(id) {
    const r = /** @type {any} */ (this.ritade.get(id)), o = this.ruta(id);
    if (!o) return false;
    const bas = String(o.bild || r?.frame?.name || '').replace(/_(ner|upp|hoger|vanster)_\d\d$/, '');
    if (!bas || !foremalsbild(this, `${bas}_vinka_ner_01`)) return false;
    const hall = riktningFor({ x: o.x + o.b / 2 - this.pos.x, y: o.y + o.h - this.pos.y });
    this.vinkaHjalte(hall);
    this.vinka(id);
    this.regiLogg.push(`vinkar: ${id}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
    return true;
  }

  /** Ungens position på skärmen i rumspixlar (för att låta ett bär flyga dit). */
  get ungePunkt() { return { x: this.ungePos.x, y: this.ungePos.y - 6 }; }

  /**
   * En fel dörr spikas igen med två plankor (förenklingen). En stig man går på spärras i stället med en
   * omkullfallen gren, och den går inte längre att gå på. @param {string} id
   */
  spika(id) {
    this.smutsig = true;
    const o = this.ruta(id); if (!o) return;
    if (o.golv) {
      if (this.sparrade.has(id)) return;
      this.sparrade.add(id); this.ritaGren(o); this.byggHinder();
      this.pos = this.hinder.narmasteFria(this.pos); this.placera();
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(0xa07a4a).fillRect(o.x - 2, o.y + Math.round(o.h * 0.3), o.b + 4, 3).fillRect(o.x - 2, o.y + Math.round(o.h * 0.65), o.b + 4, 3);
    this.lagerObjekt.add(g);
  }

  /** Grenen tvärs över stigens början (gråbox: en brun stock med gröna blad). @param {import('../karna/rumslayout.js').Objekt} o */
  ritaGren(o) {
    this.smutsig = true;
    const g = this.add.graphics();
    // grenen ligger inne på stigen, strax efter vägskälet (stigens början), så att man ser att den är spärrad
    const tvars = o.riktning === 'hoger' || o.riktning === 'vanster';
    const x = !tvars ? o.x - 4 : o.riktning === 'hoger' ? o.x + 6 : o.x + o.b - 11;
    const y = tvars ? o.y - 4 : o.riktning === 'ned' ? o.y + 6 : o.y + o.h - 11;
    const b = tvars ? 5 : o.b + 8, h = tvars ? o.h + 8 : 5;
    g.fillStyle(0x6b4a2a).fillRect(x, y, b, h);
    g.fillStyle(0x4f8a3a);
    for (let i = 2; i < Math.max(b, h) - 2; i += 6) g.fillRect(tvars ? x - 2 : x + i, tvars ? y + i : y - 2, 3, 3);
    this.lagerObjekt.add(g);
  }

  /** Hjälten (och ungen) syns inte en stund: han är bakom kurvan på en stig. @param {boolean} pa */
  gom(pa) {
    this.hjalte.setVisible(!pa && this.harRum);
    this.unge.setVisible(!pa && this.harRum && this.visaUnge);
    if (!pa) { this.ungePos = { x: this.pos.x - 16, y: this.pos.y }; this.placera(); }
  }

  /** Gå till en punkt (rörelse som spelet styr, t.ex. ett steg tillbaka från en fel dörr). @param {{ x: number, y: number }} mal @param {number} ms */
  ga(mal, ms) {
    const fran = { ...this.pos }, till = this.hinder.narmasteFria(mal);
    const vx = till.x - fran.x, vy = till.y - fran.y, vl = Math.hypot(vx, vy);
    if (vl > 1) { this.vand = { x: vx / vl, y: vy / vl }; this.ritaHjalte(); }
    return new Promise((klar) => {
      const p = { ...fran };
      this.tweens.add({ targets: p, x: till.x, y: till.y, duration: Math.max(1, ms), onUpdate: () => { this.pos = { x: p.x, y: p.y }; this.placera(); }, onComplete: () => { this.pos = { ...till }; this.placera(); klar(undefined); } });
    });
  }

  /** Visa att ett föremål är öppnat och tomt. @param {string} id */
  tomt(id) { this.smutsig = true; const r = this.ritade.get(id); if (r) { r.setFillStyle?.(0x6f6a62); r.setAlpha(0.6); } this.markera(id, false); }

  /** Visa att en kruka är slagen. @param {string} id */
  /**
   * Ägget i lådan (36.7, 10f): regin byter bild på föremålet med äggets bilder (kartans `bild` är `agg_01`).
   * Bara bildbyten och en toning, så golvdatorn klarar det. @param {typeof AGGET[string]} a @returns {boolean}
   */
  aggRegi(a) {
    const o = this.objekt.find((x) => x.bild === 'agg_01' || x.bildSedan === 'agg_skal');
    if (!o || !this.ritade.get(o.id) || !foremalsbild(this, a.ramar[0])) return false;
    // filten som hjälten bar dit ligger i bilden nu (agg_filt), så den lagda filten tas bort
    if (a.tona) { for (const g of this.lagda.filter((x) => Math.abs(x.x - (o.x + o.b / 2 - 6)) < 4 && Math.abs(x.y - (o.y + o.h / 2 - 4)) < 4)) g.destroy(); this.lagda = this.lagda.filter((x) => x.active); }
    if (a.slinga) this.slingaRamar(o.id, a.ramar, a.steg ?? 150);
    else if (a.tona) this.tonaRam(o.id, a.ramar[0], a.ramar[1], a.steg ?? 900);
    else this.spelaRamar(o.id, a.ramar, a.steg ?? 0);
    return true;
  }

  /** Föremålets bild byts (och står kvar tills rummet byts). @param {string} id @param {string} ram */
  sattRam(id, ram) {
    const fb = foremalsbild(this, ram);
    if (!fb) return;
    this.ramFor.set(id, ram);
    const r = /** @type {any} */ (this.ritade.get(id));
    // rummet kan ha ritats om sedan bytet planerades: bara en bild som finns kvar byts
    if (r?.setTexture && r.active && r.scene) { r.setTexture(fb.nyckel, fb.ram); this.smutsig = true; }
  }

  /** Bilderna i tur och ordning, steg ms var; den sista står kvar. @param {string} id @param {string[]} ramar @param {number} steg */
  spelaRamar(id, ramar, steg) {
    this.stoppaRamar(id);
    const t = ramar.slice(1).map((ram, i) => this.time.delayedCall(steg * (i + 1), () => this.sattRam(id, ram)));
    this.sattRam(id, ramar[0]);
    this.ramTimrar.set(id, t);
  }

  /** Det som byter bild på föremålet (en serie, en slinga) slutar. @param {string} id */
  stoppaRamar(id) {
    this.ramSlinga.get(id)?.remove(); this.ramSlinga.delete(id);
    for (const t of this.ramTimrar.get(id) || []) t.remove();
    this.ramTimrar.delete(id);
  }

  /** Bilderna i en slinga tills något annat byter bild (ägget som lyser). @param {string} id @param {string[]} ramar @param {number} steg */
  slingaRamar(id, ramar, steg) {
    this.stoppaRamar(id);
    let i = 0;
    this.sattRam(id, ramar[0]);
    const ev = this.time.addEvent({ delay: Math.max(150, steg), loop: true, callback: () => { i = (i + 1) % ramar.length; this.sattRam(id, ramar[i]); } });
    /** @type {any} */ (ev).slinga = { ramar, steg }; // så att en regi kan starta om slingan efteråt
    this.ramSlinga.set(id, ev);
  }

  /** Från en bild till en annan med en toning (frosten smälter). @param {string} id @param {string} fran @param {string} till @param {number} ms */
  tonaRam(id, fran, till, ms) {
    this.stoppaRamar(id);
    this.sattRam(id, fran);
    const r = /** @type {any} */ (this.ritade.get(id)), fb = foremalsbild(this, till);
    if (!r?.active || !fb) return;
    const ny = /** @type {any} */ (this.add.image(r.x, r.y, fb.nyckel, fb.ram).setOrigin(r.originX, r.originY).setAlpha(0));
    ny.fot = r.fot;
    (r.parentContainer ?? this.lagerObjekt).add(ny);
    const t = this.tweens.add({ targets: ny, alpha: 1, duration: ms, delay: 300, onUpdate: () => { this.smutsig = true; }, onComplete: () => { if (ny.active) ny.destroy(); this.sattRam(id, till); } });
    // ritas rummet om under toningen tas den nya bilden bort med det gamla rummet, och toningen slutar
    ny.once('destroy', () => { if (t.isPlaying()) { t.stop(); this.sattRam(id, till); } });
  }

  /** Ägget i rummet medan det fryser (agg_01 är dess bild just nu), eller null. */
  get frysandeAgg() {
    const o = this.objekt.find((x) => x.bild === 'agg_01');
    if (!o || !this.ritade.get(o.id)) return null;
    const nu = this.ramFor.get(o.id) ?? (this.bytta?.has(o.id) ? o.bildSedan : o.bild);
    return nu === 'agg_01' || nu?.startsWith('agg_frys') || nu?.startsWith('agg_gungar') ? o : null;
  }

  /** Knuffen i FILT (10f): ägget hackar tänder, ca 1,2 s, och snöflingor lossnar. */
  aggKnuff() {
    const o = this.frysandeAgg; if (!o || !foremalsbild(this, 'agg_frys_01')) return false;
    this.spelaRamar(o.id, [...Array(10)].map((_, i) => `agg_frys_0${1 + (i % 2)}`).concat('agg_01'), 120);
    return true;
  }

  /** Efter tre fel i FILT (10f): ägget gungar mot den rätta lådan. @param {string} mot */
  aggGungar(mot) {
    const o = this.frysandeAgg, m = this.ruta(mot);
    if (!o || !m || !foremalsbild(this, 'agg_gungar_hoger')) return false;
    const sida = m.x + m.b / 2 >= o.x + o.b / 2 ? 'agg_gungar_hoger' : 'agg_gungar_vanster';
    this.spelaRamar(o.id, [sida, 'agg_01', sida, 'agg_01', sida, 'agg_01'], 260);
    return true;
  }

  /**
   * Ett föremål syns inte en stund (boken han bär är inte kvar i hyllan), tills rummet byts. @param {string} id
   * @param {boolean} pa
   */
  gomForemal(id, pa) {
    if (pa) this.dolda.add(id); else this.dolda.delete(id);
    const r = /** @type {any} */ (this.ritade.get(id));
    if (r?.active) { r.setVisible(!pa); this.smutsig = true; }
  }

  /** Ungen kliver ur ägget (unge_folj): skalet ligger kvar i lådan, och ungen står framför. */
  ungenUrAgget() {
    for (const [id, ram] of this.ramFor) if (ram.startsWith('agg_') && ram !== 'agg_skal') { this.stoppaRamar(id); this.sattRam(id, 'agg_skal'); }
  }

  /**
   * En dörr öppnas när hjälten går igenom den (31.7, 10f): `<bild>_oppnas_01–03`, ca 80 ms var, i rummet han lämnar.
   * Den ritas stängd igen nästa gång rummet visas. En fel dörr öppnas aldrig. @param {string} id @param {number} [ms]
   * @param {() => void} [paBorjan] när dörren börjar öppnas (ljudet), bara om den har en öppning
   */
  async oppnaDorr(id, ms = 80, paBorjan = undefined) {
    const r = /** @type {any} */ (this.ritade.get(id));
    const namn = r?.frame?.name;
    if (!namn || !r.setTexture) return false;
    const serie = [1, 2, 3].map((i) => foremalsbild(this, `${namn}_oppnas_0${i}`));
    if (!serie.every(Boolean)) return false;
    paBorjan?.();
    for (const fb of /** @type {{ nyckel: string, ram: string }[]} */ (serie)) {
      if (!r.active) return false;
      r.setTexture(fb.nyckel, fb.ram); this.smutsig = true;
      // en vanlig timer, inte scenens klocka: berättelsen väntar på öppningen och får aldrig fastna på den
      await new Promise((klar) => setTimeout(klar, ms));
    }
    return true;
  }

  slagen(id) {
    this.smutsig = true; const r = this.ritade.get(id); if (!r) return;
    if (r.setFillStyle) { r.setFillStyle(0x5a554e); r.setSize(18, 8); r.y += 10; return; }
    // en lövhög (5d): löven yr och högen sjunker ihop (bild_hugg, sedan bild_kvar, ca 80 ms var), och den står kvar
    const o = this.ruta(id);
    if (o?.bildHugg && o.bildKvar && /** @type {any} */ (r).setTexture) {
      const bilder = [...o.bildHugg, o.bildKvar].map((n) => foremalsbild(this, n)).filter(Boolean);
      if (bilder.length) {
        this.lovYr(id);
        bilder.forEach((fb, i) => this.time.delayedCall(80 * i, () => { if (r.active) { /** @type {any} */ (r).setTexture(fb.nyckel, fb.ram); this.smutsig = true; } }));
        return;
      }
    }
    // med Stils bilder (36.8, 10f): krukan spricker, delar sig och faller (<bild>_spricker_01–03, ca 80 ms var),
    // och skärvorna ligger kvar (<bild>_skarvor). Samma nederkant mitt, så bilden byts på plats
    const namn = /** @type {any} */ (r).frame?.name;
    const serie = namn ? [1, 2, 3].map((i) => foremalsbild(this, `${namn}_spricker_0${i}`)) : [];
    const skarvor = namn ? foremalsbild(this, `${namn}_skarvor`) : null;
    if (serie.every(Boolean) && skarvor && /** @type {any} */ (r).setTexture) {
      [...serie, skarvor].forEach((fb, i) => this.time.delayedCall(80 * i, () => { if (r.active) { /** @type {any} */ (r).setTexture(fb.nyckel, fb.ram); this.smutsig = true; } }));
      return;
    }
    // annars: krukan är slagen i bitar, bara skärvorna på golvet syns (den nedre tredjedelen)
    r.setCrop(0, Math.round(r.height * 0.6), r.width, r.height); r.setAlpha(0.8);
  }

  /**
   * En huggen lian faller: den glider ned en bit och tonas bort (bara läge och opacitet, §8), och sedan är vägen fri.
   * @param {string} id
   */
  huggen(id) {
    this.smutsig = true;
    this.kvarDelar.delete(id);
    const r = /** @type {any} */ (this.ritade.get(id));
    const o = this.objekt.find((x) => x.id === id);
    this.objekt = this.objekt.filter((x) => x.id !== id);
    this.ritade.delete(id);
    this.byggHinder();
    this.b.vidAndring?.();
    if (!r) return;
    // med Stils bilder: snittet lyser och den nedre delen faller (bild_hugg, ca 80 ms var), sedan står stubben kvar
    const bilder = [...(o?.bildHugg || []), ...(o?.bildKvar ? [o.bildKvar] : [])].map((n) => foremalsbild(this, n)).filter(Boolean);
    const delar = /** @type {any[]} */ (r.list ? r.list : r.setFrame ? [r] : []);
    if (bilder.length && delar.length) {
      bilder.forEach((fb, i) => this.time.delayedCall(80 * i, () => { for (const d of delar) if (d.active) d.setTexture(fb.nyckel, fb.ram); this.smutsig = true; })); // ritas rummet om under tiden finns delarna inte längre
      return;
    }
    this.tweens.add({ targets: r, y: r.y + 6, alpha: 0, duration: 260, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.destroy(); this.smutsig = true; } });
  }

  /** Han vänder sig mot ett föremål (hugget, 76.5): åt det håll föremålets mitt ligger mest. @param {string} id */
  vandMot(id) {
    const o = this.ruta(id);
    if (!o) return;
    const dx = o.x + o.b / 2 - this.pos.x, dy = o.y + o.h / 2 - this.pos.y;
    this.vand = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    this.ritaHjalte();
  }

  /**
   * Träffpausen (76.5, B12): världen står still ett ögonblick när svärdet träffar (klockan och tweens), och går sedan
   * vidare. Väggklockan styr slutet, så att pausen aldrig blir längre. @param {number} ms
   */
  traffpaus(ms) {
    if (!(ms > 0) || this.time.paused) return;
    this.time.paused = true; this.tweens.pauseAll();
    window.setTimeout(() => { this.time.paused = false; this.tweens.resumeAll(); this.smutsig = true; }, ms);
  }

  /**
   * Ett sving med staven, eller ett hugg med svärdet (10b): hjältens tre svingbilder, med staven eller svärdet ovanpå
   * (under när han svingar uppåt). Gråboxen utan bilderna gör inget. @param {number} [ms] per bild
   */
  svinga(ms = 80, typ = 'sida') {
    const r = riktningFor(this.vand);
    const tex = this.textures.exists('hjalte') ? this.textures.get('hjalte') : null;
    if (!tex?.has(`hjalte_svinga_${r}_01`) || !this.kropp || this.klattrar) return;
    const stavTex = this.stav ? this.textures.get(this.stav.texture.key) : null;
    const verktyg = this.harSvard && stavTex?.has(`svard_svinga_${r}_01`) ? 'svard' : 'stav';
    const kvar = this.hjaltePose;
    // de tre huggen med svärdet (51.5, 10b): uppifrån (hjalte_hugg + svard_hugg, samma läge som svinga) och
    // snurren på den sista lianen (hjältens svingbild 02 åt alla fyra håll, med svard_snurr_01–04 runt honom)
    if (verktyg === 'svard' && typ === 'uppifran' && tex.has(`hjalte_hugg_${r}_01`) && stavTex?.has(`svard_hugg_${r}_01`)) {
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(ms * i, () => {
          this.sattPose(`hjalte_hugg_${r}_0${i + 1}`);
          if (this.stav && this.harStav) {
            this.stav.setVisible(true).setFrame(`svard_hugg_${r}_0${i + 1}`).setPosition(-16, -20);
            if (r === 'upp') this.hjalte.sendToBack(this.stav); else this.hjalte.bringToTop(this.stav);
          }
          this.smutsig = true;
        });
      }
      this.time.delayedCall(ms * 3, () => { this.sattPose(kvar); this.hjalte.bringToTop(this.stav); this.ritaHjalte(); });
      return;
    }
    if (verktyg === 'svard' && typ === 'snurr' && stavTex?.has('svard_snurr_01')) {
      const runt = ['ner', 'vanster', 'upp', 'hoger'];
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(ms * i, () => {
          this.sattPose(`hjalte_svinga_${runt[i]}_02`);
          if (this.stav && this.harStav) {
            this.stav.setVisible(true).setFrame(`svard_snurr_0${i + 1}`).setPosition(-24, -28);
            if (i === 2) this.hjalte.sendToBack(this.stav); else this.hjalte.bringToTop(this.stav);
          }
          this.smutsig = true;
        });
      }
      this.time.delayedCall(ms * 4, () => { this.sattPose(kvar); this.hjalte.bringToTop(this.stav); this.ritaHjalte(); });
      return;
    }
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(ms * i, () => {
        this.sattPose(`hjalte_svinga_${r}_0${i + 1}`);
        if (this.stav && this.harStav) {
          this.stav.setVisible(true).setFrame(`${verktyg}_svinga_${r}_0${i + 1}`);
          // stavens ruta (32 × 40) ligger som hjältens svingbild, svärdets (48 × 48) 8 till vänster och 4 högre
          this.stav.setPosition(verktyg === 'svard' ? -16 : -8, verktyg === 'svard' ? -20 : -16);
          if (r === 'upp') this.hjalte.sendToBack(this.stav); else this.hjalte.bringToTop(this.stav);
        }
        this.smutsig = true;
      });
    }
    this.time.delayedCall(ms * 3, () => { this.sattPose(kvar); this.hjalte.bringToTop(this.stav); this.ritaHjalte(); });
  }

  /**
   * Löv som yr (10b, efx_lov_yr_01–03, ca 80 ms var) över ett föremål: en lövhög eller en lian som huggs. Vid
   * snurren yr de på tre ställen. Bara bildbyten (golvets gräns gäller inte för en händelse). @param {string} id @param {number} [antal]
   */
  lovYr(id, antal = 1, ms = 80) {
    const o = this.ruta(id);
    if (!o || !this.textures.exists('effekter') || !this.textures.get('effekter').has('efx_lov_yr_01')) return;
    for (let k = 0; k < antal; k++) {
      const dx = antal > 1 ? (k - (antal - 1) / 2) * 14 : 0, dy = antal > 1 ? (k % 2) * -8 : 0;
      const b = this.add.image(Math.round(o.x + o.b / 2 + dx), o.y + o.h - 8 + dy, 'effekter', 'efx_lov_yr_01').setOrigin(0.5, 0.5);
      this.lagerLjust.add(b); this.smutsig = true;
      for (let i = 2; i <= 4; i++) this.time.delayedCall(ms * (i - 1) + k * 40, () => { if (!b.active) return; if (i === 4) b.destroy(); else b.setFrame(`efx_lov_yr_0${i}`); this.smutsig = true; });
    }
  }

  /** Stavens ände är ett svärd av guld medan han hugger (gråbox: staven lyser i guld). @param {boolean} pa */
  svard(pa) {
    this.harSvard = pa; this.smutsig = true;
    if (!this.stav) return;
    // med Stils bilder: svard_hand_<riktning> i handen (ritaHjalte), annars en guldfärgad stav i gråboxen
    const bild = this.textures.get(this.stav.texture.key).has('svard_hand_ner_01');
    if (pa && !bild) this.stav.setTint(0xf2c94c); else this.stav.clearTint();
    this.ritaHjalte();
  }

  /** Vilket av objekten står hjälten vid just nu? @param {string[]} ids @returns {string | null} */
  starVid(ids) {
    // bara den närmaste (eller den han är vänd mot) är aktiv
    const o = aktivSak(this.pos, this.paNivan(this.objekt.filter((x) => ids.includes(x.id))), this.vand);
    return o ? o.id : null;
  }

  /**
   * Vägen till en punkt. Ligger punkten på en annan nivå går vägen över närmaste trappa eller stege.
   * @param {{ x: number, y: number }} mal
   */
  vagTill(mal) {
    const malNiva = this.nivaer.finns ? this.nivaer.nivaVid(mal) : this.niva;
    if (this.hinderUndvik && malNiva === this.niva) {
      const i = (/** @type {{ x: number, y: number }} */ p) => (this.undvik || []).some((id) => { const o = this.ruta(id); return !!o && p.x >= o.x && p.x <= o.x + o.b && p.y >= o.y && p.y <= o.y + o.h; });
      if (!i(mal) && !i(this.pos)) { const v = this.hinderUndvik.vag(this.pos, mal); if (v.length) return v; }
    }
    if (malNiva === this.niva || !this.hinderPer.has(malNiva)) return this.hinder.vag(this.pos, mal);
    const over = this.nivaer.passage(this.pos);
    if (!over) return this.hinder.vag(this.pos, mal);
    const dit = this.hinder.vag(this.pos, over);
    if (!dit.length) return [];
    return [...dit, .../** @type {ReturnType<typeof skapaHinder>} */ (this.hinderPer.get(malNiva)).vag(over, mal)];
  }

  /** Han byter nivå när han lämnar trappan eller stegen. På stegen har han ryggen mot kameran. */
  foljNivan() {
    const f = this.nivaer.forbindelse(this.pos);
    const h = f && this.hinderForbindelse ? this.hinderForbindelse : /** @type {ReturnType<typeof skapaHinder>} */ (this.hinderPer.get(this.niva));
    if (h && h !== this.hinder) this.hinder = h;
    const stege = f?.forbinder === 'stege';
    if (stege) { this.pos = { x: Math.round(/** @type {any} */ (f).x + /** @type {any} */ (f).b / 2), y: this.pos.y }; this.stegeNu = f; }
    if (stege !== this.paStege) {
      this.paStege = stege; this.sattRygg(stege);
      // uppe på stegen (5d, 15: "ungen klättrar efter"): ungen klättrar själv upp med två egna bilder, ca 180 ms var.
      // Ned, och utan bilderna, skuttar den efter som förut
      const s = /** @type {any} */ (this.stegeNu);
      if (!stege && s && this.unge?.visible && this.ungeBild && this.textures.get('unge').has('unge1_klattra_upp_01') && this.pos.y < s.y + s.h / 2) {
        const x = Math.round(s.x + s.b / 2);
        this.ungeKlattrar = { fran: { x, y: s.y + s.h + 2 }, till: { x, y: Math.max(s.y + 6, this.pos.y) }, start: this.time.now, ms: Math.round(Math.max(600, (s.h + 2 - 6) * 28)), slut: { x: this.pos.x - 14, y: this.pos.y } };
        this.ungePos = { ...this.ungeKlattrar.fran };
      } else if (!stege) { this.ungePos = { x: this.pos.x - 14, y: this.pos.y }; this.placera(); } // ungen skuttar efter
    }
    if (!f) this.sattNivaVid(this.pos);
  }

  /**
   * Kameran (beslut 14, 18.1): i ett område som är större än skärmen följer den hjälten med en mittzon och stannar
   * vid kanterna. Medan en fråga är ställd visar den hela valet (visaOmrade). Den rör sig i hela pixlar och högst
   * KAMERA.fart pixlar per sekund, så den glider i stället för att hoppa. @param {number} dtMs
   */
  flyttaKameran(dtMs) {
    const S = this.storlek;
    if (enSkarm(S)) { if (this.kamera.x || this.kamera.y) this.sattKamera({ x: 0, y: 0 }); return; }
    // berget på långt håll (126.6): kameran står still över hela rummet
    if (this.k4?.fjarran) return;
    // ungen som svävar iväg i bubblan (69.5) ska synas: kameran följer den tills den följer hjälten
    // ljuset som hoppar mellan lyktorna (71.6): kameran följer ljuset ned till udden, och sedan hjälten igen
    const fokus = this.regiFokus ?? ((this.ungeSvavar && !this.ungeSvavar.foljer && this.ungeSvavar.r > 0) || this.ungeFast?.farg === 'vatten' ? this.ungePos : this.pos);
    const mal = this.omrade ? visaRuta(this.kamera, this.omrade, fokus, S).k : folj(this.kamera, fokus, S, { vand: this.vand, framat: this.kameraFramat });
    const k = narmare(this.kamera, mal, (Math.max(KAMERA.fart, FIGUR.fart * 1.5) * Math.min(dtMs, 100)) / 1000);
    if (k.x !== this.kamera.x || k.y !== this.kamera.y) this.sattKamera(k);
  }

  /**
   * Det som lever i rummet (103.3.4 och 103.3.6), två gånger i sekunden:
   * - **sysslorna:** en figur med kartans `syssla` gör något som pågår, i två bilder (minst 400 ms per bild). Högst två
   *   rör sig på skärmen samtidigt (golvdatorn, manus 19): de andra står i sysslans första bild;
   * - **nära:** en figur med `nara` vänder sig mot hjälten och vinkar när han kommer inom ca två rutor, en gång per
   *   besök (han ska ha gått mer än fyra rutor bort innan den vinkar igen), och inte medan världen står still;
   * - **ljudslingorna** (`ljud_slinga`): vattenhjulet när det snurrar och kvarnens dunk, svagare ju längre bort han står.
   */
  livTick() {
    const syns = (/** @type {any} */ o) => o.x + o.b > this.kamera.x && o.x < this.kamera.x + RUM.bredd && o.y + o.h > this.kamera.y && o.y < this.kamera.y + RUM.hojd;
    const med = this.objekt.filter((o) => o.syssla && /** @type {any} */ (this.ritade.get(o.id))?.active && foremalsbild(this, o.syssla[0]));
    const ror = med.filter(syns).slice(0, 2).map((o) => o.id);
    const nyckel = `${this.rumId}:${ror.join(',')}`;
    if (med.length && nyckel !== this.sysslaNu) {
      this.sysslaNu = nyckel;
      for (const o of med) {
        if (ror.includes(o.id)) { if (!this.ramSlinga.has(o.id)) this.slingaRamar(o.id, /** @type {string[]} */ (o.syssla), o.sysslaMs ?? 500); }
        else { this.stoppaRamar(o.id); this.sattRam(o.id, /** @type {string[]} */ (o.syssla)[0]); }
      }
      this.regiLogg.push(`sysslor: ${ror.join(', ') || '-'}`); if (this.regiLogg.length > 160) this.regiLogg.shift();
    }
    for (const o of this.objekt) {
      if (!o.nara) continue;
      const d = Math.hypot(this.pos.x - (o.x + o.b / 2), this.pos.y - (o.y + o.h));
      if (d > 64) this.naraVinkat.delete(o.id);
      else if (d <= 32 && !this.fryst && !this.naraVinkat.has(o.id) && /** @type {any} */ (this.ritade.get(o.id))?.visible) {
        this.naraVinkat.add(o.id); this.vinka(o.id);
        this.regiLogg.push(`nära: ${o.id} vinkar`); if (this.regiLogg.length > 160) this.regiLogg.shift();
        this.b.logg?.handelse('liv', `${o.id} vinkar när han kommer nära`);
      }
    }
    const ljud = this.b.ljud;
    /** @type {Set<string>} */
    const gar = new Set();
    for (const o of this.objekt) {
      if (!o.ljudSlinga || (o.animI && !(this.tillstand && o.animI.includes(this.tillstand)))) continue;
      const d = Math.hypot(this.pos.x - (o.x + o.b / 2), this.pos.y - (o.y + o.h / 2));
      const niva = Math.max(0, 1 - d / (o.ljudRadie ?? 260));
      if (niva <= 0) continue;
      gar.add(o.ljudSlinga); ljud?.slinga(o.ljudSlinga, niva);
    }
    for (const id of this.ljudSlingor || []) if (!gar.has(id)) ljud?.slinga(id, null);
    this.ljudSlingor = gar;
  }

  /** Ett löfte som uppfylls när han börjar gå (lappen flyger till sin knapp medan han går, 104.5). @returns {Promise<void>} */
  vantaPaGang() { return new Promise((klar) => { this.gangVantare.push(() => klar()); }); }

  /** Kameran följer hjälten igen efter att ha visat kartans `visas_forst` (76.5). */
  slappForst() {
    if (!this.forstFokus) return;
    this.forstFokus = false; this.regiFokus = null;
  }

  /** Flytta kameran (hela pixlar), och säg det till textlagret. @param {import('../karna/skalning.js').Kamera} k */
  sattKamera(k) {
    this.kamera = { x: Math.round(k.x), y: Math.round(k.y) };
    this.cameras?.main?.setScroll(this.kamera.x, this.kamera.y);
    this.smutsig = true;
    this.b.vidKamera?.(this.kamera, !enSkarm(this.storlek));
  }

  /**
   * När en fråga ställs visar kameran hela valet: alla föremål i listan (alternativen, deras skyltar och frågans skylt),
   * med plats för skyltarna ovanför. null = kameran följer hjälten igen. @param {string[] | null} ids
   */
  visaOmrade(ids) {
    // en dörr tar med sin skylt på väggen, som är bredare än dörren (33.3): hela skylten ska synas när frågan ställs
    const rutor = (ids || []).map((id) => this.ruta(id)).filter((o) => !!o)
      .map((o) => (o && o.sort === 'utgang' && !o.golv ? { ...o, x: Math.max(0, o.x - 16), b: o.b + 32 } : o));
    this.omrade = omradeFor(/** @type {any[]} */ (rutor));
  }

  /** Objektets ruta i rumskoordinater. @param {string} id */
  ruta(id) { return this.objekt.find((o) => o.id === id) ?? null; }

  /** @param {number} _t @param {number} dtMs */
  update(_t, dtMs) {
    const inm = this.b.inmatning;
    if (this.harRum) this.tomgang();
    // flodfolkets sysslor, att de vinkar när han kommer nära, och rummets ljudslingor, två gånger i sekunden
    if (this.harRum && (this.livKlocka = (this.livKlocka || 0) + dtMs) >= 500) { this.livKlocka = 0; this.livTick(); }
    // kameran följer hjälten också när världen står still (han går tillbaka från kurvan, en fråga ställs)
    if (this.harRum) this.flyttaKameran(dtMs);
    if (!this.harRum || this.fryst || this.klattrar) {
      if (this.gar) { this.gar = false; this.ritaHjalte(); }
      // 104.5: loggen räknar hur ofta han håller en piltangent medan världen står still (ett tryck per gång)
      const pil = this.fryst && this.harRum && (inm.riktning().x || inm.riktning().y);
      if (pil && !this.pilFryst) this.pilarFrysta++;
      this.pilFryst = !!pil;
      return;
    }
    this.pilFryst = false;
    // ett tryck medan världen stod still görs nu, om det var nyss (högst 1,5 s sedan)
    if (this.sparatTryck) {
      const t = this.sparatTryck; this.sparatTryck = null;
      if (performance.now() - t.t <= 1500) { inm.sattGaTill(t.x, t.y); this.trycktPa(t); }
    }
    const mal = inm.gaTillMal();
    const riktning = inm.riktning();
    /** @type {{ x: number, y: number, framme: boolean }} */
    let ny;
    if (riktning.x || riktning.y) {
      // piltangenterna: glid längs hindren
      this.vag = []; this.vagMal = null;
      const d = Math.min(dtMs / 1000, 0.1) * FIGUR.fart;
      // på stegen klättrar han bara upp och ned
      ny = { ...this.hinder.glid(this.pos, this.paStege ? 0 : riktning.x * d, riktning.y * d), framme: false };
    } else if (mal) {
      // tryck: räkna en väg runt hindren när målet är nytt, gå sedan punkt för punkt
      if (!this.vagMal || this.vagMal.x !== mal.x || this.vagMal.y !== mal.y) { this.vagMal = mal; this.vag = this.vagTill(mal); }
      const nasta = this.vag[0];
      if (!nasta) { ny = { ...this.pos, framme: true }; }
      else {
        ny = steg(this.pos, { riktning: { x: 0, y: 0 }, gaTill: nasta }, dtMs / 1000, FIGUR.fart, this.storlek);
        if (ny.framme) { this.vag.shift(); ny.framme = this.vag.length === 0; }
      }
    } else ny = { ...this.pos, framme: false };
    const sista = this.vag.at(-1);
    if (mal && !ny.framme && sista) this.malKors.setPosition(Math.round(sista.x), Math.round(sista.y)).setVisible(true);
    else { this.malKors.setVisible(false); if (ny.framme) { inm.rensaGaTill(); this.vag = []; this.vagMal = null; } }
    const flyttad = ny.x !== this.pos.x || ny.y !== this.pos.y;
    // 97.6: går han mot ett hinder med piltangenterna i mer än ca 1 s, skriver loggen en rad med hindrets id
    if (riktning.x || riktning.y) {
      const tankt = Math.min(dtMs / 1000, 0.1) * FIGUR.fart, kom = Math.hypot(ny.x - this.pos.x, ny.y - this.pos.y);
      const andel = tankt > 0 ? kom / tankt : 1;
      const mot = andel <= 0.25 ? (hinderFramfor(this.pos, riktning, this.krockRutor || [], this.storlek) ?? (this.nivaer?.finns ? 'nivåns kant' : null)) : null;
      this.krock = this.krock || krockVakt();
      const id = this.krock.steg(dtMs, true, andel, mot);
      if (id) this.b.logg?.handelse('krock', id, { x: Math.round(this.pos.x), y: Math.round(this.pos.y), rum: this.rumId });
    } else this.krock?.steg(dtMs, false, 1, null);
    if (flyttad) { const vx = ny.x - this.pos.x, vy = ny.y - this.pos.y, l = Math.hypot(vx, vy); if (l > 0.01) this.vand = { x: vx / l, y: vy / l }; this.gang = (this.gang || 0) + l; }
    // gången: benen rör sig medan han går, och han står i första bilden när han stannar
    if (flyttad !== !!this.gar) { this.gar = flyttad; if (!flyttad) this.ritaHjalte(); }
    // han har börjat gå: lappen flyger till sin knapp (104.5, vantaPaGang)
    if (flyttad && this.gangVantare.length) { const v = this.gangVantare; this.gangVantare = []; for (const f of v) f(); }
    // han går från hornet: han slutar blåsa (103.3.2)
    if (flyttad && this.hjaltePose?.startsWith('hjalte_blaser_')) { this.blasNr = (this.blasNr || 0) + 1; this.sattPose(null); }
    this.pos = { x: ny.x, y: ny.y };
    if (this.nivaer.finns) this.foljNivan();
    // ungen följer efter på avstånd, eller springer dit den pekar
    const m = this.ungeMal;
    const tx = m ? m.x : this.pos.x - 16, ty = m ? m.y : this.pos.y;
    const dx = tx - this.ungePos.x, dy = ty - this.ungePos.y, l = Math.hypot(dx, dy);
    const narmare = m ? 1 : 6;
    // ungen klättrar inte med honom på stegen: den väntar nedanför, och klättrar efter när han är uppe
    if (this.paStege && !m) { if (flyttad) this.placera(); return this.vantaPaHandling(inm); }
    if ((this.ungeKlattrar || this.ungeSang) && !m) return this.vantaPaHandling(inm);
    // på stocken eller i en bubbla: ungen är där regin har satt den (inget följer hjälten, 71.3), och gungar
    if (this.ungeSvavar?.styrd) return this.vantaPaHandling(inm);
    if (this.ungeSvavar) {
      const sv = this.ungeSvavar;
      const tx = sv.foljer ? this.pos.x + 12 : sv.x, ty = sv.foljer ? this.pos.y - 2 : sv.y;
      const ddx = tx - this.ungePos.x, ddy = ty - this.ungePos.y, dl = Math.hypot(ddx, ddy);
      if (dl > 0.5) { const v = Math.min(dl, (dtMs / 1000) * 80); this.ungePos = { x: this.ungePos.x + (ddx / dl) * v, y: this.ungePos.y + (ddy / dl) * v }; }
      const lyft = sv.lyft ?? 14;
      this.ungeLyft = Math.round(lyft + Math.sin(this.time.now / 400) * (lyft >= 8 ? 2 : 1));
      this.placera();
      return this.vantaPaHandling(inm);
    }
    // fast i leran (69.1): ungen står kvar där den sjönk, också när målet är nått
    if (this.ungeFast) { if (flyttad) this.placera(); else if (this.ungeBild && this.unge.visible) this.ritaUngen(); return this.vantaPaHandling(inm); }
    const ungenGar = l > narmare;
    if (ungenGar) { const v = Math.min(l - narmare, (dtMs / 1000) * (m ? 110 : 90)); this.ungePos = { x: this.ungePos.x + (dx / l) * v, y: this.ungePos.y + (dy / l) * v }; this.ungeVand = { x: dx / l, y: dy / l }; this.ungeGang = (this.ungeGang || 0) + v; }
    else if (!m && this.ungeGar) {
      // står den still tittar den mot hjälten, eller på den som talar
      const t = this.ungeTittarPa && this.time.now < this.ungeTittarPa.till ? this.ungeTittarPa : null;
      if (t) { const ux = t.x - this.ungePos.x, uy = t.y - this.ungePos.y, ul = Math.hypot(ux, uy) || 1; this.ungeVand = { x: ux / ul, y: uy / ul }; }
      else this.ungeVand = { x: this.pos.x - this.ungePos.x, y: 0.01 };
    }
    this.ungeGar = ungenGar;
    // andningen och nosandet byter bild också när inget flyttar sig
    if (this.ungeBild && this.unge.visible) this.ritaUngen();
    if (flyttad || l > narmare || m || this.buren) this.placera();
    this.vantaPaHandling(inm);
  }

  /**
   * Ungen klättrar uppför stegen (5d): också medan världen står still (en replik när han är uppe), så att den
   * aldrig blir hängande på stegen.
   */
  ungeKlattrarSteg() {
    const k = this.ungeKlattrar;
    if (!k) return;
    const t = Math.min(1, (this.time.now - k.start) / k.ms);
    this.ungePos = { x: k.fran.x, y: Math.round(k.fran.y + (k.till.y - k.fran.y) * t) }; this.ungeVand = { x: 0, y: -1 };
    if (t >= 1) { this.ungeKlattrar = null; this.ungePos = { ...k.till }; this.ungeVand = { x: 0, y: 1 }; }
    this.ritaUngen(); this.placera();
  }

  /** Står han vid något som ett steg väntar på (vantaPa)? @param {any} inm */
  vantaPaHandling(inm) {
    if (this.vantar) {
      const o = aktivSak(this.pos, this.paNivan(this.objekt.filter((x) => this.vantar && this.vantar.ids.includes(x.id))), this.vand);
      if (o) { const v = this.vantar; this.vantar = null; inm.rensaGaTill(); v.klar(o.id); }
    }
  }
}
