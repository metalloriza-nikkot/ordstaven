// Motorns nya steg, provade med en provscen (?snabb&testscen) innan innehållet använder dem.
import { test, expect } from '@playwright/test';

test.beforeEach(({}, info) => { test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker'); });

/**
 * Starta en provscen i ett av prologens rum. extra = { pussel, scener, rum }: provpussel, fler scener och fält i rummen.
 * @param {any} page @param {any} scen @param {(t: any) => void} [stall] @param {any} [extra]
 */
async function provscen(page, scen, stall, extra = {}) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([sc, fn, ex]) => {
    localStorage.setItem('ordstaven_testscen', JSON.stringify({ index: 0, scen: sc, ...ex }));
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 0; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    av.ui = { ...av.ui, barraknaren: true };
    if (fn) (0, eval)(`(${fn})`)(t);
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scen, stall ? String(stall) : null, extra]);
  // kapitel=kap-00: provrummen har ingen karta, och kapitlet spelas ändå
  await page.goto('./?snabb&testscen&kapitel=kap-00');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe(scen.id);
}
const R = (text, talare = 'berattare', extra = {}) => ({ typ: 'replik', talare, text, upplast: true, ...extra });
const steg = (page) => page.evaluate(() => window.__ORDSTAVEN.steg());
const tryckPa = async (page, id) => {
  await expect.poll(() => page.evaluate((m) => !!window.__ORDSTAVEN.objekt(m), id), { timeout: 5000 }).toBe(true);
  // ett tryck medan världen står still glöms (som i spelet): vänta tills den går
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst(), null, { timeout: 10000 });
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

test('skyltarna på dörrarna syns även när han bara ska gå (s01b), men dörrarna är låsta', async ({ page }) => {
  await provscen(page, { id: 't_skyltar', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [{ typ: 'ga_till', mal: 'stege_upp', vid_annan_utgang: { ljud: 'dunk' } }, R('Uppe.')] });
  await expect(page.locator('#skyltar .skylt')).toHaveCount(4, { timeout: 5000 });
  expect((await page.locator('#skyltar .skylt .kort').allTextContents()).sort()).toEqual(['BAD', 'MAT', 'SOV', 'TOA']);
  await page.locator('#skyltar .skylt[data-objekt="dorr_toa"] .kort').click();
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[låst] dorr_toa'), { timeout: 8000 }).toBe(true);
  await tryckPa(page, 'stege_upp');
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 10000 }).toBe('replik');
  await expect(page.locator('#skyltar .skylt')).toHaveCount(0);
});

test('nosen på datorn: Tab tänder och markerar, Tab igen nästa ord, Mellanslag läser, Escape släcker', async ({ page }) => {
  await provscen(page, { id: 't_tab', pass: 1, rum: 'koket', tillstand: 'natt', steg: [R('Ta den röda lådan.'), R('Klart.')] }, (t) => { t.aventyr['den-gomda-dalen'].ui.nosknappen = true; });
  const markerad = page.locator('#plattan .ord.markerad');
  await expect(page.locator('#plattan .replik-ruta')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#ui.nosar')).toBeVisible();
  await expect(markerad).toHaveText('TA');
  await page.keyboard.press('Tab');
  await expect(markerad).toHaveText('DEN');
  await page.keyboard.press('Space'); // läser ordet, går inte vidare
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[nos] DEN')).toBe(true);
  await expect(page.locator('#ui.nosar')).toHaveCount(0);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('TA DEN RÖDA LÅDAN.');
  await page.keyboard.press('Tab'); // fortsätter efter ordet han just hörde
  await expect(markerad).toHaveText('RÖDA');
  await page.keyboard.press('Escape'); // släcker, repliken står kvar
  await expect(page.locator('#ui.nosar')).toHaveCount(0);
  await expect(markerad).toHaveCount(0);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('TA DEN RÖDA LÅDAN.');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 5000 });
});

const nosScen = { id: 't_nos', pass: 2, rum: 'koket', tillstand: 'natt', steg: [
  { typ: 'visa_ui', element: 'nosknappen' },
  R('Tryck på nosen.', 'berattare', { vantar_pa: 'nosen' }),
  { typ: 'nos_demo', ord: 'dinomat', kostnad: 0 },
  R('Bra nosat.'),
] };
const medLapp = (t) => { const av = t.aventyr['den-gomda-dalen']; av.lappar = ['p0_dinomat']; av.ui.nosknappen = true; av.bar = 3; };

