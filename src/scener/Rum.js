// @ts-check
// Gråboxens rum: grå golv, objekt som rutor, hjälten och ungen som block, och ljuset (natt, upplyst, morgon).
// All text (objektens namn, lappar) ritas i textlagret, aldrig här.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';
import { rumsObjekt, framfor, framforFran, vidObjekt, aktivSak, VAGG, objektFarg, lasplats, arSidodorr, stigStart, landningNara } from '../karna/rumslayout.js';
import { synligaIds } from '../karna/karta.js';
import { skapaHinder } from '../karna/vag.js';
import { rumsHinder } from '../karna/rumshinder.js';
import { skapaNivaer } from '../karna/nivaer.js';
import { KAMERA, centrera, folj, visaRuta, omradeFor, narmare, enSkarm } from '../karna/kamera.js';
import { hjaltensByten } from '../karna/fargbyte.js';
import { laddaGrafik, fargad, riktningFor, foremalsbild, rutnamn, rutanimation } from './figurbilder.js';
import { foremaletsBild } from '../karna/egenskaper.js';
import { Livet } from './livet.js';

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
/**
 * Gråboxens bild av sakerna han kan ha på sig (lager): en färg per sak. Okända saker ritas i en neutral färg.
 * Riktig grafik kommer med Stil (stilguiden §5).
 */
