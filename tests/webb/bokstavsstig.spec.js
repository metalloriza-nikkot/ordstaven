// Bokstavsstigen (P18, 114.6) i sitt testrum, med Teknikens provfil (påhittade ord, stig 2:s form). Gemenerna står i
// Lexend i textlagret, han hoppar med pilarna eller ett tryck, fel bokstav knakar, en återvändsgränd sjunker tillbaka
// till där vägen delade sig, och ingen klocka räknar.
import { expect } from '@playwright/test';
import { test } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';

const prov = JSON.parse(readFileSync(new URL('../fixturer/testrum-stig.json', import.meta.url), 'utf8'));

async function oppna(page, fil = prov) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate((f) => localStorage.setItem('ordstaven_testrum_stig', JSON.stringify(f)), fil);
  await page.goto('./?snabb&testrum=stig');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_stig');
  // instruktionen (133.6: bokstäverna står redan på flaken medan den läses, så vänta tills den är stängd)
  for (let i = 0; i < 20 && !(await page.locator('#stigord .flakord').first().isVisible().catch(() => false) && await page.locator('#plattan').isHidden()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await expect(page.locator('#stigord .flakord').first()).toBeVisible();
}
const logg = (page) => page.evaluate(() => window.__ORDSTAVEN.logg().split('== SENASTE')[0]);
const flak = (page, r, k) => page.locator(`#stigord .flakord[data-ruta="${r},${k}"]`);

test('bokstavsstigen: gemenerna i Lexend, fel bokstav, en återvändsgränd och hela ordet', async ({ page }) => {
  test.setTimeout(120000);
  await oppna(page);
  // nio flak med gemener (tre rader och fyra kolumner, två vakar och en isvägg), i Lexend och inte i versaler
  await expect(page.locator('#stigord .flakord')).toHaveCount(9);
  const typ = await flak(page, 0, 0).evaluate((e) => ({ text: e.textContent, font: getComputedStyle(e).fontFamily, tt: getComputedStyle(e).textTransform }));
  expect(typ.text).toBe('r'); expect(typ.font).toMatch(/Lexend/); expect(typ.tt).toBe('none');
  // ordet i versaler ovanför stigen (stig 2: över golvet)
  await expect(page.locator('#stigord .stigord-versal')).toContainText('RYGG');
  await page.screenshot({ path: 'test-results/stig-start.png' });
  // fel bokstav: han står kvar, och kanten på ett rätt flak lyser
  const fore = await page.evaluate(() => window.__ORDSTAVEN.position());
  await page.keyboard.press('ArrowRight'); // a, mitt framför
  await expect.poll(async () => (await logg(page)).includes('tr_stig_prov: a fel')).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.position())).toEqual(fore);
  // nedåt: r, sedan y. Där tar vägen slut, och grenen sjunker tillbaka till stranden
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await logg(page)).includes('tr_stig_prov: r rätt')).toBe(true);
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await logg(page)).includes('återvändsgränd, 2 flak sjönk'), { timeout: 8000 }).toBe(true);
  await expect(flak(page, 0, 2)).toHaveClass(/sjunken/);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__ORDSTAVEN.position())).toEqual(fore);
  // överst: r, y, g, g med tryck på flaken
  for (const [r, k] of [[0, 0], [1, 0], [2, 0], [3, 0]]) { await flak(page, r, k).click(); await page.waitForTimeout(500); }
  await expect.poll(async () => (await logg(page)).includes('tr_stig_prov: klar, 1 fel, 1 återvändsgränder'), { timeout: 8000 }).toBe(true);
});

test('bokstavsstigen: sex kolumner (stig 3) ryms på en skärm, och tre flak sjunker tillbaka', async ({ page }) => {
  test.setTimeout(120000);
  await oppna(page, { ...prov, stigar: [prov.stigar[2]] });
  const ram = await page.locator('#varld canvas').boundingBox();
  for (const b of await page.locator('#stigord .flakord').evaluateAll((l) => l.map((e) => e.getBoundingClientRect().toJSON()))) {
    expect(b.top).toBeGreaterThanOrEqual(ram.y); expect(b.bottom).toBeLessThanOrEqual(ram.y + ram.height);
    expect(b.left).toBeGreaterThanOrEqual(ram.x); expect(b.right).toBeLessThanOrEqual(ram.x + ram.width);
  }
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowRight']) { await page.keyboard.press(k); await page.waitForTimeout(500); }
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await logg(page)).includes('återvändsgränd, 3 flak sjönk'), { timeout: 8000 }).toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/stig-sex-rader.png' });
});