test('nosen i s09 på datorn: "Tryck på nosen." väntar på Tab, sedan läser Mellanslag DINOMAT gratis', async ({ page }) => {
  await provscen(page, nosScen, medLapp);
  await expect(page.locator('#tanke .instruktion')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(800);
  expect((await steg(page))?.typ, 'instruktionen väntar').toBe('replik');
  await page.keyboard.press('Tab');
  const ord = page.locator('#plattan.nos-demo .ord.glimtar');
  await expect(ord).toHaveText('DINOMAT', { timeout: 5000 });
  await expect(page.locator('#plattan.nos-demo .ord.markerad')).toHaveText('DINOMAT');
  await expect(page.locator('#plattan.nos-demo .vidare')).toBeHidden();
  await page.screenshot({ path: 'tests/skarmdumpar/nos-demo-dator.png' });
  await page.keyboard.press('Space');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[nos] DINOMAT')).toBe(true);
  await expect(page.locator('#plattan.nos-demo .vidare')).toBeVisible({ timeout: 6000 });
  await page.locator('#plattan.nos-demo .vidare').click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('BRA NOSAT.', { timeout: 5000 });
  expect((await page.evaluate(() => window.__ORDSTAVEN.tillstand())).aventyr['den-gomda-dalen'].bar, 'nosen kostar inget här').toBe(3);
});

test('nosen i s09 på iPad: tryck på nosen och sedan på ordet; styrbild på nosen efter 8 s', async ({ page }) => {
  test.setTimeout(40000);
  await provscen(page, nosScen, medLapp);
  await expect(page.locator('#tanke .instruktion')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#styrhjalp:is(.tab, .tryck)')).toBeVisible({ timeout: 10000 });
  await page.click('#hud-nos');
  await expect(page.locator('#styrhjalp')).toBeHidden();
  await page.locator('#plattan.nos-demo .ord.glimtar').click();
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[nos] DINOMAT')).toBe(true);
  await page.locator('#plattan.nos-demo .vidare').click({ timeout: 6000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('BRA NOSAT.', { timeout: 5000 });
});

test('namnet syns ovanför ungen och läses upp (s08)', async ({ page }) => {
  await provscen(page, { id: 't_namn', pass: 1, rum: 'koket', tillstand: 'natt', steg: [R('{unge}.', 'berattare', { vid: 'ungen' }), R('Hej.')] });
  await expect(page.locator('#rop')).toHaveText('KNOPP.', { timeout: 5000 });
  expect(await page.locator('#plattan .replik-ruta').count(), 'inte på läsplattan').toBe(0);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HEJ.', { timeout: 8000 });
  await expect(page.locator('#rop')).toBeHidden();
});

test('passets slut läser äventyrets fråga (sparpunkt_fraga)', async ({ page }) => {
  await provscen(page, { id: 't_slut', pass: 1, rum: 'koket', tillstand: 'natt', steg: [{ typ: 'sparpunkt', pass_slut: true, valfri: false }, R('Igen.')] });
  await expect(page.locator('.pass-slut .fraga-text')).toHaveText('VILL DU FORTSÄTTA? ELLER SLUTA FÖR IDAG?', { timeout: 5000 });
  await page.click('.pass-slut .fortsatt');
});

test('ytterdörren i hallen är låst på natten: hjälten känner på handtaget, ingen dunk; stegen nås snett från sidan', async ({ page }) => {
  await provscen(page, { id: 't_ut', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [{ typ: 'ga_till', mal: 'stege_upp', vid_annan_utgang: { ljud: 'dunk' } }, R('Uppe.')] });
  await tryckPa(page, 'dorr_ut');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[låst] dorr_ut (handtaget)'), { timeout: 8000 }).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toContain('[låst] dorr_ut\n');
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stege_upp'); // fortfarande i hallen
  // nära nog räcker vid stegen: han ställer sig själv mitt för den och klättrar
  const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
  await page.mouse.click(s.vanster + 132 * s.cssSkala, s.topp + 66 * s.cssSkala); // snett nedanför stegens vänstra kant
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 10000 }).toBe('replik');
});

test('ytterdörren på morgonen: ett tryck går ut i trädgården', async ({ page }) => {
  await provscen(page, { id: 't_ut2', pass: 3, rum: 'hallen', tillstand: 'morgon', steg: [{ typ: 'ga_till', mal: 'dorr_ut' }] }, (t) => { t.aventyr['den-gomda-dalen'].scenId = undefined; });
  await tryckPa(page, 'dorr_ut');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.scen())), { timeout: 10000 }).not.toBe('t_ut2');
});

// ---------------------------------------------------------------- kapitel 1 (T2): pusslen, provade i prologens rum
import { readFileSync } from 'node:fs';
const kap01 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-01.json', import.meta.url), 'utf8'));
const P1 = (id) => JSON.parse(JSON.stringify(kap01.pussel.find((p) => p.id === id)));
const bricka = (page, b) => page.locator('#plattan .bricka[data-id]', { hasText: new RegExp(`^${b}$`) });

test('räddningen: ett tryck i taget, fel tonas ut, och kasta-läget skriver resten av ordet', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_apan', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_apan' }, R('Räddad.')] }, null, { pussel: [P1('k1_apan')] });
  await expect(page.locator('#plattan .raddning-ruta .lapp')).toHaveText('MAN KLÄTTRAR UPP MED DEN.', { timeout: 8000 });
  // brickorna i bokstavsordning
  expect(await page.locator('#plattan .bricka[data-id]').allTextContents()).toEqual(['A', 'E', 'G', 'O', 'R', 'S', 'T']);
  expect(await page.locator('#plattan .stav-knapp').count()).toBe(0);
  await bricka(page, 'O').click();
  await expect(bricka(page, 'O')).toHaveClass(/tonad/, { timeout: 5000 });
  await expect(page.locator('#regi')).toBeHidden({ timeout: 5000 }); // felreaktionen är klar
  await bricka(page, 'E').click();
  await expect.poll(() => page.locator('#plattan .plats.last').count(), { timeout: 5000 }).toBe(2); // E fyller två fält
  // staven lyser efter första rätta bokstaven: kasta-läget
  await expect(page.locator('#plattan .stav-knapp')).toBeVisible();
  await page.click('#plattan .stav-knapp');
  await expect(page.locator('#plattan .raddning-ruta')).toHaveClass(/kastar/);
  await expect(page.locator('#plattan .plats.nasta')).toHaveAttribute('data-plats', '0');
  await bricka(page, 'A').click(); // fel: studsar
  expect(await page.locator('#plattan .plats.last').count()).toBe(2); // de rätta ligger kvar
  await bricka(page, 'R').click(); // två fel på samma plats: rätt bricka blinkar
  await expect(bricka(page, 'S')).toHaveClass(/tips/);
  for (const b of 'STG') await bricka(page, b).click();
  // större fest och en egen replik när han kastade ordet
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('DU VISSTE ORDET!', { timeout: 10000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('klar i kasta-läget');
});

