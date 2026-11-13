// Motorreglerna i 2b (granskningen A 23–25, beslut 31.3 och 41.5): molnet, styrbilderna, ljudorden och dialogrutan.
import { test, expect } from './hjalp/klocka.js';

async function provscen(page, scen, stall, extra = {}) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([sc, fn, ex]) => {
    localStorage.setItem('ordstaven_testscen', JSON.stringify({ index: 0, scen: sc, ...ex }));
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 0; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    if (fn) (0, eval)(`(${fn})`)(t);
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scen, stall ? String(stall) : null, extra]);
  await page.goto('./?snabb&testscen&kapitel=kap-00');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe(scen.id);
}
const R = (text, talare = 'berattare', extra = {}) => ({ typ: 'replik', talare, text, upplast: true, ...extra });
const tryckPa = async (page, id) => {
  await expect.poll(() => page.evaluate((m) => !!window.__ORDSTAVEN.objekt(m), id), { timeout: 5000 }).toBe(true);
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst(), null, { timeout: 10000 });
  const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), id); await page.mouse.click(o.x, o.y);
};
const moln = (page) => page.locator('#tanke .instruktion');

test('molnet före bära (41.5): instruktionen står i molnet med målets bild tills han har lagt filten', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await provscen(page, { id: 't_bara_moln', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [R('Lägg filten på ägget!'), { typ: 'bara', bild: 'filt', till: 'lada_med_agg' }, R('Klart.')] });
  await page.click('#plattan .vidare');
  await expect(moln(page)).toHaveText('LÄGG FILTEN PÅ ÄGGET!', { timeout: 8000 });
  await expect(page.locator('#tanke .malbild[data-bild="lada_med_agg"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[mål] i molnet: lada_med_agg');
  await tryckPa(page, 'lada_med_agg');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 8000 });
  await expect(page.locator('#tanke')).toBeHidden();
});

test('molnet efter en frivillig scen (41.5): den pågående scenens instruktion står i molnet igen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await provscen(page, { id: 't_vag_moln', pass: 1, rum: 'provA', steg: [R('Gå dit gråten hörs!'), { typ: 'ga_till', mal: 'stig_provc', fri_vag: true }, R('Vidare.')] }, null, {
    rum: { provA: { innehall: ['stig_provB', 'stig_provc'] }, provB: { innehall: ['kista', 'stig_provA'] } },
    scener: [{ id: 't_sido', pass: 1, rum: 'provB', frivillig: true, startar_i_rum: 'provB', steg: [R('Sidogren.'), { typ: 'mellanscen', beskrivning: 'Ungen hoppar.' }] }],
  });
  await page.click('#plattan .vidare');
  await expect(moln(page)).toHaveText('GÅ DIT GRÅTEN HÖRS!', { timeout: 8000 });
  await tryckPa(page, 'stig_provB');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SIDOGREN.', { timeout: 8000 });
  await page.click('#plattan .vidare');
  // efter sidogrenens scen: målet står i molnet igen, också i sidogrenens rum
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('kista');
  await expect(moln(page)).toHaveText('GÅ DIT GRÅTEN HÖRS!', { timeout: 8000 });
  await tryckPa(page, 'stig_provA');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stig_provc');
  await expect(moln(page)).toHaveText('GÅ DIT GRÅTEN HÖRS!', { timeout: 8000 });
});

test('styrbilden (A 23): första gången i passet direkt, och igen när han har stått vid en sak i ca 4,5 s', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker, och på datorn är styrbilden Mellanslag');
  test.setTimeout(60000);
  await provscen(page, { id: 't_styr', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }, { typ: 'ga_till', mal: 'kista' }, R('Klart.')] }, null,
    { rum: { provskogen: { innehall: ['sten', 'kista'] } } });
  // första målet i passet: styrbilden för att gå
  await expect(page.locator('#styrhjalp.pilar')).toBeVisible({ timeout: 8000 });
  await tryckPa(page, 'sten');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  // första gången han står vid en sak i passet: Mellanslag direkt
  await expect(page.locator('#styrhjalp.mellanslag')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#styrhjalp.mellanslag')).toBeHidden();
  await tryckPa(page, 'kista');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  // nästa sak: ingen styrbild först, men efter ca 4,5 s utan att han gör något
  const t0 = Date.now();
  await page.waitForTimeout(2500);
  await expect(page.locator('#styrhjalp.mellanslag')).toBeHidden();
  await expect(page.locator('#styrhjalp.mellanslag')).toBeVisible({ timeout: 5000 });
  expect(Date.now() - t0).toBeGreaterThan(3500);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[styrbild] står vid saken: anvand');
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 8000 });
  await expect(page.locator('#styrhjalp')).toBeHidden();
});

test('ljudordet står kvar ca 2 s (A 24), och nästa steg väntar inte på det', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await provscen(page, { id: 't_ljudord', pass: 1, rum: 'provskogen', steg: [R('Lyssna.'), { typ: 'ljud', id: 'dunk', ljudord: 'dunk' }, R('Klart.')] }, null, { rum: { provskogen: { innehall: ['sten'] } } });
  await page.click('#plattan .vidare');
  const ord = page.locator('.ljudord');
  await expect(ord).toHaveCount(1, { timeout: 8000 });
  const t0 = Date.now();
  await expect(ord).toHaveText('DUNK');
  // nästa steg kommer medan ordet står kvar: reaktionen blir inte längre
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 1000 });
  await page.waitForTimeout(1300);
  await expect(ord).toHaveCount(1); // står kvar efter 1,3 s (förut 0,8 s)
  await expect(ord).toHaveCount(0, { timeout: 2000 });
  expect(Date.now() - t0).toBeLessThan(2900);
});

const over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
test('dialogrutan täcker aldrig det som ska hittas härnäst (31.3, 2b): också före bära, inte bara före ett mål', { tag: '@rok' }, async ({ page }) => {
  // hallen på morgonen: ytterdörren står nere till höger, där repliken annars står. Utan plats för remsan:
  await page.setViewportSize({ width: 1280, height: 700 });
  await provscen(page, { id: 't_hitta', pass: 1, rum: 'hallen', tillstand: 'morgon', steg: [R('Bär filten till dörren!'), { typ: 'bara', bild: 'filt', till: 'dorr_ut' }, R('Klart.')] });
  test.skip(await page.evaluate(() => document.documentElement.classList.contains('text-under')), 'texten står under spelytan här');
  const rutaFor = (id) => page.evaluate((m) => { const r = window.__ORDSTAVEN.rutaPaSkarm(m); return { left: r.x, top: r.y, right: r.x + r.b, bottom: r.y + r.h }; }, id);
  await expect(page.locator('#plattan.replik')).toHaveClass(/uppe/, { timeout: 5000 });
  const ruta = await page.locator('#plattan.replik .replik-ruta').evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(over(ruta, await rutaFor('dorr_ut'))).toBe(false);
});
