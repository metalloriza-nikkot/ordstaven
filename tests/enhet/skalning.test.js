import { describe, it, expect } from 'vitest';
import { planeraFonster } from '../../src/grans/fonster.js';
import { beraknaSkala, beraknaSkalaMedRemsa, remsansHojd, textskala, skarmTillRum, rumTillSkarm } from '../../src/karna/skalning.js';

// Skärmtabellen i stilguiden. "fysisk" = fysiska pixlar per spelpixel (alltid heltal).
// På retina (dpr 2) kan CSS-skalan bli ett halvt steg (7 fysiska = 3,5 CSS), lika skarpt.
const FALL = [
  { namn: 'MacBook 13" helskärm', bredd: 1280, hojd: 800, dpr: 2, fysisk: 8 },
  { namn: 'MacBook med webbläsarlist', bredd: 1280, hojd: 700, dpr: 2, fysisk: 7 },
  { namn: 'Windows 1920×1080', bredd: 1920, hojd: 1080, dpr: 1, fysisk: 5 },
  { namn: 'Windows 1366×768', bredd: 1366, hojd: 768, dpr: 1, fysisk: 4 },
  { namn: 'iPad 10:e gen (hemskärmen)', bredd: 1180, hojd: 820, dpr: 2, fysisk: 7 },
  { namn: 'iPad 10:e gen (Safari-flik)', bredd: 1180, hojd: 740, dpr: 2, fysisk: 7 },
  { namn: 'iPad 4:3', bredd: 1080, hojd: 810, dpr: 2, fysisk: 6 },
  { namn: 'iPad mini', bredd: 1133, hojd: 744, dpr: 2, fysisk: 7 },
];

describe('beraknaSkala', () => {
  for (const f of FALL) {
    it(`${f.namn}: ${f.fysisk} fysiska pixlar per spelpixel, rummet helt synligt`, () => {
      const s = beraknaSkala(f);
      expect(s.fysisk).toBe(f.fysisk);
      expect(s.cssBredd).toBeLessThanOrEqual(f.bredd);
      expect(s.cssHojd).toBeLessThanOrEqual(f.hojd);
    });
  }

  it('rummet fyller minst 85 % av bredden på iPad 16:10', () => {
    for (const f of FALL.filter((x) => x.namn.startsWith('iPad 10') || x.namn === 'iPad mini')) {
      expect(beraknaSkala(f).cssBredd / f.bredd).toBeGreaterThan(0.85);
    }
  });

  it('Windows 125 %: skalan är ett heltal i fysiska pixlar', () => {
    const s = beraknaSkala({ bredd: 1536, hojd: 864, dpr: 1.25 });
    expect(s.fysisk).toBe(5);
    expect(Number.isInteger(s.fysisk)).toBe(true);
    expect(s.cssBredd).toBe(1280);
    expect(s.cssHojd).toBe(768);
  });

  it('dpr 1,25 med litet fönster ger aldrig ojämna pixlar', () => {
    for (let b = 400; b <= 2000; b += 37) {
      const s = beraknaSkala({ bredd: b, hojd: b * 0.6, dpr: 1.25 });
      expect(Number.isInteger(s.fysisk)).toBe(true);
      // vänsterkanten hamnar på en hel fysisk pixel
      expect(Math.abs(s.vanster * 1.25 - Math.round(s.vanster * 1.25))).toBeLessThan(1e-9);
    }
  });

  // Spelet ska fungera på vilken skärm som helst, inte bara de i testmatrisen.
  it('svep över alla fönster 800–3840 och alla vanliga pixeltätheter', () => {
    let sammaGolv = 1;
    for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.25, 3]) {
      for (let b = 800; b <= 3840; b += 32) {
        for (let h = 500; h <= 2160; h += 32) {
          if (b / h < 1.2 || b / h > 3.6) continue; // liggande skärmar, från nästan 4:3 till ultrabred
          const s = beraknaSkala({ bredd: b, hojd: h, dpr });
          const plats = `${b}×${h} dpr ${dpr}`;
          // alltid hela fysiska pixlar
          expect(Number.isInteger(s.fysisk), plats).toBe(true);
          // rummet alltid helt synligt
          expect(s.cssBredd, plats).toBeLessThanOrEqual(b + 1e-9);
          expect(s.cssHojd, plats).toBeLessThanOrEqual(h + 1e-9);
          expect(s.vanster, plats).toBeGreaterThanOrEqual(0);
          expect(s.topp, plats).toBeGreaterThanOrEqual(0);
          // alltid största möjliga heltal: ett steg till får inte plats
          expect(((s.fysisk + 1) * 320) / dpr > b + 1e-9 || ((s.fysisk + 1) * 192) / dpr > h + 1e-9, plats).toBe(true);
          sammaGolv = Math.min(sammaGolv, Math.max(s.cssBredd / b, s.cssHojd / h));
        }
      }
    }
    // Sämsta fallet (litet fönster, låg pixeltäthet) fyller ändå minst två tredjedelar.
    expect(sammaGolv).toBeGreaterThan(0.66);
  });

  it('stående fönster på dator (vriden skärm): rummet ryms på bredden', () => {
    const s = beraknaSkala({ bredd: 1080, hojd: 1920, dpr: 1 });
    expect(s.cssBredd).toBeLessThanOrEqual(1080);
    expect(s.fysisk).toBe(3);
  });

  it('minst skala 1 även i mycket små fönster', () => {
    expect(beraknaSkala({ bredd: 100, hojd: 80 }).fysisk).toBe(1);
  });

  it('reserv nertill minskar höjden (tangentbordet)', () => {
    const utan = beraknaSkala({ bredd: 1180, hojd: 820, dpr: 2 });
    const med = beraknaSkala({ bredd: 1180, hojd: 820, dpr: 2, reservNere: 300 });
    expect(med.fysisk).toBeLessThan(utan.fysisk);
  });

  it('skärm → rum → skärm blir samma punkt', () => {
    const s = beraknaSkala({ bredd: 1280, hojd: 800, dpr: 2 });
    const r = skarmTillRum(s, 700, 400);
    const t = rumTillSkarm(s, r.x, r.y);
    expect(t.x).toBeCloseTo(700); expect(t.y).toBeCloseTo(400);
  });
});