test('kodlåset: ungen visar första tecknet, låset kontrolleras när hela ordet är lagt, rätta stannar', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_las', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_kodlas' }, R('Öppet.')] }, null, { pussel: [P1('k1_kodlas')] });
  // instruktionen kommer först som replik
  await expect(page.locator('#plattan .replik-ruta .text')).toBeVisible({ timeout: 8000 });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .kod-las')).toBeVisible({ timeout: 8000 });
  expect(await page.locator('#plattan .kod-nyckel .kod-par').count()).toBe(6); // nyckeln på samma skärm
  expect(await page.locator('#plattan .kod-tecken-ruta.visar').count()).toBe(1);
  expect(await page.locator('#plattan .bricka[data-id]').allTextContents()).toEqual(['A', 'E', 'H', 'M', 'S']);
  await bricka(page, 'H').click(); await bricka(page, 'A').click();
  expect(await page.locator('#plattan .plats.last').count()).toBe(0); // ingen kontroll än
  await bricka(page, 'M').click();
  await expect.poll(() => page.locator('#plattan .plats.last').count(), { timeout: 8000 }).toBe(2); // H och M stannar
  expect(await page.locator('#plattan .kod-tecken-ruta.ratt').count()).toBe(2);
  await expect(page.locator('#plattan .kod-las.skakar')).toHaveCount(0, { timeout: 8000 }); // felreaktionen är klar
  await bricka(page, 'E').click();
  await expect(page.locator('#plattan .formel-i-luften')).toHaveText('HEM', { timeout: 5000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('ÖPPET.', { timeout: 10000 });
});

test('titta–täck: förebilden tonas bort vid första brickan och tänds igen vid fel', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_svard', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_svard' }, R('Svärdet!')] }, null, { pussel: [P1('k1_svard')] });
  // instruktionen först (v0.7: SVÄRD utifrån Farfars bild)
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAD ÄR DET? SKRIV ORDET!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .forebild')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#plattan .brickor')).not.toHaveClass(/vantar/, { timeout: 5000 });
  expect(await page.locator('#plattan .bricka[data-id]').allTextContents()).toEqual(['D', 'R', 'S', 'V', 'Ä']);
  await bricka(page, 'S').click();
  await expect(page.locator('#plattan .forebild')).toHaveClass(/tonad/);
  await expect(page.locator('#plattan .unge-tacker')).toBeVisible();
  for (const b of 'DRVÄ') await bricka(page, b).click(); // SDRVÄ: fel
  await expect(page.locator('#plattan .forebild')).not.toHaveClass(/tonad/, { timeout: 8000 });
  await expect(page.locator('#plattan .platser.skakar')).toHaveCount(0, { timeout: 8000 }); // felreaktionen är klar
  // förebilden står kvar resten av försöket
  for (const b of 'VÄRD') await bricka(page, b).click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SVÄRDET!', { timeout: 10000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('klar med förebild');
});

test('svinga mot rummets föremål: saken i sista kommer alltid sist', async ({ page }) => {
  test.setTimeout(60000);
  const p = { ...P1('k1_busken'), foremal: ['lada_lang_overst', 'lada_lang_mitten', 'lada_lang_nederst', 'lada_hornet'] };
  await provscen(page, { id: 't_busken', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_busken' }, R('Hittat.')] }, null, { pussel: [p] });
  for (const id of p.foremal) {
    await tryckPa(page, id);
    await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 }); // hjälten står vid föremålet
    await page.keyboard.press('Space');
    await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes(`[svinga] ${id}:`), { timeout: 8000 }).toBe(true);
  }
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain(`[svinga] lada_hornet: skattlada`);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HITTAT.', { timeout: 10000 });
});

// ---------------------------------------------------------------- kapitel 1:s värld (T2)
/** En provkarta (Tiled-JSON) för ett provrum. objekt: { name, type, x, y, width, height, properties: { ... } } */
const provkarta = (objekt, start = { x: 160, y: 180 }) => ({
  type: 'map', width: 20, height: 12, tilewidth: 16, tileheight: 16, properties: [],
  layers: [{ type: 'objectgroup', objects: [{ name: 'start', point: true, x: start.x, y: start.y }, ...objekt.map((o) => ({ ...o, properties: Object.entries(o.properties || {}).map(([name, value]) => ({ name, value })) }))] }],
});
const vidare = (page) => page.locator('#plattan .vidare.synlig').click();

