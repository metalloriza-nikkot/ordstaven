// @ts-check
// Liv i skogen (beslut 26.3, 10e *Liv i skogen*, 10b): saker som rör sig utan att man kan göra något med dem.
// Kartans objekt med typen `omgivning` säger var saken bor (rutan) och vad den är (`vad`: fagel, lov, fjaril, ekorre,
// och från kapitel 2 (72.10) hager, groda och katt). Saknas Stils bilder ritas saken som en enkel form i gråboxen.
// Hägern flyger som fågeln när han kommer nära, grodan plumsar i vattnet, och katten sträcker på sig ibland.
// Reglerna (10e och golvets gränser i 45):
// - bara läge och bildruta ändras, högst fyra gånger per sekund (250 ms), och ingen glidande rörelse;
// - allt står stilla när han läser (världen är fryst), och bara det som syns i kameran rör sig;
// - långa och ojämna pauser, slumpade mellan ca 8 och 20 sekunder;
// - inget går att trycka på: ingen glimt, ingen markering, inget ljud. Går han mot en fågel flyger den.
// Inget här är Phasers tweens: varje sak flyttas i steg av sig själv i `steg()`, som Rum anropar i varje bildruta.

const STEG_MS = 250;
const paus = () => 8000 + Math.random() * 12000;

/** Det som ritas som en form i gråboxen när bilderna saknas (72.10). */
const GRABOX = ['hager', 'groda', 'katt', 'fagel', 'fjaril'];

/**
 * Gråboxens form för en sak, i det läge den har (`img.ram`), med fötterna i (0, 0). Bara fyllda rutor, inga
 * mjuka kanter (golvet). @param {any} s
 */
function ritaGra(s) {
  const g = s.img, ram = g.ram, v = s.o.vad;
  g.clear();
  if (v === 'hager') {
    if (ram === 'vilar') {
      g.fillStyle(0x9aa6b0, 1).fillRect(-1, -3, 1, 3).fillRect(-3, -12, 6, 9).fillRect(1, -18, 2, 6).fillRect(1, -20, 4, 2);
      g.fillStyle(0xe0a030, 1).fillRect(5, -20, 3, 1);
    } else g.fillStyle(0x9aa6b0, 1).fillRect(-6, -10, 12, 3).fillRect(ram === 'flyger_1' ? -8 : -6, ram === 'flyger_1' ? -14 : -8, 16, 2).fillRect(4, -12, 4, 2);
  } else if (v === 'groda') {
    if (ram === 'plums') g.lineStyle(1, 0xcfe8f8, 1).strokeEllipse(0, -1, 10, 3);
    else g.fillStyle(0x4f9a3a, 1).fillRect(-3, ram === 'hopp' ? -6 : -3, 6, 3).fillStyle(0xe8f0c0, 1).fillRect(-2, ram === 'hopp' ? -7 : -4, 1, 1).fillRect(1, ram === 'hopp' ? -7 : -4, 1, 1);
  } else if (v === 'katt') {
    const b = ram === 'stracker' ? 14 : 10;
    g.fillStyle(0xd08a3a, 1).fillRect(-b / 2, -5, b, 5).fillRect(b / 2 - 4, ram === 'stracker' ? -8 : -7, 4, 3).fillRect(-b / 2 - 3, -2, 3, 1);
  } else if (v === 'fagel') {
    g.fillStyle(0x7a6048, 1).fillRect(-2, -4, 5, 3).fillRect(2, -5, 2, 2);
    if (ram !== 'vilar') g.fillRect(ram === 'flyger_1' ? -4 : -3, ram === 'flyger_1' ? -7 : -3, 8, 1);
  } else if (v === 'fjaril') g.fillStyle(0xf2c14e, 1).fillRect(-2, -3, ram === 'fladdrar_2' ? 2 : 4, 2).fillRect(ram === 'fladdrar_2' ? 1 : 0, -3, 2, 2);
}