test('bokstavsstigen: utan ord i klartext står ordet i versaler efter två fel, och kanten lyser efter en stund medan ungen väntar på kanten', async ({ page }) => {
  test.setTimeout(120000);
  // bara den andra stigen (mossa, utan ordet), och en kort knuff
  await oppna(page, { ...prov, stigar: [{ ...prov.stigar[1], knuff: { efter_sek: 2 } }] });
  await expect(page.locator('#stigord .stigord-versal')).toHaveCount(0);
  await expect.poll(async () => (await logg(page)).includes('kanten lyser vid m, ungen piper på kanten'), { timeout: 10000 }).toBe(true);
  await page.keyboard.press('ArrowDown'); // o, inte m
  await page.waitForTimeout(400);
  await expect(page.locator('#stigord .stigord-versal')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#stigord .stigord-versal')).toContainText('MOSSA');
  await page.screenshot({ path: 'test-results/stig-versaler.png' });
});

// 116.4: Innehålls fil (content/testrum-stig.json) med kapitel 4:s tre stigar. Utan provfil öppnar testrummet den, och
// knappen syns i den vuxnes meny. UPP spelas igenom, och i klubba sjunker lockordet klo redan på det nedre l:et (116.2).
test('bokstavsstigen: Innehålls tre stigar, UPP igenom och klo som sjunker på l', async ({ page }) => {
  test.setTimeout(120000);
  const fil = JSON.parse(readFileSync(new URL('../../content/testrum-stig.json', import.meta.url), 'utf8'));
  expect(fil.stigar.map((s) => s.id)).toEqual(['tr_stig_upp', 'tr_stig_tavla', 'tr_stig_klubba']);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => localStorage.removeItem('ordstaven_testrum_stig'));
  // utan provfil: Innehålls fil
  await page.goto('./?snabb&testrum=stig');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_stig');
  const framTillFlaken = async () => {
    for (let i = 0; i < 30 && !(await page.locator('#stigord .flakord').first().isVisible().catch(() => false) && await page.locator('#plattan').isHidden()); i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    await expect(page.locator('#stigord .flakord').first()).toBeVisible();
  };
  await framTillFlaken();
  await expect(page.locator('#stigord .stigord-versal')).toContainText('UPP');
  await page.screenshot({ path: 'test-results/stig-innehall-upp.png' });
  for (const [k, r] of [[0, 0], [1, 1], [2, 0]]) { await flak(page, k, r).click(); await page.waitForTimeout(500); }
  await expect.poll(async () => (await logg(page)).includes('tr_stig_upp: klar, 0 fel, 0 återvändsgränder'), { timeout: 8000 }).toBe(true);
  // TAVLA: t, a, v, l, a
  await expect.poll(async () => (await logg(page)).includes('[pussel] tr_stig_tavla'), { timeout: 15000 }).toBe(true);
  await framTillFlaken();
  for (const [k, r] of [[0, 1], [1, 0], [2, 0], [3, 1], [4, 1]]) { await flak(page, k, r).click(); await page.waitForTimeout(500); }
  await expect.poll(async () => (await logg(page)).includes('tr_stig_tavla: klar, 0 fel'), { timeout: 8000 }).toBe(true);
  // klubba: k, sedan det nedre l:et (klo). Där sjunker grenen, och ungens replik kommer
  await expect.poll(async () => (await logg(page)).includes('[pussel] tr_stig_klubba'), { timeout: 15000 }).toBe(true);
  await framTillFlaken();
  await expect(page.locator('#stigord .stigord-versal')).toHaveCount(0);
  await flak(page, 0, 1).click(); await page.waitForTimeout(500);
  await flak(page, 1, 2).click();
  await expect.poll(async () => (await logg(page)).includes('återvändsgränd'), { timeout: 8000 }).toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/stig-innehall-klo.png' });
  // sedan rätt väg: k, l, u, b, b, a
  for (let i = 0; i < 10 && !(await flak(page, 0, 1).isVisible().catch(() => false)); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  for (const [k, r] of [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [5, 1]]) { await flak(page, k, r).click(); await page.waitForTimeout(600); }
  await expect.poll(async () => (await logg(page)).includes('tr_stig_klubba: klar'), { timeout: 8000 }).toBe(true);
});
