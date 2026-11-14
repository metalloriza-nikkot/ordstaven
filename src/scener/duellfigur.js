// @ts-check
// Motståndaren i ordduellen som figur i rummet (beslut 91.5, Stils halmdocka, Stil 14/11 07:20). Reglerna för
// bilderna står i karna/duellfigur.js. Figuren står mittemot hjälten och vänder sig mot honom (en riktning).
//
// Stils tider: tomgång grund_01–02 (minst 400 ms per bild, golvets gränser i 10c), ropar_01–02 när den pratar,
// vid rätt kort forvirrad (ca 300 ms), saken faller och ligger kvar, backar ett steg bort och står i den nya
// utrustningen; vid fel narmare ett steg närmare; vinsten trillar_01–03 (150 ms och sedan stilla) eller
// snurrar_01–02 tre varv och sedan sitter_01.
import { sakI, utrustningEfter, vinstLage } from '../karna/duellfigur.js';

/** Ett steg bort eller närmare, i rumspixlar. */
export const DUELL_STEG = 10;
const TOMGANG_MS = 500;

export class Duellfigur {
  /**
   * @param {any} scen rummet (Rum) @param {string} nyckel atlasen @param {string} figur bildernas början (halmdockan)
   * @param {{ lagen: string[], utrustningar: string[], saker: string[], sakPrefix: string }} info
   * @param {{ x: number, y: number, minY: number, maxY: number }} plats fötterna
   */
  constructor(scen, nyckel, figur, info, plats) {
    this.scen = scen; this.nyckel = nyckel; this.figur = figur; this.info = info;
    this.minY = plats.minY; this.maxY = plats.maxY;
    /** @type {string[]} */ this.tappade = [];
    this.utrustning = 'hel';
    this.lage = 'grund';
    /** @type {any[]} */ this.timrar = [];
    /** @type {any} */ this.loop = null;
    /** @type {symbol | null} */ this.loopId = null;
    /** @type {number | null} dit fötterna är på väg */ this.malY = null;
    /** @type {any[]} */ this.saker = [];
    this.img = scen.add.image(Math.round(plats.x), Math.round(plats.y), nyckel, this.ram('grund', 1)).setOrigin(0.5, 1);
    this.img.fot = this.img.y;
    scen.lagerFigurer.add(this.img);
    this.tomgang();
    scen.smutsig = true;
  }

  /** Bildens namn, i figurens utrustning (finns den inte i det läget, hel). @param {string} lage @param {number} nr */
  ram(lage, nr) {
    const n = `${this.figur}_${lage}_${String(nr).padStart(2, '0')}_`;
    const tex = this.scen.textures.get(this.nyckel);
    return tex.has(n + this.utrustning) ? n + this.utrustning : n + 'hel';
  }

  /** @param {string} lage @param {number} nr */
  visa(lage, nr) { if (this.img.active) { this.img.setFrame(this.ram(lage, nr)); this.scen.smutsig = true; } }

  /**
   * Något som ska hända om ms. Med maste händer det ändå om nästa sak börjar innan (saken trillar och figuren backar
   * också när spelet går vidare snabbare än bilderna, i testläget). @param {number} ms @param {() => void} f @param {boolean} [maste]
   */
  sen(ms, f, maste = false) {
    const post = { f, maste, av: false, t: /** @type {any} */ (null) };
    post.t = this.scen.time.delayedCall(ms, () => { if (post.av) return; post.av = true; this.timrar = this.timrar.filter((x) => x !== post); if (this.img.active) f(); });
    this.timrar.push(post);
  }

  /** Slingan och det som väntar tas bort, och det som måste hända (saken, steget) görs färdigt direkt. */
  stoppa() {
    if (this.loop) this.scen.time.removeEvent(this.loop); this.loop = null; this.loopId = null;
    const kvar = this.timrar; this.timrar = [];
    for (const p of kvar) { if (p.av) continue; p.av = true; this.scen.time.removeEvent(p.t); if (p.maste && this.img.active) p.f(); }
    if (this.malY != null && this.img.active) { this.scen.tweens.killTweensOf(this.img); this.img.y = this.malY; this.img.fot = this.malY; this.malY = null; this.scen.smutsig = true; }
  }

  /** Två bilder växelvis, tills något annat börjar (det som väntar i en följd står kvar). @param {string} lage @param {number} ms */
  slinga(lage, ms) {
    if (this.loop) this.scen.time.removeEvent(this.loop); this.lage = lage;
    let i = 0;
    const min = Symbol(lage); this.loopId = min;
    const steg = () => { if (this.loopId !== min) return; this.visa(lage, 1 + (i++ % 2)); this.loop = this.scen.time.delayedCall(ms, () => { if (this.img.active) steg(); }); };
    steg();
  }

