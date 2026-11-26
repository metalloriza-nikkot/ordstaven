// @ts-check
// Baronen på marken i fäktningen (kapitel 5, beslut 129.5 och 132.4, manus 22 Till Teknik punkt 2). Samma
// gränssnitt som Duellfigur och BaronStege (ropar, ratt, fel, vinst, taBort och img), så att ordduellen i spel.js
// inte behöver veta vem motståndaren är.
//
// Han står mittemot hjälten, ca 40 px ovanför, med ryggen mot skylten. Rätt kort får honom att backa ett steg mot
// skylten (baronen_backar), fel kort får honom att ta ett steg fram och skratta. Segern är paraplyet som vänds ut och
// in, med duellens segerljud (128.10.4). Stils bilder för fäktningen finns inte än: tills dess är han sin gångbild
// (baronen_ga_ner_*) och paraplyet en gråbox. När Stil levererar `baronen_faktar_<läge>_01–02` (grund, ropar, backar,
// fram, utochin) används de av sig själva.

const STEG_BAK = 10;
const STEG_FRAM = 6;
const TOMGANG_MS = 500;

export class BaronMark {
  /**
   * @param {any} scen rummet (Rum)
   * @param {{ x: number, y: number }} hjalte hjältens fötter
   * @param {number} [minY] så högt han kan backa (rummets övre kant)
   */
  constructor(scen, hjalte, minY = 24) {
    this.scen = scen;
    /** fäktningens figur (testerna ser vilken figur duellen har) */
    this.slag = 'faktning';
    /** @type {any[]} */ this.timrar = [];
    /** @type {any} */ this.loop = null;
    this.minFot = minY + 24;
    // fötterna ca 40 px ovanför hjälten, men aldrig så högt att tre steg bakåt hamnar utanför rummet
    this.fot = Math.max(this.minFot + 3 * STEG_BAK, Math.round(hjalte.y - 40));
    this.x = Math.round(hjalte.x);
    this.img = scen.add.image(this.x, this.fot, 'baronen', this.ram('grund', 1)).setOrigin(0.5, 1);
    this.img.fot = this.fot;
    scen.lagerFigurer.add(this.img);
    /** @type {any} gråboxens paraply tills Stil har ritat det */
    this.paraply = null;
    this.tomgang();
    scen.smutsig = true;
  }

  /** @param {string} namn */
  har(namn) { return this.scen.textures.get('baronen').has(namn); }

  /** Stils fäktbild om den finns, annars gångbilden. @param {string} lage @param {number} nr */
  ram(lage, nr) {
    const n = `baronen_faktar_${lage}_${String(nr).padStart(2, '0')}`;
    if (this.scen.textures.exists('baronen') && this.scen.textures.get('baronen').has(n)) return n;
    return `baronen_ga_ner_0${lage === 'fram' || lage === 'backar' ? 1 + (nr % 2) * 2 : 1}`;
  }

  /** @param {string} lage @param {number} nr */
  visa(lage, nr) { if (this.img.active) { this.img.setFrame(this.ram(lage, nr)); this.scen.smutsig = true; } }

  /** @param {number} ms @param {() => void} f */
  sen(ms, f) { const t = this.scen.time.delayedCall(ms, () => { this.timrar = this.timrar.filter((x) => x !== t); if (this.img.active) f(); }); this.timrar.push(t); }

  stoppa() {
    if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null;
    for (const t of this.timrar) this.scen.time.removeEvent(t); this.timrar = [];
    this.scen.tweens.killTweensOf(this.img);
    this.img.y = this.fot; this.img.fot = this.fot;
  }

  /** @param {string} lage @param {number} ms */
  slinga(lage, ms) {
    if (this.loop) this.scen.time.removeEvent(this.loop);
    let i = 0;
    const steg = () => { this.visa(lage, 1 + (i++ % 2)); this.loop = this.scen.time.delayedCall(ms, () => { if (this.img.active) steg(); }); };
    steg();
  }

  tomgang() { this.slinga('grund', TOMGANG_MS); }

  /** Han ropar: en liten studs medan repliken står. @param {boolean} pa */
  ropar(pa) {
    this.stoppa();
    if (pa) { this.slinga('ropar', 250); this.scen.regiLogg?.push('baronen ropar'); } else this.tomgang();
  }

  /** @param {number} till fötternas nya y @param {number} ms */
  ga(till, ms) {
    this.fot = till;
    this.scen.tweens.add({ targets: this.img, y: till, duration: ms, ease: 'Sine.easeOut', onUpdate: () => { this.img.fot = this.img.y; this.scen.smutsig = true; } });
  }

  /** Rätt kort: han backar ett steg mot skylten. @returns {number} hur länge det tar */
  ratt() {
    this.stoppa();
    this.slinga('backar', 150);
    this.ga(Math.max(this.minFot, this.fot - STEG_BAK), 450);
    this.scen.regiLogg?.push('baronen_backar');
    this.sen(600, () => this.tomgang());
    return 700;
  }

  /** Fel kort: ett steg fram och ett skratt. Ofarligt. @returns {number} */
  fel() {
    this.stoppa();
    this.slinga('fram', 150);
    this.ga(this.fot + STEG_FRAM, 300);
    this.scen.regiLogg?.push('baronen tar ett steg fram');
    this.sen(500, () => this.tomgang());
    return 600;
  }

  /** Segern: paraplyet vänds ut och in (Stils bild, eller en gråbox i orange och vitt). @returns {number} */
  vinst() {
    this.stoppa();
    if (this.har('baronen_faktar_utochin_01')) this.slinga('utochin', 200);
    else {
      const g = this.scen.add.graphics();
      g.fillStyle(0xf28c28, 1).fillTriangle(this.x + 4, this.fot - 30, this.x + 18, this.fot - 30, this.x + 11, this.fot - 18);
      g.fillStyle(0xffffff, 1).fillRect(this.x + 10, this.fot - 30, 2, 12);
      this.scen.lagerFigurer.add(g); this.paraply = g;
    }
    this.scen.b?.ljud?.spela('plopp');
    this.scen.regiLogg?.push('paraplyet ut och in');
    this.scen.smutsig = true;
    return 1200;
  }

  taBort() {
    this.stoppa();
    this.paraply?.destroy(); this.paraply = null;
    this.img.destroy();
    this.scen.smutsig = true;
  }
}
