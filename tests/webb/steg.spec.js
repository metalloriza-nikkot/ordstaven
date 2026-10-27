// Motorns nya steg, provade med en provscen (?snabb&testscen) innan innehållet använder dem.
import { test, expect } from '@playwright/test';

test.beforeEach(({}, info) => { test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker'); });

/** Starta en provscen i ett av prologens rum. @param {any} page @param {any} scen @param {(t: any) => void} [stall] */
async function provscen(page, scen, stall) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([sc, fn]) => {
    localStorage.setItem('ordstaven_testscen', JSON.stringify({ index: 0, scen: sc }));
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 0; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    av.ui = { ...av.ui, barraknaren: true };
    if (fn) (0, eval)(`(${fn})`)(t);
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scen, stall ? String(stall) : null]);
  await page.goto('./?snabb&testscen');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe(scen.id);
}
const R = (text, talare = 'berattare', extra = {}) => ({ typ: 'replik', talare, text, upplast: true, ...extra });
const steg = (page) => page.evaluate(() => window.__ORDSTAVEN.steg());
const tryckPa = async (page, id) => {
  await expect.poll(() => page.evaluate((m) => !!window.__ORDSTAVEN.objekt(m), id), { timeout: 5000 }).toBe(true);
  const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), id); await page.mouse.click(o.x, o.y);
};

test('bära: filten svävar efter hjälten och läggs om ägget när han når fram', async ({ page }) => {
  await provscen(page, { id: 't_bara', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'bara', bild: 'filt', till: 'lada_med_agg' }, R('Klart.')] });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.buren())).toBe(true);
  await tryckPa(page, 'lada_med_agg');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.buren())).toBe(false);
  expect(await page.evaluate(() => window.__ORDSTAVEN.lagda())).toBe(1);
});

test('låsta dörrar: en annan dörr öppnas inte, det dunkar och hjälten tittar upp; stegen går', async ({ page }) => {
  await provscen(page, { id: 't_last', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [{ typ: 'ga_till', mal: 'stege_upp', vid_annan_utgang: { ljud: 'dunk' } }, R('Uppe.')] });
  await tryckPa(page, 'dorr_mat');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[låst] dorr_mat'), { timeout: 8000 }).toBe(true);
  expect((await steg(page))?.typ).toBe('ga_till');
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stege_upp'); // fortfarande i hallen
  await tryckPa(page, 'stege_upp');
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 10000 }).toBe('replik');
});

test('prata: Farfar kallar på avstånd, och samtalet börjar när hjälten kommer nära', async ({ page }) => {
  await provscen(page, { id: 't_prata', pass: 1, rum: 'koket', tillstand: 'natt', steg: [{ typ: 'prata', figur: 'farfar_vid_bordet', kalla: R('Här!', 'farfar') }, R('Hej på dig!', 'farfar')] });
  await expect(page.locator('#rop')).toHaveText('HÄR!', { timeout: 5000 });
  expect((await steg(page))?.typ).toBe('prata');
  await tryckPa(page, 'farfar_vid_bordet');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HEJ PÅ DIG!', { timeout: 8000 });
});

test('ta emot: hjälten tar lappen själv med ett tryck', async ({ page }) => {
  await provscen(page, { id: 't_ta', pass: 1, rum: 'koket', tillstand: 'natt', steg: [{ typ: 'ta_emot', fran: 'farfar_vid_bordet', bild: 'lapp' }, R('Tack!')] });
  await tryckPa(page, 'farfar_vid_bordet');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  expect((await steg(page))?.typ).toBe('ta_emot');
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('TACK!', { timeout: 8000 });
});

test('fråga igen: ett tryck på Farfar upprepar hans senaste instruktion', async ({ page }) => {
  await provscen(page, { id: 't_fraga', pass: 1, rum: 'koket', tillstand: 'natt', steg: [R('Hämta radion.', 'farfar'), { typ: 'ga_till', mal: 'radio' }] });
  await page.click('#plattan .replik-ruta');
  await expect.poll(async () => (await steg(page))?.typ).toBe('ga_till');
  await tryckPa(page, 'farfar_vid_bordet');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HÄMTA RADION.', { timeout: 5000 });
  await page.click('#plattan .replik-ruta');
  expect((await steg(page))?.typ).toBe('ga_till');
});

test('en instruktion väntar på handlingen: nästa replik först när ungen har ätit, styrbild efter 8 s', async ({ page }) => {
  test.setTimeout(40000);
  await provscen(page, { id: 't_vanta', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'ge_bar', antal: 3 }, R('Tryck på bären, så får {unge} ett.', 'berattare', { vantar_pa: 'mata_ungen' }), R('Mums!')] });
  await expect(page.locator('#tanke .instruktion')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1500);
  expect(await page.locator('#plattan .replik-ruta').count(), 'nästa replik väntar').toBe(0);
  await expect(page.locator('#styrhjalp.tryck')).toBeVisible({ timeout: 10000 });
  await page.click('#hud-bar');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('MUMS!', { timeout: 5000 });
  await expect(page.locator('#styrhjalp.tryck')).toBeHidden();
});

test('radion: repliken hörs genom radion, och radioramen glider in', async ({ page }) => {
  await provscen(page, { id: 't_radio', pass: 1, rum: 'koket', tillstand: 'morgon', steg: [{ typ: 'visa_ui', element: 'radioramen' }, R('Test, test. Hör du mig?', 'farfar', { via: 'radio' })] });
  await expect(page.locator('#plattan .replik-ruta .via-radio')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#hud-radio.glider-in')).toBeVisible();
});
