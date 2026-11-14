import { test, expect } from '@playwright/test';
test('tmp startskärmen', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./?ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-02', scen: 0, scenId: 'k2s01_kanten', startad: true });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.waitForTimeout(4000);
  const anim = await page.evaluate(() => document.getAnimations().map((a) => `${a.animationName || a.constructor.name} ${a.playState} ${a.effect?.target?.id || ''}.${(a.effect?.target?.className || '').toString().slice(0, 40)} hidden:${!!a.effect?.target?.closest?.('[hidden]')}`));
  console.log('ANIM', JSON.stringify(anim, null, 1));
  console.log('SKARM', await page.evaluate(() => document.querySelector('#skarm')?.className + ' ' + !!document.querySelector('.startbord') + ' intro:' + !!document.querySelector('.intro')));
  await page.screenshot({ path: 'test-results/tmp-start.png' });
});