test('skyltar i rummet: ett ord syns i världen, en mening öppnas på läsplattan när han går dit (las_skylt väntar)', async ({ page }) => {
  await provscen(page, { id: 't_skylt', pass: 1, rum: 'provskogen', steg: [{ typ: 'las_skylt', foremal: 'skylt_mening' }, R('Läst.')] }, null,
    { rum: { provskogen: { innehall: ['skylt_ord', 'skylt_mening', 'sten'], skyltar: { skylt_ord: { text: 'bär' }, skylt_mening: { text: 'Följ mina skyltar.', papper: 'traskylt' } } } } });
  await expect(page.locator('#rumsskyltar .skylt[data-objekt="skylt_ord"] .kort')).toHaveText('BÄR');
  await expect(page.locator('#rumsskyltar .skylt[data-objekt="skylt_mening"] .mening-skylt')).toBeVisible();
  expect(await page.locator('#plattan').isHidden()).toBe(true);
  await page.click('#rumsskyltar .skylt[data-objekt="skylt_mening"] .kort'); // går dit
  await expect(page.locator('#plattan .lapp.p-traskylt')).toHaveText('FÖLJ MINA SKYLTAR.', { timeout: 8000 });
  await vidare(page);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('LÄST.', { timeout: 8000 });
});

test('det frivilliga i rummet: buskens bär går att ta en gång medan han går någon annanstans', async ({ page }) => {
  await provscen(page, { id: 't_fri', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }, R('Framme.')] }, null,
    { rum: { provskogen: { innehall: ['barbuske', 'sten'], frivilligt: [{ foremal: 'barbuske', steg: [{ typ: 'ge_bar', antal: 2 }] }] } } });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.interaktiva())).toContain('barbuske');
  const bar = () => page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar);
  const fore = await bar();
  await tryckPa(page, 'barbuske');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect.poll(bar, { timeout: 5000 }).toBe(fore + 2);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.interaktiva())).not.toContain('barbuske');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].frivilligt)).toContain('provskogen/barbuske');
  await tryckPa(page, 'sten');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('FRAMME.', { timeout: 8000 });
});

test('dolda föremål: lådan syns först när steget visar den, och sedan resten av äventyret', async ({ page }) => {
  await provscen(page, { id: 't_dold', pass: 1, rum: 'provskogen', steg: [R('Före.'), { typ: 'visa_foremal', foremal: 'lada' }, R('Efter.')] }, null,
    { rum: { provskogen: { innehall: ['sten', { id: 'lada', dold: true }] } } });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('FÖRE.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).not.toContain('lada');
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('EFTER.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('lada');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].visade.provskogen)).toEqual(['lada']);
});

test('fri väg: en sidogren (frivillig scen) spelas en gång, han går själv tillbaka, och steget står kvar', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_vag', pass: 1, rum: 'provA', steg: [{ typ: 'ga_till', mal: 'stig_provc', fri_vag: true }, R('Vidare.')] }, null, {
    rum: { provA: { innehall: ['stig_provB', 'stig_provc'] }, provB: { innehall: ['kista', 'stig_provA'] } },
    scener: [{ id: 't_sido', pass: 1, rum: 'provB', frivillig: true, startar_i_rum: 'provB', steg: [R('Sidogren.')] }],
  });
  await tryckPa(page, 'stig_provB');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SIDOGREN.', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('kista');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].frivilligt)).toContain('t_sido');
  await tryckPa(page, 'stig_provA');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stig_provc');
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('t_vag');
  await tryckPa(page, 'stig_provc');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VIDARE.', { timeout: 8000 });
});

test('stigarna: frågan står på skylten, valet räknas vid kurvan, felet händer bakom kurvan, och förenklingen spärrar med en gren', async ({ page }) => {
  test.setTimeout(90000);
  const stig = (name, x) => ({ name, type: 'utgang', x, y: 30, width: 28, height: 70, properties: { golv: true, riktning: 'upp' } });
  const pussel = {
    id: 't_stigar', typ: 'P1_las_och_valj', i_rummet: true, skylt: 'skylt_fraga', papper: 'traskylt', hjalp: 'ett_ord', forenkla: { efter_fel: 2 },
    varianter: { L2: { text: 'Gå mot den höga stenen.', alternativ: [
      { id: 'a', objekt: 'stig_a', bild: 'hog_sten', ratt: true },
      { id: 'b', objekt: 'stig_b', bild: 'lag_sten', vid_valj: { reaktion: 'en kotte', replik: R('Plupp!') } },
      { id: 'c', objekt: 'stig_c', bild: 'lag_rund_sten', vid_valj: { reaktion: 'en kotte till' } },
    ] } },
    vid_ratt: { handling: 'rätt' },
  };
  await provscen(page, { id: 't_stig', pass: 1, rum: 'provstigar', steg: [{ typ: 'ga_till', mal: 'skylt_fraga' }, { typ: 'pussel', pussel_id: 't_stigar' }, R('Rätt stig.')] }, null, {
    pussel: [pussel],
    rum: { provstigar: { innehall: ['skylt_fraga', 'stig_a', 'stig_b', 'stig_c'] } },
    kartor: { provstigar: provkarta([{ name: 'skylt_fraga', type: 'sak', x: 136, y: 150, width: 48, height: 12 }, stig('stig_a', 30), stig('stig_b', 146), stig('stig_c', 262)], { x: 60, y: 180 }) },
  });
  // skylten med frågan syns som ett papper; han går dit, och den öppnas
  await page.click('#rumsskyltar .skylt[data-objekt="skylt_fraga"] .kort');
  await expect(page.locator('#plattan .lapp.p-traskylt')).toHaveText('GÅ MOT DEN HÖGA STENEN.', { timeout: 8000 });
  await vidare(page);
  await expect(page.locator('#tanke .tanke-skylt')).toBeVisible();
  // fel stig: bakom kurvan syns han inte, och han kommer tillbaka till vägskälet
  await tryckPa(page, 'stig_b');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('PLUPP!', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.synlig())).toBe(false);
  await page.click('#plattan .vidare');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.synlig())).toBe(true);
  await expect.poll(() => page.evaluate(() => !window.__ORDSTAVEN.fryst() && window.__ORDSTAVEN.position().y > 104), { timeout: 8000 }).toBe(true);
  // ett tryck på papperet i bubblan öppnar skylten igen
  await page.click('#tanke .tanke-skylt');
  await expect(page.locator('#plattan .lapp.p-traskylt')).toHaveText('GÅ MOT DEN HÖGA STENEN.', { timeout: 5000 });
  await vidare(page);
  // andra felet: förenklingen spärrar en prövad stig med en gren
  await tryckPa(page, 'stig_c');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.sparrade().length), { timeout: 10000 }).toBe(1);
  const kvar = (await page.evaluate(() => window.__ORDSTAVEN.sparrade()))[0] === 'stig_b' ? 'stig_c' : 'stig_b';
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.synlig())).toBe(true);
  // den prövade stigen som inte är spärrad: samma sak händer igen, men det räknas inte
  await expect.poll(() => page.evaluate(() => !window.__ORDSTAVEN.fryst() && window.__ORDSTAVEN.position().y > 104), { timeout: 8000 }).toBe(true);
  await tryckPa(page, kvar);
  if (kvar === 'stig_b') { await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('PLUPP!', { timeout: 8000 }); await page.click('#plattan .vidare'); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('igen (räknas inte)');
  await expect.poll(() => page.evaluate(() => !window.__ORDSTAVEN.fryst() && window.__ORDSTAVEN.position().y > 104), { timeout: 8000 }).toBe(true);
  await tryckPa(page, 'stig_a');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('RÄTT STIG.', { timeout: 10000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/t_stigar: a .*"resultat":"klar"/);
});

