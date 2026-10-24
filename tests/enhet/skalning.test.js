import { describe, it, expect } from 'vitest';
import { beraknaSkala, skarmTillRum, rumTillSkarm } from '../../src/karna/skalning.js';

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
