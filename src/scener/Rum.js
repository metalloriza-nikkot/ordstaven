// @ts-check
// Gråboxens rum: grå golv, objekt som rutor, hjälten och ungen som block, och ljuset (natt, upplyst, morgon).
// All text (objektens namn, lappar) ritas i textlagret, aldrig här.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';
import { placeraObjekt, framfor, vidObjekt, hinderFran } from '../karna/rumslayout.js';
import { skapaHinder } from '../karna/vag.js';

const FARG = {
  golv: 0x8c8a86, rutnat: 0x7f7d79, kant: 0x5d5b58,
  sak: 0xb9b2a4, sakKant: 0x6e675c, utgang: 0x6d5a45, figur: 0xc9a27a, markerad: 0xf2c14e,
  unge: 0x5fae6a, ungeMage: 0x9fd4a0, ljus: 0xfff2b0,
};
export const HJALTE_FARGER = {
  kropp: [0x3d6fb6, 0xc0563a, 0x4f8a4a, 0x8a5bb0],
  hudton: [0xf2d0b0, 0xd9a77e, 0xa8714a, 0x6b4428],
  klader: [0x6b4c35, 0x2f4f6f, 0x7a2e2e, 0x3f5f3a],
  hatt: [0x2b2420, 0xb08a3e, 0x7a2e2e, 0x3d6fb6],
};

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
    this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
    /** @type {import('../karna/rumslayout.js').Objekt[]} */
    this.objekt = [];
    /** @type {Map<string, any>} */
    this.ritade = new Map();
    this.fryst = false;
    this.harRum = false;
    this.visaUnge = false;
    this.tillstand = /** @type {string | null} */ (null);
    /** @type {{ ids: string[], klar: (id: string) => void } | null} */
    this.vantar = null;
    this.markerade = new Set();
    this.redo = new Promise((r) => { this._redo = r; });
    this.hinder = skapaHinder([]);
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
    this.malKors = this.add.graphics().setVisible(false);
    this.malKors.fillStyle(FARG.markerad).fillRect(-3, 0, 7, 1).fillRect(0, -3, 1, 7);
    // tryck på ett objekt = gå fram till det
    this.b.inmatning.lyssna((h) => {
      if (h.typ !== 'tryck' || !this.harRum || this.fryst) return;
      // närmaste objekt vars ruta (med lite marginal) innehåller trycket
      const traffar = this.objekt.filter((x) => h.x >= x.x - 4 && h.x <= x.x + x.b + 4 && h.y >= x.y - 4 && h.y <= x.y + x.h + 4);
      const avst = (/** @type {any} */ x) => Math.hypot(h.x - (x.x + x.b / 2), h.y - (x.y + x.h / 2));
      const o = traffar.sort((a, c) => avst(a) - avst(c))[0];
      if (o) { const f = framfor(o); this.b.inmatning.sattGaTill(f.x, f.y); }
    });
    this.sattUtseende({});
    this.ritaUnge();
    this.ritaGolv(false);
    this._redo?.();
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
  }

  /** Hjältens färger efter valen i skapa hjälten. @param {Record<string, number>} val */
  sattUtseende(val) {
    const f = (/** @type {keyof HJALTE_FARGER} */ del) => HJALTE_FARGER[del][val[del] ?? 0];
    this.hjalte.removeAll(true);
    this.hjalte.add([
      this.add.rectangle(0, 8, 16, 16, f('klader')).setOrigin(0, 0),
      this.add.rectangle(2, 10, 12, 8, f('kropp')).setOrigin(0, 0),
      this.add.rectangle(3, 2, 10, 8, f('hudton')).setOrigin(0, 0),
      this.add.rectangle(1, 0, 14, 3, f('hatt')).setOrigin(0, 0),
    ]);
  }

  ritaUnge() {
    this.unge.removeAll(true);
    this.unge.add([this.add.rectangle(0, 0, 12, 12, FARG.unge).setOrigin(0, 0), this.add.rectangle(2, 6, 8, 5, FARG.ungeMage).setOrigin(0, 0)]);
  }

  /**
   * Visa ett rum (eller inget rum, för scener utan rum).
   * @param {{ rum: string | null, tillstand: string | null, innehall: string[], unge: boolean, nyttRum: boolean }} v
   */
  visa(v) {
    this.harRum = !!v.rum;
    this.visaUnge = v.unge;
    this.tillstand = v.tillstand;
    this.ritaGolv(this.harRum);
    if (v.nyttRum || !this.harRum) {
      this.objekt = this.harRum ? placeraObjekt(v.innehall) : [];
      this.lagerObjekt.removeAll(true); this.ritade.clear(); this.markerade.clear();
      for (const o of this.objekt) this.ritaObjekt(o);
      this.byggHinder();
      this.pos = this.hinder.narmasteFria({ x: RUM.bredd / 2, y: RUM.hojd - 12 });
      this.ungePos = { x: this.pos.x - 18, y: this.pos.y };
      this.b.inmatning.rensaGaTill();
    }
    this.hjalte.setVisible(this.harRum);
    this.unge.setVisible(this.harRum && this.visaUnge);
    this.ritaLjus();
    this.placera();
    this.b.vidAndring?.();
  }

  byggHinder() { this.hinder = skapaHinder(hinderFran(this.objekt)); this.vag = []; this.vagMal = null; }

  /** @param {import('../karna/rumslayout.js').Objekt} o */
  ritaObjekt(o) {
    const fyll = o.sort === 'utgang' ? FARG.utgang : o.sort === 'figur' ? FARG.figur : FARG.sak;
    const r = this.add.rectangle(o.x, o.y, o.b, o.h, fyll).setOrigin(0, 0).setStrokeStyle(1, FARG.sakKant);
    this.lagerObjekt.add(r);
    this.ritade.set(o.id, r);
  }

  ritaLjus() {
    const g = this.morker; g.clear();
    const t = this.tillstand || '';
    const alfa = !this.harRum ? 0 : t === 'natt' ? 0.72 : t === 'natt_upplyst' ? 0.42 : 0;
    if (alfa) g.fillStyle(0x0a0820, alfa).fillRect(0, 0, RUM.bredd, RUM.hojd);
    this.ljusboll.setVisible(this.harRum && t === 'natt_upplyst');
  }

  placera() {
    this.hjalte.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd));
    this.unge.setPosition(Math.round(this.ungePos.x - 6), Math.round(this.ungePos.y - 12));
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

  /** Ersätt ett objekt med flera små (krukorna). @param {string} id @param {number} antal @returns {string[]} */
  dela(id, antal) {
    const nya = [];
    this.objekt = this.objekt.filter((x) => x.id !== id);
    this.ritade.get(id)?.destroy(); this.ritade.delete(id);
    for (let i = 0; i < antal; i++) {
      // en egen rad under de andra sakerna, så att inget överlappar
      const n = { id: `${id}_${i}`, x: Math.round(((i + 1) * RUM.bredd) / (antal + 1)) - 9, y: 112, b: 18, h: 18, sort: /** @type {'sak'} */ ('sak') };
      this.objekt.push(n); this.ritaObjekt(n); nya.push(n.id);
    }
    this.byggHinder();
    this.b.vidAndring?.();
    return nya;
  }

  /** Visa att en kruka är slagen. @param {string} id */
  slagen(id) { const r = this.ritade.get(id); if (r) { r.setFillStyle(0x5a554e); r.setSize(18, 8); r.y += 10; } }

  /** Objektets ruta i rumskoordinater. @param {string} id */
  ruta(id) { return this.objekt.find((o) => o.id === id) ?? null; }

  /** @param {number} _t @param {number} dtMs */
  update(_t, dtMs) {
    const inm = this.b.inmatning;
    if (!this.harRum || this.fryst) return;
    const mal = inm.gaTillMal();
    const riktning = inm.riktning();
    /** @type {{ x: number, y: number, framme: boolean }} */
    let ny;
    if (riktning.x || riktning.y) {
      // piltangenterna: glid längs hindren
      this.vag = []; this.vagMal = null;
      const d = Math.min(dtMs / 1000, 0.1) * FIGUR.fart;
      ny = { ...this.hinder.glid(this.pos, riktning.x * d, riktning.y * d), framme: false };
    } else if (mal) {
      // tryck: räkna en väg runt hindren när målet är nytt, gå sedan punkt för punkt
      if (!this.vagMal || this.vagMal.x !== mal.x || this.vagMal.y !== mal.y) { this.vagMal = mal; this.vag = this.hinder.vag(this.pos, mal); }
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
    this.pos = { x: ny.x, y: ny.y };
    // ungen följer efter på avstånd
    const dx = this.pos.x - 16 - this.ungePos.x, dy = this.pos.y - this.ungePos.y, l = Math.hypot(dx, dy);
    if (l > 6) { const v = Math.min(l - 6, (dtMs / 1000) * 90); this.ungePos = { x: this.ungePos.x + (dx / l) * v, y: this.ungePos.y + (dy / l) * v }; }
    if (flyttad || l > 6) this.placera();
    if (this.vantar) {
      const o = this.objekt.find((x) => this.vantar && this.vantar.ids.includes(x.id) && vidObjekt(this.pos, x));
      if (o) { const v = this.vantar; this.vantar = null; inm.rensaGaTill(); v.klar(o.id); }
    }
  }
}
