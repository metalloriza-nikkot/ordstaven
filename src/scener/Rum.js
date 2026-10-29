// @ts-check
// Gråboxens rum: grå golv, objekt som rutor, hjälten och ungen som block, och ljuset (natt, upplyst, morgon).
// All text (objektens namn, lappar) ritas i textlagret, aldrig här.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';
import { rumsObjekt, framfor, framforFran, vidObjekt, aktivSak, hinderFran, vaggar, VAGG, objektFarg, lasplats, arSidodorr, stigStart } from '../karna/rumslayout.js';
import { synligaIds } from '../karna/karta.js';
import { skapaHinder } from '../karna/vag.js';
import { skapaNivaer } from '../karna/nivaer.js';

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
/**
 * Gråboxens bild av sakerna han kan ha på sig (lager): en färg per sak. Okända saker ritas i en neutral färg.
 * Riktig grafik kommer med Stil (stilguiden §5).
 */
const LAGER_FARG = { taggkam: 0x5fae6a, ryggsack_skog: 0x8a5a2b };

export class Rum extends Phaser.Scene {
  /**
   * @param {{ inmatning: ReturnType<typeof import('../karna/inmatning.js').skapaInmatning>,
   *           logg: { handelse(t: string, m: string, d?: any): void },
   *           vidAndring?: () => void }} b
   */
  constructor(b) {
    super({ key: 'Rum' });
    this.b = b;
    this.pos = { x: RUM.bredd / 2, y: RUM.hojd - 12 };
    /**
     * Kamerans läge i världen (beslut 14): punkten i skärmens övre vänstra hörn, i hela pixlar. Kapitel 1:s rum ryms
     * på en skärm, så den står i (0, 0). Kameran som följer hjälten byggs i T6; textlagret räknar redan med den.
     * @type {import('../karna/skalning.js').Kamera}
     */
    this.kamera = { x: 0, y: 0 };
    this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
    /** @type {import('../karna/rumslayout.js').Objekt[]} */
    this.objekt = [];
    /** @type {Map<string, any>} */
    this.ritade = new Map();
    this.fryst = false;
    this.harRum = false;
    this.inomhus = false;
    /** väggarnas mått i rummet (kartan) */
    this.vagg = VAGG;
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
    /** @type {{ x: number, y: number, t: number } | null} ett tryck medan världen stod still, som görs när den går igen */
    this.sparatTryck = null;
    /** Står han på en stege mellan nivåerna (styrbar klättring)? */
    this.paStege = false;
    /** @type {{ x: number, y: number }[]} vägen hjälten går just nu */
    this.vag = [];
    /** @type {{ x: number, y: number } | null} målet som vägen räknades till */
    this.vagMal = null;
  }

  create() {
    this.golv = this.add.graphics();
    this.lagerObjekt = this.add.container(0, 0);
    this.ljusboll = this.add.graphics().setVisible(false);
    this.lagerFigurer = this.add.container(0, 0);
    this.morker = this.add.graphics();
    this.hjalte = this.add.container(0, 0);
    this.unge = this.add.container(0, 0).setVisible(false);
    this.lagerFigurer.add([this.unge, this.hjalte]);
    // det som går att använda: en glimt på avstånd, ljus ram och glänt lock när hjälten står vid det
    this.glimtar = this.add.graphics();
    this.tweens.add({ targets: this.glimtar, alpha: { from: 1, to: 0.25 }, duration: 700, yoyo: true, repeat: -1 });
    this.naraRam = this.add.graphics();
    this.tweens.add({ targets: this.naraRam, alpha: { from: 1, to: 0.55 }, duration: 450, yoyo: true, repeat: -1 });
    this.malKors = this.add.graphics().setVisible(false);
    this.malKors.fillStyle(FARG.markerad).fillRect(-3, 0, 7, 1).fillRect(0, -3, 1, 7);
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
    const f = this.malFor?.(o) ?? framforFran(o, this.pos, this.inomhus, this.vagg); this.b.inmatning.sattGaTill(f.x, f.y);
  }