/**
 * @typedef {{ vad: string, x: number, y: number, b: number, h: number }} Omgivning
 * @typedef {{ o: Omgivning, img: any, lage: string, nasta: number, t: number, i: number, x: number, y: number, dx: number, gra?: boolean }} Sak
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
    for (const o of lista) {
      const ram = o.vad === 'fagel' ? 'fagel_sitta_01' : o.vad === 'fjaril' ? 'fjaril_01' : o.vad === 'lov' ? 'lov_gron_01' : 'ekorre_titta_hoger_01';
      const nyckel = o.vad === 'ekorre' ? 'djur' : 'omgivning';
      const x = Math.round(o.x + o.b / 2), y = Math.round(o.y + o.h / 2);
      // gråbox (72.10): hägern, grodan och katten har inga bilder än, och fågeln och fjärilen ritas som former där
      // Stils bilder inte är laddade. Lövet och ekorren finns bara med bilder.
      const gra = GRABOX.includes(o.vad) && !(tex.exists(nyckel) && tex.get(nyckel).has(ram) && (o.vad === 'fagel' || o.vad === 'fjaril'));
      if (gra) {
        const g = /** @type {any} */ (this.scen.add.graphics({ x, y }));
        g.ram = 'vilar';
        this.lager.add(g);
        const sak = { o, img: g, lage: 'vilar', nasta: performance.now() + 1000 + Math.random() * 4000, t: 0, i: 0, x, y, dx: 1, gra: true };
        this.saker.push(sak); ritaGra(sak);
        continue;
      }
      if (!tex.exists(nyckel) || !tex.get(nyckel).has(ram)) continue;
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
      const las = () => `${s.img.x},${s.img.y},${s.img.frame?.name ?? s.img.ram},${s.img.visible},${s.img.scaleX}`;
      const fore = las();
      if (s.gra) this.graSteg(s, hjalte, nu);
      else if (o.vad === 'fagel') this.fagel(s, hjalte, nu);
      else if (o.vad === 'fjaril') this.fjaril(s, nu);
      else if (o.vad === 'lov') this.lov(s, nu);
      else if (o.vad === 'ekorre') this.ekorre(s, nu);
      if (s.gra) ritaGra(s);
      if (las() !== fore) andrat = true;
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

  /**
   * Gråboxens saker (72.10), ett läge per steg som de andra. Fågeln och hägern flyger upp ur bild när han kommer inom ca
   * tre rutor och kommer tillbaka efter ca 15 s. Grodan hoppar två skutt ned i vattnet och plumsar (ringar) när han
   * kommer inom ca två rutor. Katten sover och sträcker på sig ibland. Fjärilen fladdrar inom sin ruta.
   * @param {Sak & { gra?: boolean }} s @param {{ x: number, y: number }} h @param {number} nu
   */
  graSteg(s, h, nu) {
    const { o } = s, img = /** @type {any} */ (s.img);
    const avst = Math.hypot(h.x - s.x, h.y - s.y);
    if (o.vad === 'fagel' || o.vad === 'hager') {
      if (s.lage === 'vilar') { if (avst < 48) { s.lage = 'flyger'; s.t = 0; s.dx = h.x < s.x ? 1 : -1; } return; }
      if (s.lage === 'flyger') {
        s.t++; img.ram = s.t % 2 ? 'flyger_1' : 'flyger_2';
        img.setPosition(img.x + s.dx * (o.vad === 'hager' ? 8 : 6), img.y - (o.vad === 'hager' ? 6 : 8));
        if (s.t >= 8) { s.lage = 'borta'; img.setVisible(false); s.nasta = nu + 15000; }
        return;
      }
      if (nu >= s.nasta && avst >= 48) { s.lage = 'vilar'; img.ram = 'vilar'; img.setPosition(s.x, s.y).setVisible(true); }
      return;
    }
    if (o.vad === 'groda') {
      if (s.lage === 'vilar') { if (avst < 36) { s.lage = 'hoppar'; s.t = 0; s.dx = h.x < s.x ? 1 : -1; } return; }
      if (s.lage === 'hoppar') {
        s.t++;
        if (s.t <= 2) { img.ram = 'hopp'; img.setPosition(img.x + s.dx * 6, img.y + 3); }
        else if (s.t === 3) img.ram = 'plums';
        else if (s.t >= 5) { s.lage = 'borta'; img.setVisible(false); s.nasta = nu + 15000; }
        return;
      }
      if (nu >= s.nasta && avst >= 48) { s.lage = 'vilar'; img.ram = 'vilar'; img.setPosition(s.x, s.y).setVisible(true); }
      return;
    }
    if (o.vad === 'katt') {
      if (s.lage === 'vilar') { if (nu >= s.nasta) { s.lage = 'stracker'; s.t = 0; } return; }
      s.t++; img.ram = s.t < 4 ? 'stracker' : 'vilar';
      if (s.t >= 4) { s.lage = 'vilar'; s.nasta = nu + paus(); }
      return;
    }
    if (o.vad === 'fjaril') {
      if (s.lage === 'vilar') { if (nu < s.nasta) return; s.lage = 'fladdrar'; s.t = 0; }
      s.t++; img.ram = s.t % 2 ? 'fladdrar_1' : 'fladdrar_2';
      img.setPosition(Math.max(o.x + 4, Math.min(o.x + o.b - 4, img.x + Math.round((Math.random() - 0.5) * 8))), Math.max(o.y + 6, Math.min(o.y + o.h, img.y + Math.round((Math.random() - 0.55) * 6))));
      if (s.t >= 16) { s.lage = 'vilar'; img.ram = 'vilar'; s.nasta = nu + paus() / 2; }
    }
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