describe('texten under spelytan (beslut 36.2)', () => {
  it('har fönstret plats ligger texten under, i full skala', () => {
    const s = beraknaSkalaMedRemsa({ bredd: 1920, hojd: 1200, dpr: 1 });
    expect(s.fysisk).toBe(5);
    expect(s.remsa).toBe(remsansHojd(textskala(1600)));
    expect(s.topp + s.cssHojd + s.remsa).toBeLessThanOrEqual(1200);
    expect(s.topp).toBeGreaterThanOrEqual(0);
  });
  it('annars ett steg mindre, om spelytan då är minst tre gånger så stor', () => {
    const s = beraknaSkalaMedRemsa({ bredd: 1920, hojd: 1080, dpr: 1 }); // 5× ryms inte med remsan, 4× gör det
    expect(s.fysisk).toBe(4);
    expect(s.remsa).toBeGreaterThan(0);
    const ipad = beraknaSkalaMedRemsa({ bredd: 1180, hojd: 820, dpr: 2 }); // iPad 10: 3,5× → 3×
    expect(ipad.cssSkala).toBe(3);
    expect(ipad.remsa).toBeGreaterThan(0);
  });
  it('aldrig mindre än tre gånger: då står texten över spelytan som förut', () => {
    const mac = beraknaSkalaMedRemsa({ bredd: 1280, hojd: 664, dpr: 2 }); // MacBooken i appen
    expect(mac).toMatchObject({ fysisk: 6, cssSkala: 3, remsa: 0 });
    expect(mac).toMatchObject(beraknaSkala({ bredd: 1280, hojd: 664, dpr: 2 }));
  });
  it('högst ett helt steg mindre: helskärm på MacBooken går från 4× till 3× med remsan (39.5)', () => {
    const helskarm = beraknaSkalaMedRemsa({ bredd: 1280, hojd: 800, dpr: 2 }); // 4× och 3,5× ryms inte, 3× gör det
    expect(helskarm).toMatchObject({ fysisk: 6, cssSkala: 3 });
    expect(helskarm.remsa).toBeGreaterThan(0);
    expect(helskarm.topp + helskarm.cssHojd + helskarm.remsa).toBeLessThanOrEqual(800);
    const app = beraknaSkalaMedRemsa({ bredd: 1280, hojd: 762, dpr: 2 }); // spelarens app
    expect(app).toMatchObject({ fysisk: 6, cssSkala: 3 });
    expect(app.remsa).toBeGreaterThan(0);
    // vid 1× aldrig mer än en fysisk pixel: 2560 × 1170 är 6×, och varken 6× eller 5× har plats → texten över
    expect(beraknaSkalaMedRemsa({ bredd: 2560, hojd: 1170, dpr: 1 })).toMatchObject({ fysisk: 6, remsa: 0 });
  });
});

describe('appens fönster (beslut 39.5)', () => {
  const bas = { installerad: true, helskarm: false, pek: false, yttreBredd: 1280, x: 0, y: 50, skarmTopp: 0, skarmHojd: 800 };
  it('ett för lågt appfönster blir 762 punkter högt inuti', () => {
    const p = planeraFonster({ ...bas, inreHojd: 664, yttreHojd: 692 });
    expect(p).toMatchObject({ andra: true, hojd: 790, nyInreHojd: 762, flyttaTill: 10, rackerInte: false });
  });
  it('blir aldrig högre än skärmen, och säger till när det inte räcker', () => {
    const p = planeraFonster({ ...bas, inreHojd: 600, yttreHojd: 628, skarmTopp: 25, skarmHojd: 692 }); // menyraden och Dock syns
    expect(p).toMatchObject({ andra: true, hojd: 692, nyInreHojd: 664, flyttaTill: 25, rackerInte: true });
  });
  it('ändrar inget i en flik, i helskärm, på en pekskärm eller när fönstret räcker', () => {
    expect(planeraFonster({ ...bas, installerad: false, inreHojd: 600, yttreHojd: 700 }).andra).toBe(false);
    expect(planeraFonster({ ...bas, helskarm: true, inreHojd: 600, yttreHojd: 600 }).andra).toBe(false);
    expect(planeraFonster({ ...bas, pek: true, inreHojd: 600, yttreHojd: 600 }).andra).toBe(false);
    expect(planeraFonster({ ...bas, inreHojd: 762, yttreHojd: 790 }).andra).toBe(false);
  });
});