const LAGER_FARG = { taggkam: 0x5fae6a, ryggsack_skog: 0x8a5a2b, ryggsack_vass: 0xb8a060, ryggsack_rosa: 0xe58fb0 };
/** Ryggsäckar i en annan färg än Stils bild (72.11): bilden tonas, tills Stil har ritat dem. */
const SACK_TON = { ryggsack_rosa: 0xffa8cc };
/** Dräkter han får (72.11): dräktens färg byts mot gåvans, och garderoben byter tillbaka till den han valde. */
export const DRAKT_GAVOR = { drakt_grodgron: 0x4f9a3a };

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
   *           vidKamera?: (k: import('../karna/skalning.js').Kamera, stor: boolean) => void, plattaOppen?: () => boolean }} b
   * plattaOppen = läsplattan är öppen (golvdatorn: världen bakom den ritas i lugn takt)
   * mjukvara = världen ritas med canvas utan grafikkort (golvdatorn): en bildruta ritas bara när något har ändrats
   * vidKamera = kameran har flyttat sig (textlagret flyttar skyltarna med), stor = området är större än skärmen
   */
  constructor(b) {
    super({ key: 'Rum' });
    this.b = b;
    this.pos = { x: RUM.bredd / 2, y: RUM.hojd - 12 };
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
    /** kameran visar kartans visas_forst tills han ska göra något (76.5) */
    this.forstFokus = false;
    /** @type {Map<string, any>} */
    this.ritade = new Map();
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
    /** @type {((o: any) => boolean) | null} ett tryck på en figur: upprepa dess senaste instruktion */
    this.fragaIgen = null;
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
    this.ljusboll = this.add.graphics().setVisible(false);
    this.lagerFigurer = this.add.container(0, 0);
    // liv i skogen (fåglar, löv, fjärilen, ekorren) i världens pixlar
    this.livet = new Livet(this, this.lagerFigurer);
    /** @type {{ img: any, ramar: string[], ms: number, i: number, senast: number }[]} figurer som rör sig i tomgång (bild_anim) */
    this.animerade = [];
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
  trycktPa(h) {
    if (!this.harRum) return;
    // närmaste objekt vars ruta (med lite marginal) innehåller trycket. En yta (kullen, trappan) är golv:
    // ett tryck där går dit, som på golvet.
    // dekor (52.2) har inget samspel: ett tryck på den är ett tryck på marken
    const traffar = this.objekt.filter((x) => x.sort !== 'yta' && !x.dekor && h.x >= x.x - 4 && h.x <= x.x + x.b + 4 && h.y >= x.y - 4 && h.y <= x.y + x.h + 4);
    const avst = (/** @type {any} */ x) => Math.hypot(h.x - (x.x + x.b / 2), h.y - (x.y + x.h / 2));
    const o = traffar.sort((a, c) => avst(a) - avst(c))[0];
    if (!o) return;
    // står hjälten redan vid föremålet, och det är det aktiva, räknas trycket som att använda det.
    // Är det en annan sak än den aktiva går han närmare den, så att den blir aktiv.
    if (vidObjekt(this.pos, o) && this.tryckPa && this.tryckPa(o.id)) return;
    // dialogregeln: ett tryck på en figur upprepar dess senaste instruktion (fråga igen)
    if (o.sort === 'figur' && this.fragaIgen?.(o)) return;
    const f = this.malFor?.(o) ?? this.standplats(o); this.b.inmatning.sattGaTill(f.x, f.y);
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
    const bild = this.rumsbild ? `rum_${this.rumsbild}` : this.mark ? this.ritaMark() : null;
    if (bild && this.textures.exists(bild)) { this.golvBild.setTexture(bild).setVisible(true); return; }
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
    const sackBild = sack && finns('ryggsack_ner_01');
    this.sackBak = sackBild ? this.add.image(0, 0, 'hjalte', 'ryggsack_hoger_01').setOrigin(0, 0) : null;
    this.kropp = this.add.image(0, 0, this.hjalteTextur, 'hjalte_ga_ner_01').setOrigin(0, 0);
    this.sackFram = sackBild ? this.add.image(0, 0, 'hjalte', 'ryggsack_ner_01').setOrigin(0, 0) : null;
    const ton = sack ? SACK_TON[/** @type {keyof SACK_TON} */ (sack)] : undefined;
    if (ton) { this.sackBak?.setTint(ton); this.sackFram?.setTint(ton); }
    this.kam = this.lager?.hjalmdekor && finns('taggkam_ner_01') ? this.add.image(0, 0, 'hjalte', 'taggkam_ner_01').setOrigin(0, 0) : null;
    this.stav = this.add.image(0, 0, fargad(this, 'stav', hjaltensByten(hud)), 'stav_hand_ner_01').setOrigin(0, 0).setVisible(!!this.harStav);
    this.hjalte.add(/** @type {any[]} */ ([this.skugga, this.sackBak, this.kropp, this.sackFram, this.kam, this.stav].filter(Boolean)));
    // gråbox för det som inte har bilder än
    if (sack && !sackBild) this.hjalte.addAt(this.add.rectangle(11, 12, 4, 8, farg(sack)).setOrigin(0, 0), this.skugga ? 1 : 0);
    const dekor = this.lager?.hjalmdekor;
    if (dekor && !this.kam) for (const x of [4, 7, 10]) this.hjalte.add(this.add.rectangle(x, -3, 2, 3, farg(dekor)).setOrigin(0, 0));
    this.ritaHjalte();
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
    // vinka (51.4) är en bild i gångens storlek (16 × 24) åt ett håll: staven och ryggsäcken ritas som när han går
    const liten = /^hjalte_vinka_(ner|upp|hoger|vanster)_/.exec(this.hjaltePose || '');
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
    this.stav?.setVisible(!!this.harStav && !klattrar && !helPose);
    if (this.stav && !helPose) {
      // svärdet i handen (16 × 32) ritas 8 pixlar högre än hjälten, eftersom klingan sticker upp (10b)
      const svard = this.harSvard && this.textures.get(this.stav.texture.key).has(`svard_hand_${r}_01`);
      const ram = svard ? `svard_hand_${r}_01` : `stav_hand_${r}_01`;
      if (this.stav.frame.name !== ram) { this.stav.setFrame(ram); this.smutsig = true; }
      const y = svard ? -8 : 0;
      if (this.stav.x !== 0 || this.stav.y !== y) { this.stav.setPosition(0, y); this.smutsig = true; }
    }
    const sida = r === 'hoger' || r === 'vanster';
    this.sackBak?.setVisible(sida).setFrame(`ryggsack_${r}_01`);
    this.sackFram?.setVisible(!sida).setFrame(`ryggsack_${r}_01`);
    this.kam?.setFrame(`taggkam_${r}_01`);
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
    const namn = o.bildSedan && this.bytta?.has(o.id) ? o.bildSedan : o.bildNatt && natt ? o.bildNatt : o.bild;
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
   *   mellanscenerna med stocken, Tant Rosa och elden, se tabellen `k2` nedan.
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
      stocken_flyger_till_stranden: () => this.stockenIland('flyg'),
      rep_till_ungen: () => this.stockenIland('rep'),
      bro_till_stocken: () => this.tillStocken('bro'),
      stege_till_stocken: () => this.tillStocken('stege'),
      unge_hoppar_i_land: () => this.ungeHopparILand(),
      ljuset_hoppar_mellan_lyktorna: () => this.ljusetHopparMellanLyktorna(),
      en_liten_ljusprick: () => this.litenLjusprick(),
      tant_rosa_nar_inte: () => this.tantRosaNarInte(),
      elden_tands: () => this.eldenTands(),
      byborna_jublar: () => this.byborJublar(),
      // 72.8: lerpölen i vassen
      hjalte_sjunker: () => this.hjalteSjunker(),
      unge_drar_upp_hjalten: () => this.ungeDrarUppHjalten(),
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
      if (ms && this.luft) this.luft.tider.push(this.time.delayedCall(ms, () => this.visaSidovy(bild))); else this.visaSidovy(bild);
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
    const bilder = this.textures.get('unge').has(`unge1_${lage}_${hall}_02`) ? 2 : 1, nu = this.time.now, tid = ms * bilder * varv;
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

  /** Ungens sjunkna läge i bilden: skuren vid marken, och leran som en ring runt den. Anropas av placera(). */
  ritaUngeFast() {
    const u = this.ungeBild; if (!u) return;
    const f = this.ungeFast, d = f ? Math.round(f.djup) : 0;
    this.ungeSkugga?.setVisible(!f);
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
    const brev = this.add.rectangle(under().x, under().y, 10, 7, papper).setStrokeStyle(1, kant).setOrigin(0.5, 0);
    this.lagerLuft.add(brev);
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
      flyg(-3, mitt('stig_vassen', { x: p.x, y: p.y - 200 }), 1700);
      flyg(3, mitt('brygga_fran_torget', { x: p.x + 220, y: p.y }), 1500);
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
      if (this.textures.get('baronen').has('luftskepp_flyger_fel_01')) this.luftskepp('flyger_fel');
      l.glider = true;
      this.tweens.add({ targets: img, x: img.x + ((bryggan.x - fran.x) / dd) * 380, y: img.y + Math.max(20, ((bryggan.y - fran.y) / dd) * 380), duration: 1900, ease: 'Sine.easeIn', onUpdate: () => { img.x = Math.round(img.x); img.y = Math.round(img.y); this.smutsig = true; } });
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

  /** Hjälten i leran: bilderna skärs av vid marken och leran ringar sig runt honom, och lerig om benen efteråt. Anropas av placera(). */
  ritaHjalteFast() {
    const d = this.hjalteFast ? Math.round(this.hjalteFast.djup) : 0;
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

  /** Ungen sitter på stocken och piper: små skutt, och den tittar på vattnet och på hjälten. @returns {number} */
  ungePiperPaStocken() {
    const sv = this.ungeSvavar;
    if (!sv) return 0;
    sv.styrd = true;
    const y0 = this.ungePos.y;
    this.ungeVand = { x: 0, y: 1 };
    for (let i = 0; i < 3; i++) this.time.delayedCall(350 * i, () => this.ungeBage({ x: this.ungePos.x, y: y0 }, 200, 4));
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
      this.ungeReagerar(true); this.placera(); this.smutsig = true;
    };
    if (sv) { sv.styrd = true; this.ungeBage(till, 700, 18, skaka); } else skaka();
    this.regiLogg.push('ungen hoppar i land');
    return sv ? 1500 : 800;
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
    const p = this.lyktPunkter();
    if (!p.length) return 0;
    const boll = this.add.graphics(); this.lagerLjust.add(boll);
    let fran = { x: this.pos.x + 6, y: this.pos.y - 26 };
    const steg = 360, slut = steg * p.length + 900;
    this.regiFokus = { x: this.pos.x, y: this.pos.y };
    p.forEach((q, i) => this.time.delayedCall(steg * i, () => {
      const a = { ...fran }, t = { p: 0 };
      this.regiFokus = { x: q.x, y: q.y };
      this.tweens.add({ targets: t, p: 1, duration: steg - 20, onUpdate: () => { if (!boll.active) return; boll.clear().fillStyle(0xfff2a8, 0.5).fillCircle(Math.round(a.x + (q.x - a.x) * t.p), Math.round(a.y + (q.y - 6 - a.y) * t.p - Math.sin(t.p * Math.PI) * 10), 4).fillStyle(0xffffff, 1).fillCircle(Math.round(a.x + (q.x - a.x) * t.p), Math.round(a.y + (q.y - 6 - a.y) * t.p - Math.sin(t.p * Math.PI) * 10), 2); this.smutsig = true; },
        onComplete: () => { const l = this.add.graphics(); this.lagerLjust.add(l); this.lagda.push(l); l.fillStyle(0xffd34d, 0.35).fillCircle(Math.round(q.x), Math.round(q.y - 6), 5).fillStyle(0xffe680, 1).fillRect(Math.round(q.x - 1), Math.round(q.y - 8), 3, 4); this.smutsig = true; } });
      fran = { x: q.x, y: q.y - 6 };
    }));
    this.time.delayedCall(steg * p.length + 100, () => boll.destroy());
    this.time.delayedCall(slut, () => { this.regiFokus = null; });
    this.regiLogg.push('ljuset hoppar mellan lyktorna');
    return slut;
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

  /** Elden tänds på udden, gnistor stiger, och byborna runt elden skuttar och jublar (71.5). @returns {number} */
  eldenTands() {
    const { o } = this.foremalOchBild('lagereld');
    if (!o) return 0;
    for (let i = 0; i < 12; i++) this.time.delayedCall(90 * i, () => {
      const g = this.add.rectangle(Math.round(o.x + 4 + Math.random() * (o.b - 8)), o.y + 4, 2, 2, i % 2 ? 0xffb347 : 0xffe680); this.lagerLjust.add(g);
      this.tweens.add({ targets: g, y: g.y - 18 - Math.random() * 10, alpha: 0, duration: 700, onUpdate: () => { this.smutsig = true; }, onComplete: () => g.destroy() });
    });
    this.byborJublar(400);
    this.regiLogg.push('elden tänds');
    return 2000;
  }

  /** Byborna (och Tant Rosa) skuttar och jublar där de står. @param {number} [fore] */
  byborJublar(fore = 0) {
    for (const id of ['fiskaren', 'tvatterskan', 'barnet_drake', 'tant_rosa']) {
      const r = /** @type {any} */ (this.ritade.get(id));
      if (!r?.active) continue;
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

  /** Luftskeppet, hjälmen och sidovyn tas bort (nytt rum). */
  rensaRegi() {
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
    this.regiLogg.push(lage); if (this.regiLogg.length > 40) this.regiLogg.shift();
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
    });
    return true;
  }

  /**
   * En hel bild av hjälten i stället för gången (32 × 40 som svingen, fötterna där gångens fötter är), eller null.
   * Staven göms så länge. @param {string | null} bild
   */
  sattPose(bild) {
    const ny = bild && this.textures.exists('hjalte') && this.textures.get('hjalte').has(bild) ? bild : null;
    if (ny === this.hjaltePose) return;
    this.hjaltePose = ny; this.smutsig = true;
    this.regiLogg.push(`pose:${ny ?? '-'}`); if (this.regiLogg.length > 40) this.regiLogg.shift();
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
      this.unge.add(/** @type {any[]} */ ([this.ungeSkugga, this.ungeBild].filter(Boolean)));
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
   * @param {{ rum: string | null, tillstand: string | null, innehall: (string | { id: string, syns_i?: string[] })[], unge: boolean, nyttRum: boolean,
   *           karta?: import('../karna/karta.js').Karta | null, franRum?: string | null,
   *           delar?: Record<string, { farg: number | null, storlek: string | null }[]>, visade?: string[],
   *           kvar?: import('../karna/rumslayout.js').Objekt[] }} v
   * visade = dolda föremål som ett steg har visat (visa_foremal), kvar = det som står kvar efter hugget (bild_kvar)
   */
  visa(v) {
    this.harRum = !!v.rum;
    if (v.nyttRum || !this.harRum) { this.rumsbild = (this.harRum && v.karta?.bild) || null; this.mark = (this.harRum && v.karta?.mark) || null; this.rumId = v.rum; this.markObjekt = v.karta?.objekt || []; }
    this.visaUnge = v.unge;
    if (v.nyttRum) { for (const id of [...this.ramSlinga.keys(), ...this.ramTimrar.keys()]) this.stoppaRamar(id); this.ramFor.clear(); this.dolda.clear(); this.ungeMal = null; this.ungeTittarPa = null; this.ungeKlattrar = null; this.stegeNu = null; this.ungeSang = null; this.ungeLyft = 0; this.ungeFast = null; this.hjalteFast = null; this.lerig = 0; this.undvik = []; this.hinderUndvik = null; this.regiFokus = null; this.forstFokus = false; if (this.ungeSvavar) { this.ungeSvavar.g.destroy(); this.ungeSvavar = null; } for (const g of this.lagda) g.destroy(); this.lagda = []; this.sparrade.clear(); if (this.sover) { this.sover.andas?.remove(); this.sover = null; } this.vaknar = null; this.rensaRegi(); }
    this.tillstand = v.tillstand;
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
      if (v.nyttRum) this.flyttade.clear();
      this.objekt = this.harRum ? rumsObjekt(v.innehall, v.tillstand, v.karta, v.visade) : [];
      for (const o of this.objekt) { const f = this.flyttade.get(o.id); if (f) { o.x = f.x; o.y = f.y; } }
      // en figur som klättrar ned när den visas (apan när den är räddad, 56.4): bara i rummet han redan är i
      const klattrar = v.nyttRum ? [] : this.objekt.filter((o) => o.klattrarFran && !fore.has(o.id)).map((o) => o.id);
      for (const g of this.hogaBilder) g.destroy(); this.hogaBilder.clear(); this.animerade = [];
      this.lagerObjekt.removeAll(true); this.lagerLjust.removeAll(true); this.ritade.clear(); this.markerade.clear(); this.ritadeDelar.clear(); this.markramar?.clear();
      this.delar = { ...(v.delar || {}) };
      for (const o of [...this.objekt.filter((x) => x.sort === 'yta'), ...this.objekt.filter((x) => x.sort !== 'yta')]) this.ritaObjekt(o);
      for (const id of this.dolda) /** @type {any} */ (this.ritade.get(id))?.setVisible?.(false);
      for (const id of this.sparrade) { const o = this.ruta(id); if (o) this.ritaGren(o); }
      this.ritaKvar(v.kvar || []);
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
        const dorr = v.franRum ? this.objekt.find((o) => o.till === v.franRum) : null;
        /** @type {import('../karna/rumslayout.js').Objekt | null} utgången hjälten kom in genom */
        this.inkom = dorr ?? null;
        const start = dorr ? framfor(dorr) : (v.franRum && v.karta?.in?.[v.franRum]) || v.karta?.start || { x: this.storlek.bredd / 2, y: this.storlek.hojd - 12 };
        this.niva = 0; this.paStege = false; this.byggHinder(); this.sattNivaVid(start);
        this.pos = this.hinder.narmasteFria(start);
        this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
        this.b.inmatning.rensaGaTill();
        // kameran hoppar till hjälten när han kommer in (rummet glider eller tonas in)
        this.sattKamera(enSkarm(this.storlek) ? { x: 0, y: 0 } : centrera(this.pos, this.storlek));
        // kartans visas_forst (76.5, D5): kameran glider till figuren som scenen börjar med (apan i nätet), och
        // tillbaka till hjälten när han ska göra något (slappForst) eller efter högst 20 s
        const forst = this.objekt.find((o) => o.visasForst);
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
    this.unge.setVisible(this.harRum && this.visaUnge && !this.sover?.ungeGomd);
    // han sitter kvar i fåtöljen när rummet ritas om, men inte i ett nytt rum
    if (this.sitter) { const id = this.sitter.id; this.sitter = null; if (!v.nyttRum) this.sattSig(id); }
    this.ritaLjus();
    this.placera();
    this.b.vidAndring?.();
  }

  /** Föremålen som går att använda just nu får en glimt. @param {string[]} ids */
  sattInteraktiva(ids) {
    this.interaktiva = ids; this.smutsig = true;
    const g = this.glimtar; g.clear();
    for (const id of ids) {
      const o = this.ruta(id); if (!o || o.sort === 'utgang') continue;
      // en liten stjärna i övre högra hörnet
      const x = o.x + o.b - 2, y = o.y + 1;
      g.fillStyle(FARG.markerad, 1).fillRect(x - 1, y - 3, 2, 6).fillRect(x - 3, y - 1, 6, 2);
    }
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
    const bildNamn = this.ramFor.has(o.id) ? this.ramFor.get(o.id) : o.bildSedan && this.bytta?.has(o.id) ? o.bildSedan : o.bildNatt && (this.tillstand === 'natt' || this.tillstand === 'natt_upplyst') ? o.bildNatt : o.bild;
    // ett föremål som är ett alternativ i ett läsval i rummet (dinomatens lådor) har alternativets bild, i den
    // variant spelaren får (lada_rod, lada_bla_stor …), när Stil har ritat den. Är föremålet alternativets eget
    // (gläntans träd i L3) visar kartans bild alternativet (66.2).
    const valt = foremaletsBild({ kartbild: bildNamn, delar: this.delar[o.id] }, (n) => !!foremalsbild(this, n));
    const fb = valt ? foremalsbild(this, valt) : null;
    if (fb) {
      const pa = (o.bildPa && this.objekt.find((x) => x.id === o.bildPa)) || o;
      const tex = fb.nyckel === 'hjalte' ? this.hjalteTextur || 'hjalte' : fb.nyckel;
      const img = this.add.image(Math.round(pa.x + pa.b / 2), pa.y + pa.h, tex, fb.ram).setOrigin(0.5, 1);
      // en hög bild (en trädkrona som sticker upp) ritas bland figurerna, så att hjälten kan gå bakom den
      const hog = !o.lyser && !o.skataFonster && o.sort !== 'yta' && img.height > o.h + 6;
      if (hog) { /** @type {any} */ (img).fot = pa.y + pa.h; this.lagerFigurer.add(img); this.hogaBilder.add(img); this.sorteraFigurer(); }
      else (o.lyser || o.skataFonster ? this.lagerLjust : this.lagerObjekt).add(img);
      // tomgång (bild_anim): bilderna byts var animMs, med ett litet slumpat avstånd mellan figurerna
      const ramar = (o.bildAnim || []).filter((r) => foremalsbild(this, r)?.nyckel === fb.nyckel);
      if (ramar.length > 1 && !this.bytta?.has(o.id)) this.animerade.push({ img, ramar, ms: o.animMs || 500, i: 0, senast: performance.now() + Math.random() * 300 });
      this.ritade.set(o.id, /** @type {any} */ (img));
      return;
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
    const r = this.add.rectangle(o.x, o.y, o.b, o.h, fyll, delar ? 0 : 1).setOrigin(0, 0).setStrokeStyle(1, sidodorr ? 0x3a3129 : FARG.sakKant, delar ? 0 : 1);
    this.lagerObjekt.add(r);
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
    // en lampa (läslampan vid Farfars plats) lyser varmt i mörkret: ljusare ringar inåt och en glödande punkt
    if (alfa) for (const l of this.lampor) {
      for (const [r, a] of [[60, 0.10], [44, 0.12], [28, 0.16]]) g.fillStyle(FARG.ljus, a).fillCircle(l.x, l.y, r);
      g.fillStyle(FARG.ljus, 1).fillCircle(l.x, l.y - 14, 3);
    }
    this.ljusboll.setVisible(this.harRum && t === 'natt_upplyst');
  }

  placera() {
    this.hjalte.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd + (this.hjalteFast ? Math.round(this.hjalteFast.djup) : 0)));
    this.ritaHjalteFast();
    this.ritaHjalte();
    this.sorteraFigurer();
    if (this.buren) this.buren.setPosition(Math.round(this.pos.x + 6), Math.round(this.pos.y - FIGUR.hojd - 6 + Math.sin(this.time.now / 300) * 1.5));
    // pekar ungen nosar den mot föremålet: små ryck åt dess håll
    const m = this.ungeMal;
    const nos = m && Math.hypot(m.x - this.ungePos.x, m.y - this.ungePos.y) < 3 ? Math.max(0, Math.sin(this.time.now / 110)) * 3 : 0;
    if (this.ungeBild) { this.unge.setPosition(Math.round(this.ungePos.x - 12), Math.round(this.ungePos.y - 23 - (this.ungeLyft || 0) + (this.ungeFast ? Math.round(this.ungeFast.djup) : 0))); this.ritaUngen(); this.ritaUngeFast(); this.ritaUngeBubbla(); }
    else this.unge.setPosition(Math.round(this.ungePos.x - 6 + (m ? Math.cos(m.mot) * nos : 0)), Math.round(this.ungePos.y - 12 + (m ? Math.sin(m.mot) * nos : 0)));
    const l = this.ljusboll; l.clear();
    if (l.visible) {
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

  /** Ett föremål hoppar till (det låter därifrån, t.ex. ägglådan som dunkar). @param {string} id */
  hoppa(id) {
    const r = this.ritade.get(id); if (!r) return;
    const y = r.y;
    this.tweens.add({ targets: r, y: y - 4, duration: 90, yoyo: true, repeat: 1, onComplete: () => { r.y = y; } });
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
  vinka(id) { this.hoppa(id); this.time.delayedCall(260, () => this.hoppa(id)); }

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
    // ungen som svävar iväg i bubblan (69.5) ska synas: kameran följer den tills den följer hjälten
    // ljuset som hoppar mellan lyktorna (71.6): kameran följer ljuset ned till udden, och sedan hjälten igen
    const fokus = this.regiFokus ?? ((this.ungeSvavar && !this.ungeSvavar.foljer && this.ungeSvavar.r > 0) || this.ungeFast?.farg === 'vatten' ? this.ungePos : this.pos);
    const mal = this.omrade ? visaRuta(this.kamera, this.omrade, fokus, S).k : folj(this.kamera, fokus, S, { vand: this.vand, framat: this.kameraFramat });
    const k = narmare(this.kamera, mal, (Math.max(KAMERA.fart, FIGUR.fart * 1.5) * Math.min(dtMs, 100)) / 1000);
    if (k.x !== this.kamera.x || k.y !== this.kamera.y) this.sattKamera(k);
  }

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
    // kameran följer hjälten också när världen står still (han går tillbaka från kurvan, en fråga ställs)
    if (this.harRum) this.flyttaKameran(dtMs);
    if (!this.harRum || this.fryst || this.klattrar) { if (this.gar) { this.gar = false; this.ritaHjalte(); } return; }
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
    if (flyttad) { const vx = ny.x - this.pos.x, vy = ny.y - this.pos.y, l = Math.hypot(vx, vy); if (l > 0.01) this.vand = { x: vx / l, y: vy / l }; this.gang = (this.gang || 0) + l; }
    // gången: benen rör sig medan han går, och han står i första bilden när han stannar
    if (flyttad !== !!this.gar) { this.gar = flyttad; if (!flyttad) this.ritaHjalte(); }
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
