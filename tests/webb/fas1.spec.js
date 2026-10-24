// Grinden för fas 1: blocket går med piltangenter och tryck, skalan är hel, texten är Andika,
// spelet startar offline och minns var blocket stod.
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('tests/skarmdumpar', { recursive: true });

/** Starta spelet och vänta tills scenen kör. */
async function starta(page) {
  const fel = [];
  page.on('pageerror', (e) => fel.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()); });
  await page.goto('./');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.spel.scene.isActive('Testrum'));
  return fel;
}
const pos = (page) => page.evaluate(() => window.__ORDSTAVEN.position());
/** Avstånd i rumspixlar till en punkt. Ett tryck landar på hela skärmpunkter, så upp till två pixlars avvikelse är väntad (en ruta är 16). */
const avstand = async (page, x, y) => { const p = await pos(page); return Math.hypot(p.x - x, p.y - y); };

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
  await page.waitForTimeout(300);
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

  const v = page.locator('#textlager .version');
  await expect(v).toHaveText(/^ORDSTAVEN \d+\.\d+\.\d+$/);
  const krock = await page.evaluate(() => {
    const e = document.querySelector('#textlager .version');
    if (e.hidden) return false;
    const a = e.getBoundingClientRect(), c = document.querySelector('#varld canvas').getBoundingClientRect();
    return a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
  });
  expect(krock).toBe(false);
});

test('piltangenterna flyttar blocket', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'pekskärm');
  await starta(page);
  const fore = await pos(page);
  // Håll tangenten tills blocket har gått en bit (testwebbläsare kan rita långsamt).
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await pos(page)).x, { timeout: 5000 }).toBeGreaterThan(fore.x + 20);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await pos(page)).y, { timeout: 5000 }).toBeLessThan(fore.y - 10);
  await page.keyboard.up('ArrowUp');
  // Blocket stannar när tangenten släpps.
  const stopp = await pos(page); await page.waitForTimeout(300);
  expect(Math.abs((await pos(page)).y - stopp.y)).toBeLessThan(3);
});

test('tryck eller klick flyttar blocket dit', async ({ page }, info) => {
  await starta(page);
  // Mål i rummet: ruta (60, 160) i rumskoordinater
  const skarm = await page.evaluate(() => { const s = window.__ORDSTAVEN.skala(); return { x: s.vanster + 60 * s.cssSkala, y: s.topp + 160 * s.cssSkala }; });
  if (info.project.use.hasTouch) await page.touchscreen.tap(skarm.x, skarm.y);
  else await page.mouse.click(skarm.x, skarm.y);
  await expect.poll(() => avstand(page, 60, 160), { timeout: 15000 }).toBeLessThan(2);
});

test('minns var blocket stod efter omladdning', async ({ page }) => {
  await starta(page);
  const skarm = await page.evaluate(() => { const s = window.__ORDSTAVEN.skala(); return { x: s.vanster + 250 * s.cssSkala, y: s.topp + 60 * s.cssSkala }; });
  await page.mouse.click(skarm.x, skarm.y);
  await expect.poll(() => avstand(page, 250, 60), { timeout: 15000 }).toBeLessThan(2);
  const stod = await pos(page);
  await page.waitForTimeout(2500); // sparning sker högst varannan sekund
  await page.reload();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.scene.isActive('Testrum'));
  // Sparningen avrundar till hela rumspixlar.
  const efter = await pos(page);
  expect(Math.hypot(efter.x - stod.x, efter.y - stod.y)).toBeLessThan(2);
});

test('startar offline', async ({ page, context }, info) => {
  test.skip(!['mac-helskarm', 'mac-safari', 'ipad-10'].includes(info.project.name), 'räcker med några projekt');
  await starta(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // Vänta tills förcachen är klar och sidan styrs av service workern
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.scene.isActive('Testrum'));
  await expect(page.locator('#textlager .version')).toHaveText(/ORDSTAVEN/);
  const cacher = await page.evaluate(() => caches.keys());
  expect(cacher.some((k) => k.startsWith('ordstaven-'))).toBe(true);
});

test('stående läge på pekskärm visar vrid-bilden', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'bara pekskärm');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('./');
  await expect(page.locator('#vrid')).toBeVisible();
});