test('påminnelsen: egen text efter en stund, och har han inga bär trillar ett ner först', async ({ page }) => {
  await provscen(page, { id: 't_pam', pass: 1, rum: 'provskogen', steg: [R('{unge} är rädd.', 'berattare', { vantar_pa: 'mata_ungen', paminnelse: { efter_sek: 1, replik: R('Ge {unge} ett bär.') } }), R('Tack.')] },
    (t) => { t.aventyr['den-gomda-dalen'].bar = 0; }, { rum: { provskogen: { innehall: ['sten'] } } });
  await expect(page.locator('#tanke')).toHaveText('KNOPP ÄR RÄDD.', { timeout: 8000 });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar)).toBe(1);
  await expect(page.locator('#tanke')).toHaveText('GE KNOPP ETT BÄR.', { timeout: 5000 });
  await page.click('#hud-bar');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('TACK.', { timeout: 8000 });
});

test('höjdnivåer: han går upp för trappan själv, kanten går inte att gå över, och på stegen klättrar han med ryggen mot kameran', async ({ page }) => {
  test.setTimeout(60000);
  const karta = provkarta([
    { name: 'kronet', type: 'yta', x: 80, y: 40, width: 160, height: 70, properties: { niva: 1 } },
    { name: 'trappa', type: 'trappa', x: 110, y: 100, width: 24, height: 30 },
    { name: 'stege', type: 'stege', x: 190, y: 100, width: 16, height: 30 },
    { name: 'lovhog_1', type: 'sak', x: 100, y: 56, width: 20, height: 14 },
  ], { x: 160, y: 170 });
  await provscen(page, { id: 't_niva', pass: 1, rum: 'provkullen', steg: [{ typ: 'ga_till', mal: 'kronet' }, R('Uppe.'), { typ: 'ga_till', mal: 'lovhog_1' }, R('Löven.')] }, null,
    { rum: { provkullen: { innehall: ['kronet', 'trappa', 'stege', 'lovhog_1'] } }, kartor: { provkullen: karta } });
  const niva = () => page.evaluate(() => window.__ORDSTAVEN.niva());
  const pos = () => page.evaluate(() => window.__ORDSTAVEN.position());
  // rakt upp mot kanten: han stannar nedanför
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900); await page.keyboard.up('ArrowUp');
  expect((await pos()).y).toBeGreaterThan(110);
  expect((await niva()).niva).toBe(0);
  // stegen: in under den, och uppåt
  const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
  await page.mouse.click(s.vanster + 198 * s.cssSkala, s.topp + 140 * s.cssSkala);
  await expect.poll(async () => Math.abs((await pos()).x - 198) < 3 && (await pos()).y > 130, { timeout: 5000 }).toBe(true);
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await niva()).stege, { timeout: 3000 }).toBe(true);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
  expect(Math.abs((await pos()).x - 198)).toBeLessThan(1); // på stegen går det bara upp och ned
  await expect.poll(async () => (await niva()).niva, { timeout: 4000 }).toBe(1);
  await page.keyboard.up('ArrowUp');
  expect((await niva()).stege).toBe(false);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('UPPE.', { timeout: 8000 });
  await page.click('#plattan .vidare');
  // ned igen med trappan, och upp igen av sig själv när han trycker på lövhögen (vägen går över trappan)
  await page.mouse.click(s.vanster + 122 * s.cssSkala, s.topp + 160 * s.cssSkala);
  await expect.poll(async () => (await niva()).niva, { timeout: 6000 }).toBe(0);
  await expect.poll(async () => (await pos()).y, { timeout: 6000 }).toBeGreaterThan(150);
  await tryckPa(page, 'lovhog_1');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  expect((await niva()).niva).toBe(1);
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('LÖVEN.', { timeout: 8000 });
});

