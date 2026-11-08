import { describe, it, expect } from 'vitest';
import { namnetIC, introBilder } from '../../src/grans/intro.js';
import INTRO from '../../assets/ui/intro/intro.json';

describe('introt (F4, 10e v0.4)', () => {
  it('Stils bilder finns: tolv steg av himlen och landet, tre solar, b_01–10 och c_01–13', () => {
    const b = introBilder();
    for (let i = 0; i < INTRO.del_a.steg; i++) for (const l of ['a_himmel_', 'a_land_']) expect(b).toContain(l + String(i).padStart(2, '0'));
    for (const n of ['sol_stor', 'sol_mellan', 'sol_liten']) expect(b).toContain(n);
    for (let i = 1; i <= 10; i++) expect(b).toContain('b_' + String(i).padStart(2, '0'));
    for (let i = 1; i <= 13; i++) expect(b).toContain('c_' + String(i).padStart(2, '0'));
    for (const n of Object.keys(INTRO.del_a.solar)) expect(INTRO.del_a.solar[n].mitt_per_steg).toHaveLength(INTRO.del_a.steg);
  });
  it('namnet faller ned mot skylten och har landat där startskärmens namn står i sista bilden', () => {
    const y0 = INTRO.del_a.titel.overkant_y, s0 = INTRO.del_a.titel.storlek_px;
    const sist = namnetIC(13, y0, s0);
    expect(sist.y).toBeCloseTo(9.4, 5);
    expect(sist.sx).toBeCloseTo(14.5 / 15, 4);
    expect(sist.sy).toBeCloseTo(14.5 / 15, 4);
    // först faller det (nedåt), sedan följer det skylten upp
    const y = Array.from({ length: 13 }, (_, i) => namnetIC(i + 1, y0, s0).y);
    expect(Math.max(...y)).toBeGreaterThan(y0 + 20);
    expect(y[0]).toBeGreaterThan(y0);
  });
});
