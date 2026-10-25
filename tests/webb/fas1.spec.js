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
async function tillScen(page, index, extra = {}) {
  await starta(page, '?snabb&ny');
  await page.evaluate(([i, x]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = i; delete av.scenId; delete av.steg; av.startad = false; av.ungen.namn = 'KNOPP';
    Object.assign(av, x.av || {}); av.ui = { ...av.ui, ...(x.ui || {}) };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [index, extra]);
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

test('tryck på ett föremål: hjälten går dit, handen visas, och först ett tryck till öppnar', async ({ page }, info) => {
  test.setTimeout(60000);
  await tillScen(page, 2);
  const pt = await page.evaluate(() => window.__ORDSTAVEN.objekt('lada_med_stav'));
  const tryck = () => (info.project.use.hasTouch ? page.touchscreen.tap(pt.x, pt.y) : page.mouse.click(pt.x, pt.y));
  // styrhjälpen visar hur man går på just den här enheten
  await expect(page.locator(info.project.use.hasTouch ? '#styrhjalp.tryck' : '#styrhjalp.pilar')).toBeVisible();
  await page.screenshot({ path: `tests/skarmdumpar/styrhjalp-${info.project.name}.png` });
  // på avstånd glimtar det som går att använda
  expect(await page.evaluate(() => window.__ORDSTAVEN.interaktiva())).toContain('lada_med_stav');
  await expect(page.locator('#handknapp')).toBeHidden();
  await tryck();
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#styrhjalp')).toBeHidden(); // försvinner när hjälten går
  // att stå vid lådan räcker inte
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s02_glimten');
  await page.screenshot({ path: `tests/skarmdumpar/nara-${info.project.name}.png` });
  await tryck();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('s03_staven');
});

test('menyn för vuxna: ett kort tryck visar "håll inne", att hålla öppnar menyn, och scenhoppet fungerar', async ({ page }, info) => {
  test.setTimeout(60000);
  await starta(page, '?snabb&ny');
  const knapp = page.locator('#hud-meny');
  // går att öppna redan på startskärmen
  await knapp.click();
  await expect(knapp).toHaveClass(/visa-hall/);
  await expect(page.locator('#vuxenmeny')).toBeHidden();
  const r = await knapp.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up();
  await expect(page.locator('#vuxenmeny .meny')).toBeVisible();
  await page.click('#vuxenmeny .stang');
  await expect(page.locator('#vuxenmeny')).toBeHidden();
  await expect(page.locator('.start-knapp')).toBeVisible();
  // i spelet: hoppa till köket
  await page.click('.start-knapp');
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .scen[data-i="8"]');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s08_farfar');
});

test('nosen: skakar när det inte finns något att nosa på, ljudningen går att avbryta', async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await tillScen(page, 2);
  await page.evaluate(() => { const t = window.__ORDSTAVEN.tillstand(); t.aventyr['den-gomda-dalen'].ui.nosknappen = true; });
  await page.evaluate(() => document.querySelector('#hud-nos').hidden = false);
  await page.click('#hud-nos');
  await expect(page.locator('#hud-nos')).toHaveClass(/nej/);
  // på en replik: nosen på ett ord ljudar det, och ett tryck på remsan avbryter
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect(page.locator('#plattan .replik-ruta')).toBeVisible();
  await page.evaluate(() => document.querySelector('#hud-nos').hidden = false);
  await page.click('#hud-nos');
  await page.locator('#plattan .ord').first().click();
  await expect(page.locator('#remsa')).toBeVisible();
  await page.click('#remsa');
  await expect(page.locator('#remsa')).toBeHidden();
  await expect(page.locator('#plattan .replik-ruta')).toBeVisible(); // repliken gick inte vidare
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

test('bärräknaren matar ungen, och vid 0 bär rycker ungen på axlarna', async ({ page }, info) => {
  test.setTimeout(60000);
  await tillScen(page, 2, { av: { bar: 1 }, ui: { barraknaren: true } });
  const bar = page.locator('#hud-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.tal')).toHaveText('1');
  if (info.project.use.hasTouch) await bar.tap(); else await bar.click();
  await expect(bar.locator('.tal')).toHaveText('0');
  await expect(page.locator('.flygande-bar')).toHaveCount(0, { timeout: 3000 });
  if (info.project.use.hasTouch) await bar.tap(); else await bar.click();
  await expect(bar.locator('.tal')).toHaveText('0');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar)).toBe(0);
});
