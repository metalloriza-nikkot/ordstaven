// Uppdragslappen (2d, beslut 37.3 och 40.1): i remsan under spelytan, till vänster om textrutan.
import { test, expect } from '@playwright/test';

async function provscen(page, scen, extra = {}) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([sc, ex]) => {
    localStorage.setItem('ordstaven_testscen', JSON.stringify({ index: 0, scen: sc, ...ex }));
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 0; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    t.spelare.hjalte.formler = ['LJUS']; // pausknappen finns, så att lappen kan flyga dit
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scen, extra]);
  await page.goto('./?snabb&testscen&kapitel=kap-00');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe(scen.id);
}
const R = (text, talare = 'berattare', extra = {}) => ({ typ: 'replik', talare, text, upplast: true, ...extra });
const logg = (page) => page.evaluate(() => window.__ORDSTAVEN.logg());
const SCEN = { id: 't_lapp', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [R('Nu går vi.'), R('Gå till boken!'), { typ: 'ga_till', mal: 'dorr_bok' }, R('Här är boken.'), R('Bra.'), { typ: 'ga_till', mal: 'dorr_sov' }] };
const UPPDRAG = [{ id: 't_u', rubrik: 'HITTA {UNGE}', bild: 'uppdrag_stegen', pass: 1,
  steg: [{ text: 'GÅ TILL BOK', klart: { scen: 't_lapp', ga_till: 'dorr_bok' }, ersatter: [{ scen: 't_lapp', text: 'Gå till boken!' }] }],
  stampel: { scen: 't_lapp', efter: { replik: 'Här är boken.' } } }];

test('lappen står i remsan, ersätter instruktionen och molnet, och stämplas efter berättelsens stund', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await provscen(page, SCEN, { uppdrag: UPPDRAG });
  expect(await page.evaluate(() => document.documentElement.classList.contains('text-under'))).toBe(true);
  // repliken före frågan: ingen lapp än
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('NU GÅR VI.', { timeout: 8000 });
  await expect(page.locator('#uppdragslapp')).toBeHidden();
  await page.click('#plattan .vidare');
  // lappen kommer, och instruktionen som den ersätter visas aldrig
  const lapp = page.locator('#uppdragslapp');
  await expect(lapp).toBeVisible({ timeout: 8000 });
  await expect(lapp.locator('.lapp-rubrik')).toHaveText('HITTA KNOPP');
  await expect(lapp.locator('.lapp-steg')).toHaveText('GÅ TILL BOK');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()))?.typ, { timeout: 8000 }).toBe('ga_till');
  const l = await logg(page);
  expect(l).toContain('[lappen] ersätter: Gå till boken!');
  expect(l).toContain('[lappen] t_u: GÅ TILL BOK');
  await expect(page.locator('#tanke')).toBeHidden(); // lappen säger vad han ska göra: inget moln
  // lappen står under spelytan, till vänster, och inne i fönstret
  const varld = await page.locator('#varld').boundingBox(), r = await lapp.boundingBox();
  expect(r.y).toBeGreaterThanOrEqual(varld.y + varld.height);
  expect(r.y + r.height).toBeLessThanOrEqual(800);
  expect(r.x).toBeLessThan(varld.x + varld.width / 2);
  await page.screenshot({ path: 'test-results/lappen-ga-till.png' });
  // framme: steget bockas, och repliken står bredvid lappen
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_bok')); await page.mouse.click(o.x, o.y);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HÄR ÄR BOKEN.', { timeout: 10000 });
  await expect(lapp.locator('.lapp-bock')).toHaveCount(1);
  const ruta = await page.locator('#plattan .replik-ruta').boundingBox(), r2 = await lapp.boundingBox();
  expect(ruta.x).toBeGreaterThanOrEqual(r2.x + r2.width - 2); // bredvid, inte över
  await page.screenshot({ path: 'test-results/lappen-replik.png' });
  // stämpeln kommer efter repliken (berättelsens stund), och lappen flyger till pausknappen
  await page.click('#plattan .vidare');
  await expect.poll(() => logg(page), { timeout: 8000 }).toContain('[lappen] klart: t_u');
  await expect(lapp).toBeHidden({ timeout: 8000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('BRA.', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()))?.mal, { timeout: 8000 }).toBe('dorr_sov');
  // fliken KLART i hjälteboken har uppdraget
  await page.click('#hud-paus');
  await page.click('.paus-val[data-val="hjalteboken"]');
  await page.click('.paus-val[data-val="klart"]');
  await expect(page.locator('.paus-klart .klart-lapp')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/lappen-klart.png' });
});

test('utan remsa finns ingen lapp: instruktionen och molnet står som förut', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await page.setViewportSize({ width: 1280, height: 700 });
  await provscen(page, SCEN, { uppdrag: UPPDRAG });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#tanke .instruktion')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await expect(page.locator('#uppdragslapp')).toBeHidden();
});