  /** @param {boolean} rum */
  ritaGolv(rum) {
    const g = this.golv; g.clear();
    if (!rum) { g.fillStyle(0x1a1410).fillRect(0, 0, RUM.bredd, RUM.hojd); return; }
    g.fillStyle(FARG.golv).fillRect(0, 0, RUM.bredd, RUM.hojd);
    g.fillStyle(FARG.rutnat);
    for (let x = RUM.ruta; x < RUM.bredd; x += RUM.ruta) g.fillRect(x, 0, 1, RUM.hojd);
    for (let y = RUM.ruta; y < RUM.hojd; y += RUM.ruta) g.fillRect(0, y, RUM.bredd, 1);
    g.fillStyle(FARG.kant).fillRect(0, 0, RUM.bredd, 2).fillRect(0, RUM.hojd - 2, RUM.bredd, 2).fillRect(0, 0, 2, RUM.hojd).fillRect(RUM.bredd - 2, 0, 2, RUM.hojd);
    if (!this.inomhus) return;
    // väggramen: bakvägg 3 rutor, sidoväggar 2 med sneda hörn, främre kant 1, och en ljus list överst
    const B = RUM.bredd, H = RUM.hojd, { bak, sida, fram } = this.vagg;
    g.fillStyle(0x7a6a58).fillRect(sida, 0, B - 2 * sida, bak);
    g.fillStyle(0x5e5244);
    g.fillTriangle(0, 0, sida, bak, 0, H).fillTriangle(0, 0, sida, 0, sida, bak);
    g.fillTriangle(B, 0, B - sida, bak, B, H).fillTriangle(B, 0, B - sida, 0, B - sida, bak);
    g.fillRect(0, bak, sida, H - bak - fram).fillRect(B - sida, bak, sida, H - bak - fram);
    g.fillTriangle(0, H, sida, H - fram, sida, H).fillTriangle(B, H, B - sida, H - fram, B - sida, H);
    g.fillStyle(0x6a5c4c).fillRect(sida, H - fram, B - 2 * sida, fram);
    g.fillStyle(0xcbb894).fillRect(0, 0, B, 3).fillRect(0, 0, 3, H).fillRect(B - 3, 0, 3, H).fillRect(0, H - 3, B, 3);
    g.fillStyle(0x4a3f34).fillRect(sida, bak - 2, B - 2 * sida, 2);
  }

  /** Hjältens färger efter valen i skapa hjälten. @param {Record<string, number>} val */
  sattUtseende(val) {
    this.utseende = val;
    const f = (/** @type {'hudfarg' | 'drakt' | 'hjalm' | 'skor'} */ del) => (del === 'hjalm' || del === 'skor' ? HJALTE_FAST[del] : HJALTE_FARGER[del][val[del] ?? 0] ?? HJALTE_FARGER[del][0]);
    this.hjalte.removeAll(true);
    // gråboxens version av spelarens figur: stort huvud med rund grå hjälm runt ett blått ansikte,
    // mörkgrå dräkt, blå armar, mörkblå skor
    this.ansikte = this.add.rectangle(4, 3, 8, 7, f('hudfarg')).setOrigin(0, 0);
    this.hjalte.add([
      this.add.rectangle(4, 21, 3, 3, f('skor')).setOrigin(0, 0),
      this.add.rectangle(9, 21, 3, 3, f('skor')).setOrigin(0, 0),
      // ryggsäcken syns som en kant bakom ryggen
      ...(this.lager?.ryggsack ? [this.add.rectangle(11, 12, 4, 8, LAGER_FARG[/** @type {keyof LAGER_FARG} */ (this.lager.ryggsack)] ?? 0x9a8f80).setOrigin(0, 0)] : []),
      this.add.rectangle(1, 13, 2, 6, f('hudfarg')).setOrigin(0, 0),
      this.add.rectangle(13, 13, 2, 6, f('hudfarg')).setOrigin(0, 0),
      this.add.rectangle(3, 12, 10, 9, f('drakt')).setOrigin(0, 0),
      this.add.rectangle(2, 0, 12, 12, f('hjalm')).setOrigin(0, 0),
      this.add.rectangle(3, 0, 10, 1, 0xffffff, 0.5).setOrigin(0, 0),
      this.ansikte,
    ]);
    // hjälmdekoren: taggar längs hjälmens topp
    const dekor = this.lager?.hjalmdekor;
    if (dekor) { const fd = LAGER_FARG[/** @type {keyof LAGER_FARG} */ (dekor)] ?? 0x9a8f80; for (const x of [4, 7, 10]) this.hjalte.add(this.add.rectangle(x, -3, 2, 3, fd).setOrigin(0, 0)); }
    // ryggsäcken mitt på ryggen, när han vänder ryggen mot kameran (stegen)
    this.ryggBak = this.lager?.ryggsack ? this.add.rectangle(4, 12, 8, 8, LAGER_FARG[/** @type {keyof LAGER_FARG} */ (this.lager.ryggsack)] ?? 0x9a8f80).setOrigin(0, 0).setVisible(false) : null;
    if (this.ryggBak) this.hjalte.add(this.ryggBak);
    this.sattRygg(this.klattrar);
  }