test('gåvor tas på direkt, pausknappen glimtar, och hjälteboken har garderoben och Dinoboken med en stjärna på det nya', async ({ page }) => {
  await provscen(page, { id: 't_gava', pass: 1, rum: 'provskogen', steg: [
    { typ: 'ge_sak', sort: 'hjalmdekor', id: 'taggkam' }, { typ: 'dinobok', sida: { bild: 'fossil_och_ungen', bildtext: 'fossil' } }, { typ: 'ga_till', mal: 'sten' }, R('Klart.'),
  ] }, null, { rum: { provskogen: { innehall: ['sten'] } } });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.lager().hjalmdekor), { timeout: 5000 }).toBe('taggkam');
  await expect(page.locator('#hud-paus')).toBeVisible();
  await expect(page.locator('#hud-paus')).toHaveClass(/glimt/);
  await expect.poll(() => steg(page).then((s) => s?.typ), { timeout: 5000 }).toBe('ga_till');
  await page.click('#hud-paus');
  expect(await page.evaluate(() => window.__ORDSTAVEN.pausad())).toBe(true);
  await expect(page.locator('#pausmeny .paus-val[data-val="kartan"]')).toBeVisible();
  await expect(page.locator('#pausmeny .paus-val[data-val="hjalteboken"]')).toHaveClass(/ny/);
  // hjälteboken öppnas på den nya fliken: garderoben, där han kan byta tillbaka
  await page.click('#pausmeny .paus-val[data-val="hjalteboken"]');
  await expect(page.locator('#pausmeny .paus-val.flik.vald')).toHaveAttribute('data-val', 'garderoben');
  await expect(page.locator('#pausmeny .paus-val[data-val="dinoboken"]')).toHaveClass(/ny/);
  await page.click('#pausmeny .paus-garderob .sak');
  expect(await page.evaluate(() => window.__ORDSTAVEN.lager().hjalmdekor)).toBe(null);
  await page.click('#pausmeny .paus-garderob .sak');
  expect(await page.evaluate(() => window.__ORDSTAVEN.lager().hjalmdekor)).toBe('taggkam');
  await page.click('#pausmeny .paus-val[data-val="dinoboken"]');
  await expect(page.locator('#pausmeny .dinosida .kort-etikett')).toHaveText('FOSSIL');
  await expect(page.locator('#pausmeny .paus-val[data-val="dinoboken"]')).not.toHaveClass(/ny/);
  await page.click('#pausmeny .paus-tillbaka');
  await expect(page.locator('#pausmeny .paus-val[data-val="hjalteboken"]')).not.toHaveClass(/ny/);
  await page.click('#pausmeny .paus-stang');
  await expect(page.locator('#pausmeny')).toBeHidden();
  expect(await page.evaluate(() => window.__ORDSTAVEN.pausad())).toBe(false);
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.sett)).toMatchObject({ garderoben: 1, dinoboken: 1 });
});

// ---------------------------------------------------------------- golvdatorn (MacBooken ritar utan grafikkort)
test('tappar webbläsaren WebGL startar spelet om med canvas och fortsätter där han var', async ({ page }) => {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ritning())).toBe('webgl');
  await page.evaluate(() => window.__ORDSTAVEN.spel.renderer.gl.getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.ritning() === 'canvas', null, { timeout: 15000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('canvas (WebGL tappades förut');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_ritning')).typ)).toBe('canvas');
});

test('ett hack i bildrutorna skrivs i loggen med vad som pågick', async ({ page }) => {
  await provscen(page, { id: 't_hack', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }] }, null, { rum: { provskogen: { innehall: ['sten'] } } });
  await page.waitForTimeout(1500); // starten kan ge egna hack: de skrivs först
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => { const t = performance.now(); while (performance.now() - t < 250) { /* upptagen */ } r(undefined); })));
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 5000 }).toMatch(/\[hack\] \d+ bildrut(a|or) över 100 ms, längst 2\d\d ms[^\n]*"scen":"t_hack","steg":"ga_till"/);
});

