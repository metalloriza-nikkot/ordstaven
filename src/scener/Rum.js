// @ts-check
// Gråboxens rum: grå golv, objekt som rutor, hjälten och ungen som block, och ljuset (natt, upplyst, morgon).
// All text (objektens namn, lappar) ritas i textlagret, aldrig här.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';
import { rumsObjekt, framfor, framforFran, vidObjekt, aktivSak, hinderFran, vaggar, VAGG, objektFarg, lasplats, arSidodorr, stigStart } from '../karna/rumslayout.js';
import { synligaIds } from '../karna/karta.js';
import { skapaHinder, skarIgenom } from '../karna/vag.js';
import { skapaNivaer } from '../karna/nivaer.js';
import { KAMERA, centrera, folj, visaRuta, omradeFor, narmare, enSkarm } from '../karna/kamera.js';
import { hjaltensByten } from '../karna/fargbyte.js';
import { laddaGrafik, fargad, riktningFor, foremalsbild, rutnamn } from './figurbilder.js';

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
const LAGER_FARG = { taggkam: 0x5fae6a, ryggsack_skog: 0x8a5a2b };

/** Ordkraftens ljus: en bild per 100 ms, händelsetakten i 10e §7 (46.5). */
export const ORDKRAFT_MS = 100;
/** Ordkraftens ljus: bildernas ordning (beslut 48.3), ca 0,5 s. */
export const ORDKRAFT_BILDER = [1, 2, 3, 3, 4];

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
    /** @type {Map<string, any>} */
    this.ritade = new Map();
    this.fryst = false;
    this.frysSteg = false;
    this.pausad = false;
    this.harRum = false;
    this.inomhus = false;
    /** väggarnas mått i rummet (kartan) */
    this.vagg = VAGG;
    /** @type {{ x: number, y: number, b: number, h: number }[]} väggar inne i rummet (kartans vagg) */
    this.massiv = [];
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
    /** @type {string | null} den senaste sidovyn som visades (för testerna) */
    this.senasteSidovy = null;
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
    /** @type {Record<string, { farg: number | null, storlek: string | null }[]>} föremål som visar ett pussels alternativ */
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
    this.ljusboll = this.add.graphics().setVisible(false);
    this.lagerFigurer = this.add.container(0, 0);
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
    /** @type {{ hjalmdekor: string | null, ryggsack: string | null }} det han har på sig */
    this.lager = this.lager || { hjalmdekor: null, ryggsack: null };
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
    const traffar = this.objekt.filter((x) => x.sort !== 'yta' && h.x >= x.x - 4 && h.x <= x.x + x.b + 4 && h.y >= x.y - 4 && h.y <= x.y + x.h + 4);
    const avst = (/** @type {any} */ x) => Math.hypot(h.x - (x.x + x.b / 2), h.y - (x.y + x.h / 2));
    const o = traffar.sort((a, c) => avst(a) - avst(c))[0];
    if (!o) return;
    // står hjälten redan vid föremålet, och det är det aktiva, räknas trycket som att använda det.
    // Är det en annan sak än den aktiva går han närmare den, så att den blir aktiv.
    if (vidObjekt(this.pos, o) && this.tryckPa && this.tryckPa(o.id)) return;
    // dialogregeln: ett tryck på en figur upprepar dess senaste instruktion (fråga igen)
    if (o.sort === 'figur' && this.fragaIgen?.(o)) return;
    const f = this.malFor?.(o) ?? framforFran(o, this.pos, this.inomhus, this.vagg, this.massiv); this.b.inmatning.sattGaTill(f.x, f.y);
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
    this.golvBild.setVisible(false);
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
    if (!this.inomhus) return;
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
   * Marken utomhus av rutor (kartans `mark`, t.ex. skog): gräs i fyra varianter, lite blommor, och stigens rutor under
   * stigarna. Ritas en gång per rum till en egen bild, så att golvdatorn bara ritar en bild. @returns {string | null}
   */
  ritaMark() {
    const zon = /** @type {string} */ (this.mark), nyckel = `rutor_${zon}`;
    if (!this.textures.exists(nyckel)) return null;
    const B = this.storlek.bredd, H = this.storlek.hojd, ut = `mark_${zon}_${this.rumId}_${B}x${H}`;
    if (this.textures.exists(ut)) return ut;
    const n = rutnamn(zon), tex = this.textures.get(nyckel), src = /** @type {HTMLImageElement} */ (tex.getSourceImage());
    const duk = document.createElement('canvas'); duk.width = B; duk.height = H;
    const c = /** @type {CanvasRenderingContext2D} */ (duk.getContext('2d'));
    const kol = Math.floor(src.width / 16);
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
   * Hjälten i spelarens färger (valen i skapa hjälten): bilderna av hjälte A med hud och dräkt bytta, staven ovanpå
   * när han har den, och det han har på sig. @param {Record<string, number>} val
   */
  sattUtseende(val) {
    this.utseende = val; this.smutsig = true;
    const hud = HJALTE_FARGER.hudfarg[val.hudfarg ?? 0] ?? HJALTE_FARGER.hudfarg[0];
    const drakt = HJALTE_FARGER.drakt[val.drakt ?? 0] ?? HJALTE_FARGER.drakt[0];
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

  /** Det han har på sig (hjältens lager: hjälmdekor, ryggsäck). @param {{ hjalmdekor: string | null, ryggsack: string | null }} lager */
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
    const r = this.rygg || this.hjaltePose ? 'upp' : riktningFor(this.vand);
    const i = this.gar ? Math.floor((this.gang || 0) / GANG_STEG) % 4 : 0;
    // på stegen: klättra med ryggen mot oss (två bilder som växlar medan han klättrar)
    const klattrar = this.klattrar && this.textures.get('hjalte').has('hjalte_klattra_upp_01');
    const pose = !klattrar && this.hjaltePose;
    const namn = pose || (klattrar ? `hjalte_klattra_upp_0${1 + (Math.floor(this.pos.y / 6) % 2)}` : `hjalte_ga_${r}_0${i + 1}`);
    if (this.kropp.frame.name !== namn) { this.kropp.setFrame(namn); this.smutsig = true; }
    // en hel bild (32 × 40) står med fötterna där gångens bild (16 × 24) har dem
    const px = pose ? -8 : 0, py = pose ? -16 : 0;
    if (this.kropp.x !== px || this.kropp.y !== py) { this.kropp.setPosition(px, py); this.smutsig = true; }
    this.stav?.setVisible(!!this.harStav && !klattrar && !pose);
    if (this.stav && !pose) {
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
    this.sover = { id: o.id, img, tex: img.texture.key, ram: img.frame.name, ungeGomd: false, andas: /** @type {any} */ (null) };
    img.setTexture(this.hjalteTextur || 'hjalte', 'hjalte_sang_03');
    this.hjalte.setVisible(false);
    this.sover.andas = this.time.addEvent({ delay: 900, loop: true, callback: () => { img.setFrame(img.frame.name === 'hjalte_sang_03' ? 'hjalte_sang_04' : 'hjalte_sang_03'); this.smutsig = true; } });
    this.smutsig = true;
    return true;
  }

  /** Han vaknar och kliver ur sängen: täcket av, han kliver ur, och står framför sängen. @param {number} ms */
  async vakna(ms = 500) {
    const s = this.sover; if (!s) return;
    this.sover = null;
    s.andas.remove();
    for (const ram of ['hjalte_sang_02', 'hjalte_sang_01']) { s.img.setFrame(ram); this.smutsig = true; await new Promise((k) => this.time.delayedCall(Math.max(1, ms / 2), k)); }
    s.img.setTexture(s.tex, s.ram);
    const o = this.ruta(s.id);
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
        for (const [n, t] of bilder) { img.setTexture(figur, `runt_fonster_skata_0${n}`); this.smutsig = true; await new Promise((k) => this.time.delayedCall(t, k)); }
        img.setTexture(forut.tex, forut.ram); this.smutsig = true;
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
   * - en sidovy (`assets/sidovyer/<bild>_bakgrund.png`), se `visaSidovy`.
   * @param {string} bild @returns {number} hur länge mellanscenen visas (ms), 0 = ingen bild
   */
  regi(bild) {
    if (!this.harRum || !bild) return 0;
    if (bild === 'hjalte_sang_morgon') return this.morgonISangen() ? 2400 : 0;
    if (bild.startsWith('luftskepp_')) {
      const lage = bild.slice('luftskepp_'.length);
      return this.luftskepp(lage) ? ({ glider: 2800, skata_putsar: 2200, trasslar: 2000 })[lage] ?? 1400 : 0;
    }
    if (this.textures.exists(`sidovy_${bild}_bakgrund`)) {
      // luftskeppet flyger först iväg åt fel håll, mot SKOLAN (Stil 21:20), sedan kommer sidovyn
      const ms = this.luft && this.flygFel() ? 1600 : 0;
      if (ms && this.luft) this.luft.tider.push(this.time.delayedCall(ms, () => this.visaSidovy(bild))); else this.visaSidovy(bild);
      return ms + 4200;
    }
    return 0;
  }

  /** Luftskeppet, hjälmen och sidovyn tas bort (nytt rum). */
  rensaRegi() {
    if (this.luft) { for (const t of this.luft.tider) t.remove(); this.luft.gung.remove(); this.tweens.killTweensOf(this.luft.img); this.luft = null; }
    this.sattPose(null);
    this.lagerLuft?.each((/** @type {any} */ x) => this.tweens.killTweensOf(x));
    this.lagerLuft?.removeAll(true);
    if (this.sidovy) this.rensaSidovy();
  }

  /** Morgonen i sängen (s19): han är vaken och skrattar, och ungen på täcket slickar honom på näsan. @returns {boolean} */
  morgonISangen() {
    const s = this.sover;
    if (!s || !s.img.texture.has('hjalte_sang_morgon_01')) return false;
    s.andas.remove();
    s.ungeGomd = true; this.unge.setVisible(false);
    s.img.setFrame('hjalte_sang_morgon_01');
    s.andas = this.time.addEvent({ delay: 260, loop: true, callback: () => { s.img.setFrame(s.img.frame.name === 'hjalte_sang_morgon_01' ? 'hjalte_sang_morgon_02' : 'hjalte_sang_morgon_01'); this.smutsig = true; } });
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
   * @param {string} lage @returns {boolean}
   */
  luftskepp(lage) {
    if (!this.textures.exists('baronen') || !this.textures.get('baronen').has('luftskepp_glider_01')) return false;
    const k = this.kamera, mal = { x: Math.round(k.x + 64), y: k.y + 2 };
    if (!this.luft) {
      const img = this.add.image(lage === 'glider' ? k.x - 112 : mal.x, mal.y, 'baronen', 'luftskepp_glider_01').setOrigin(0, 0);
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
    this.smutsig = true;
    return new Promise((klar) => {
      try { this.game.renderer.snapshot((img) => klar(/** @type {HTMLImageElement} */ (img))); } catch (e) { klar(null); }
      setTimeout(() => klar(null), 500);
    });
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
    if (re && nu < re.slut) namn = `unge1_${re.namn}_${re.sida ? sida : 'ner'}_0${1 + Math.min(re.bilder - 1, Math.floor((nu - re.start) / re.ms))}`;
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
    if (v.nyttRum) { this.ungeMal = null; this.ungeTittarPa = null; for (const g of this.lagda) g.destroy(); this.lagda = []; this.sparrade.clear(); if (this.sover) { this.sover.andas.remove(); this.sover = null; } this.rensaRegi(); }
    this.tillstand = v.tillstand;
    if (v.nyttRum || !this.harRum) this.inomhus = !!v.karta?.inomhus;
    this.lampor = v.karta?.lampor || [];
    this.morkerNatt = v.karta?.morker ?? null;
    if (v.nyttRum || !this.harRum) this.vagg = v.karta?.vagg || VAGG;
    if (v.nyttRum || !this.harRum) this.massiv = (this.harRum && v.karta?.massiv) || [];
    if (v.nyttRum || !this.harRum) { this.storlek = (this.harRum && v.karta?.storlek) || { bredd: RUM.bredd, hojd: RUM.hojd }; this.omrade = null; }
    this.ritaGolv(this.harRum);
    // föremål som bara syns i vissa tillstånd (ägget när ljuset är tänt) gör att rummet byggs om
    const synliga = this.harRum ? synligaIds(v.innehall, v.tillstand, v.visade).join(' ') : '';
    const andrat = synliga !== this.synliga;
    this.synliga = synliga;
    if (v.nyttRum || !this.harRum || andrat) {
      this.objekt = this.harRum ? rumsObjekt(v.innehall, v.tillstand, v.karta, v.visade) : [];
      this.lagerObjekt.removeAll(true); this.lagerLjust.removeAll(true); this.ritade.clear(); this.markerade.clear(); this.ritadeDelar.clear(); this.markramar?.clear();
      this.delar = { ...(v.delar || {}) };
      for (const o of [...this.objekt.filter((x) => x.sort === 'yta'), ...this.objekt.filter((x) => x.sort !== 'yta')]) this.ritaObjekt(o);
      for (const id of this.sparrade) { const o = this.ruta(id); if (o) this.ritaGren(o); }
      this.ritaKvar(v.kvar || []);
      this.byggHinder();
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
      } else this.pos = this.hinder.narmasteFria(this.pos);
    }
    if (!this.harRum && (this.kamera.x || this.kamera.y)) this.sattKamera({ x: 0, y: 0 });
    this.hjalte.setVisible(this.harRum && !this.sover);
    this.unge.setVisible(this.harRum && this.visaUnge && !this.sover?.ungeGomd);
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

  byggHinder() {
    const sparrade = this.objekt.filter((o) => this.sparrade.has(o.id));
    // en stig som är en öppning skär igenom häcken den ligger över (hålet bakom stenen), när den syns
    const oppningar = this.objekt.filter((o) => o.oppning);
    const rutor = [...skarIgenom(hinderFran(this.objekt), oppningar), ...sparrade, ...(this.inomhus ? vaggar(this.vagg, this.storlek) : []), ...this.massiv];
    // en uppsättning hinder per nivå: på marken går det inte att gå upp på kullen utom på trappan, och tvärtom
    const n = (this.nivaer = skapaNivaer(this.objekt));
    this.hinderPer = new Map(n.nivaer.map((niva) => [niva, skapaHinder(rutor, n.finns ? (p) => n.tillaten(p, niva) : undefined, this.storlek)]));
    // på trappan eller stegen gäller båda nivåerna: han kan gå av uppe eller nere (men aldrig över kanten)
    this.hinderForbindelse = n.finns ? skapaHinder(rutor, (p) => n.nivaer.some((niva) => n.tillaten(p, niva)), this.storlek) : null;
    if (!this.hinderPer.has(this.niva)) this.niva = 0;
    this.hinder = /** @type {ReturnType<typeof skapaHinder>} */ (this.hinderPer.get(this.niva));
    this.vag = []; this.vagMal = null;
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
      const rad = this.bildrad(o, o.bildRad);
      this.lagerObjekt.add(rad);
      this.ritade.set(o.id, /** @type {any} */ (rad));
      return;
    }
    const bildNamn = o.bildNatt && (this.tillstand === 'natt' || this.tillstand === 'natt_upplyst') ? o.bildNatt : o.bild;
    const fb = bildNamn && !this.delar[o.id] ? foremalsbild(this, bildNamn) : null;
    if (fb) {
      const pa = (o.bildPa && this.objekt.find((x) => x.id === o.bildPa)) || o;
      const tex = fb.nyckel === 'hjalte' ? this.hjalteTextur || 'hjalte' : fb.nyckel;
      const img = this.add.image(Math.round(pa.x + pa.b / 2), pa.y + pa.h, tex, fb.ram).setOrigin(0.5, 1);
      (o.lyser || o.skataFonster ? this.lagerLjust : this.lagerObjekt).add(img);
      this.ritade.set(o.id, /** @type {any} */ (img));
      return;
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
    const ritade = delar.map((d, i) => {
      const k = d.storlek === 'stor' ? 1 : d.storlek === 'liten' ? 0.55 : 0.8;
      const b = Math.round(bas * k), h = Math.round(o.h * k);
      const x = Math.round(o.x + i * steg + (steg - b) / 2), y = o.y + o.h - h;
      const ruta = this.add.rectangle(x, y, b, h, d.farg ?? FARG.sak).setOrigin(0, 0).setStrokeStyle(1, 0x2b2420);
      this.lagerObjekt.add(ruta);
      return ruta;
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
   * Det som står kvar efter hugget (bild_kvar: lianernas stubbar), ritat utan att vara ett föremål eller ett hinder.
   * @param {import('../karna/rumslayout.js').Objekt[]} lista
   */
  ritaKvar(lista) {
    for (const o of lista) {
      if (!o.bildKvar || !foremalsbild(this, o.bildKvar)) continue;
      if (o.bildRad) { this.lagerObjekt.add(this.bildrad(o, [o.bildKvar])); continue; }
      const fb = /** @type {{ nyckel: string, ram: string }} */ (foremalsbild(this, o.bildKvar));
      this.lagerObjekt.add(this.add.image(Math.round(o.x + o.b / 2), o.y + o.h, fb.nyckel, fb.ram).setOrigin(0.5, 1));
    }
    this.smutsig = true;
  }

  /**
   * Visa ett pussels alternativ i föremålet (t.ex. lådorna i den variant spelaren har). null = som vanligt.
   * @param {string} id @param {{ farg: number | null, storlek: string | null }[] | null} delar
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
    this.hjalte.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd));
    this.ritaHjalte();
    if (this.buren) this.buren.setPosition(Math.round(this.pos.x + 6), Math.round(this.pos.y - FIGUR.hojd - 6 + Math.sin(this.time.now / 300) * 1.5));
    // pekar ungen nosar den mot föremålet: små ryck åt dess håll
    const m = this.ungeMal;
    const nos = m && Math.hypot(m.x - this.ungePos.x, m.y - this.ungePos.y) < 3 ? Math.max(0, Math.sin(this.time.now / 110)) * 3 : 0;
    if (this.ungeBild) { this.unge.setPosition(Math.round(this.ungePos.x - 12), Math.round(this.ungePos.y - 23)); this.ritaUngen(); }
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
   * Spelet pausas (menyn för vuxna, fliken dold): världen står still så länge, och sedan står den som stegen vill.
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
    // lianväggen (kartans delas: hela): delarna fyller hela föremålet, så att väggen står kvar tills den är huggen
    if (bas?.delasHela) {
      for (let i = 0; i < antal; i++) {
        const x0 = bas.x + Math.round((i * bas.b) / antal), x1 = bas.x + Math.round(((i + 1) * bas.b) / antal);
        const n = { id: `${id}_${i}`, x: x0, y: bas.y, b: x1 - x0, h: bas.h, sort: /** @type {'sak'} */ ('sak'), ...(bas.sida ? { sida: bas.sida } : {}), ...(bas.bildDel ? { bild: bas.bildDel } : {}),
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
    const f = o.sort === 'utgang' ? lasplats(o) : framforFran(o, this.pos, this.inomhus, this.vagg, this.massiv);
    const p = this.hinder.narmasteFria({ x: f.x, y: f.y });
    const cx = o.x + o.b / 2, cy = o.y + o.h / 2;
    this.ungeMal = { x: p.x, y: p.y, mot: Math.atan2(cy - p.y, cx - p.x) };
    return true;
  }

  /**
   * Hjälten bär en sak som svävar efter honom (som ljusbollen), eller null. @param {number | null} farg
   */
  bara(farg) {
    this.buren?.destroy(); this.buren = null;
    if (farg === null) return;
    const g = this.add.container(0, 0);
    g.add(this.add.rectangle(0, 0, 12, 8, farg).setOrigin(0, 0).setStrokeStyle(1, 0x4a3f34));
    for (let x = 1; x < 12; x += 3) g.add(this.add.rectangle(x, 8, 1, 2, farg).setOrigin(0, 0)); // fransar
    this.buren = g; this.placera();
  }
  /** Lägg saken hjälten bär på ett föremål (filten om ägget). Den ligger kvar där. @param {string} id */
  lagg(id) {
    const o = this.ruta(id), g = this.buren; if (!o || !g) return;
    this.buren = null;
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
  slagen(id) {
    this.smutsig = true; const r = this.ritade.get(id); if (!r) return;
    if (r.setFillStyle) { r.setFillStyle(0x5a554e); r.setSize(18, 8); r.y += 10; return; }
    // en bild: krukan är slagen i bitar, bara skärvorna på golvet syns (den nedre tredjedelen)
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
      bilder.forEach((fb, i) => this.time.delayedCall(80 * i, () => { for (const d of delar) d.setTexture(fb.nyckel, fb.ram); this.smutsig = true; }));
      return;
    }
    this.tweens.add({ targets: r, y: r.y + 6, alpha: 0, duration: 260, onUpdate: () => { this.smutsig = true; }, onComplete: () => { r.destroy(); this.smutsig = true; } });
  }

  /**
   * Ett sving med staven, eller ett hugg med svärdet (10b): hjältens tre svingbilder, med staven eller svärdet ovanpå
   * (under när han svingar uppåt). Gråboxen utan bilderna gör inget. @param {number} [ms] per bild
   */
  svinga(ms = 80) {
    const r = riktningFor(this.vand);
    const tex = this.textures.exists('hjalte') ? this.textures.get('hjalte') : null;
    if (!tex?.has(`hjalte_svinga_${r}_01`) || !this.kropp || this.klattrar) return;
    const verktyg = this.harSvard && this.stav && this.textures.get(this.stav.texture.key).has(`svard_svinga_${r}_01`) ? 'svard' : 'stav';
    const kvar = this.hjaltePose;
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
    if (stege) this.pos = { x: Math.round(/** @type {any} */ (f).x + /** @type {any} */ (f).b / 2), y: this.pos.y };
    if (stege !== this.paStege) {
      this.paStege = stege; this.sattRygg(stege);
      if (!stege) { this.ungePos = { x: this.pos.x - 14, y: this.pos.y }; this.placera(); } // ungen skuttar efter
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
    const mal = this.omrade ? visaRuta(this.kamera, this.omrade, this.pos, S).k : folj(this.kamera, this.pos, S, { vand: this.vand, framat: this.kameraFramat });
    const k = narmare(this.kamera, mal, (Math.max(KAMERA.fart, FIGUR.fart * 1.5) * Math.min(dtMs, 100)) / 1000);
    if (k.x !== this.kamera.x || k.y !== this.kamera.y) this.sattKamera(k);
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
    // ungen klättrar inte på stegen: den väntar nedanför och kommer efter med ett skutt
    if (this.paStege && !m) { if (flyttad) this.placera(); return this.vantaPaHandling(inm); }
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

  /** Står han vid något som ett steg väntar på (vantaPa)? @param {any} inm */
  vantaPaHandling(inm) {
    if (this.vantar) {
      const o = aktivSak(this.pos, this.paNivan(this.objekt.filter((x) => this.vantar && this.vantar.ids.includes(x.id))), this.vand);
      if (o) { const v = this.vantar; this.vantar = null; inm.rensaGaTill(); v.klar(o.id); }
    }
  }
}
