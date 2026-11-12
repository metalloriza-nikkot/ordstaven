// Testrummet för fritt skrivande (76.9, Teknik 41): Innehålls skrivuppgifter i ett tomt rum på en egen sparplats.
// Det öppnas i INSTÄLLNINGAR, orden han skriver står i loggen, och äventyrets sparning och lärandet rörs inte.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const tr = JSON.parse(readFileSync(new URL('../../content/testrum-skriv.json', import.meta.url), 'utf8'));

test('testrummet: skrivuppgifterna en i taget, orden i loggen, och äventyrets sparning rörs inte (41)', async ({ page }) => {
  test.setTimeout(120000);
  // en sparning i äventyret, med ett märke att känna igen
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  const fore = await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand();
    t.spelare.hjalte.namn = 'TESTA';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    return localStorage.getItem('ordstaven_spar');
  });
  // INSTÄLLNINGAR, PASS OCH KAPITEL: knappen till testrummet
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await expect(page.locator('#vuxenmeny .testrum-in')).toBeVisible();
  await Promise.all([page.waitForURL(/\?testrum$/), page.click('#vuxenmeny .testrum-in')]);
  // äventyrets sparning när testrummet öppnas (äventyrets sida sparar när INSTÄLLNINGAR stängs)
  const fore2 = await page.evaluate(() => localStorage.getItem('ordstaven_spar'));
  expect(JSON.parse(fore2).spelare.hjalte.namn).toBe(JSON.parse(fore).spelare.hjalte.namn);
  // i snabbläget i testet: samma rum med ?snabb
  await page.goto('./?snabb&testrum');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_skriv');
  const skriv = async (ord) => {
    for (let i = 0; i < 30 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    await expect(page.locator('#plattan .formel-skriv')).toBeVisible({ timeout: 10000 });
    for (const c of ord) { if ('ÅÄÖ'.includes(c)) await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
  };
  const forsta = tr.uppgifter[0];
  for (let i = 0; i < 30 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)).toBe(forsta.id);
  // fälten säger inte hur långt ordet är (82.2): åtta fält, fast formeln är kortare
  expect(Math.max(...forsta.formler.map((f) => [...f.ord].length))).toBeLessThan(8);
  await expect(page.locator('#plattan .formel-skriv .platser .plats')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/testrum-forsta.png' });
  // ett rimligt ord, sedan ett ord som löser problemet
  await skriv(forsta.rimliga[0].ord);
  await skriv(forsta.formler[1].ord);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id), { timeout: 15000 }).toBe(tr.uppgifter[1].id);
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain(`[formel] ${forsta.id}: ${forsta.rimliga[0].ord} (rimligt)`);
  expect(logg).toContain(`[formel] ${forsta.id}: ${forsta.formler[1].ord} (formel)`);
  expect(logg).toContain('[testrum]');
  // äventyrets sparning är orörd, och testrummet sparar på sin egen plats
  expect(await page.evaluate(() => localStorage.getItem('ordstaven_spar'))).toBe(fore2);
  expect(await page.evaluate(() => !!localStorage.getItem('ordstaven_spar_testrum'))).toBe(true);
  await page.screenshot({ path: 'test-results/testrum-andra.png' });
  // tillbaka till äventyret
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await Promise.all([page.waitForURL((u) => !u.search.includes('testrum')), page.click('#vuxenmeny .testrum-ut')]);
});
