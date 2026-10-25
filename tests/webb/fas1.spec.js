// Grunden: skalan är hel, texten är Andika, hjälten går med piltangenter och tryck,
// spelet startar offline och minns var det var.
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('tests/skarmdumpar', { recursive: true });

/** Starta spelet (testläge) och vänta tills Phaser kör. */
async function starta(page, sok = '?snabb') {
  const fel = [];
  page.on('pageerror', (e) => fel.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()); });
  await page.goto('./' + sok);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.spel.scene.isActive('Rum'));
  return fel;
}

/** Gå direkt till en scen i prologen (via sparningen) och tryck förbi startskärmen och replikerna. */
async function tillScen(page, index) {
  await starta(page, '?snabb&ny');
  await page.evaluate((i) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = i; av.startad = false; av.ungen.namn = 'KNOPP';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, index);
  await starta(page);
  await page.click('.start-knapp');
  for (let k = 0; k < 6; k++) {
    if ((await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) === 'ga_till') break;
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click();
    await page.waitForTimeout(120);
  }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)).toBe('ga_till');
}
const pos = (page) => page.evaluate(() => window.__ORDSTAVEN.position());

test('startar utan fel, med hel skala och rummet helt i bild', async ({ page }, info) => {
  const fel = await starta(page);
  const m = await page.evaluate(() => {
    const c = document.querySelector('#varld canvas').getBoundingClientRect();
    return { b: c.width, h: c.height, x: c.left, y: c.top, dpr: devicePixelRatio, vb: innerWidth, vh: innerHeight };
  });
  const fysisk = (m.b * m.dpr) / 320;
  expect(Math.abs(fysisk - Math.round(fysisk))).toBeLessThan(0.01);
  expect(Math.abs((m.h * m.dpr) / 192 - fysisk)).toBeLessThan(0.01);
  expect(m.x).toBeGreaterThanOrEqual(0);
  expect(m.y).toBeGreaterThanOrEqual(0);
  expect(m.x + m.b).toBeLessThanOrEqual(m.vb + 0.5);
  expect(m.y + m.h).toBeLessThanOrEqual(m.vh + 0.5);
  await expect(page.locator('.start-knapp')).toBeVisible();
  await page.screenshot({ path: `tests/skarmdumpar/${info.project.name}.png` });
  expect(fel).toEqual([]);
});

test('textlagret använder Andika, och versionsraden täcker aldrig rummet', async ({ page }) => {
  await starta(page);
  const prov = page.locator('#textlager .typsnittsprov');
  await expect(prov).toHaveText('ÅÄÖ');
  const stil = await prov.evaluate((e) => ({ familj: getComputedStyle(e).fontFamily, storlek: parseFloat(getComputedStyle(e).fontSize), laddad: document.fonts.check('32px Andika') }));
  expect(stil.familj).toContain('Andika');
  expect(stil.storlek).toBeGreaterThanOrEqual(32);
  expect(stil.laddad).toBe(true);
  const krock = await page.evaluate(() => {
    const e = document.querySelector('#textlager .version');
    if (!e || e.hidden) return false;
    const a = e.getBoundingClientRect(), c = document.querySelector('#varld canvas').getBoundingClientRect();
    return a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
  });
  expect(krock).toBe(false);
});

test('piltangenterna flyttar hjälten', async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(!!info.project.use.hasTouch, 'pekskärm');
  await tillScen(page, 2); // vinden, gå till lådan med staven
  const fore = await pos(page);
  // åt höger: hjälten börjar vid stegen, till vänster är väggen
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await pos(page)).x, { timeout: 20000 }).toBeGreaterThan(fore.x + 20); // långsamma testdatorer: lång väntan
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await pos(page)).y, { timeout: 20000 }).toBeLessThan(fore.y - 10);
  await page.keyboard.up('ArrowUp');
  const stopp = await pos(page); await page.waitForTimeout(300);
  expect(Math.abs((await pos(page)).y - stopp.y)).toBeLessThan(3);
});

test('tryck på ett objekt: hjälten går dit och scenen går vidare', async ({ page }, info) => {
  test.setTimeout(60000);
  await tillScen(page, 2);
  const pt = await page.evaluate(() => window.__ORDSTAVEN.objekt('lada_med_stav'));
  if (info.project.use.hasTouch) await page.touchscreen.tap(pt.x, pt.y);
  else await page.mouse.click(pt.x, pt.y);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 30000 }).toBe('s03_staven');
});

test('startar offline', async ({ page, context }, info) => {
  test.skip(!['mac-helskarm', 'mac-safari', 'ipad-10'].includes(info.project.name), 'räcker med några projekt');
  await starta(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await expect(page.locator('.start-knapp')).toBeVisible();
  const cacher = await page.evaluate(() => caches.keys());
  expect(cacher.some((k) => k.startsWith('ordstaven-'))).toBe(true);
});

test('stående läge på pekskärm visar vrid-bilden', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'bara pekskärm');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('./?snabb');
  await expect(page.locator('#vrid')).toBeVisible();
});

test('skrivläget på pekskärm: tangentbordet kommer fram och rummet krymper', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'bara pekskärm');
  await starta(page, '?snabb&ny');
  await page.click('.start-knapp');
  for (let k = 0; k < 12 && !(await page.$('.dop-ruta')); k++) {
    if (await page.$('#plattan .replik-ruta')) await page.click('#plattan .replik-ruta');
    if (await page.$('.hjalte-ruta .klar')) await page.click('.hjalte-ruta .klar');
    await page.waitForTimeout(150);
  }
  await expect(page.locator('#tangentbord')).toBeVisible();
  const m = await page.evaluate(() => ({ rum: document.querySelector('#varld').getBoundingClientRect().bottom, tb: document.querySelector('#tangentbord').getBoundingClientRect().top, skala: window.__ORDSTAVEN.skala().fysisk }));
  expect(m.rum).toBeLessThanOrEqual(m.tb + 1); // inget i rummet täcks
  for (const b of ['K', 'N', 'O']) await page.locator('.tb-tangent', { hasText: new RegExp(`^${b}$`) }).dispatchEvent('pointerdown');
  await expect(page.locator('.namnrutor')).toContainText('KNO');
  await page.locator('.tb-klar').dispatchEvent('pointerdown');
  await expect(page.locator('#tangentbord')).toBeHidden();
  await page.screenshot({ path: `tests/skarmdumpar/skrivlage-${info.project.name}.png` });
});
