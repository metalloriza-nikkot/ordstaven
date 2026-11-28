// @ts-check
// Baronen på marken i fäktningen (kapitel 5, beslut 129.5 och 132.4, manus 22 Till Teknik punkt 2). Samma
// gränssnitt som Duellfigur och BaronStege (ropar, ratt, fel, vinst, taBort och img), så att ordduellen i spel.js
// inte behöver veta vem motståndaren är.
//
// Med Stils bilder (lev139, LASMIG_139 §1) står han öster om hjälten, med ansiktet åt väster mot honom och ryggen mot
// skylten, och hjälten står vänd åt höger. Bilderna är 48 × 32 med fötterna på nederkantens mitt.
// - start: honnör och bugning (baronen_faktning_bugar_<h>_01–02), och hjälten bugar tillbaka (hjalte_bugar_<h>_01–02);
// - när han skryter: utfall (baronen_faktning_utfall_<h>_01–02) eller snurr med paraplyet (_snurrar_<h>_01–03), ett
//   av dem per rond;
// - rätt kort: hjälten parerar (hjalte_parerar_<h>_01–02 med pling), paraplyet studsar och han backar ett steg mot
//   skylten (baronen_backar_<h>_01–02);
// - fel kort: piruett och pose (baronen_poserar_<h>_01–03), och ett steg fram under den sista;
// - segern: paraplyet fäller ihop sig över honom (paraplyet_faller_ihop_<h>_01–03, plopp på den sista), och han står
//   kvar så tills duellen tas bort. Mellanscenen efter (baronen_bugar) är kravlar ut och bugar med hatten på sned.
// - Herr Skata sitter på skylten som domare (herr_skata_domare_<h>_01–02) så länge duellen pågår.
// Utan Stils bilder (en äldre atlas) står han ovanför hjälten i sin gångbild, med ett paraply i gråbox.

