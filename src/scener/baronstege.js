// @ts-check
// Baronen på repstegen i ordduellen (beslut 106.5, Stils bilder i 10h v0.8). Samma gränssnitt som Duellfigur
// (ropar, ratt, fel, vinst, taBort och img), så att ordduellen i spel.js inte behöver veta vem motståndaren är.
//
// Stils mått: luftskeppet utan stege (112 × 96) med den långa stegen (14 × 96) i (72, 74) i skeppets bild. Stegens
// sidorep i x 1 och 13, och steget var 6:e px (y 3, 9, 15 …). Baronen (24 × 28) läggs med x = stegens x − 5, och
// fötterna står på ett steg i y 27. Ett steg upp är 6 px. Lägen: grund, ropar, forvirrad, klattrar (upp 01 → 02,
// ned 02 → 01) och tappar 01–03, i utrustningen hel, medalj (efter rond 1) och medalj_fjader (efter rond 2).

const STEG = 6;
const STEGE_I_SKEPP = { x: 72, y: 74 };
const TOMGANG_MS = 500;

/** Har atlasen allt som baronen på stegen behöver? @param {any} scen */
export function harBaronStege(scen) {
  if (!scen.textures.exists('baronen')) return false;
  const t = scen.textures.get('baronen');
  return ['luftskepp_utan_stege', 'repstege_lang', 'baronen_stege_grund_hel_01'].every((r) => t.has(r));
}

export class BaronStege {
  /**
   * @param {any} scen rummet (Rum)
   * @param {{ x: number, y: number }} hjalte hjältens fötter: baronens fötter hamnar ca 50 px ovanför, mittemot honom
   * @param {string | null} medalj atlasen med `baron_medalj_01–02` (föremålen vid floden), eller null
   */
  constructor(scen, hjalte, medalj) {
    this.scen = scen; this.medalj = medalj;
    this.utrustning = 'hel';
    this.ratta = 0;
    /** @type {any[]} */ this.timrar = [];
    /** @type {any} */ this.loop = null;
    // steget han står på (0 = översta), så att det finns stege kvar ovanför för tre rätt
    this.steg = 8;
    const stegeX = Math.round(hjalte.x - 7), fotY = Math.round(hjalte.y - 50);
    this.stegeY = fotY - (3 + STEG * this.steg);
    this.stegeX = stegeX;
    this.skepp = { x: stegeX - STEGE_I_SKEPP.x, y: this.stegeY - STEGE_I_SKEPP.y };
    this.c = scen.add.container(0, 0);
    scen.lagerLuft.add(this.c);
    this.skeppImg = scen.add.image(this.skepp.x, this.skepp.y, 'baronen', 'luftskepp_utan_stege').setOrigin(0, 0);
    this.stege = scen.add.image(stegeX, this.stegeY, 'baronen', 'repstege_lang').setOrigin(0, 0);
    this.img = scen.add.image(stegeX - 5, 0, 'baronen', this.ram('grund', 1)).setOrigin(0, 0);
    this.placera();
    this.c.add([this.skeppImg, this.stege, this.img]);
    /** @type {any[]} */ this.saker = [];
    this.tomgang();
    scen.smutsig = true;
  }

  /** @param {string} lage @param {number} nr */
  ram(lage, nr) {
    const t = this.scen.textures.get('baronen');
    const n = `baronen_stege_${lage}_${this.utrustning}_${String(nr).padStart(2, '0')}`;
    return t.has(n) ? n : `baronen_stege_${lage}_hel_${String(nr).padStart(2, '0')}`;
  }

  /** Bildens övre kant när fötterna står på steget. */
  yFor(steg = this.steg) { return this.stegeY + 3 + STEG * steg - 27; }

  placera() { this.img.y = this.yFor(); this.img.fot = this.img.y + 28; this.scen.smutsig = true; }

  /** @param {string} lage @param {number} nr */
  visa(lage, nr) { if (this.img.active) { this.img.setFrame(this.ram(lage, nr)); this.scen.smutsig = true; } }

  /** @param {number} ms @param {() => void} f */
  sen(ms, f) { const t = this.scen.time.delayedCall(ms, () => { this.timrar = this.timrar.filter((x) => x !== t); if (this.img.active) f(); }); this.timrar.push(t); }

