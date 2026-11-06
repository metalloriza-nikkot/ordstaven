// @ts-check
// Liv i skogen (beslut 26.3, 10e *Liv i skogen*, 10b): saker som rör sig utan att man kan göra något med dem.
// Kartans objekt med typen `omgivning` säger var saken bor (rutan) och vad den är (`vad`: fagel, lov, fjaril, ekorre).
// Reglerna (10e och golvets gränser i 45):
// - bara läge och bildruta ändras, högst fyra gånger per sekund (250 ms), och ingen glidande rörelse;
// - allt står stilla när han läser (världen är fryst), och bara det som syns i kameran rör sig;
// - långa och ojämna pauser, slumpade mellan ca 8 och 20 sekunder;
// - inget går att trycka på: ingen glimt, ingen markering, inget ljud. Går han mot en fågel flyger den.
// Inget här är Phasers tweens: varje sak flyttas i steg av sig själv i `steg()`, som Rum anropar i varje bildruta.

const STEG_MS = 250;
const paus = () => 8000 + Math.random() * 12000;

/**
 * @typedef {{ vad: string, x: number, y: number, b: number, h: number }} Omgivning
 * @typedef {{ o: Omgivning, img: any, lage: string, nasta: number, t: number, i: number, x: number, y: number, dx: number }} Sak
 */

export class Livet {
  /** @param {Phaser.Scene} scen @param {Phaser.GameObjects.Container} lager */
  constructor(scen, lager) {
    this.scen = scen;
    this.lager = lager;
    /** @type {Sak[]} */
    this.saker = [];
    this.senast = 0;
  }

  /** Bygg rummets saker (ett nytt rum). @param {Omgivning[]} lista */
  bygg(lista) {
    this.rensa();
    const tex = this.scen.textures;
    if (!tex.exists('omgivning')) return;
    for (const o of lista) {
      const ram = o.vad === 'fagel' ? 'fagel_sitta_01' : o.vad === 'fjaril' ? 'fjaril_01' : o.vad === 'lov' ? 'lov_gron_01' : 'ekorre_titta_hoger_01';
      const nyckel = o.vad === 'ekorre' ? 'djur' : 'omgivning';
      if (!tex.exists(nyckel) || !tex.get(nyckel).has(ram)) continue;
      const x = Math.round(o.x + o.b / 2), y = Math.round(o.y + o.h / 2);
      const img = this.scen.add.image(x, y, nyckel, ram).setOrigin(0.5, 1);
      // löven och ekorren syns bara när de rör sig, fåglarna och fjärilen sitter där de bor
      img.setVisible(o.vad === 'fagel' || o.vad === 'fjaril');
      this.lager.add(img);
      this.saker.push({ o, img, lage: 'vilar', nasta: performance.now() + 1000 + Math.random() * 4000, t: 0, i: 0, x, y, dx: 1 });
    }
  }

  rensa() { for (const s of this.saker) s.img.destroy(); this.saker = []; }

  /**
   * Ett steg (högst var 250:e ms). @param {{ x: number, y: number }} hjalte hjältens fötter
   * @param {boolean} stilla världen är fryst (han läser) @param {{ x: number, y: number, right: number, bottom: number }} vy kamerans ruta
   * @returns {boolean} om något ändrades (världen ritas om)
   */
  steg(hjalte, stilla, vy) {
    const nu = performance.now();
    if (stilla || !this.saker.length || nu - this.senast < STEG_MS) return false;
    this.senast = nu;
    let andrat = false;
    for (const s of this.saker) {
      const { o } = s;
      const syns = o.x < vy.right && o.x + o.b > vy.x && o.y < vy.bottom && o.y + o.h > vy.y;
      if (!syns && s.lage === 'vilar') continue;
      const fore = `${s.img.x},${s.img.y},${s.img.frame.name},${s.img.visible}`;
      if (o.vad === 'fagel') this.fagel(s, hjalte, nu);
      else if (o.vad === 'fjaril') this.fjaril(s, nu);
      else if (o.vad === 'lov') this.lov(s, nu);
      else if (o.vad === 'ekorre') this.ekorre(s, nu);
      if (`${s.img.x},${s.img.y},${s.img.frame.name},${s.img.visible}` !== fore) andrat = true;
    }
    return andrat;
  }

