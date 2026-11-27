// 136: ungen går bara där hjälten kan gå (133.7). Efter varje test i kapitlen prövas att ungen inte har gått inne i en
// vägg mer än en kort stund i något rum (Rum.ungeIVagg, ms per rum, bara när spelaren styr). Ungen kan börja en bit in
// i en dörr och gå ut ur den, och i testläget kan en regi sluta medan ungen är kvar ute på stocken, så gränsen är 1,5 s
// per rum. Felet i 133.7 var många sekunder i grottans väggar.
import { expect } from '@playwright/test';

/** @param {any} page */
export async function ungenGarRuntVaggarna(page) {
  const { ms: g, var: v } = await page.evaluate(() => { const x = window.__ORDSTAVEN?.grafik?.(); return { ms: x?.ungeIVagg ?? {}, var: x?.ungeIVaggVar ?? {} }; }).catch(() => ({ ms: {}, var: {} }));
  const for_lange = Object.entries(g).filter(([, ms]) => /** @type {number} */ (ms) > 1500).map(([rum, ms]) => [rum, ms, v[rum]]);
  expect(for_lange, 'rum där ungen gick inne i en vägg (ms)').toEqual([]);
}

/** Lägger provet efter varje godkänt test i filen. @param {any} test */
export function provaUngenEfterVarje(test) {
  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus || info.status !== 'passed') return;
    await ungenGarRuntVaggarna(page);
  });
}