  stoppa() {
    if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null;
    for (const t of this.timrar) this.scen.time.removeEvent(t); this.timrar = [];
    this.scen.tweens.killTweensOf(this.img); this.placera();
  }

  /** @param {string} lage @param {number} ms */
  slinga(lage, ms) {
    if (this.loop) this.scen.time.removeEvent(this.loop);
    let i = 0;
    const steg = () => { this.visa(lage, 1 + (i++ % 2)); this.loop = this.scen.time.delayedCall(ms, () => { if (this.img.active) steg(); }); };
    steg();
  }

  tomgang() { this.slinga('grund', TOMGANG_MS); }

  /** Har Stil ritat ett läge (paraplyet, 109.7)? @param {string} namn hela bildens namn */
  har(namn) { return this.scen.textures.get('baronen').has(namn); }

  /**
   * När han har ropat petar han ned mot hjälten med det stängda paraplyet, en gång per kort (109.7, Stils
   * baronen_stege_petar_<utrustning>_01–02). Utan bilderna står han i tomgång som förut. @param {boolean} pa
   */
  ropar(pa) {
    this.stoppa();
    if (pa) { this.slinga('ropar', 300); return; }
    if (!this.har('baronen_stege_petar_hel_01')) { this.tomgang(); return; }
    this.visa('petar', 1); this.sen(250, () => this.visa('petar', 2)); this.sen(650, () => this.visa('petar', 1)); this.sen(900, () => this.tomgang());
  }

  /** Ett steg upp (−1) eller ned (+1), med händerna en i taget. @param {number} dir */
  klattra(dir) {
    this.steg = Math.max(0, Math.min(14, this.steg + dir));
    const ordning = dir < 0 ? [1, 2] : [2, 1];
    this.visa('klattrar', ordning[0]);
    this.sen(150, () => this.visa('klattrar', ordning[1]));
    this.scen.tweens.add({ targets: this.img, y: this.yFor(), duration: 300, onUpdate: () => { this.img.y = Math.round(this.img.y); this.scen.smutsig = true; }, onComplete: () => this.placera() });
  }

  /** En medalj faller från honom ned i sanden (eller vattnet) och ligger kvar. */
  tappaMedalj() {
    if (!this.medalj) return;
    const nyckel = this.medalj;
    const s = this.scen.add.image(this.img.x + 14, this.img.y + 12, nyckel, 'baron_medalj_01').setOrigin(0.5, 1);
    this.c.add(s); this.saker.push(s);
    this.scen.tweens.add({
      targets: s, y: this.img.y + 60, x: s.x + 6, duration: 600, ease: 'Quad.easeIn',
      onUpdate: () => { s.x = Math.round(s.x); s.y = Math.round(s.y); s.setFrame(Math.floor(this.scen.time.now / 100) % 2 ? 'baron_medalj_02' : 'baron_medalj_01'); this.scen.smutsig = true; },
      onComplete: () => { s.setFrame('baron_medalj_01'); this.scen.smutsig = true; },
    });
  }

  /** Rätt kort: förvirrad, en medalj eller fjädern trillar, och han klättrar själv ett steg upp. @returns {number} ms */
  ratt() {
    this.stoppa();
    // 109.7: SKÖLD parerar paraplyet, som vänds ut och in (baronen_stege_utochin_<utrustning>_01), och han blir förvirrad
    if (this.har('baronen_stege_utochin_hel_01')) { this.scen.skoldParerar?.(); this.visa('utochin', 1); this.sen(350, () => this.slinga('forvirrad', 200)); }
    else this.slinga('forvirrad', 200);
    this.ratta++;
    this.sen(300, () => { this.tappaMedalj(); this.utrustning = this.ratta >= 2 ? 'medalj_fjader' : 'medalj'; });
    this.sen(500, () => { if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null; this.klattra(-1); });
    this.sen(900, () => this.tomgang());
    return 1000;
  }

  /** Fel kort: ett steg ned. @returns {number} ms */
  fel() { this.stoppa(); this.klattra(1); this.sen(450, () => this.tomgang()); return 500; }