  /** Småfågeln: sitter och pickar, flyger upp ur bild när hjälten kommer inom ca tre rutor och kommer tillbaka efter ca 15 s. @param {Sak} s @param {{ x: number, y: number }} h @param {number} nu */
  fagel(s, h, nu) {
    const nara = Math.hypot(h.x - s.x, h.y - s.y) < 48;
    if (s.lage === 'vilar' || s.lage === 'pickar') {
      if (nara) { s.lage = 'flyger'; s.t = 0; s.img.setFrame('fagel_flyga_01'); return; }
      if (s.lage === 'vilar' && nu >= s.nasta) { s.lage = 'pickar'; s.t = 0; }
      if (s.lage === 'pickar') {
        s.t++;
        s.img.setFrame(s.t % 2 ? 'fagel_sitta_02' : 'fagel_sitta_01');
        if (s.t >= 6) { s.lage = 'vilar'; s.img.setFrame('fagel_sitta_01'); s.nasta = nu + paus(); }
      }
      return;
    }
    if (s.lage === 'flyger') {
      s.t++;
      s.img.setFrame(s.t % 2 ? 'fagel_flyga_02' : 'fagel_flyga_01');
      s.img.setPosition(s.img.x + 6, s.img.y - 8);
      if (s.t >= 8) { s.lage = 'borta'; s.img.setVisible(false); s.nasta = nu + 15000; }
      return;
    }
    // borta: kommer tillbaka när hjälten har gått
    if (nu >= s.nasta && !nara) { s.lage = 'vilar'; s.img.setPosition(s.x, s.y).setFrame('fagel_sitta_01').setVisible(true); s.nasta = nu + paus(); }
  }

  /** Fjärilen: fladdrar långsamt inom sin ruta, en stund i taget. @param {Sak} s @param {number} nu */
  fjaril(s, nu) {
    if (s.lage === 'vilar') {
      if (nu < s.nasta) return;
      s.lage = 'fladdrar'; s.t = 0;
    }
    s.t++;
    s.img.setFrame(s.t % 2 ? 'fjaril_02' : 'fjaril_01');
    const { o } = s;
    // ett litet hopp åt slumpat håll, inom rutan (ett läge per steg, ingen glidning)
    const nx = Math.max(o.x + 4, Math.min(o.x + o.b - 4, s.img.x + Math.round((Math.random() - 0.5) * 8)));
    const ny = Math.max(o.y + 6, Math.min(o.y + o.h, s.img.y + Math.round((Math.random() - 0.55) * 6)));
    s.img.setPosition(nx, ny);
    if (s.t >= 16) { s.lage = 'vilar'; s.img.setFrame('fjaril_01'); s.nasta = nu + paus() / 2; }
  }

  /** Ett löv som faller: seglar ned i sicksack på ca 2,5 s, ligger kvar ca 2 s och försvinner. @param {Sak} s @param {number} nu */
  lov(s, nu) {
    const { o } = s;
    if (s.lage === 'vilar') {
      if (nu < s.nasta) return;
      const farg = ['lov_gron', 'lov_gron2', 'lov_gulgron'][Math.floor(Math.random() * 3)];
      s.lage = 'faller'; s.t = 0; s.i = 0; /** @type {any} */ (s).farg = farg;
      s.img.setPosition(o.x + Math.round(Math.random() * o.b), o.y).setFrame(`${farg}_01`).setVisible(true);
      return;
    }
    const farg = /** @type {any} */ (s).farg;
    if (s.lage === 'faller') {
      s.t++;
      s.img.setFrame(`${farg}_0${1 + (s.t % 2)}`);
      s.img.setPosition(s.img.x + (s.t % 4 < 2 ? 3 : -3), s.img.y + Math.max(2, Math.round(o.h / 10)));
      if (s.t >= 10) { s.lage = 'ligger'; s.i = 0; }
      return;
    }
    if (s.lage === 'ligger') { s.i++; if (s.i >= 8) { s.lage = 'vilar'; s.img.setVisible(false); s.nasta = nu + paus(); } }
  }

  /** Ekorren längs trädridån: tittar fram, springer en bit längs kanten och försvinner bakom nästa stam. @param {Sak} s @param {number} nu */
  ekorre(s, nu) {
    const { o } = s;
    if (s.lage === 'vilar') {
      if (nu < s.nasta) return;
      s.dx = Math.random() < 0.5 ? 1 : -1;
      const sida = s.dx > 0 ? 'hoger' : 'vanster';
      s.lage = 'tittar'; s.t = 0;
      s.img.setPosition(s.dx > 0 ? o.x + 6 : o.x + o.b - 6, o.y + o.h).setFrame(`ekorre_titta_${sida}_01`).setVisible(true);
      return;
    }
    const sida = s.dx > 0 ? 'hoger' : 'vanster';
    if (s.lage === 'tittar') { s.t++; if (s.t >= 4) { s.lage = 'springer'; s.t = 0; } return; }
    if (s.lage === 'springer') {
      s.t++;
      s.img.setFrame(`ekorre_springa_${sida}_0${1 + (s.t % 2)}`);
      s.img.setPosition(s.img.x + s.dx * 8, s.img.y);
      if (s.img.x < o.x || s.img.x > o.x + o.b) { s.lage = 'vilar'; s.img.setVisible(false); s.nasta = nu + paus(); }
    }
  }
}
