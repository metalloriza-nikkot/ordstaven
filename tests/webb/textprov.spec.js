// Provsidan för textgrammatiken (beslut 13.3): alla former laddas utan fel, ord för ord kommer fram
// ett ord i taget, allt på en gång visar allt direkt, och ett tryck på texten visar allt.
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('tests/skarmdumpar', { recursive: true });

test('provsidan visar alla former utan fel', async ({ page }, info) => {
  const fel = [];
  page.on('pageerror', (e) => fel.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()); });
  await page.goto('./textprov.html?snabb');
  await page.waitForFunction(() => { const s = window.__textprov?.status(); return s && s.klara === s.antal; }, null, { timeout: 20000 });
  const s = await page.evaluate(() => window.__textprov.status());
  expect(s.antal).toBeGreaterThanOrEqual(27);
  expect(s.fel).toEqual([]);
  expect(fel).toEqual([]);
  // varje ram har spelets textlager, i Lexend
  const typsnitt = await page.frameLocator('[data-form="berattaren"] iframe').locator('#plattan .text').evaluate((e) => getComputedStyle(e).fontFamily);
  expect(typsnitt).toContain('Lexend');
  // filtret: bara nya former
  await page.check('[name=filter][value=ny]');
  const synliga = await page.locator('.form:not([hidden])').count();
  expect(synliga).toBeGreaterThan(5);
  expect(synliga).toBeLessThan(s.antal);
  await page.check('[name=filter][value=alla]');
  if (info.project.name === 'mac-helskarm') await page.screenshot({ path: 'tests/skarmdumpar/textprov.png', fullPage: true });
});

test('ord för ord: orden kommer ett i taget, och ett tryck visar allt', async ({ page }) => {
  await page.goto('./textprov.html?form=farfar');
  await page.waitForFunction(() => window.__ram);
  await page.uncheck('[name=rost]');
  await page.click('.prov-spela');
  const dolda = () => page.evaluate(() => document.querySelectorAll('#plattan .ord.dold').length);
  const alla = await page.evaluate(() => document.querySelectorAll('#plattan .ord').length);
  expect(alla).toBeGreaterThan(3);
  await page.waitForTimeout(150);
  const forst = await dolda();
  expect(forst).toBeGreaterThan(0);
  expect(forst).toBeLessThan(alla);
  // skiljetecknen kommer med sitt ord
  expect(await page.evaluate(() => document.querySelectorAll('#plattan .tecken.dold').length)).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  expect(await dolda()).toBeLessThan(forst);
  expect(await page.locator('#plattan .ord.lases').count()).toBe(1);
  await page.click('#plattan .text');
  expect(await dolda()).toBe(0);
  await expect(page.locator('.prov-takt')).toHaveText(/Takt/, { timeout: 8000 });
  expect(await page.locator('#plattan .ord.lases').count()).toBe(0);
});

test('allt på en gång: hela texten syns direkt, och ordet som läses markeras', async ({ page }) => {
  await page.goto('./textprov.html?form=berattaren');
  await page.waitForFunction(() => window.__ram);
  await page.uncheck('[name=rost]');
  await page.check('[name=lage][value=allt]');
  await page.click('.prov-spela');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.querySelectorAll('.ord.dold, .tecken.dold').length)).toBe(0);
  expect(await page.locator('#plattan .ord.lases').count()).toBe(1);
});

test('provsidans ▶ spelar i ramen och en ny ▶ avbryter den förra', async ({ page }) => {
  await page.goto('./textprov.html?snabb');
  await page.waitForFunction(() => { const s = window.__textprov?.status(); return s && s.klara === s.antal; }, null, { timeout: 20000 });
  await page.uncheck('[name=rost]');
  await page.click('[data-form="farfar"] .spela');
  const ram = page.frameLocator('[data-form="farfar"] iframe');
  await page.waitForTimeout(150);
  expect(await ram.locator('#plattan .ord.dold').count()).toBeGreaterThan(0);
  await page.click('[data-form="radion"] .spela');
  // den förra visar hela texten igen
  expect(await ram.locator('#plattan .ord.dold').count()).toBe(0);
  await expect(page.locator('[data-form="radion"] .status')).toHaveText(/Takt/, { timeout: 8000 });
});