test('hopp till kapitel 1 (?kapitel=kap-01): prologen spolas fram, namnen frågas efter, och ungen och knapparna finns', async ({ page }) => {
  await page.goto('./?snabb&ny&kapitel=kap-01');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (const namn of ['TESTA', 'KNOPP']) {
    // hjältens dop har en instruktion först ("Skriv ditt namn.")
    await expect(page.locator('#plattan :is(.dop-ruta, .replik-ruta)')).toBeVisible({ timeout: 10000 });
    if (await page.locator('#plattan .replik-ruta').isVisible()) await page.click('#plattan .replik-ruta');
    await expect(page.locator('#plattan .dop-ruta')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(200);
    await page.keyboard.type(namn);
    await expect(page.locator('#plattan .namnrutor .ruta.fylld')).toHaveCount(namn.length, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.unge.namn), { timeout: 10000 }).toBe('KNOPP');
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('k1s01_brynet');
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.hjalte.namn).toBe('TESTA');
  expect(t.spelare.unge).toMatchObject({ namn: 'KNOPP', folj: true });
  expect(t.aventyr['den-gomda-dalen'].spolat).toEqual(['kap-00']);
  await expect(page.locator('#hud-bar')).toBeVisible();
  await expect(page.locator('#hud-nos')).toBeVisible();
  expect(await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').unge.visible)).toBe(true);
});

test('golvdatorn (canvas): högst 30 bildrutor per sekund när han går, och nästan inga när inget rör sig', async ({ page }) => {
  // canvasläget som på golvdatorn (som när WebGL har tappats)
  await provscen(page, { id: 't_golv', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }] },
    () => { localStorage.setItem('ordstaven_ritning', JSON.stringify({ typ: 'canvas', t: Date.now() })); }, { rum: { provskogen: { innehall: ['sten'] } } });
  expect(await page.evaluate(() => window.__ORDSTAVEN.ritning())).toBe('canvas');
  await page.waitForTimeout(500);
  const r = () => page.evaluate(() => ({ ritade: window.__ORDSTAVEN.ritade(), steg: window.__ORDSTAVEN.steg2() }));
  const a = await r(); await page.waitForTimeout(2000); const b = await r();
  const y0 = (await page.evaluate(() => window.__ORDSTAVEN.position())).y;
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(800); const c = await r(); await page.keyboard.up('ArrowUp');
  expect((await page.evaluate(() => window.__ORDSTAVEN.position())).y).toBeLessThan(y0 - 30); // han gick hela tiden
  // stilla: glimten åtta gånger per sekund, alltså färre än hälften av stegen (högst 30 per sekund)
  expect(b.ritade - a.ritade).toBeLessThan((b.steg - a.steg) / 2);
  expect((b.steg - a.steg) / 2).toBeLessThanOrEqual(32);
  // han går: varje steg ritas (de första stegen efter tangenten kan vara stilla)
  expect(c.ritade - b.ritade).toBeGreaterThanOrEqual((c.steg - b.steg) - 4);
});

// ------------------------------------------------------------------ kameran (beslut 14, 18.1)
/** En karta som är större än skärmen (högst 2×2 skärmar). */
const storKarta = (objekt, start, bredd = 40, hojd = 24) => ({ ...provkarta(objekt, start), width: bredd, height: hojd });
/** Ligger rutan helt inne i bilden av rummet (#varld)? */
const iBild = async (page, r) => {
  const v = await page.locator('#varld').boundingBox();
  return r.x >= v.x - 1 && r.y >= v.y - 1 && r.x + (r.b ?? r.width) <= v.x + v.width + 1 && r.y + (r.h ?? r.height) <= v.y + v.height + 1;
};

test('kameran följer hjälten i ett stort område: mittzon, hela pixlar, stannar vid kanterna, och skyltarna följer med', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_kam', pass: 1, rum: 'provdalen', steg: [{ typ: 'ga_till', mal: 'sten' }, R('Framme.')] }, null, {
    rum: { provdalen: { innehall: ['skylt_ord', 'sten'], skyltar: { skylt_ord: { text: 'bär' } } } },
    kartor: { provdalen: storKarta([{ name: 'skylt_ord', type: 'sak', x: 300, y: 300, width: 24, height: 16 }, { name: 'sten', type: 'sak', x: 560, y: 60, width: 24, height: 16 }], { x: 80, y: 350 }) },
  });
  const kam = () => page.evaluate(() => window.__ORDSTAVEN.kamera());
  await expect.poll(kam).toMatchObject({ x: 0, y: 192, bredd: 640, hojd: 384 }); // nere till vänster, vid kanterna
  await expect(page.locator('#varldslager')).toHaveClass(/klipp/);
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst());
  // ett kort steg inom mittzonen: kameran står still
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
  expect((await kam()).x).toBe(0);
  // längre åt höger: kameran följer, i hela pixlar, och hjälten är kvar i bilden
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2600); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  const k = await kam(), p = await page.evaluate(() => window.__ORDSTAVEN.position());
  expect(k.x).toBeGreaterThan(0);
  expect(Number.isInteger(k.x) && Number.isInteger(k.y)).toBe(true);
  expect(p.x - k.x).toBeGreaterThan(0); expect(p.x - k.x).toBeLessThan(320);
  expect(Math.abs(p.x - k.x - 160)).toBeLessThanOrEqual(33); // vid mittzonens kant
  // skylten sitter kvar på sitt föremål när kameran har flyttat sig (föremålet mitt i bilden, så att skylten inte
  // flyttas in från bildens kant)
  await expect.poll(async () => {
    const s = await page.locator('#rumsskyltar .skylt[data-objekt="skylt_ord"]').boundingBox(), o = await page.evaluate(() => window.__ORDSTAVEN.rutaPaSkarm('skylt_ord'));
    return s ? Math.abs(s.x + s.width / 2 - (o.x + o.b / 2)) : 999;
  }).toBeLessThanOrEqual(2);
  // ända bort till höger kanten: kameran stannar vid områdets kant
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(5000); await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await kam()).x).toBe(320);
});