const STEG_BAK = 10;
const STEG_FRAM = 6;
const TOMGANG_MS = 500;
const AVSTAND = 40;

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
    /** @type {any} gråboxens paraply när Stils bilder saknas */
    this.paraply = null;
    /** @type {any} Herr Skata som domare på skylten */
    this.skata = null;
    /** @type {any} */ this.skataLoop = null;
    /** har han kravlat ut och bugat (då står rummets baron kvar med hatten på sned) */
    this.bugat = false;
    /** skryten växlar mellan utfall och snurr, en sort per rond */
    this.skryt = 0;
    // Stils fäktbilder (lev139): från sidan, öster om hjälten
    this.sida = this.har('baronen_faktning_utfall_vanster_01');
    const bredd = scen.storlek?.bredd ?? 320;
    if (this.sida) {
      this.minFot = 0;
      this.fot = Math.round(hjalte.y);
      // tre steg bakåt ska rymmas i rummet
      this.x = Math.min(bredd - 24 - 3 * STEG_BAK, Math.round(hjalte.x + AVSTAND));
      this.img = scen.add.image(this.x, this.fot, 'baronen', 'baronen_faktning_bugar_vanster_01').setOrigin(0.5, 1);
    } else {
      this.minFot = minY + 24;
      // fötterna ca 40 px ovanför hjälten, men aldrig så högt att tre steg bakåt hamnar utanför rummet
      this.fot = Math.max(this.minFot + 3 * STEG_BAK, Math.round(hjalte.y - 40));
      this.x = Math.round(hjalte.x);
      this.img = scen.add.image(this.x, this.fot, 'baronen', this.ram('grund', 1)).setOrigin(0.5, 1);
    }
    this.img.fot = this.fot;
    scen.lagerFigurer.add(this.img);
    // rummets egen baron (baronen_molnkant) göms medan fäktningen pågår, så att det aldrig står två
    /** @type {any} */
    this.rumsBaron = this.sida ? [...(scen.ritade?.entries?.() ?? [])].find(([id, r]) => id.startsWith('baronen') && r?.visible)?.[1] ?? null : null;
    this.rumsBaron?.setVisible(false);
    if (this.sida) {
      // honnör och bugning, och hjälten bugar tillbaka, innan första skrytet
      this.visaNamn('baronen_faktning_bugar_vanster_01');
      this.sen(350, () => this.visaNamn('baronen_faktning_bugar_vanster_02'));
      this.hjaltePose('hjalte_bugar_hoger_01', 0); this.hjaltePose('hjalte_bugar_hoger_02', 350); this.hjaltePose(null, 900);
      this.sen(900, () => this.tomgang());
      this.domare();
      scen.regiLogg?.push('faktning_borjar');
    } else this.tomgang();
    scen.smutsig = true;
  }

  /** @param {string} namn */
  har(namn) { return this.scen.textures.exists('baronen') && this.scen.textures.get('baronen').has(namn); }

  /** Gångbilden när Stils fäktbilder saknas. @param {string} lage @param {number} nr */
  ram(lage, nr) {
    const n = `baronen_faktar_${lage}_${String(nr).padStart(2, '0')}`;
    if (this.har(n)) return n;
    return `baronen_ga_ner_0${lage === 'fram' || lage === 'backar' ? 1 + (nr % 2) * 2 : 1}`;
  }

  /** @param {string} namn */
  visaNamn(namn) { if (this.img.active && this.har(namn)) { this.img.setFrame(namn); this.scen.smutsig = true; } }

  /** @param {string} lage @param {number} nr */
  visa(lage, nr) { if (this.img.active) { this.img.setFrame(this.ram(lage, nr)); this.scen.smutsig = true; } }

  /** Hjältens pose om ms (null = som vanligt). @param {string | null} bild @param {number} ms */
  hjaltePose(bild, ms) {
    const t = this.scen.time.delayedCall(ms, () => { this.timrar = this.timrar.filter((x) => x !== t); this.scen.sattPose?.(bild); });
    this.timrar.push(t);
  }

  /** @param {number} ms @param {() => void} f */
  sen(ms, f) { const t = this.scen.time.delayedCall(ms, () => { this.timrar = this.timrar.filter((x) => x !== t); if (this.img.active) f(); }); this.timrar.push(t); }

  /** Herr Skata sitter på skylten och lyfter en vinge som en domare (lev139). */
  domare() {
    const s = this.scen.ruta?.('skylt_baronens_dal');
    const tex = this.scen.textures.exists('herr_skata') ? this.scen.textures.get('herr_skata') : null;
    if (!s || !tex?.has('herr_skata_domare_vanster_01')) return;
    this.skata = this.scen.add.image(Math.round(s.x + s.b / 2), s.y, 'herr_skata', 'herr_skata_domare_vanster_01').setOrigin(0.5, 1);
    this.skata.fot = s.y + s.h + 1;
    this.scen.lagerFigurer.add(this.skata);
    let i = 0;
    const steg = () => {
      if (!this.skata?.active) return;
      this.skata.setFrame(`herr_skata_domare_vanster_0${1 + (i++ % 2)}`); this.scen.smutsig = true;
      this.skataLoop = this.scen.time.delayedCall(i % 2 ? 900 : 1400, steg);
    };
    steg();
  }

  stoppa() {
    if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null;
    for (const t of this.timrar) this.scen.time.removeEvent(t); this.timrar = [];
    this.scen.tweens.killTweensOf(this.img);
    if (this.sida) { this.img.x = this.x; } else this.img.y = this.fot;
    this.img.fot = this.fot;
    this.scen.sattPose?.(null);
  }

  /** @param {string} lage @param {number} ms */
  slinga(lage, ms) {
    if (this.loop) this.scen.time.removeEvent(this.loop);
    let i = 0;
    const steg = () => { this.visa(lage, 1 + (i++ % 2)); this.loop = this.scen.time.delayedCall(ms, () => { if (this.img.active) steg(); }); };
    steg();
  }

  /** En följd av Stils bilder som går runt. @param {string[]} namn @param {number} ms */
  slingaNamn(namn, ms) {
    if (this.loop) this.scen.time.removeEvent(this.loop);
    let i = 0;
    const steg = () => { this.visaNamn(namn[i++ % namn.length]); this.loop = this.scen.time.delayedCall(ms, () => { if (this.img.active) steg(); }); };
    steg();
  }

  tomgang() {
    if (this.sida) { if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null; this.visaNamn('baronen_faktning_utfall_vanster_01'); return; }
    this.slinga('grund', TOMGANG_MS);
  }

  /** Han skryter: utfall eller snurr med paraplyet medan repliken står. @param {boolean} pa */
  ropar(pa) {
    this.stoppa();
    if (!pa) { this.tomgang(); return; }
    if (this.sida) {
      const snurr = this.skryt++ % 2 === 1;
      if (snurr) this.slingaNamn(['baronen_faktning_snurrar_vanster_01', 'baronen_faktning_snurrar_vanster_02', 'baronen_faktning_snurrar_vanster_03'], 180);
      else this.slingaNamn(['baronen_faktning_utfall_vanster_01', 'baronen_faktning_utfall_vanster_02'], 300);
      this.scen.regiLogg?.push(snurr ? 'baronen snurrar' : 'baronen utfall');
      return;
    }
    this.slinga('ropar', 250); this.scen.regiLogg?.push('baronen ropar');
  }

  /**
   * Han går till ett nytt ställe (x från sidan, y annars). Stället gäller direkt, så att en replik som avbryter
   * rörelsen (stoppa) ställer honom där han skulle hamna. @param {number} till @param {number} ms @param {number} [vanta]
   */
  ga(till, ms, vanta = 0) {
    if (this.sida) {
      this.x = till;
      this.scen.tweens.add({ targets: this.img, x: till, duration: ms, delay: vanta, ease: 'Sine.easeOut', onUpdate: () => { this.img.x = Math.round(this.img.x); this.scen.smutsig = true; } });
      return;
    }
    this.fot = till;
    this.scen.tweens.add({ targets: this.img, y: till, duration: ms, ease: 'Sine.easeOut', onUpdate: () => { this.img.fot = this.img.y; this.scen.smutsig = true; } });
  }

  /** Rätt kort: hjälten parerar, paraplyet studsar och han backar ett steg mot skylten. @returns {number} hur länge det tar */
  ratt() {
    this.stoppa();
    if (this.sida) {
      const bredd = this.scen.storlek?.bredd ?? 320;
      this.hjaltePose('hjalte_parerar_hoger_01', 0); this.hjaltePose('hjalte_parerar_hoger_02', 200); this.hjaltePose(null, 800);
      this.scen.b?.ljud?.spela('pling');
      this.visaNamn('baronen_backar_vanster_01');
      this.sen(250, () => this.visaNamn('baronen_backar_vanster_02'));
      this.ga(Math.min(bredd - 24, this.x + STEG_BAK), 400, 250);
      this.scen.regiLogg?.push('baronen_backar');
      this.sen(800, () => this.tomgang());
      return 900;
    }
    this.slinga('backar', 150);
    this.ga(Math.max(this.minFot, this.fot - STEG_BAK), 450);
    this.scen.regiLogg?.push('baronen_backar');
    this.sen(600, () => this.tomgang());
    return 700;
  }

  /** Fel kort: piruett, pose och ett steg fram. Ofarligt. @returns {number} */
  fel() {
    this.stoppa();
    if (this.sida) {
      this.visaNamn('baronen_poserar_vanster_01');
      this.sen(250, () => this.visaNamn('baronen_poserar_vanster_02'));
      this.sen(500, () => this.visaNamn('baronen_poserar_vanster_03'));
      this.ga(this.x - STEG_FRAM, 300, 500);
      this.scen.regiLogg?.push('baronen_poserar');
      this.sen(1100, () => this.tomgang());
      return 1200;
    }
    this.slinga('fram', 150);
    this.ga(this.fot + STEG_FRAM, 300);
    this.scen.regiLogg?.push('baronen tar ett steg fram');
    this.sen(500, () => this.tomgang());
    return 600;
  }

  /** Segern: paraplyet fäller ihop sig över honom (Stils bilder), eller vänds ut och in i gråbox. @returns {number} */
  vinst() {
    this.stoppa();
    if (this.sida) {
      this.hjaltePose('hjalte_parerar_hoger_01', 0); this.hjaltePose('hjalte_parerar_hoger_02', 200); this.hjaltePose(null, 700);
      this.visaNamn('paraplyet_faller_ihop_vanster_01');
      this.sen(300, () => this.visaNamn('paraplyet_faller_ihop_vanster_02'));
      this.sen(600, () => { this.visaNamn('paraplyet_faller_ihop_vanster_03'); this.scen.b?.ljud?.spela('plopp'); });
      this.scen.regiLogg?.push('paraplyet_faller_ihop');
      this.scen.smutsig = true;
      return 1400;
    }
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

  /** Efter segern (mellanscenen baronen_bugar): han kravlar ut med hatten på sned och bugar ändå. @returns {number} */
  kravlarUt() {
    if (!this.sida) return 0;
    this.stoppa();
    this.visaNamn('baronen_kravlar_ut_vanster_01');
    this.sen(400, () => this.visaNamn('baronen_kravlar_ut_vanster_02'));
    this.sen(900, () => this.visaNamn('baronen_bugar_sned_vanster_01'));
    this.scen.regiLogg?.push('baronen_bugar');
    this.bugat = true;
    return 1800;
  }

  taBort() {
    this.stoppa();
    this.paraply?.destroy(); this.paraply = null;
    if (this.skataLoop) this.scen.time.removeEvent(this.skataLoop); this.skataLoop = null;
    this.skata?.destroy(); this.skata = null;
    // rummets baron tar över där fäktningens stod (fötterna på samma ställe), med hatten på sned om han har bugat
    const r = this.rumsBaron;
    if (r?.active) {
      r.setPosition(Math.round(this.img.x + (r.originX - 0.5) * r.displayWidth), Math.round(this.img.y + (r.originY - 1) * r.displayHeight));
      if (r.fot !== undefined) r.fot = this.img.y;
      if (this.bugat && r.texture?.key === 'baronen' && this.har('baronen_bugar_sned_vanster_01')) r.setFrame('baronen_bugar_sned_vanster_01');
      r.setVisible(true);
    }
    this.rumsBaron = null;
    this.img.destroy();
    this.scen.smutsig = true;
  }
}
