// @ts-check
// Fas 1: ett grått rum och ett block i hjältens storlek. Inget spelinnehåll.
// Blocket går med piltangenterna och till punkten man trycker på.
import Phaser from 'phaser';
import { RUM } from '../karna/skalning.js';
import { FIGUR, steg } from '../karna/rorelse.js';

const FARG = { golv: 0x8c8a86, rutnat: 0x7f7d79, kant: 0x5d5b58, block: 0xc0563a, blockTopp: 0xe08a6c, mal: 0xf2c14e };

export class Testrum extends Phaser.Scene {
  /**
   * @param {{ inmatning: ReturnType<typeof import('../karna/inmatning.js').skapaInmatning>,
   *           plats: { x: number, y: number },
   *           vidFlytt: (p: { x: number, y: number }) => void,
   *           logg: { handelse(t: string, m: string, d?: any): void } }} b
   */
  constructor(b) {
    super({ key: 'Testrum' });
    this.b = b;
    this.pos = { x: b.plats.x, y: b.plats.y };
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(FARG.golv).fillRect(0, 0, RUM.bredd, RUM.hojd);
    g.fillStyle(FARG.rutnat);
    for (let x = RUM.ruta; x < RUM.bredd; x += RUM.ruta) g.fillRect(x, 0, 1, RUM.hojd);
    for (let y = RUM.ruta; y < RUM.hojd; y += RUM.ruta) g.fillRect(0, y, RUM.bredd, 1);
    g.fillStyle(FARG.kant);
    g.fillRect(0, 0, RUM.bredd, 2).fillRect(0, RUM.hojd - 2, RUM.bredd, 2).fillRect(0, 0, 2, RUM.hojd).fillRect(RUM.bredd - 2, 0, 2, RUM.hojd);

    this.mal = this.add.graphics().setVisible(false);
    this.mal.fillStyle(FARG.mal).fillRect(-3, 0, 7, 1).fillRect(0, -3, 1, 7);

    this.block = this.add.container(0, 0);
    const kropp = this.add.rectangle(0, 0, FIGUR.bredd, FIGUR.hojd, FARG.block).setOrigin(0, 0);
    const topp = this.add.rectangle(0, 0, FIGUR.bredd, 6, FARG.blockTopp).setOrigin(0, 0);
    this.block.add([kropp, topp]);
    this.placera();
    this.b.logg.handelse('scen', 'testrummet startat', this.pos);
  }

  placera() {
    // Hela pixlar: positionen är fötterna (mitten nertill).
    this.block.setPosition(Math.round(this.pos.x - FIGUR.bredd / 2), Math.round(this.pos.y - FIGUR.hojd));
  }

  /** @param {number} _t @param {number} dtMs */
  update(_t, dtMs) {
    const inm = this.b.inmatning;
    inm.hamtaHandlingar(); // engångshandlingar används inte i fas 1
    const gaTill = inm.gaTillMal();
    const ny = steg(this.pos, { riktning: inm.riktning(), gaTill }, dtMs / 1000);
    if (gaTill && !ny.framme) {
      this.mal.setPosition(Math.round(Math.min(RUM.bredd - 4, Math.max(3, gaTill.x))), Math.round(Math.min(RUM.hojd - 4, Math.max(3, gaTill.y)))).setVisible(true);
    } else {
      this.mal.setVisible(false);
      if (ny.framme) inm.rensaGaTill();
    }
    if (ny.x !== this.pos.x || ny.y !== this.pos.y) {
      this.pos = { x: ny.x, y: ny.y };
      this.placera();
      this.b.vidFlytt(this.pos);
    }
  }
}