test('kameran visar hela valet när frågan ställs: alla alternativ, deras skyltar och frågans skylt', async ({ page }) => {
  test.setTimeout(60000);
  const stig = (name, x) => ({ name, type: 'utgang', x, y: 50, width: 28, height: 60, properties: { golv: true, riktning: 'upp' } });
  const pussel = {
    id: 't_kamval', typ: 'P1_las_och_valj', i_rummet: true, skylt: 'skylt_fraga', papper: 'traskylt',
    varianter: { L2: { text: 'Gå mot solen.', alternativ: [
      { id: 'a', objekt: 'stig_a', ord: 'sol', ratt: true }, { id: 'b', objekt: 'stig_b', ord: 'sal' }, { id: 'c', objekt: 'stig_c', ord: 'sil' },
    ] } },
  };
  await provscen(page, { id: 't_kamv', pass: 1, rum: 'provdalen', steg: [{ typ: 'pussel', pussel_id: 't_kamval' }, R('Rätt.')] }, null, {
    pussel: [pussel],
    rum: { provdalen: { innehall: ['skylt_fraga', 'stig_a', 'stig_b', 'stig_c'] } },
    kartor: { provdalen: storKarta([{ name: 'skylt_fraga', type: 'sak', x: 470, y: 140, width: 48, height: 12 }, stig('stig_a', 420), stig('stig_b', 490), stig('stig_c', 560)], { x: 360, y: 190 }) },
  });
  // innan frågan: stigen längst till höger syns inte
  await expect(page.locator('#skyltar .skylt')).toHaveCount(3, { timeout: 8000 });
  const allt = async () => {
    for (const id of ['stig_a', 'stig_b', 'stig_c', 'skylt_fraga']) if (!(await iBild(page, await page.evaluate((i) => window.__ORDSTAVEN.rutaPaSkarm(i), id)))) return id;
    // alla skyltar på en gång (de placeras om när kameran har stannat)
    const skyltar = await page.evaluate(() => [...document.querySelectorAll('#skyltar .skylt, #rumsskyltar .skylt')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.objekt, x: r.x, y: r.y, width: r.width, height: r.height }; }));
    for (const s of skyltar) if (!(await iBild(page, s))) return 'skylt ' + s.id;
    const k = await page.evaluate(() => window.__ORDSTAVEN.kamera()), p = await page.evaluate(() => window.__ORDSTAVEN.position());
    if (p.x - k.x < 0 || p.x - k.x > 320 || p.y - k.y < 24 || p.y - k.y > 192) return 'hjälten';
    return 'allt syns';
  };
  await expect.poll(allt, { timeout: 8000 }).toBe('allt syns');
  await page.screenshot({ path: 'test-results/kamera-valet.png' });
  // valet fungerar som vanligt: rätt stig
  await tryckPa(page, 'stig_a');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('RÄTT.', { timeout: 10000 });
});

test('kapitel 1 med kartorna (T5): bara varianten syns, den rätta stenen öppnar hålet i häcken, och kameran följer honom igenom', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./?snabb&ny&kapitel=kap-01');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (const namn of ['TESTA', 'KNOPP']) {
    await expect(page.locator('#plattan :is(.dop-ruta, .replik-ruta)')).toBeVisible({ timeout: 10000 });
    if (await page.locator('#plattan .replik-ruta').isVisible()) await page.click('#plattan .replik-ruta');
    await expect(page.locator('#plattan .dop-ruta')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(200);
    await page.keyboard.type(namn);
    await expect(page.locator('#plattan .namnrutor .ruta.fylld')).toHaveCount(namn.length, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  /** Klicka fram repliker tills villkoret gäller. */
  const fram = async (villkor, ms = 30000) => {
    const t0 = Date.now();
    while (!(await villkor())) {
      if (Date.now() - t0 > ms) throw new Error('kom inte fram');
      const v = page.locator('#plattan .vidare');
      if (await v.isVisible()) await v.click({ timeout: 2000 }).catch(() => {}); else await page.waitForTimeout(150);
    }
  };
  expect(await page.evaluate(() => window.__ORDSTAVEN.kamera())).toMatchObject({ bredd: 640, hojd: 192 });
  // bara en variant av stenarna syns: två (L2) eller tre (L3), aldrig fem
  const stenar = await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => /sten$/.test(id)));
  expect([2, 3]).toContain(stenar.length);
  const ratt = stenar.includes('hog_sten') ? 'hog_sten' : 'hog_rund_sten';
  expect(stenar).toContain(ratt);
  // skylten vid ingången (en mening): han går dit
  await fram(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ === 'las_skylt' && document.querySelector('#plattan').hidden));
  await page.click('#rumsskyltar .skylt[data-objekt="skylt_ingang"] .kort');
  await expect(page.locator('#plattan .lapp')).toBeVisible({ timeout: 10000 });
  await fram(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ === 'ga_till'));
  await tryckPa(page, 'skylt_farfar_1');
  // frågan står på Farfars skylt: den öppnas när han är där
  await expect(page.locator('#plattan .lapp.p-traskylt')).toBeVisible({ timeout: 10000 });
  await page.locator('#plattan .vidare.synlig').click();
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).not.toContain('stig_genom_hacken');
  await tryckPa(page, ratt);
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  // hålet i häcken kommer fram, och han går igenom det till östra skärmen
  await fram(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().includes('stig_genom_hacken') && window.__ORDSTAVEN.scen() === 'k1s02_lianerna'));
  await fram(() => page.evaluate(() => !window.__ORDSTAVEN.fryst() && window.__ORDSTAVEN.steg()?.mal === 'stig_genom_hacken'));
  await tryckPa(page, 'stig_genom_hacken');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.position().x), { timeout: 10000 }).toBeGreaterThan(320);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.kamera().x), { timeout: 5000 }).toBeGreaterThan(100);
  // lianerna står kvar tills SVÄRD
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('lianer');
  await page.screenshot({ path: 'test-results/kapitel1-ostra-skarmen.png' });
});