  tomgang() { this.slinga('grund', TOMGANG_MS); }

  /** Munnen öppen medan den ropar (repliken). @param {boolean} pa */
  ropar(pa) { this.stoppa(); if (this.info.lagen.includes('ropar') && pa) this.slinga('ropar', 300); else this.tomgang(); }

  /** Flytta fötterna dy pixlar på ms, med två bilder av läget. @param {string} lage @param {number} dy @param {number} ms */
  flytta(lage, dy, ms) {
    const mal = Math.max(this.minY, Math.min(this.maxY, (this.malY ?? this.img.y) + dy));
    this.malY = mal;
    this.slinga(lage, Math.max(100, ms / 2));
    this.scen.tweens.add({
      targets: this.img, y: mal, duration: ms, ease: 'Sine.easeOut',
      onUpdate: () => { this.img.y = Math.round(this.img.y); this.img.fot = this.img.y; this.scen.smutsig = true; },
      onComplete: () => { this.img.y = mal; this.img.fot = mal; if (this.malY === mal) this.malY = null; this.scen.smutsig = true; },
    });
  }

  /**
   * Rätt kort: förvirrad, saken som texten nämner faller och ligger kvar, och den backar ett steg i den nya utrustningen.
   * @param {string} [handling] reaktionens text @returns {number} hur länge det tar (ms)
   */
  ratt(handling) {
    this.stoppa(); this.slinga('forvirrad', 150);
    const sak = sakI(handling || '', this.info.saker);
    if (sak) this.sen(300, () => this.tappa(sak), true);
    this.sen(300, () => this.flytta('backar', -DUELL_STEG, 450), true);
    this.sen(800, () => this.tomgang());
    return 900;
  }

  /** Saken faller från figuren ned till golvet, snurrar medan den faller och ligger kvar. @param {string} sak */
  tappa(sak) {
    const forsta = `${this.info.sakPrefix}_sak_${sak}_01`, andra = `${this.info.sakPrefix}_sak_${sak}_02`;
    const tex = this.scen.textures.get(this.nyckel);
    this.tappade.push(sak);
    this.utrustning = utrustningEfter(this.tappade, this.info.utrustningar);
    if (!tex.has(forsta)) return;
    const sida = this.saker.length % 2 ? 1 : -1;
    const fran = { x: this.img.x + sida * 4, y: this.img.y - 22 };
    const s = this.scen.add.image(fran.x, fran.y, this.nyckel, forsta).setOrigin(0.5, 1);
    s.fot = this.img.y + 2;
    this.scen.lagerFigurer.add(s);
    this.saker.push(s);
    this.scen.tweens.add({
      targets: s, y: this.img.y + 2, x: fran.x + sida * 8, duration: 400, ease: 'Quad.easeIn',
      onUpdate: () => { s.x = Math.round(s.x); s.y = Math.round(s.y); if (tex.has(andra)) s.setFrame(Math.floor(this.scen.time.now / 100) % 2 ? andra : forsta); this.scen.smutsig = true; },
      onComplete: () => { s.setFrame(forsta); this.scen.smutsig = true; },
    });
  }

  /** Fel kort: den hoppar ett steg närmare. @returns {number} ms */
  fel() {
    this.stoppa();
    this.flytta(this.info.lagen.includes('narmare') ? 'narmare' : 'grund', DUELL_STEG, 400);
    this.sen(450, () => this.tomgang());
    return 500;
  }

  /**
   * Vinsten: trillar baklänges i höet, eller snurrar tre varv och sätter sig, efter texten. Den ligger kvar.
   * @param {string} [handling] @returns {number} ms
   */
  vinst(handling) {
    this.stoppa();
    const v = vinstLage(handling || '', this.info.lagen);
    if (v === 'snurrar') {
      this.lage = 'snurrar';
      for (let i = 0; i < 6; i++) this.sen(150 * i, () => this.visa('snurrar', 1 + (i % 2)));
      if (this.info.lagen.includes('sitter')) this.sen(900, () => { this.lage = 'sitter'; this.visa('sitter', 1); });
      return 1100;
    }
    if (v === 'trillar') {
      this.lage = 'trillar';
      this.visa('trillar', 1); this.sen(150, () => this.visa('trillar', 2)); this.sen(300, () => this.visa('trillar', 3));
      return 700;
    }
    return 0;
  }

  /** Figuren och sakerna tas bort (nästa duell, nytt rum). */
  taBort() {
    this.stoppa();
    this.scen.tweens.killTweensOf([this.img, ...this.saker]);
    for (const s of this.saker) s.destroy();
    this.img.destroy();
    this.saker = [];
    this.scen.smutsig = true;
  }
}