  /**
   * Sista kortet: han tappar greppet, och repstegen rullas upp med honom i gondolen, där han landar på huvudet.
   * Luftskeppet står kvar tills segern (ordduell_seger) låter det fara. @returns {number} ms
   */
  vinst() {
    this.stoppa();
    this.visa('tappar', 1); this.sen(200, () => this.visa('tappar', 2)); this.sen(400, () => this.visa('tappar', 3));
    const t = this.scen.textures.get('baronen');
    // 109.7: han hänger i paraplyet som fallskärm (baronen_paraply_fallskarm_01–02) medan stegen rullas upp
    if (t.has('baronen_paraply_fallskarm_01')) {
      let n = 0;
      const dinglar = () => { if (!this.img.active || !this.img.visible) return; this.img.setFrame(`baronen_paraply_fallskarm_0${1 + (n++ % 2)}`); this.scen.smutsig = true; this.sen(300, dinglar); };
      this.sen(600, dinglar);
    }
    // stegen rullas upp nedifrån, och baronen följer med upp
    const rull = { h: 96 };
    this.sen(600, () => this.scen.tweens.add({
      targets: rull, h: 6, duration: 900, ease: 'Quad.easeIn',
      onUpdate: () => {
        const h = Math.round(rull.h);
        this.stege.setCrop(0, 0, 14, h);
        this.img.y = Math.min(this.img.y, this.stegeY + h - 28); this.scen.smutsig = true;
      },
      onComplete: () => {
        this.img.setVisible(false); this.stege.setVisible(false);
        if (t.has('luftskepp_baron_landar_01')) {
          let n = 0;
          this.skeppImg.setFrame('luftskepp_baron_landar_01');
          const sparkar = () => { this.skeppImg.setFrame(`luftskepp_baron_landar_0${1 + (n++ % 2)}`); this.scen.smutsig = true; this.loop = this.scen.time.delayedCall(250, () => { if (this.skeppImg.active) sparkar(); }); };
          sparkar();
        }
        this.scen.smutsig = true;
      },
    }));
    return 1600;
  }

  /**
   * Segern (ordduell_seger): luftskeppet far snett uppåt ut ur bild, och Herr Skata flaxar efter. @returns {number} ms
   */
  far() {
    this.stoppa();
    const t = this.scen.textures.get('baronen'), k = this.scen.kamera;
    const glider = t.has('luftskepp_glider_01');
    if (glider) {
      let n = 0;
      const vaxla = () => { this.skeppImg.setFrame(`luftskepp_glider_0${1 + (n++ % 2)}`); this.scen.smutsig = true; this.loop = this.scen.time.delayedCall(300, () => { if (this.skeppImg.active) vaxla(); }); };
      vaxla();
    }
    this.scen.tweens.add({ targets: this.skeppImg, x: k.x + 340, y: this.skepp.y - 40, duration: 1800, delay: 200, ease: 'Sine.easeIn', onUpdate: () => { this.skeppImg.x = Math.round(this.skeppImg.x); this.skeppImg.y = Math.round(this.skeppImg.y); this.scen.smutsig = true; } });
    if (this.scen.textures.exists('herr_skata') && this.scen.textures.get('herr_skata').has('herr_skata_flyga_hoger_01')) {
      const s = this.scen.add.image(this.skepp.x + 30, this.skepp.y + 80, 'herr_skata', 'herr_skata_flyga_hoger_01').setOrigin(0.5, 1);
      this.c.add(s);
      this.scen.tweens.add({ targets: s, x: k.x + 330, y: this.skepp.y - 10, duration: 1800, delay: 500, onUpdate: () => { s.x = Math.round(s.x); s.y = Math.round(s.y); s.setFrame(Math.floor(this.scen.time.now / 150) % 2 ? 'herr_skata_flyga_hoger_02' : 'herr_skata_flyga_hoger_01'); this.scen.smutsig = true; } });
    }
    return 2400;
  }

  taBort() {
    this.stoppa();
    this.scen.tweens.killTweensOf([this.img, this.skeppImg, this.stege, ...this.c.list]);
    this.c.destroy(true);
    this.scen.smutsig = true;
  }
}