  /** Det han har på sig (hjältens lager: hjälmdekor, ryggsäck). @param {{ hjalmdekor: string | null, ryggsack: string | null }} lager */
  sattLager(lager) {
    this.lager = { ...lager };
    this.sattUtseende(this.utseende || {});
  }

  /** Ryggen mot kameran (på stegen): ansiktet döljs bakom hjälmen. @param {boolean} pa */
  sattRygg(pa) {
    const hud = HJALTE_FARGER.hudfarg[(this.utseende || {}).hudfarg ?? 0] ?? HJALTE_FARGER.hudfarg[0];
    this.ansikte?.setFillStyle(pa ? HJALTE_FAST.hjalm : hud);
    this.ryggBak?.setVisible(pa);
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

  /** En bild av rummet som det ser ut nu (för glidningen mellan rum). @returns {Promise<HTMLImageElement | null>} */
  bild() {
    return new Promise((klar) => {
      try { this.game.renderer.snapshot((img) => klar(/** @type {HTMLImageElement} */ (img))); } catch (e) { klar(null); }
      setTimeout(() => klar(null), 500);
    });
  }

  ritaUnge() {
    this.unge.removeAll(true);
    this.unge.add([this.add.rectangle(0, 0, 12, 12, FARG.unge).setOrigin(0, 0), this.add.rectangle(2, 6, 8, 5, FARG.ungeMage).setOrigin(0, 0)]);
  }

  /**
   * Visa ett rum (eller inget rum, för scener utan rum).
   * @param {{ rum: string | null, tillstand: string | null, innehall: (string | { id: string, syns_i?: string[] })[], unge: boolean, nyttRum: boolean,
   *           karta?: import('../karna/karta.js').Karta | null, franRum?: string | null,
   *           delar?: Record<string, { farg: number | null, storlek: string | null }[]>, visade?: string[] }} v
   * visade = dolda föremål som ett steg har visat (visa_foremal)
   */
  visa(v) {
    this.harRum = !!v.rum;
    this.visaUnge = v.unge;
    if (v.nyttRum) { this.ungeMal = null; for (const g of this.lagda) g.destroy(); this.lagda = []; this.sparrade.clear(); }
    this.tillstand = v.tillstand;
    if (v.nyttRum || !this.harRum) this.inomhus = !!v.karta?.inomhus;
    this.lampor = v.karta?.lampor || [];
    this.morkerNatt = v.karta?.morker ?? null;
    if (v.nyttRum || !this.harRum) this.vagg = v.karta?.vagg || VAGG;
    this.ritaGolv(this.harRum);
    // föremål som bara syns i vissa tillstånd (ägget när ljuset är tänt) gör att rummet byggs om
    const synliga = this.harRum ? synligaIds(v.innehall, v.tillstand, v.visade).join(' ') : '';
    const andrat = synliga !== this.synliga;
    this.synliga = synliga;
    if (v.nyttRum || !this.harRum || andrat) {
      this.objekt = this.harRum ? rumsObjekt(v.innehall, v.tillstand, v.karta, v.visade) : [];
      this.lagerObjekt.removeAll(true); this.ritade.clear(); this.markerade.clear(); this.ritadeDelar.clear();
      this.delar = { ...(v.delar || {}) };
      for (const o of [...this.objekt.filter((x) => x.sort === 'yta'), ...this.objekt.filter((x) => x.sort !== 'yta')]) this.ritaObjekt(o);
      for (const id of this.sparrade) { const o = this.ruta(id); if (o) this.ritaGren(o); }
      this.byggHinder();
      this.sattInteraktiva(this.interaktiva.filter((id) => this.ruta(id))); this.nara(null);
      if (v.nyttRum || !this.harRum) {
        // hjälten kommer in genom utgången från förra rummet, annars vid kartans startpunkt
        const dorr = v.franRum ? this.objekt.find((o) => o.till === v.franRum) : null;
        /** @type {import('../karna/rumslayout.js').Objekt | null} utgången hjälten kom in genom */
        this.inkom = dorr ?? null;
        const start = dorr ? framfor(dorr) : (v.franRum && v.karta?.in?.[v.franRum]) || v.karta?.start || { x: RUM.bredd / 2, y: RUM.hojd - 12 };
        this.niva = 0; this.paStege = false; this.byggHinder(); this.sattNivaVid(start);
        this.pos = this.hinder.narmasteFria(start);
        this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
        this.b.inmatning.rensaGaTill();
      } else this.pos = this.hinder.narmasteFria(this.pos);
    }
    this.hjalte.setVisible(this.harRum);
    this.unge.setVisible(this.harRum && this.visaUnge);
    this.ritaLjus();
    this.placera();
    this.b.vidAndring?.();
  }

  /** Föremålen som går att använda just nu får en glimt. @param {string[]} ids */
  sattInteraktiva(ids) {
    this.interaktiva = ids;
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
    this.naraId = id;
    const g = this.naraRam; g.clear();
    const o = id ? this.ruta(id) : null;
    if (!o) return;
    g.lineStyle(2, FARG.markerad, 1).strokeRect(o.x - 1, o.y - 1, o.b + 2, o.h + 2);
    // locket lyfts lite (gråboxens tecken för "här kan du göra något")
    if (o.sort === 'sak') g.fillStyle(0xfff2b0, 0.9).fillRect(o.x + 2, o.y - 4, o.b - 4, 2);
  }

  byggHinder() {
    const sparrade = this.objekt.filter((o) => this.sparrade.has(o.id));
    const rutor = [...hinderFran(this.objekt), ...sparrade, ...(this.inomhus ? vaggar(this.vagg) : [])];
    // en uppsättning hinder per nivå: på marken går det inte att gå upp på kullen utom på trappan, och tvärtom
    const n = (this.nivaer = skapaNivaer(this.objekt));
    this.hinderPer = new Map(n.nivaer.map((niva) => [niva, skapaHinder(rutor, n.finns ? (p) => n.tillaten(p, niva) : undefined)]));
    // på trappan eller stegen gäller båda nivåerna: han kan gå av uppe eller nere (men aldrig över kanten)
    this.hinderForbindelse = n.finns ? skapaHinder(rutor, (p) => n.nivaer.some((niva) => n.tillaten(p, niva))) : null;
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
    // en dörr i en sidovägg är en mörk öppning i väggen; dörrbladet, karmen och golvremsan ritas i ritaDetaljer
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
    const g = this.morker; g.clear();
    const t = this.tillstand || '';
    const alfa = !this.harRum ? 0 : t === 'natt' ? (this.morkerNatt ?? 0.72) : t === 'natt_upplyst' ? 0.42 : 0;
    if (alfa) g.fillStyle(0x0a0820, alfa).fillRect(0, 0, RUM.bredd, RUM.hojd);
    // en lampa (läslampan vid Farfars plats) lyser varmt i mörkret: ljusare ringar inåt och en glödande punkt
    if (alfa) for (const l of this.lampor) {
      for (const [r, a] of [[60, 0.10], [44, 0.12], [28, 0.16]]) g.fillStyle(FARG.ljus, a).fillCircle(l.x, l.y, r);
      g.fillStyle(FARG.ljus, 1).fillCircle(l.x, l.y - 14, 3);
    }
    this.ljusboll.setVisible(this.harRum && t === 'natt_upplyst');
  }

  placera() {
    this.hjalte.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd));
    if (this.buren) this.buren.setPosition(Math.round(this.pos.x + 6), Math.round(this.pos.y - FIGUR.hojd - 6 + Math.sin(this.time.now / 300) * 1.5));
    // pekar ungen nosar den mot föremålet: små ryck åt dess håll
    const m = this.ungeMal;
    const nos = m && Math.hypot(m.x - this.ungePos.x, m.y - this.ungePos.y) < 3 ? Math.max(0, Math.sin(this.time.now / 110)) * 3 : 0;
    this.unge.setPosition(Math.round(this.ungePos.x - 6 + (m ? Math.cos(m.mot) * nos : 0)), Math.round(this.ungePos.y - 12 + (m ? Math.sin(m.mot) * nos : 0)));
    const l = this.ljusboll; l.clear();
    if (l.visible) {
      const cx = Math.round(this.pos.x), cy = Math.round(this.pos.y - 30);
      l.fillStyle(FARG.ljus, 0.18).fillCircle(cx, cy + 18, 56);
      l.fillStyle(FARG.ljus, 1).fillCircle(cx, cy, 3);
    }
  }

  /** Världen stannar när läsplattan är öppen. @param {boolean} pa */
  frys(pa) { this.fryst = pa; if (pa) this.b.inmatning.rensaGaTill(); }

  /** @param {string} id @param {boolean} pa */
  markera(id, pa) {
    const r = this.ritade.get(id);
    if (!r) return;
    if (pa) this.markerade.add(id); else this.markerade.delete(id);
    r.setStrokeStyle(pa ? 2 : 1, pa ? FARG.markerad : FARG.sakKant);
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
    const ryms = bas && bas.b >= antal * 22;
    for (let i = 0; i < antal; i++) {
      // inom objektets ruta om de ryms, annars en egen rad mitt i rummet
      const x = ryms && bas ? Math.round(bas.x + ((i + 0.5) * bas.b) / antal) - 9 : Math.round(((i + 1) * RUM.bredd) / (antal + 1)) - 9;
      const n = { id: `${id}_${i}`, x, y: ryms && bas ? bas.y : 112, b: 18, h: 18, sort: /** @type {'sak'} */ ('sak'), ...(bas?.sida ? { sida: bas.sida } : {}) };
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
    const f = o.sort === 'utgang' ? lasplats(o) : framforFran(o, this.pos, this.inomhus, this.vagg);
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
    return new Promise((klar) => {
      const p = { ...fran };
      this.tweens.add({ targets: p, x: till.x, y: till.y, duration: Math.max(1, ms), onUpdate: () => { this.pos = { x: p.x, y: p.y }; this.placera(); }, onComplete: () => { this.pos = { ...till }; this.placera(); klar(undefined); } });
    });
  }

  /** Visa att ett föremål är öppnat och tomt. @param {string} id */
  tomt(id) { const r = this.ritade.get(id); if (r) { r.setFillStyle(0x6f6a62); r.setAlpha(0.6); } this.markera(id, false); }

  /** Visa att en kruka är slagen. @param {string} id */
  slagen(id) { const r = this.ritade.get(id); if (r) { r.setFillStyle(0x5a554e); r.setSize(18, 8); r.y += 10; } }

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

  /** Objektets ruta i rumskoordinater. @param {string} id */
  ruta(id) { return this.objekt.find((o) => o.id === id) ?? null; }

  /** @param {number} _t @param {number} dtMs */
  update(_t, dtMs) {
    const inm = this.b.inmatning;
    if (!this.harRum || this.fryst || this.klattrar) return;
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
        ny = steg(this.pos, { riktning: { x: 0, y: 0 }, gaTill: nasta }, dtMs / 1000);
        if (ny.framme) { this.vag.shift(); ny.framme = this.vag.length === 0; }
      }
    } else ny = { ...this.pos, framme: false };
    const sista = this.vag.at(-1);
    if (mal && !ny.framme && sista) this.malKors.setPosition(Math.round(sista.x), Math.round(sista.y)).setVisible(true);
    else { this.malKors.setVisible(false); if (ny.framme) { inm.rensaGaTill(); this.vag = []; this.vagMal = null; } }
    const flyttad = ny.x !== this.pos.x || ny.y !== this.pos.y;
    if (flyttad) { const vx = ny.x - this.pos.x, vy = ny.y - this.pos.y, l = Math.hypot(vx, vy); if (l > 0.01) this.vand = { x: vx / l, y: vy / l }; }
    this.pos = { x: ny.x, y: ny.y };
    if (this.nivaer.finns) this.foljNivan();
    // ungen följer efter på avstånd, eller springer dit den pekar
    const m = this.ungeMal;
    const tx = m ? m.x : this.pos.x - 16, ty = m ? m.y : this.pos.y;
    const dx = tx - this.ungePos.x, dy = ty - this.ungePos.y, l = Math.hypot(dx, dy);
    const narmare = m ? 1 : 6;
    // ungen klättrar inte på stegen: den väntar nedanför och kommer efter med ett skutt
    if (this.paStege && !m) { if (flyttad) this.placera(); return this.vantaPaHandling(inm); }
    if (l > narmare) { const v = Math.min(l - narmare, (dtMs / 1000) * (m ? 110 : 90)); this.ungePos = { x: this.ungePos.x + (dx / l) * v, y: this.ungePos.y + (dy / l) * v }; }
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
