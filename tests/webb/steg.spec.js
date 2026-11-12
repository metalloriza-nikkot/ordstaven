// Motorns nya steg, provade med en provscen (?snabb&testscen) innan innehållet använder dem.
import { test, expect } from '@playwright/test';

test.beforeEach(({}, info) => { test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker'); });

/**
 * Starta en provscen i ett av prologens rum. extra = { pussel, scener, rum }: provpussel, fler scener och fält i rummen.
 * @param {any} page @param {any} scen @param {(t: any) => void} [stall] @param {any} [extra]
 */
async function provscen(page, scen, stall, extra = {}, url = '') {
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
  await page.goto('./?snabb&testscen&kapitel=kap-00' + url);
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
  await expect(page.locator('#plattan .replik-ruta.genom-radio .portratt.radio')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#hud-radio.glider-in')).toBeVisible();
});

test('radion lärs ut: "Tryck på radion" väntar tills radion har sagt målet igen (v0.11.3)', async ({ page }) => {
  await provscen(page, { id: 't_radio_vantar', pass: 1, rum: 'koket', tillstand: 'morgon', steg: [{ typ: 'visa_ui', element: 'radioramen' },
    R('Hitta bitarna.', 'farfar', { via: 'radio' }), R('Tryck på radion, så säger jag det igen.', 'farfar', { vantar_pa: 'radion' }), R('Bra!')] });
  await page.locator('#plattan .replik-ruta').click();
  await expect.poll(async () => (await steg(page))?.vantar_pa, { timeout: 5000 }).toBe('radion');
  // instruktionen står i molnet med radion som bild, och världen går
  await expect(page.locator('#tanke img[data-ikon="radio"]')).toBeVisible();
  await page.waitForTimeout(300);
  expect((await steg(page))?.vantar_pa).toBe('radion');
  await page.click('#hud-radio');
  await expect(page.locator('#plattan .replik-ruta.genom-radio')).toContainText('HITTA BITARNA.');
  // radiomärket är ritat i Farfars porträtt (beslut 31.2): ingen emoji ovanpå ansiktet
  const portratt = page.locator('#plattan .replik-ruta.genom-radio .portratt.p-farfar.radio');
  await expect(portratt).toHaveText('');
  // en egen bild (radiomärket), inte samma som utan radio
  const bilder = await portratt.evaluate((e) => { const u = document.createElement('span'); u.className = 'portratt p-farfar'; e.parentElement.appendChild(u); const b = [getComputedStyle(e).backgroundImage, getComputedStyle(u).backgroundImage]; u.remove(); return b; });
  expect(bilder[0]).toMatch(/^url\(/);
  expect(bilder[0]).not.toBe(bilder[1]);
  await page.locator('#plattan .replik-ruta').click();
  await expect(page.locator('#plattan .replik-ruta')).toContainText('BRA!', { timeout: 5000 });
});

test('skyltarna på dörrarna syns även när han bara ska gå (s01b), men dörrarna är låsta', async ({ page }) => {
  await provscen(page, { id: 't_skyltar', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [{ typ: 'ga_till', mal: 'stege_upp', vid_annan_utgang: { ljud: 'dunk' } }, R('Uppe.')] });
  await expect(page.locator('#skyltar .skylt')).toHaveCount(5, { timeout: 5000 });
  expect((await page.locator('#skyltar .skylt .kort').allTextContents()).sort()).toEqual(['BAD', 'BOK', 'FARFAR', 'MAT', 'SOV']);
  await page.locator('#skyltar .skylt[data-objekt="dorr_bad"] .kort').click();
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[låst] dorr_bad'), { timeout: 8000 }).toBe(true);
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
  const s = await page.evaluate(() => window.__ORDSTAVEN.skala()), k = await page.evaluate(() => window.__ORDSTAVEN.kamera());
  await page.mouse.click(s.vanster + (292 - k.x) * s.cssSkala, s.topp + (66 - k.y) * s.cssSkala); // snett nedanför stegens vänstra kant
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

test('räddningen (apan, v0.7.4): ingen kasta-knapp, ett pinnsteg per fyllt fält, apan blundar vid fel och knuffen kommer efter första felet', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_apan', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_apan' }, R('Räddad.')] }, null, { pussel: [P1('k1_apan')] });
  await expect(page.locator('#plattan .raddning-ruta .lapp')).toHaveText('MAN KLÄTTRAR UPP MED DEN.', { timeout: 8000 });
  // brickorna i bokstavsordning, stegen under nätet utan pinnsteg, och ingen stav
  expect(await page.locator('#plattan .bricka[data-id]').allTextContents()).toEqual(['A', 'E', 'G', 'O', 'R', 'S', 'T']);
  await expect(page.locator('#plattan .stege-raddning')).toHaveAttribute('data-pinnar', '0');
  expect(await page.locator('#plattan .stege-raddning .pinne').count()).toBe(5);
  expect(await page.locator('#plattan .stav-knapp').count()).toBe(0);
  // ingen knuff före första felet (3 s)
  await page.waitForTimeout(3600);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toMatch(/\[knuff\] ungen pekar på kategorin/);
  await bricka(page, 'O').click();
  await expect(page.locator('#plattan .apa-markor')).toHaveClass(/blundar/, { timeout: 3000 });
  await expect(bricka(page, 'O')).toHaveClass(/tonad/, { timeout: 5000 });
  await expect(page.locator('#regi')).toBeHidden({ timeout: 5000 }); // felreaktionen är klar
  await expect(page.locator('#plattan .apa-markor')).not.toHaveClass(/blundar/);
  // efter första felet kommer knuffen efter 3 s
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toMatch(/\[knuff\] ungen pekar på kategorin/);
  await bricka(page, 'E').click();
  await expect.poll(() => page.locator('#plattan .plats.last').count(), { timeout: 5000 }).toBe(2); // E fyller två fält
  await expect(page.locator('#plattan .stege-raddning')).toHaveAttribute('data-pinnar', '2'); // och ger två pinnsteg
  await expect(page.locator('#plattan .stege-raddning .pinne.ny')).toHaveCount(2);
  expect(await page.locator('#plattan .stav-knapp').count()).toBe(0); // staven erbjuds aldrig
  for (const b of 'ST') { await bricka(page, b).click(); await page.waitForTimeout(450); }
  await expect(page.locator('#plattan .stege-raddning')).toHaveAttribute('data-pinnar', '4');
  await bricka(page, 'G').click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('RÄDDAD.', { timeout: 10000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('pinnsteg 5 av 5');
  expect(logg).toContain('klar med bokstäverna');
  expect(logg).toContain('[ordkraft] STEGE'); // ordet blir en stege: ordkraftens ljus (39.2)
  expect(logg).not.toContain('(utan bild)');
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
  await page.screenshot({ path: 'test-results/kodlas-fel.png' });
  expect(await page.locator('#plattan .kod-tecken-ruta.ratt').count()).toBe(2);
  await expect(page.locator('#plattan .kod-las.rasslar')).toHaveCount(0, { timeout: 8000 }); // felreaktionen är klar
  await bricka(page, 'E').click();
  await expect(page.locator('#plattan .formel-i-luften')).toHaveText('HEM', { timeout: 5000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('ÖPPET.', { timeout: 10000 });
});

test('SVÄRD med brickor (72.2 och 74.3): bilden, ledbilden efter första felet, förebilden efter två fel, täcks vid nästa bricka utan blinkande bricka och tänds igen vid fel', async ({ page }) => {
  test.setTimeout(60000);
  // en ledbild i provet (kapitel 1 har ingen än), för att se att den tänds med brickor också
  const svard = { ...P1('k1_svard'), ledbild: 'tankebubbla_svard' };
  expect(svard.forebild.visas).toBe('andra_felet');
  await provscen(page, { id: 't_svardbild', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_svard' }, R('Svärdet!')] }, null, { pussel: [svard] });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAD ÄR DET? SKRIV ORDET!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  // bilden ställer frågan, brickorna kommer direkt, och ordet syns ingenstans
  await expect(page.locator('#plattan .formel-bild')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#plattan .brickor')).not.toHaveClass(/vantar/);
  const forebild = page.locator('#plattan .forebild'), ledbild = page.locator('#plattan .formel-bild.ledbild');
  await expect(forebild).toHaveCount(0); await expect(ledbild).toHaveCount(0);
  for (const b of 'SDRVÄ') await bricka(page, b).click(); // första felet (S stannar)
  await expect(ledbild).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#plattan .platser.gra')).toHaveCount(0, { timeout: 8000 });
  await expect(forebild).toHaveCount(0);
  await page.screenshot({ path: 'test-results/svard-ledbild-efter-fel.png' });
  for (const b of 'ÄDRV') await bricka(page, b).click(); // SÄDRV: andra felet (R stannar)
  await expect(forebild).toBeVisible({ timeout: 8000 });
  await expect(forebild).not.toHaveClass(/tonad/);
  await expect(page.locator('#plattan .platser.gra')).toHaveCount(0, { timeout: 8000 });
  await page.screenshot({ path: 'test-results/svard-forebild-efter-tva-fel.png' });
  // nästa bricka: det tonas bort, och ungen håller för ögonen
  await bricka(page, 'V').click();
  await expect(forebild).toHaveClass(/tonad/);
  await expect(page.locator('#plattan .unge-tacker')).toBeVisible();
  // förebilden är det sista steget (74.3): förenklingen i k1_svard blinkar ingen bricka medan den är täckt
  expect(svard.forenkla?.efter_fel).toBe(2);
  await expect(page.locator('#plattan .bricka.tips')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/svard-tackt-utan-tips.png' });
  for (const b of 'DÄ') await bricka(page, b).click(); // SVDRÄ (R stannade): fel igen, och förebilden tänds igen
  await expect(forebild).not.toHaveClass(/tonad/, { timeout: 8000 });
  await expect(page.locator('#plattan .platser.gra')).toHaveCount(0, { timeout: 8000 });
  await bricka(page, 'Ä').click(); // och täcks igen
  await expect(forebild).toHaveClass(/tonad/);
  await bricka(page, 'D').click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SVÄRDET!', { timeout: 10000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('ledbilden tankebubbla_svard tänds');
  expect(logg).toContain('förebilden tänds (andra felet)');
  expect(logg).toContain('förebilden tänds (igen)');
  expect(logg).toContain('klar med förebild');
});

test('samma fel ord två gånger i en formel: andra gången bara ljudet och ungens blick', async ({ page }) => {
  const svard = P1('k1_svard'); delete svard.forenkla;
  await provscen(page, { id: 't_sammafel', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_svard' }, R('Svärdet!')] }, null, { pussel: [svard] });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .formel-bild')).toBeVisible({ timeout: 8000 });
  for (const b of 'DRSVÄ') await bricka(page, b).click(); // fel: ingen bokstav rätt, alla går tillbaka
  // hela reaktionen första gången. Repliken kan hinna gå förbi i snabbläget (reaktionen har syns_redan), så loggen avgör
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('k1_svard: fel nr 1');
  await expect(page.locator('#plattan .platser.gra')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#plattan .svar-rad')).toHaveCount(0, { timeout: 8000 });
  for (const b of 'DRSVÄ') await bricka(page, b).click(); // samma fel igen
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('samma fel igen (kort)');
  expect(await page.locator('#plattan .svar-rad').count()).toBe(0);
});

test('SVÄRD utifrån bilden, rätt på en gång: förebilden syns aldrig', async ({ page }) => {
  await provscen(page, { id: 't_svardratt', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_svard' }, R('Svärdet!')] }, null, { pussel: [P1('k1_svard')] });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAD ÄR DET? SKRIV ORDET!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .formel-bild')).toBeVisible({ timeout: 8000 });
  for (const b of 'SVÄRD') { await bricka(page, b).click(); expect(await page.locator('#plattan .formel-ruta .forebild').count()).toBe(0); }
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SVÄRDET!', { timeout: 10000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('klar utan förebild');
});

test('titta–täck: förebilden tonas bort vid första brickan och tänds igen vid fel', async ({ page }) => {
  test.setTimeout(60000);
  // titta–täck från början (som SKÖLD och SNABB): förebilden syns innan brickorna kommer
  const svard = P1('k1_svard'); delete svard.bild; svard.forebild = { ...svard.forebild, visas: 'fran_start', brickor_efter_sek: 2 };
  await provscen(page, { id: 't_svard', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_svard' }, R('Svärdet!')] }, null, { pussel: [svard] });
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
  await expect(page.locator('#plattan .platser.gra')).toHaveCount(0, { timeout: 8000 }); // felreaktionen är klar
  // förebilden står kvar resten av försöket
  for (const b of 'VÄRD') await bricka(page, b).click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SVÄRDET!', { timeout: 10000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('klar med förebild');
  expect(logg).toContain('[ordkraft] SVÄRD'); // formeln blir något: ordkraftens ljus med Stils bilder (39.2)
  expect(logg).not.toContain('(utan bild)');
});

test('svinga mot rummets föremål: instruktionen först, knuffen nosar mot närmaste, och saken i sista kommer alltid sist', async ({ page }) => {
  test.setTimeout(60000);
  const p = { ...P1('k1_busken'), foremal: ['lada_lang_overst', 'lada_lang_mitten', 'lada_lang_nederst', 'lada_hornet'] };
  await provscen(page, { id: 't_busken', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_busken' }, R('Hittat.')] }, null, { pussel: [p] });
  // instruktionen läses upp först (v0.7.4)
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VIFTA MED STAVEN MOT BUSKARNA!', { timeout: 8000 });
  await page.click('#plattan .replik-ruta');
  // knuffen: ungen springer till föremålet närmast hjälten och nosar mot det (ingen text för den vuxne)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toMatch(/\[knuff\] ungen nosar mot närmaste buske/);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal())).not.toBeNull();
  await expect(page.locator('#regi')).toBeHidden();
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

/** Kapitel 1 vid en scen, med prologen och scenerna före spolade (som ett hopp i menyn). */
async function kapitel1Vid(page, scenId) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([id, i]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    Object.assign(av, { kapitelId: 'kap-01', scen: i, scenId: id, spolaTill: id, spolat: [], startad: false }); delete av.steg;
    t.installningar = { ...t.installningar, oppnadeKapitel: ['kap-01'] };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scenId, kap01.scener.findIndex((x) => x.id === scenId)]);
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe(scenId);
}
/** Tryck förbi replikerna tills ett ga_till väntar. */
async function tillGaTill(page) {
  for (let k = 0; k < 40; k++) {
    if ((await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) === 'ga_till' && !(await page.$('#plattan .replik-ruta'))) return;
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  throw new Error('inget ga_till');
}
const iRummet = (page, id) => expect.poll(() => page.evaluate((m) => window.__ORDSTAVEN.rumsobjekt().includes(m), id), { timeout: 15000 }).toBe(true);

test('vägen tillbaka (beslut 26.2): från gläntan i pass 2 till buskarna och tillbaka, och spelet fortsätter i avstickaren', async ({ page }) => {
  test.setTimeout(150000);
  await kapitel1Vid(page, 'k1s07_stigarna');
  await tillGaTill(page);
  expect((await steg(page)).mal).toBe('skylt_farfar_3');
  // stigen söderut leder tillbaka till skogsbrynet, fast målet är skylten
  await tryckPa(page, 'stig_brynet');
  await iRummet(page, 'stig_buskarna');
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('k1s07_stigarna');
  expect((await steg(page)).mal).toBe('skylt_farfar_3');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].avstickare)).toEqual({ rum: 'skogsbrynet' });
  // vidare till buskarna: sidogrenens scen spelas första gången
  await tryckPa(page, 'stig_buskarna');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VIFTA MED STAVEN MOT BUSKARNA!', { timeout: 15000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].avstickare)).toEqual({ rum: 'buskarna', scen: 'k1s03_buskarna' });
  // spelet startar om mitt i sidogrenen: den börjar om med sin egen omstart
  await page.reload();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAR VAR VI? VI LETAR I BUSKARNA.', { timeout: 15000 });
  await iRummet(page, 'buske_1');
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VIFTA MED STAVEN MOT BUSKARNA!', { timeout: 15000 });
  await page.click('#plattan .replik-ruta');
  for (const id of ['buske_1', 'buske_2', 'buske_3', 'buske_4']) {
    await tryckPa(page, id);
    await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Space');
    await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes(`[svinga] ${id}:`), { timeout: 8000 }).toBe(true);
  }
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('EN SKATTLÅDA! EN NY RYGGSÄCK!', { timeout: 15000 });
  await page.click('#plattan .replik-ruta');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].avstickare), { timeout: 10000 }).toEqual({ rum: 'buskarna' });
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].frivilligt)).toContain('k1s03_buskarna');
  // spelet startar om efter sidogrenen: han står kvar i buskarna och hör den pågående scenens omstart
  await page.reload();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAR VAR VI? APAN ÄR RÄDDAD. NU KARTBITEN!', { timeout: 15000 });
  await iRummet(page, 'buske_1');
  await page.click('#plattan .replik-ruta');
  // tillbaka: buskarna → skogsbrynet → gläntan, och steget fortsätter
  await tryckPa(page, 'stig_lianerna');
  await iRummet(page, 'stig_glantan');
  await tryckPa(page, 'stig_glantan');
  await iRummet(page, 'skylt_farfar_3');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 10000 }).toContain('[avstickare] tillbaka i glantan');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].avstickare)).toBeUndefined();
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('k1s07_stigarna');
  expect((await steg(page)).mal).toBe('skylt_farfar_3');
  // radion upprepar fortfarande Farfars replik i scenen
  await page.click('#hud-radio');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KARTBITEN ÄR NÄRA. LÄS MIN SKYLT!', { timeout: 8000 });
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
  // loggen säger att han tog sidogrenen först (beslut 17.1)
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[vägval] stig_provB först');
  await page.click('#plattan .vidare');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('kista');
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].frivilligt)).toContain('t_sido');
  // ett tryck medan rummet tonar in kan gå förlorat i en långsam webbläsare (CI): då trycker testet igen, som han skulle
  await tryckPa(page, 'stig_provA');
  await expect.poll(async () => {
    const o = await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt());
    if (o.includes('stig_provA')) await tryckPa(page, 'stig_provA');
    return o;
  }, { timeout: 15000, intervals: [2500] }).toContain('stig_provc');
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('t_vag');
  await tryckPa(page, 'stig_provc');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VIDARE.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[vägval] stig_provc efter stig_provB');
});

test('SLUTA FÖR IDAG i pausmenyn: ungen somnar, Farfar säger hej då, och ▶ fortsätter där han var', async ({ page }) => {
  // pausknappen finns när det finns något i hjälteboken (här formeln LJUS)
  await provscen(page, { id: 't_sluta', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }, R('Framme.')] }, (t) => { t.spelare.hjalte.formler = ['LJUS']; }, { rum: { provskogen: { innehall: ['sten'] } } });
  await expect.poll(() => steg(page).then((s) => s?.typ), { timeout: 5000 }).toBe('ga_till');
  await page.click('#hud-paus');
  await page.click('#pausmeny .paus-val[data-val="sluta_for_idag"]');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KNOPP SOMNADE. BRA JOBBAT I DAG!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VI SES SNART. HEJ DÅ!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('.pass-slut.sover-nu')).toBeVisible({ timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[sluta för idag] med ungen');
  await page.click('.pass-slut.sover-nu .fortsatt');
  await expect(page.locator('.pass-slut')).toBeHidden();
  await expect(page.locator('#plattan')).toBeHidden();
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('t_sluta');
  await tryckPa(page, 'sten');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('FRAMME.', { timeout: 8000 });
});

test('dialogregeln för radion: ett tryck på radion upprepar Farfars senaste replik genom den', async ({ page }) => {
  await provscen(page, { id: 't_radio', pass: 1, rum: 'provskogen', steg: [R('Titta på trädet!', 'farfar', { via: 'radio' }), { typ: 'ga_till', mal: 'sten' }, R('Framme.')] },
    (t) => { t.aventyr['den-gomda-dalen'].ui = { ...t.aventyr['den-gomda-dalen'].ui, radioramen: true }; }, { rum: { provskogen: { innehall: ['sten'] } } });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText(/TITTA PÅ TRÄDET!/, { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect.poll(() => steg(page).then((s) => s?.typ), { timeout: 5000 }).toBe('ga_till');
  await expect(page.locator('#plattan')).toBeHidden();
  await page.click('#hud-radio');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText(/TITTA PÅ TRÄDET!/, { timeout: 8000 });
  await page.click('#plattan .vidare');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[fråga igen] radion');
  expect((await steg(page))?.typ).toBe('ga_till'); // steget står kvar
});

test('föräldravyn i menyn för vuxna visar hur det går per pusseltyp, med slumpen för läsvalen', async ({ page }) => {
  await provscen(page, { id: 't_vy', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'sten' }] },
    (t) => { t.spelare.larande.historik = [{ pussel_id: 'p0_filt', typ: 'P1_las_och_valj', niva: 'L2', ratt: true, tid: 5000 }, { pussel_id: 'p0_ljus', typ: 'P11_formel', niva: 'S1', ratt: false, tid: 20000 }]; },
    { rum: { provskogen: { innehall: ['sten'] } } });
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="framsteg"]');
  await expect(page.locator('#vuxenmeny .foraldravy tbody tr')).toHaveCount(2);
  await expect(page.locator('#vuxenmeny .foraldravy tbody tr').first()).toContainText('Läsa och välja');
  await page.screenshot({ path: 'test-results/foraldravy.png' });
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
  // samma fel igen: kortare, bara ljudet och ungens blick (ingen replik)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('igen (räknas inte)');
  expect(await page.locator('#plattan .replik-ruta').count()).toBe(0);
  await expect.poll(() => page.evaluate(() => !window.__ORDSTAVEN.fryst() && window.__ORDSTAVEN.position().y > 104), { timeout: 8000 }).toBe(true);
  await tryckPa(page, 'stig_a');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('RÄTT STIG.', { timeout: 10000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/t_stigar: a .*"resultat":"klar"/);
});

test('påminnelsen: egen text efter en stund, och har han inga bär trillar ett ner först', async ({ page }) => {
  await provscen(page, { id: 't_pam', pass: 1, rum: 'provskogen', steg: [R('{unge} är rädd.', 'berattare', { vantar_pa: 'mata_ungen', paminnelse: { efter_sek: 1, replik: R('Ge {unge} ett bär.') } }), R('Tack.')] },
    (t) => { t.aventyr['den-gomda-dalen'].bar = 0; }, { rum: { provskogen: { innehall: ['sten'] } } });
  await expect(page.locator('#tanke .instruktion')).toHaveText('KNOPP ÄR RÄDD.', { timeout: 8000 });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar)).toBe(1);
  await expect(page.locator('#tanke .instruktion')).toHaveText('GE KNOPP ETT BÄR.', { timeout: 5000 });
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
  // ungen klättrar själv efter honom med sina två bilder (5d, 15: "ungen klättrar efter"), och står sedan uppe
  const ungenRam = () => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').ungeBild?.frame?.name);
  await expect.poll(ungenRam, { timeout: 2000, intervals: [50] }).toMatch(/^unge1_klattra_upp_0[12]$/);
  await expect.poll(ungenRam, { timeout: 4000 }).not.toMatch(/klattra/);
  expect(await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').ungePos.y)).toBeLessThan(112);
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

test('Bos grodgröna dräkt (72.11): dräktens färg byts direkt, och garderoben byter tillbaka', async ({ page }) => {
  await provscen(page, { id: 't_drakt', pass: 1, rum: 'provskogen', steg: [
    { typ: 'ge_sak', sort: 'drakt', id: 'drakt_grodgron' }, { typ: 'ga_till', mal: 'sten' }, R('Klart.'),
  ] }, null, { rum: { provskogen: { innehall: ['sten'] } } });
  const forut = 0x3a3e48, gron = 0x20946a; // Stils grodgröna (10g, del 3b)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.draktFarg()), { timeout: 8000 }).toBe(gron);
  expect(await page.evaluate(() => window.__ORDSTAVEN.lager().drakt)).toBe('drakt_grodgron');
  await expect.poll(() => steg(page).then((s) => s?.typ), { timeout: 5000 }).toBe('ga_till');
  await page.screenshot({ path: 'test-results/drakt-grodgron.png' });
  await page.click('#hud-paus');
  await page.click('#pausmeny .paus-val[data-val="hjalteboken"]');
  await page.click('#pausmeny .paus-garderob .sak[data-sort="drakt"]');
  expect(await page.evaluate(() => window.__ORDSTAVEN.draktFarg())).toBe(forut);
  await page.click('#pausmeny .paus-garderob .sak[data-sort="drakt"]');
  expect(await page.evaluate(() => window.__ORDSTAVEN.draktFarg())).toBe(gron);
});

test('gåvor tas på direkt, pausknappen glimtar, och hjälteboken har garderoben och Dinoboken med en stjärna på det nya', async ({ page }) => {
  await provscen(page, { id: 't_gava', pass: 1, rum: 'provskogen', steg: [
    { typ: 'ge_sak', sort: 'hjalmdekor', id: 'taggkam' }, { typ: 'dinobok', sida: { bild: 'fossil_och_ungen', bildtext: 'fossil' } }, { typ: 'ga_till', mal: 'sten' }, R('Klart.'),
  ] }, null, { rum: { provskogen: { innehall: ['sten'] } } });
  // festen visar bilden, aldrig dess kod (fossilet i Dinoboken visade HTML som text i 0.12.1)
  await page.evaluate(() => { window.__fest = []; new MutationObserver(() => { const f = document.querySelector('#fest'); window.__fest.push({ text: f.textContent, bild: !!f.querySelector('.bild') }); }).observe(document.querySelector('#fest'), { childList: true, characterData: true, subtree: true }); });
  // skärmdumpen: festen hålls kvar när bilden kommit, så att den hinner fotograferas i snabbläget
  await page.evaluate(() => { const f = document.querySelector('#fest'); const egen = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
    Object.defineProperty(f, 'hidden', { configurable: true, get() { return egen.get.call(this); }, set(v) { if (v && this.querySelector('.bild')) return; egen.set.call(this, v); } }); });
  await page.locator('#fest .bild').waitFor({ timeout: 8000 });
  await page.screenshot({ path: 'test-results/fest-bild.png' });
  await page.evaluate(() => { const f = document.querySelector('#fest'); delete f.hidden; f.hidden = true; });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.lager().hjalmdekor), { timeout: 5000 }).toBe('taggkam');
  await expect(page.locator('#hud-paus')).toBeVisible();
  await expect(page.locator('#hud-paus')).toHaveClass(/glimt/);
  await expect.poll(() => steg(page).then((s) => s?.typ), { timeout: 5000 }).toBe('ga_till');
  const fester = await page.evaluate(() => window.__fest);
  expect(fester.some((f) => f.bild)).toBe(true);
  expect(fester.filter((f) => f.text.includes('<'))).toEqual([]);
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

/** Ligger rutan a och b över varandra? */
const over = (a, q) => a.left < q.right - 1 && q.left < a.right - 1 && a.top < q.bottom - 1 && q.top < a.bottom - 1;
test('texten under spelytan (36.2): har fönstret plats står repliken och molnet under världen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await provscen(page, { id: 't_remsa', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [R('Gå ut genom dörren!'), { typ: 'ga_till', mal: 'dorr_bok' }, R('Inne.')] });
  expect(await page.evaluate(() => document.documentElement.classList.contains('text-under'))).toBe(true);
  const varld = await page.locator('#varld').boundingBox();
  const ruta = await page.locator('#plattan.replik .replik-ruta').boundingBox();
  expect(ruta.y).toBeGreaterThanOrEqual(varld.y + varld.height); // under världen
  expect(ruta.y + ruta.height).toBeLessThanOrEqual(1000); // och inne i fönstret
  await page.screenshot({ path: 'test-results/text-under-replik.png' });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#tanke')).toBeVisible({ timeout: 5000 });
  const moln = await page.locator('#tanke').boundingBox();
  expect(moln.y).toBeGreaterThanOrEqual(varld.y + varld.height);
  expect(moln.y + moln.height).toBeLessThanOrEqual(1000);
  await page.screenshot({ path: 'test-results/text-under-moln.png' });
});

test('utan plats står texten över spelytan, men aldrig över målet (36.2, 31.3)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 }); // MacBooken med menyraden och Dock: ingen plats för remsan
  await provscen(page, { id: 't_over', pass: 1, rum: 'hallen', tillstand: 'morgon', steg: [R('Gå ut genom dörren!'), { typ: 'ga_till', mal: 'dorr_ut' }, R('Ute.')] });
  expect(await page.evaluate(() => document.documentElement.classList.contains('text-under'))).toBe(false);
  const rutaFor = (id) => page.evaluate((m) => { const r = window.__ORDSTAVEN.rutaPaSkarm(m); return { left: r.x, top: r.y, right: r.x + r.b, bottom: r.y + r.h }; }, id);
  // repliken skulle täcka ytterdörren nere till höger: den står uppe
  await expect(page.locator('#plattan.replik')).toHaveClass(/uppe/, { timeout: 5000 });
  const ruta = await page.locator('#plattan.replik .replik-ruta').evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(over(ruta, await rutaFor('dorr_ut'))).toBe(false);
  await page.screenshot({ path: 'test-results/text-over-uppe.png' });
  await page.click('#plattan .replik-ruta');
  // molnet med målet täcker inte dörren, inte heller när han går dit och kameran följer
  await expect(page.locator('#tanke')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(300);
    const moln = await page.locator('#tanke').evaluate((e) => e.getBoundingClientRect().toJSON());
    expect(over(moln, await rutaFor('dorr_ut'))).toBe(false);
    if (i === 1) await page.keyboard.down('ArrowRight');
  }
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: 'test-results/text-over-moln.png' });
});

test('kommer spelet inte igång med WebGL (Safari på golvdatorn) startar det om med canvas', async ({ page }) => {
  await page.goto('./?snabb&ny&provstartfel');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.ritning() === 'canvas', null, { timeout: 15000 });
  await expect(page.locator('.start-knapp')).toBeVisible({ timeout: 10000 });
  expect(page.url()).not.toContain('provstartfel');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('kom inte igång med WebGL');
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
  // kameran och hjälten läses i samma ögonblick, annars hinner hjälten glida en bildruta till mellan läsningarna
  const { k, p } = await page.evaluate(() => ({ k: window.__ORDSTAVEN.kamera(), p: window.__ORDSTAVEN.position() }));
  expect(k.x).toBeGreaterThan(0);
  expect(Number.isInteger(k.x) && Number.isInteger(k.y)).toBe(true);
  expect(p.x - k.x).toBeGreaterThan(0); expect(p.x - k.x).toBeLessThan(320);
  expect(Math.abs(p.x - k.x - 160)).toBeLessThanOrEqual(34); // vid mittzonens kant (32), plus avrundning och en bildrutas steg
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

/** Hoppa till en scen i kapitel 1 i menyn för vuxna och skriv namnen. */
async function hoppaKapitel1(page, i) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="test"]');
  await page.click(`#vuxenmeny .scenlista .scen[data-kapitel="kap-01"][data-i="${i}"]`);
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
}
/**
 * Tryck på ett föremål i ett stort område: ligger det utanför skärmen går hjälten först mot det (ett tryck på
 * golvet vid skärmens kant), och kameran följer med.
 */
async function tryckNara(page, id) {
  for (let i = 0; i < 6; i++) {
    await page.waitForFunction(() => !window.__ORDSTAVEN.fryst(), null, { timeout: 10000 });
    const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), id);
    const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
    // syns en del av föremålet trycker han där, på en punkt som inte ligger under en knapp
    const r = await page.evaluate((m) => window.__ORDSTAVEN.rutaPaSkarm(m), id);
    const v0 = Math.max(r.x, s.vanster + 4), v1 = Math.min(r.x + r.b, s.vanster + s.cssBredd - 4);
    const t0 = Math.max(r.y, s.topp + 4), t1 = Math.min(r.y + r.h, s.topp + s.cssHojd - 4);
    if (v1 - v0 > 4 && t1 - t0 > 4) {
      const pt = await page.evaluate(([a, b, c, d]) => {
        for (const fy of [0.5, 0.75, 0.25]) for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
          const x = a + (b - a) * fx, y = c + (d - c) * fy, e = document.elementFromPoint(x, y);
          if (e && e.tagName === 'CANVAS') return { x, y };
        }
        return null;
      }, [v0, v1, t0, t1]);
      if (pt) { await page.mouse.click(pt.x, pt.y); return; }
    }
    // annars en bit mot föremålet, inne på skärmen och inte vid knapparna i hörnen
    const x = Math.min(Math.max(o.x, s.vanster + s.cssBredd * 0.15), s.vanster + s.cssBredd * 0.85), y = Math.min(Math.max(o.y, s.topp + s.cssHojd * 0.3), s.topp + s.cssHojd * 0.7);
    const fore = await page.evaluate(() => window.__ORDSTAVEN.kamera());
    await page.mouse.click(x, y);
    await expect.poll(async () => JSON.stringify(await page.evaluate(() => window.__ORDSTAVEN.kamera())) !== JSON.stringify(fore), { timeout: 8000 }).toBe(true);
    await page.waitForTimeout(800);
  }
  throw new Error('nådde inte ' + id);
}
/** Klicka fram repliker tills villkoret gäller. */
async function framTill(page, villkor, arg, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    // texten på plattan läses före villkoret, och trycket görs bara om den inte har bytts sedan dess: en replik som
    // kommer mellan villkoret och trycket klickas inte bort innan villkoret har sett den
    const fore = await page.evaluate(() => document.querySelector('#plattan')?.textContent || '');
    if (await page.evaluate(villkor, arg)) return;
    if (Date.now() - t0 > ms) throw new Error('kom inte fram: ' + JSON.stringify(await page.evaluate(() => ({ scen: window.__ORDSTAVEN.scen(), steg: window.__ORDSTAVEN.steg() }))));
    const tryckt = await page.evaluate((t) => {
      const p = document.querySelector('#plattan');
      if (!p || p.hidden || (p.textContent || '') !== t) return false;
      const v = /** @type {HTMLElement | null} */ (p.querySelector('.vidare') || p.querySelector('.replik-ruta'));
      if (!v) return false; v.click(); return true;
    }, fore);
    await page.waitForTimeout(tryckt ? 60 : 150);
  }
}

test('SVÄRD gör staven till ett svärd, och spelaren hugger sig igenom liangången: varje hugg fäller en, huggen växlar, och de kommer inte tillbaka (39.3, 50.2, 51.5)', async ({ page }) => {
  test.setTimeout(120000);
  await hoppaKapitel1(page, 1); // k1s02_lianerna
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s02_lianerna');
  await framTill(page, () => window.__ORDSTAVEN.steg()?.mal === 'stig_genom_hacken' && !window.__ORDSTAVEN.fryst());
  await tryckPa(page, 'stig_genom_hacken');
  await framTill(page, () => window.__ORDSTAVEN.steg()?.mal === 'trad_med_formel' && !window.__ORDSTAVEN.fryst());
  await tryckPa(page, 'trad_med_formel');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VAD ÄR DET? SKRIV ORDET!', { timeout: 10000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .formel-bild')).toBeVisible({ timeout: 8000 });
  for (const b of 'SVÄRD') await bricka(page, b).click();
  // svärdet sveper inte av sig självt: lianerna står kvar, en per del i pusslet, tills han hugger
  await framTill(page, () => window.__ORDSTAVEN.rumsobjekt().includes('lianer_0') && !window.__ORDSTAVEN.fryst());
  const lianer = await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => /^lianer/.test(id)));
  expect(lianer).toEqual(['lianer_0', 'lianer_1', 'lianer_2', 'lianer_3', 'lianer_4', 'lianer_5']); // sex i gången (52.5)
  expect(await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').harSvard)).toBe(true);
  // de står efter varandra i gången (delas: djup, 50.2) och fyller den, så att vägen norrut är stängd tills han har huggit
  const delar = await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').objekt.filter((o) => /^lianer_/.test(o.id)).map((o) => [o.y, o.h, o.b]));
  expect(delar.reduce((s, [, h]) => s + h, 0)).toBe(40); // gången börjar 8 px längre ned sedan 0.42.0 (18, y 48, h 40)
  expect(delar.every(([, , b]) => b === 32)).toBe(true);
  await page.screenshot({ path: 'test-results/lianerna-hugga.png' });
  // den södra står närmast: han hugger sig norrut genom gången
  for (const id of [...lianer].reverse()) {
    await tryckNara(page, id);
    // står han redan vid lianen hugger trycket direkt (som på iPad), annars går han dit och handen kommer
    await expect.poll(async () => (await page.locator('#handknapp').isVisible()) || !(await page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id)), { timeout: 8000 }).toBe(true);
    if (await page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id)) {
      await page.keyboard.press('Space');
      if (id === lianer.at(-1)) { await page.waitForTimeout(60); await page.screenshot({ path: 'test-results/lianerna-hugget.png' }); }
    }
    await expect.poll(() => page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id), { timeout: 8000 }).toBe(false);
    if (id === lianer.at(-1)) { await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/lianerna-en-huggen.png' }); }
  }
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SVÄRDET SKÄR BARA VÄXTER.', { timeout: 10000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('[hugga] lianer_0');
  // tre hugg som växlar (51.5): från sidan, uppifrån, och snurren på den sista lianen
  const hugg = [...logg.matchAll(/\[hugg\] (\w+): lianer_/g)].map((m) => m[1]);
  expect(hugg.at(-1)).toBe('snurr');
  expect(hugg.slice(0, 2)).toEqual(['sida', 'uppifran'].slice(0, Math.min(2, hugg.length - 1)));
  expect(await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').harSvard)).toBe(false);
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().some((id) => /^lianer/.test(id)))).toBe(false);
  // efter en omstart står lianerna inte där igen
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s02_lianerna');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().length), { timeout: 10000 }).toBeGreaterThan(3);
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().some((id) => /^lianer/.test(id)))).toBe(false);
  // det som ligger kvar är låga högar (Stils lian_gang_kvar), som inte stänger vägen
  const stumpar = await page.evaluate(() => {
    const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); let n = 0;
    const g = (o) => { if (o.frame?.name === 'lian_gang_kvar') n++; (o.list || []).forEach(g); };
    r.lagerObjekt.list.forEach(g); return n;
  });
  expect(stumpar).toBeGreaterThan(0);
});

test('den lilla lianen: SVÄRD ur minnet, sedan hugger han den, och den är borta (39.3)', async ({ page }) => {
  test.setTimeout(90000);
  await hoppaKapitel1(page, 3); // k1s05_glantan: SVÄRD finns på staven
  await expect.poll(() => page.evaluate(() => { const t = window.__ORDSTAVEN.tillstand(); return `${window.__ORDSTAVEN.scen()} ${t.spelare.hjalte.namn} ${t.spelare.unge.namn}`; }), { timeout: 10000 }).toBe('k1s05_glantan TESTA KNOPP');
  // sparningen flyttas till vägvalet i skogsbrynet, efter lianerna (SVÄRD finns redan på staven)
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 1; av.scenId = 'k1s02_lianerna'; av.steg = 17; av.startad = true; // vid vägvalet, efter lianerna
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await framTill(page, () => window.__ORDSTAVEN.steg()?.mal === 'stig_glantan' && !window.__ORDSTAVEN.fryst());
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('liten_lian');
  await tryckNara(page, 'liten_lian');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  // Stils ljusa lian i gångens grön (28 × 38) hänger ned ur snåret framför stubben (18, F6)
  await page.screenshot({ path: 'test-results/skogsbrynet-liten-lian.png' });
  await page.keyboard.press('Space');
  await expect(page.locator('#plattan .formel-ruta')).toBeVisible({ timeout: 8000 });
  for (const b of 'SVÄRD') await bricka(page, b).click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HUGG LIANEN!', { timeout: 10000 });
  await page.click('#plattan .vidare');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').harSvard), { timeout: 5000 }).toBe(true);
  await tryckNara(page, 'liten_lian');
  // står han redan vid lianen hugger trycket direkt (det hände på en långsam CI-maskin). Annars kommer handen,
  // och Mellanslag hugger
  const huggen = async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[hugga] liten_lian');
  await expect.poll(async () => (await huggen()) || page.locator('#handknapp').isVisible(), { timeout: 8000 }).toBe(true);
  if (!(await huggen())) await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().includes('liten_lian')), { timeout: 8000 }).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[hugga] liten_lian');
  // tillbaka i rummet efter en omstart: den är borta
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().length), { timeout: 10000 }).toBeGreaterThan(3);
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).not.toContain('liten_lian');
});

test('k1s08: krönet är målet i molnet, och ett tryck på det går uppför trappan (v0.7.5)', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 700 }); // utan remsa: molnet (med remsan säger uppdragslappen det)
  await hoppaKapitel1(page, 6); // k1s08_loven
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s08_loven');
  await framTill(page, () => window.__ORDSTAVEN.steg()?.mal === 'kronet' && !window.__ORDSTAVEN.fryst());
  const moln = page.locator('#tanke');
  await expect(moln).toBeVisible();
  await expect(moln.locator('.instruktion')).toHaveText('GÅ UPP PÅ KULLEN!');
  // bilden i molnet: Stils bildkort för krönet (42.4), aldrig trappans bild
  await expect(moln.locator('.bildkort[data-bild="uppdrag_kullen"]')).toHaveCount(1);
  expect(await moln.locator('.malbild').count()).toBe(0);
  await page.screenshot({ path: 'test-results/k1s08-kronet.png' });
  expect(await page.evaluate(() => window.__ORDSTAVEN.niva().niva)).toBe(0);
  await tryckNara(page, 'kronet');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), { timeout: 20000 }).not.toBe('ga_till');
  expect(await page.evaluate(() => window.__ORDSTAVEN.niva().niva)).toBe(1);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[framme\] kronet/);
});

test('k1s08 med höjdkitet (77.8, Stil 16): trappan står i kullens framsida, och han går uppför den söderifrån till krönet med piltangenten', async ({ page }) => {
  test.setTimeout(90000);
  await hoppaKapitel1(page, 6); // k1s08_loven
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s08_loven');
  await framTill(page, () => window.__ORDSTAVEN.steg()?.mal === 'kronet' && !window.__ORDSTAVEN.fryst());
  const t = await page.evaluate(() => window.__ORDSTAVEN.ruta('trappa'));
  const k = await page.evaluate(() => window.__ORDSTAVEN.ruta('kulle'));
  // trappan sitter i kullens södra kant (framsidan), där molnets bild visar den
  expect(t.y + t.h).toBeGreaterThanOrEqual(k.y + k.h);
  expect(t.x).toBeGreaterThan(k.x); expect(t.x + t.b).toBeLessThan(k.x + k.b);
  // söder om trappan, på marken
  await page.evaluate(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [t.x + t.b / 2, t.y + t.h + 18]);
  await expect.poll(async () => { const p = await page.evaluate(() => window.__ORDSTAVEN.position()); return Math.abs(p.y - (t.y + t.h + 18)) < 4; }, { timeout: 8000 }).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.niva().niva)).toBe(0);
  await page.screenshot({ path: 'test-results/k1s08-trappan-fran-soder.png' });
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 10000 }).toMatch(/\[framme\] kronet/);
  await page.keyboard.up('ArrowUp');
  expect(await page.evaluate(() => window.__ORDSTAVEN.niva().niva)).toBe(1);
  await page.screenshot({ path: 'test-results/k1s08-uppe-pa-kronet.png' });
});

test('menyn för vuxna hoppar till en scen i ett senare kapitel: det som kommer före spolas fram, och ungen är med', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s00_start');
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="test"]');
  await expect(page.locator('#vuxenmeny .kapitelrad')).toHaveCount(3); // prologen, kapitel 1 och kapitel 2 (0.45.0)
  await page.screenshot({ path: 'test-results/meny-alla-kapitel.png' });
  await page.click('#vuxenmeny .scenlista .scen[data-kapitel="kap-01"][data-i="5"]'); // k1s07_stigarna, pass 2
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
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.unge.namn), { timeout: 10000 }).toBe('KNOPP');
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('k1s07_stigarna');
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.unge).toMatchObject({ namn: 'KNOPP', folj: true });
  expect(t.spelare.hjalte.formler).toEqual(expect.arrayContaining(['LJUS', 'SVÄRD']));
  expect(t.spelare.hjalte.lager.hjalmdekor).toBe('taggkam');
  expect(await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').unge.visible)).toBe(true);
  await expect(page.locator('#hud-bar')).toBeVisible();
  // stegen står kvar vid apans bo (gläntan i tillståndet räddad)
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stege');
  // ugglorna i det rätta trädets krona är dolda tills trädet är valt (52.3): de visar aldrig läsvalet
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).not.toContain('ugglor');
});

// ---------------------------------------------------------------- T4c (stilguiden §3)
test('molnet: uppgiften står nere till vänster med en bild av handlingen och en högtalare som läser den igen', async ({ page }) => {
  await provscen(page, { id: 't_moln', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [R('Tryck på bären, så får {unge} ett.', 'berattare', { vantar_pa: 'mata_ungen' }), R('Klart.')] });
  const moln = page.locator('#tanke');
  await expect(moln).toBeVisible();
  await expect(moln.locator('.instruktion')).toHaveText('TRYCK PÅ BÄREN, SÅ FÅR KNOPP ETT.');
  await expect(moln.locator('.moln-bild')).toBeVisible();
  await expect(moln.locator('.moln-hogtalare')).toBeVisible();
  // nere till vänster i rummet
  const r = await moln.boundingBox(); const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
  expect(r.x).toBeLessThan(s.vanster + s.cssBredd / 2);
  expect(r.y + r.height).toBeGreaterThan(s.topp + s.cssHojd / 2);
  await page.screenshot({ path: 'test-results/t4c-molnet.png' });
  await page.click('#tanke .moln-hogtalare');
  await page.click('#hud-bar');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 8000 });
  await expect(moln).toBeHidden();
});

test('frågan står kvar ovanför korten, och ett tryck på stjärnan läser den igen', async ({ page }) => {
  await provscen(page, { id: 't_fraga', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [R('Vad vill {unge} äta?'), { typ: 'pussel', pussel_id: 'p0_bar' }] });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .kortrad')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#plattan .fraga-rad .text')).toHaveText('VAD VILL KNOPP ÄTA?');
  await expect(page.locator('#plattan .fraga-rad .stjarna')).toBeVisible();
  await page.screenshot({ path: 'test-results/t4c-fragan.png' });
});

test('luckorna: frågan och bilden överst, tre rader i hela bredden som är luckor, en mening per rad', async ({ page }) => {
  const luckor = kap01.pussel.find((p) => p.id === 'k1_luckorna');
  await provscen(page, { id: 't_luckor', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 't_luckorna' }] }, null, { pussel: [{ ...luckor, id: 't_luckorna' }] });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .pussel-ruta.luckor')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#plattan .fraga-rad .text')).toHaveText('VILKEN LUCKA PASSAR KNOPP?');
  await expect(page.locator('#plattan .fraga-rad .fraga-bild')).toBeVisible();
  const rader = page.locator('#plattan .kort.lucka');
  await expect(rader).toHaveCount(3);
  // varje mening ryms på en rad (skala ×4): raden är lägre än två textrader
  for (const h of await rader.evaluateAll((els) => els.map((e) => e.querySelector('.kort-etikett').getBoundingClientRect().height / parseFloat(getComputedStyle(e.querySelector('.kort-etikett')).fontSize)))) expect(h).toBeLessThan(2);
  await page.screenshot({ path: 'test-results/t4c-luckorna.png' });
  await rader.first().click();
});

// ---------------------------------------------------------------- pass 3 och låset (beslut 24.2)
/** En sparning där prologen är spelad till slut, med namnen. */
async function prologenKlar(page, extra = null) {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate((n) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true; t.spelare.hjalte.formler = ['LJUS'];
    av.kapitelId = 'kap-00'; av.scenId = 's22_tradgarden'; av.scen = n.i; av.steg = n.steg; av.startad = true; av.spolat = [];
    av.ui = { nosknappen: true, barraknaren: true, radioramen: true };
    if (n.extra) (0, eval)(`(${n.extra})`)(t);
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { i: kap00.scener.length - 1, steg: kap00.scener.at(-1).steg.length, extra: extra ? String(extra) : null });
}
const kap00 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));

test('kapitel 1 är låst efter prologen: slutrutan kommer i stället, FORTSÄTT kommer dit igen, och den vuxne öppnar kapitlet', async ({ page }) => {
  test.setTimeout(60000);
  await prologenKlar(page);
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  const sagt = [];
  for (let i = 0; i < 40 && !(await page.locator('.pass-slut.kapitel-last').isVisible()); i++) {
    const r = page.locator('#plattan .replik-ruta');
    if (await r.isVisible()) { sagt.push(await r.locator('.text').textContent()); await r.click(); }
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.pass-slut.kapitel-last')).toBeVisible();
  expect(sagt).toEqual(['VART LEDER KARTAN NU?', 'FORTSÄTTNING FÖLJER!']); // slutrutan efter vilket kapitel som helst (67.4)
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('kapitlet är låst: kap-01');
  // ingen knapp som raderar eller börjar om
  await expect(page.locator('.pass-slut .om')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/kapitel-last.png' });
  // den vuxne öppnar kapitel 1 på enheten, och då fortsätter spelet där
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await page.locator('#vuxenmeny .kapitel-oppet[data-kapitel="kap-01"]').check();
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s01_brynet');
});

test('menyn för vuxna startar ett pass: pass 3 börjar med morgonen, namnen och det som kommer före finns kvar', async ({ page }) => {
  test.setTimeout(60000);
  await prologenKlar(page);
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await expect(page.locator('#vuxenmeny .pass-start')).toHaveCount(8); // prologens tre pass, kapitel 1:s två och kapitel 2:s tre
  await page.screenshot({ path: 'test-results/meny-pass.png' });
  await page.locator('#vuxenmeny .pass-start', { hasText: 'Prologen, pass 3' }).click();
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('s19_morgon');
  await expect(page.locator('#plattan .dop-ruta')).toHaveCount(0);
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.hjalte.namn).toBe('TESTA');
  expect(t.spelare.unge).toMatchObject({ namn: 'KNOPP', folj: true });
  expect(t.aventyr['den-gomda-dalen'].kartbitar).toEqual([1]);
  expect(t.spelare.hjalte.grad).toBe('Lärling');
});

test('sparfilen: den vuxne sparar hela sparningen som en fil och läser in den igen efter att ha börjat om', async ({ page }, info) => {
  test.setTimeout(60000);
  await prologenKlar(page);
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="sparfil"]');
  // spara: en fil i Hämtade filer med hela sparningen
  const [hamtad] = await Promise.all([page.waitForEvent('download'), page.click('#vuxenmeny .spara-fil')]);
  expect(hamtad.suggestedFilename()).toMatch(/^ordstaven-sparfil-\d{8}-\d{4}\.json$/);
  const fil = info.outputPath('sparfil.json');
  await hamtad.saveAs(fil);
  const data = JSON.parse(readFileSync(fil, 'utf8'));
  expect(data).toMatchObject({ app: 'ORDSTAVEN', spelare: { hjalte: { namn: 'TESTA' }, unge: { namn: 'KNOPP' } } });
  await expect(page.locator('#vuxenmeny .sparfil-svar')).toContainText('Sparad');
  // börja om: sparningen är tom
  await page.click('#vuxenmeny .nollstall');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.hjalte.namn ?? null)).toBeFalsy();
  // en fil som inte är en sparning: ett svar, och inget byts
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="sparfil"]');
  await page.setInputFiles('#vuxenmeny .las-fil-val', { name: 'fel.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"NAGOT_ANNAT"}') });
  await expect(page.locator('#vuxenmeny .sparfil-svar')).toContainText('gick inte att läsa');
  // läs in: spelet startar om med sparningen från filen
  // (filen läses som innehåll: Chromium tar inte en sökväg med å, ä och ö här)
  await page.setInputFiles('#vuxenmeny .las-fil-val', { name: 'sparfil.json', mimeType: 'application/json', buffer: readFileSync(fil) });
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.tillstand().spelare.hjalte.namn === 'TESTA', null, { timeout: 15000 });
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.unge.namn).toBe('KNOPP');
  expect(t.aventyr['den-gomda-dalen']).toMatchObject({ kapitelId: data.aventyr['den-gomda-dalen'].kapitelId, scenId: data.aventyr['den-gomda-dalen'].scenId });
  expect(t.spelare.larande).toEqual(data.spelare.larande);
  // den gamla (tomma) sparningen ligger i backup
  expect(await page.evaluate(() => !!localStorage.getItem('ordstaven_spar_backup'))).toBe(true);
});

// ---------------------------------------------------------------- textgrammatiken (T4b, beslut 21)
test('textgrammatiken: berättaren i en rak ruta med stjärnan, Farfar i en pratruta, och det som sägs rullas fram', async ({ page }) => {
  await provscen(page, { id: 't_grammatik', pass: 1, rum: 'vinden', tillstand: 'natt', steg: [
    R('Det är mörkt. Men något glimmar längst bort i hörnet.'), R('Hörde du? Mina knän är för stela.', 'farfar'), { typ: 'ljud', id: 'dunk', ljudord: 'dunk' }, R('Klart.')] }, null, {}, '&rulla');
  // berättaren: rak ruta, svalt papper, stjärnan på ansiktets plats
  await expect(page.locator('#plattan .replik-ruta.berattarruta .portratt.stjarna')).toBeVisible({ timeout: 5000 });
  // texten rullar: tecknen har sin plats från början (dolda, inte borta), och raden hoppar inte
  const bredd0 = await page.locator('#plattan .replik-ruta .text').evaluate((e) => e.getBoundingClientRect().width);
  expect(await page.locator('#plattan .tk.dold').count()).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  expect(await page.locator('#plattan .replik-ruta .text').evaluate((e) => e.getBoundingClientRect().width)).toBe(bredd0);
  // ett tryck visar allt, och repliken står kvar; nästa tryck går vidare
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .tk.dold')).toHaveCount(0);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText(/MÖRKT/);
  await page.click('#plattan .replik-ruta');
  // Farfar: pratruta med rundade hörn, spets och ansikte
  await expect(page.locator('#plattan .replik-ruta.pratruta .portratt.p-farfar')).toBeVisible({ timeout: 5000 });
  const runda = await page.locator('#plattan .replik-ruta.pratruta').evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
  expect(runda).toBeGreaterThan(15);
  // utan tryck rullar den klart av sig själv, ca 40 tecken per sekund
  await expect(page.locator('#plattan .tk.dold')).toHaveCount(0, { timeout: 3000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[rullning\] \d+ tecken på \d+ ms/);
  await page.click('#plattan .replik-ruta');
  // ljudordet i världen, i versaler, och det försvinner av sig självt
  await expect(page.locator('.ljudord')).toHaveText('DUNK', { timeout: 5000 });
  await expect(page.locator('.ljudord')).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 5000 });
});

test('textgrammatiken: uppläst text i 40 punkter, lappen i 48 på ett snett papper', async ({ page }) => {
  await provscen(page, { id: 't_storlek', pass: 1, rum: 'vinden', tillstand: 'natt', steg: [R('Hej.'), { typ: 'oppna_lasplatta', pussel_id: 'p0_dinomat' }] });
  const t = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t'));
  const px = (n) => n * Number(t || 1);
  await expect(page.locator('#plattan .replik-ruta .text')).toBeVisible({ timeout: 5000 });
  expect(await page.locator('#plattan .replik-ruta .text').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(px(40), 0);
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .lapp')).toBeVisible({ timeout: 5000 });
  expect(await page.locator('#plattan .lapp').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(px(48), 0);
  expect(await page.locator('#plattan .lapp').evaluate((e) => getComputedStyle(e).transform)).not.toBe('none');
  await page.screenshot({ path: 'tests/skarmdumpar/lappen-papper.png' });
});

test('hjälten ur inkorgen: en bild per riktning, gången byter bild, staven syns när han har en formel, huden byts', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_figur', pass: 1, rum: 'provrum', steg: [{ typ: 'ga_till', mal: 'sten' }, R('Framme.')] }, (t) => { t.spelare.hjalte.formler = []; t.spelare.hjalte.utseende = { hudfarg: 2 }; }, {
    rum: { provrum: { innehall: ['sten'] } },
    kartor: { provrum: provkarta([{ name: 'sten', type: 'sak', x: 280, y: 20, width: 24, height: 16 }], { x: 40, y: 170 }) },
  });
  const bild = () => page.evaluate(() => window.__ORDSTAVEN.hjaltebild());
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst());
  // utan formel: ingen stav. Huden är bytt (en egen textur för valet), och han står vänd mot oss
  expect(await bild()).toMatchObject({ bild: 'hjalte_ga_ner_01', stav: false });
  expect((await bild()).textur).toMatch(/^hjalte:/);
  await page.screenshot({ path: 'test-results/hjalte-hud.png' });
  // åt höger: bilderna åt höger, och gången byter bild medan han går
  const sedda = new Set();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150);
  for (let i = 0; i < 12; i++) { sedda.add((await bild()).bild); await page.waitForTimeout(60); }
  await page.keyboard.up('ArrowRight');
  expect([...sedda].every((b) => b.startsWith('hjalte_ga_hoger_'))).toBe(true);
  expect(sedda.size).toBeGreaterThan(1);
  // han stannar: första bilden
  await expect.poll(async () => (await bild()).bild).toBe('hjalte_ga_hoger_01');
  for (const [tangent, riktning] of [['ArrowUp', 'upp'], ['ArrowLeft', 'vanster'], ['ArrowDown', 'ner']]) {
    await page.keyboard.down(tangent); await page.waitForTimeout(250); await page.keyboard.up(tangent);
    await expect.poll(async () => (await bild()).bild).toBe(`hjalte_ga_${riktning}_01`);
  }
  // en formel: staven syns i handen (den kommer med nästa steg)
  await page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.hjalte.formler.push('LJUS'));
  await tryckPa(page, 'sten');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 10000 }); await page.keyboard.press('Space');
  await expect.poll(async () => (await bild()).stav, { timeout: 10000 }).toBe(true);
  await page.screenshot({ path: 'test-results/hjalte-stav.png' });
});

test('Herr Skata flyger förbi när han skrattar, och lätet får låta klart', async ({ page }) => {
  await provscen(page, { id: 't_skata', pass: 1, rum: 'provrum', steg: [R('Lyssna.'), { typ: 'ljud', id: 'fagel_late' }, R('Där flög han.')] }, null, {
    rum: { provrum: { innehall: [] } }, kartor: { provrum: provkarta([]) },
  });
  await page.evaluate(() => { window.__flog = []; setInterval(() => { const f = window.__ORDSTAVEN.flygande(); if (f.length) window.__flog.push(...f); }, 30); });
  await page.locator('#plattan .replik-ruta').click();
  await expect.poll(() => page.evaluate(() => window.__flog.length), { timeout: 8000 }).toBeGreaterThan(0);
  const bilder = await page.evaluate(() => [...new Set(window.__flog)]);
  expect(bilder.every((b) => b.startsWith('herr_skata_flyga_hoger_'))).toBe(true);
  await page.screenshot({ path: 'test-results/herr-skata.png' });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.flygande().length), { timeout: 8000 }).toBe(0);
});

test('Prologen, pass 3 i menyn: inget från kapitel 1 finns kvar, och kapitel 1 är låst igen (beslut 26.6)', async ({ page }) => {
  test.setTimeout(60000);
  // en sparning där kapitel 1 är spelat på enheten: SVÄRD, kartbit 2, Dinoboken, ryggsäcken, hjälmdekoren, bären
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP'; t.spelare.hjalte.utseende = { hudfarg: 1 };
    t.spelare.hjalte.formler = ['LJUS', 'SVÄRD']; t.spelare.dinobok = [{ bild: 'fossil_och_ungen', bildtext: 'fossil' }];
    t.spelare.hjalte.garderob = [{ sort: 'hjalmdekor', id: 'taggkam' }, { sort: 'ryggsack', id: 'ryggsack_skog' }];
    t.spelare.hjalte.lager = { hjalmdekor: 'taggkam', ryggsack: 'ryggsack_skog' };
    t.spelare.unge.tillagg = ['nosmonster'];
    Object.assign(av, { kapitelId: 'kap-01', scen: 10, scenId: 'k1s10', bar: 15, kartbitar: [1, 2], frivilligt: ['buskarna'] });
    t.installningar = { ...t.installningar, oppnadeKapitel: ['kap-01'] };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await expect(page.locator('#vuxenmeny .kapitel-oppet[data-kapitel="kap-01"]')).toBeChecked();
  await page.locator('#vuxenmeny .pass-start', { hasText: 'Prologen, pass 3' }).click();
  await page.waitForURL((u) => true);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s19_morgon');
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  const av = t.aventyr['den-gomda-dalen'];
  expect(t.spelare.hjalte.formler).not.toContain('SVÄRD');
  expect(t.spelare.hjalte.formler).toContain('LJUS');
  expect(av.kartbitar).toEqual([1]);
  expect(t.spelare.dinobok).toEqual([]);
  expect(t.spelare.hjalte.lager).toEqual({ hjalmdekor: null, ryggsack: null, drakt: null });
  expect(t.spelare.hjalte.garderob).toEqual([]);
  expect(t.spelare.unge.tillagg).toEqual([]);
  expect(av.bar).toBe(6); // högst det prologen ger före pass 3
  expect(av.frivilligt || []).toEqual([]);
  // namnen och utseendet står kvar
  expect(t.spelare.hjalte.namn).toBe('TESTA'); expect(t.spelare.unge.namn).toBe('KNOPP'); expect(t.spelare.hjalte.utseende).toEqual({ hudfarg: 1 });
  // kapitel 1 är låst igen
  expect(t.installningar.oppnadeKapitel || []).not.toContain('kap-01');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/kap-01 låst \(hopp bakåt\)/);
});

test('Farfars hus i grafik: rummets bild, föremålen som bilder, och hjälten sover i sängen tills han ska gå (pass 3)', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP';
    Object.assign(av, { kapitelId: 'kap-00', scenId: 's19_morgon', spolaTill: 's19_morgon', spolat: [], startad: false, scen: 21 }); delete av.steg;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s19_morgon');
  // han sover: hjälten syns inte, sängen visar honom
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.synlig())).toBe(false);
  expect(await page.evaluate(() => window.__ORDSTAVEN.grafik())).toMatchObject({ golv: 'rum_sovrummet', sang: expect.stringMatching(/^hjalte_sang_(0[34]|morgon_0[12])$/) });
  // morgonen (mellanscenens bild): han är vaken, och ungen ligger på täcket och slickar honom på näsan
  for (let i = 0; i < 20 && !/morgon/.test((await page.evaluate(() => window.__ORDSTAVEN.grafik())).sang); i++) { await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(150); }
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).sang).toMatch(/^hjalte_sang_morgon_0[12]$/);
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).unge).toBe(false);
  await page.screenshot({ path: 'test-results/hus-sover.png' });
  // repliker hör han i sängen, och när han ska gå kliver han ur
  for (let i = 0; i < 8 && (await steg(page))?.typ !== 'ga_till'; i++) { await page.locator('#plattan .replik-ruta').click().catch(() => {}); await page.waitForTimeout(150); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.synlig())).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.grafik())).toMatchObject({ sang: 'sang', unge: true });
  await tryckPa(page, 'dorr_hallen');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('s20_hallen_morgon');
  // rummets bild kommer när glidningen är klar (scenen byter först)
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.grafik())).golv, { timeout: 5000 }).toBe('rum_hallen');
  await page.screenshot({ path: 'test-results/hus-hallen.png' });
});

test('Pass 3 komplett: luftskeppet i trädgården, baronens porträtt, packlistans bildkort och sidovyn in i skogen', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP';
    Object.assign(av, { kapitelId: 'kap-00', scenId: 's22_tradgarden', spolaTill: 's22_tradgarden', spolat: [], startad: false, scen: 25 }); delete av.steg;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s22_tradgarden');
  const grafik = () => page.evaluate(() => window.__ORDSTAVEN.grafik());
  const sett = new Set(); const minerna = new Set();
  let skylt = false; const pose = { sedd: false, stav: false, under: new Set() };
  const texter = []; // allt som står på plattan (slutrutan kan komma innan sidovyn syns i snabbläget)
  // plattans texter samlas också i sidan, så att en replik som klickas bort mellan två avläsningar kommer med
  await page.evaluate(() => { const w = /** @type {any} */ (window); w.__texter = []; new MutationObserver(() => { const t = document.querySelector('#plattan')?.textContent; if (t) w.__texter.push(t); }).observe(document.querySelector('#plattan'), { childList: true, subtree: true, characterData: true }); });
  for (let i = 0; i < 160; i++) {
    const g = await grafik();
    const tp = await page.evaluate(() => document.querySelector('#plattan')?.textContent || '');
    if (tp) texter.push(tp);
    if (g.luftskepp) sett.add(g.luftskepp);
    // hjälten håller upp kartbiten medan baronen spanar på den och talar om den, utan staven
    const hb = await page.evaluate(() => window.__ORDSTAVEN.hjaltebild());
    if (hb.bild === 'hjalte_kartbit_upp_01') {
      if (!pose.sedd) await page.screenshot({ path: 'test-results/pass3-kartbiten.png' });
      pose.sedd = true; pose.stav ||= hb.stav; if (g.luftskepp) pose.under.add(g.luftskepp);
    }
    if (g.luftskepp === 'luftskepp_laser_skyltarna' && !sett.has('skott2')) { sett.add('skott2'); await page.screenshot({ path: 'test-results/pass3-laser-skyltarna.png' }); }
    if (g.luftskepp?.startsWith('luftskepp_flyger_fel') && !sett.has('skott3')) { sett.add('skott3'); await page.waitForTimeout(500); await page.screenshot({ path: 'test-results/pass3-flyger-fel.png' }); }
    const p = await page.evaluate(() => document.querySelector('#plattan .portratt.p-baronen')?.className ?? null);
    if (p) minerna.add(/u-(\w+)/.exec(p)?.[1] || 'stolt');
    if (g.luftskepp === 'luftskepp_skata_landar' && !sett.has('skott')) { sett.add('skott'); await page.screenshot({ path: 'test-results/pass3-luftskepp.png' }); }
    const s = await steg(page);
    if (s?.typ === 'fritt') { await tryckPa(page, 'tva_buskar'); await page.locator('#handknapp').click({ timeout: 5000 }).catch(() => {}); continue; }
    if (s?.typ === 'pussel' && !(await page.evaluate(() => window.__ORDSTAVEN.fryst()))) {
      if (!skylt) { skylt = true; await page.waitForTimeout(800); await page.screenshot({ path: 'test-results/pass3-trasslar.png' }); }
      await page.locator('#skyltar .skylt[data-objekt="stig_skogen"] .kort').click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400); continue;
    }
    if (g.senasteSidovy === 'in_i_skogen') { await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/pass3-sidovy.png' }); break; }
    await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  // lägena i berättelsens ordning (Herr Skata landar två gånger: när han kommer flygande och i mellanscenen)
  expect((await grafik()).regi.filter((x, i, a) => x !== a[i - 1])).toEqual(['glider', 'skata_landar', 'ser_hjalten', 'talar', 'ser_kartan', 'pose:hjalte_kartbit_upp_01', 'talar', 'skata_putsar', 'pose:-', 'trasslar', 'laser_skyltarna', 'flyger_fel']);
  expect(sett.has('luftskepp_trasslar_02')).toBe(true);
  expect(pose.stav).toBe(false); // staven syns inte medan han håller upp kartbiten
  expect([...pose.under].every((x) => /ser_kartan|talar/.test(x))).toBe(true);
  expect((await page.evaluate(() => window.__ORDSTAVEN.hjaltebild())).bild).not.toBe('hjalte_kartbit_upp_01');
  expect(minerna.has('forvanad') && minerna.has('stolt')).toBe(true);
  expect((await grafik()).hjalm).toBe(true);
  expect((await grafik()).senasteSidovy).toBe('in_i_skogen');
  // kapitel 1 är låst: rubriken "Kapitel 1. Skogen." kommer inte, utan slutrutans krok (granskningen A 21)
  for (let i = 0; i < 40 && !texter.some((t) => t.includes('VART LEDER KARTAN NU')); i++) {
    const t = await page.evaluate(() => document.querySelector('#plattan')?.textContent || '');
    if (t) texter.push(t);
    await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  texter.push(...(await page.evaluate(() => /** @type {any} */ (window).__texter)));
  expect(texter.some((t) => t.includes('VART LEDER KARTAN NU'))).toBe(true);
  expect(texter.some((t) => t.includes('KAPITEL 1'))).toBe(false);
});

test('Packlistans bildkort: Stils bilder i stället för emoji', async ({ page }) => {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP';
    Object.assign(av, { kapitelId: 'kap-00', scenId: 's21_uppdraget', spolaTill: 's21_uppdraget', spolat: [], startad: false, scen: 23 }); delete av.steg;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (let i = 0; i < 60 && (await page.locator('#plattan img.bild.bildkort').count()) === 0; i++) {
    const s = await steg(page);
    if (s?.typ === 'ga_till') await tryckPa(page, s.mal);
    await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  const kort = await page.locator('#plattan img.bild.bildkort').evaluateAll((el) => el.map((e) => [e.getAttribute('data-bild'), e.naturalWidth, Math.round(e.getBoundingClientRect().width * devicePixelRatio) % 48]));
  expect(kort.length).toBeGreaterThanOrEqual(6);
  for (const [, b, rest] of kort) { expect(b).toBe(48); expect(rest).toBe(0); }
  await page.screenshot({ path: 'test-results/pass3-packlista.png' });
});

test('kartbiten: Stils bild i närbilden, i festen och i KARTAN, där den hör hemma i kartan (Stil 21:20)', async ({ page }) => {
  await provscen(page, { id: 't_kartbit', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', vy: 'narbild',
    steg: [R('En kartbit!'), { typ: 'ge_kartbit', nummer: 1 }, R('Visa den för Farfar!'), { typ: 'ga_till', mal: 'stege_ner' }] });
  await expect(page.locator('#narbild .karta-bitar img[data-bit="1"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#narbild')).not.toContainText('🗺️');
  // heltalsskala: bildens bredd i fysiska pixlar är en jämn multipel av bitens 87 pixlar
  const fysisk = await page.evaluate(() => document.querySelector('#narbild .kartbit-bild').getBoundingClientRect().width * devicePixelRatio);
  expect(Math.abs(fysisk / 87 - Math.round(fysisk / 87))).toBeLessThan(0.01);
  await page.screenshot({ path: 'test-results/kartbit-narbild.png' });
  await page.evaluate(() => { window.__festbit = false; new MutationObserver(() => { if (document.querySelector('#fest .karta-bitar')) window.__festbit = true; }).observe(document.querySelector('#fest'), { childList: true, subtree: true }); });
  await page.locator('#plattan .replik-ruta').click();
  await expect.poll(() => page.evaluate(() => window.__festbit), { timeout: 5000 }).toBe(true);
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('replik');
  await page.locator('#plattan .replik-ruta').click();
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('ga_till');
  await expect(page.locator('#narbild')).toBeHidden();
  await page.click('#hud-paus');
  await page.click('#pausmeny .paus-val[data-val="kartan"]');
  await expect(page.locator('#pausmeny .paus-karta .karta-bitar img[data-bit="1"]')).toBeVisible();
  await expect(page.locator('#pausmeny .paus-karta .kartbit')).toHaveCount(0); // ingen emoji för en ritad bit
  await page.screenshot({ path: 'test-results/kartbit-kartan.png' });
  await page.click('#pausmeny .paus-stang');
});

test('kedjan i molnet (36.5): instruktionen följer inte med till nästa mål i samma rum, bara när rummet byts', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_k1', pass: 1, rum: 'provskogen', steg: [R('Gå till stenen!'), { typ: 'ga_till', mal: 'sten' }] }, null, {
    rum: { provskogen: { innehall: ['sten', 'lada'] } },
    efter: [{ id: 't_k2', pass: 1, rum: 'provskogen', steg: [{ typ: 'ga_till', mal: 'lada' }, R('Klart.')] }],
  });
  await page.locator('#plattan .replik-ruta').click({ timeout: 8000 });
  await expect(page.locator('#tanke .instruktion')).toHaveText('GÅ TILL STENEN!', { timeout: 5000 });
  await tryckPa(page, 'sten');
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('t_k2');
  await page.waitForTimeout(600);
  await expect(page.locator('#tanke')).toBeHidden(); // samma rum: ingen gammal instruktion
});

test('efter en dialog står målet kvar i molnet med en bild tills han är framme, och ungen nosar mot det efter ca 15 s (31.2, 39.4)', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_malmoln', pass: 3, rum: 'hallen', tillstand: 'morgon', steg: [R('Frukost! Kom till köket!', 'farfar'), { typ: 'ga_till', mal: 'dorr_mat' }, R('Klart.')] });
  await page.locator('#plattan .replik-ruta').click({ timeout: 8000 });
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('ga_till');
  const moln = page.locator('#tanke');
  await expect(moln).toBeVisible();
  await expect(moln.locator('.instruktion')).toHaveText('FRUKOST! KOM TILL KÖKET!');
  await expect(moln.locator('img.malbild[data-bild="dorr_mat"]')).toBeVisible();
  // molnet står nere till vänster
  const r = await moln.boundingBox(), s = await page.evaluate(() => window.__ORDSTAVEN.skala());
  expect(r.x).toBeLessThan(s.vanster + s.cssBredd / 3);
  expect(r.y + r.height).toBeGreaterThan(s.topp + s.cssHojd / 2);
  await page.screenshot({ path: 'test-results/mal-i-molnet.png' });
  // ungens knuff efter ca 15 s (39.4): inte efter 11 s, men sedan nosar den mot dörren
  await page.waitForTimeout(11000);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal())).toBeNull();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.ungeMal()), { timeout: 8000, intervals: [500] }).not.toBeNull();
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[knuff] ungen nosar mot målet: dorr_mat');
  await page.locator('#skyltar .skylt[data-objekt="dorr_mat"] .kort').click();
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 10000 }).toBe('replik');
  await expect(moln).toBeHidden();
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal())).toBeNull();
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[framme\] dorr_mat .*"efter_dialog":true/);
});

test('knuffen på ett mål utan ungen (39.4): finns ingen unge som följer med glimtar målet efter ca 15 s', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_malglimt', pass: 1, rum: 'hallen', tillstand: 'morgon', steg: [{ typ: 'unge_folj', folj: false }, { typ: 'ga_till', mal: 'dorr_mat' }, R('Klart.')] });
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('ga_till');
  await page.waitForTimeout(11000);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toContain('målet glimtar: dorr_mat');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000, intervals: [500] }).toContain('[knuff] målet glimtar: dorr_mat');
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal())).toBeNull();
});

test('dörrskyltarna sitter på väggen, täcker aldrig varandra eller hjälten, och den vid dörren växer (31.2, 33.3)', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_lappar', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [{ typ: 'ga_till', mal: 'dorr_ut', vid_annan_utgang: { ljud: 'dunk' } }, R('Ute.')] });
  await expect(page.locator('#skyltar .skylt')).toHaveCount(5, { timeout: 5000 });
  const krockar = () => page.evaluate(() => {
    const p = window.__ORDSTAVEN.position(), s = window.__ORDSTAVEN.skala(), k = window.__ORDSTAVEN.kamera();
    const hj = { left: s.vanster + (p.x - 8 - k.x) * s.cssSkala, right: s.vanster + (p.x + 8 - k.x) * s.cssSkala, top: s.topp + (p.y - 26 - k.y) * s.cssSkala, bottom: s.topp + (p.y - k.y) * s.cssSkala };
    const r = [...document.querySelectorAll('#skyltar .skylt:not(.tonad) .kort')].map((e) => ({ id: e.closest('.skylt').dataset.objekt, ...e.getBoundingClientRect().toJSON() }))
      .filter((q) => q.right > s.vanster && q.left < s.vanster + s.cssBredd); // de som syns
    const over = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const fel = [];
    for (let i = 0; i < r.length; i++) { if (over(r[i], hj)) fel.push(`${r[i].id} täcker hjälten|` + JSON.stringify({ q: [r[i].left, r[i].top, r[i].right, r[i].bottom].map(Math.round), hj: [hj.left, hj.top, hj.right, hj.bottom].map(Math.round), undan: document.querySelector(`#skyltar .skylt[data-objekt="${r[i].id}"]`).dataset.undan, alla: r.map((x) => [x.id, Math.round(x.left), Math.round(x.top), Math.round(x.right)]) })); for (let j = i + 1; j < r.length; j++) if (over(r[i], r[j])) fel.push(`${r[i].id} över ${r[j].id}`); }
    return fel;
  });
  // han går längs bakväggen, där lapparna står, från höger till vänster och tillbaka. Lapparna ordnas om några
  // gånger i sekunden, så ett fel räknas när det står kvar i två prov i rad (inte medan han precis har klivit in)
  const fel = new Set();
  let forra = new Set();
  const stora = new Set();
  const prova = async () => {
    const lista = await krockar(); const nu = new Set(lista.map((f) => f.split('|')[0]));
    for (const f of lista) if (forra.has(f.split('|')[0])) fel.add(f); forra = nu;
    for (const id of await page.$$eval('#skyltar .skylt.stor', (es) => es.map((e) => e.dataset.objekt))) stora.add(id);
    expect(await page.locator('#skyltar .skylt.stor').count()).toBeLessThanOrEqual(1); // bara en stor åt gången
  };
  // upp till bakväggen, där han går rakt under lapparna
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp');
  for (const tangent of ['ArrowLeft', 'ArrowRight']) {
    await page.keyboard.down(tangent);
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(250); await prova(); }
    await page.keyboard.up(tangent);
    await page.waitForTimeout(300); await prova(); await page.waitForTimeout(150); await prova();
  }
  await page.screenshot({ path: 'test-results/lappar-hallen.png' });
  expect([...fel]).toEqual([]);
  // han gick förbi dörrarna, och skylten vid dörren växte. Hann han inte fram till någon dörr med tangenterna
  // (en långsam dator), går han fram till en
  if (!stora.size) { await tryckPa(page, 'dorr_mat'); await expect.poll(async () => { await prova(); return stora.size; }, { timeout: 10000 }).toBeGreaterThan(0); }
  // skyltarna sitter på väggen: nederkanten ovanför dörrens överkant, och de har trä (9-slice)
  const vagg = await page.evaluate(() => { const s = window.__ORDSTAVEN.skala(), k = window.__ORDSTAVEN.kamera(), o = window.__ORDSTAVEN.ruta('dorr_bok');
    const e = document.querySelector('#skyltar .skylt[data-objekt="dorr_bok"]:not(.stor) .kort'); if (!e) return null;
    const r = e.getBoundingClientRect(); return { botten: r.bottom, dorrTopp: s.topp + (o.y - k.y) * s.cssSkala, tra: getComputedStyle(e).borderImageSource }; });
  if (vagg) { expect(vagg.botten).toBeLessThanOrEqual(vagg.dorrTopp + 1); expect(vagg.tra).toMatch(/^url\(/); }
});

test('målet i molnet efter radion: instruktionen före "Tryck på radion" står där, och den följer med till nästa rum (s21, 31.2)', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_malradio', pass: 3, rum: 'koket', tillstand: 'morgon', steg: [{ typ: 'visa_ui', element: 'radioramen' },
    R('Hitta bitarna. Följ {unge} hem!', 'farfar', { via: 'radio' }), R('Tryck på radion, så säger jag det igen.', 'farfar', { vantar_pa: 'radion' }), { typ: 'ga_till', mal: 'dorr_hallen' }] },
  null, { efter: [{ id: 't_malradio_hall', pass: 3, rum: 'hallen', tillstand: 'morgon', steg: [{ typ: 'ga_till', mal: 'dorr_ut' }, R('Ute.')] }] });
  await page.locator('#plattan .replik-ruta').click({ timeout: 8000 });
  await expect.poll(async () => (await steg(page))?.vantar_pa, { timeout: 5000 }).toBe('radion');
  await page.click('#hud-radio');
  await page.locator('#plattan .replik-ruta').click({ timeout: 8000 });
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('ga_till');
  await expect(page.locator('#tanke .instruktion')).toHaveText('HITTA BITARNA. FÖLJ KNOPP HEM!');
  await expect(page.locator('#tanke img.malbild[data-bild="dorr_hallen"]')).toBeVisible();
  await tryckPa(page, 'dorr_hallen');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('t_malradio_hall');
  await expect(page.locator('#tanke img.malbild[data-bild="dorr_ut"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#tanke .instruktion')).toHaveText('HITTA BITARNA. FÖLJ KNOPP HEM!');
});

test('HUD:en i ramen till höger när ramen är bred nog, annars i rummets hörn, och inga emoji (31.4, 33.2)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 664 }); // MacBooken i helskärm: 160 punkter ram på sidan
  await provscen(page, { id: 't_hud', pass: 3, rum: 'koket', tillstand: 'morgon', steg: [R('Hej på dig!', 'farfar'), R('Klart.')] },
    (t) => { const av = t.aventyr['den-gomda-dalen']; av.ui = { ...av.ui, nosknappen: true, radioramen: true }; av.bar = 3; });
  const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
  const ruta = (sel) => page.locator(sel).boundingBox();
  for (const id of ['#hud-radio', '#hud-nos', '#hud-bar']) {
    const r = await ruta(id);
    expect(r.x, `${id} står i ramen`).toBeGreaterThanOrEqual(s.vanster + s.cssBredd);
    expect(r.width).toBeGreaterThanOrEqual(48);
    expect(await page.locator(`${id} img.ikon-px`).first().isVisible()).toBe(true);
  }
  // nere till höger, i ordningen radio, nos och bär
  const [ra, no, ba] = [await ruta('#hud-radio'), await ruta('#hud-nos'), await ruta('#hud-bar')];
  expect(ra.y < no.y && no.y < ba.y).toBe(true);
  expect(ba.y + ba.height).toBeGreaterThan(s.topp + s.cssHojd / 2);
  await expect(page.locator('#hud-bar .tal')).toHaveText('3');
  // inga emoji i det som syns (⚙ är den vuxnes)
  const emoji = await page.evaluate(() => (document.querySelector('#ui').innerText.match(/\p{Extended_Pictographic}/gu) || []).filter((c) => c !== '⚙'));
  expect(emoji).toEqual([]);
  await page.screenshot({ path: 'test-results/hud-i-ramen.png' });
  await page.setViewportSize({ width: 1280, height: 1000 }); // 4× med remsan, ingen ram på sidan: knapparna står i rummets hörn som förut
  await expect.poll(async () => (await ruta('#hud-bar')).x).toBeLessThan(s.vanster + 400);
});

test('ett samtal: hjälten och Farfar vänder sig mot varandra och ungen tittar på Farfar, men inte genom radion (34.2)', async ({ page }) => {
  await provscen(page, { id: 't_samtal', pass: 3, rum: 'koket', tillstand: 'morgon', steg: [R('Hitta bitarna.', 'farfar', { via: 'radio' }), R('Hej på dig!', 'farfar'), R('Klart.')] },
    (t) => { const av = t.aventyr['den-gomda-dalen']; av.ui = { ...av.ui, radioramen: true }; });
  await expect(page.locator('#plattan .replik-ruta.genom-radio')).toBeVisible({ timeout: 8000 });
  expect((await page.evaluate(() => window.__ORDSTAVEN.samtal('farfar_vid_bordet'))).talare).toBeUndefined(); // radion: ingen vänder sig
  await page.locator('#plattan .replik-ruta').click();
  await expect(page.locator('#plattan .replik-ruta')).toContainText('HEJ PÅ DIG!', { timeout: 8000 });
  const s = await page.evaluate(() => window.__ORDSTAVEN.samtal('farfar_vid_bordet'));
  expect(s.talare).toBe('farfar');
  // Farfar står till vänster om hjälten: hjälten tittar åt vänster eller uppåt, och Farfar mot hjälten (Stils bilder)
  expect(s.hjalte).toMatch(/hjalte_ga_(vanster|upp)_/);
  expect(s.figur).toMatch(/farfar_morgon_(hoger|ner)_01/);
  expect(s.figur).not.toBe('farfar_morgon_ner_01');
  expect(s.unge).toMatch(/_(vanster|upp)_/);
});

test('handen vid målet i molnet syns på ca två rutors avstånd, och ett tryck på den går dit (34.3)', async ({ page }) => {
  test.setTimeout(60000);
  await provscen(page, { id: 't_handtidig', pass: 3, rum: 'koket', tillstand: 'morgon', steg: [R('Ta min gamla radio på hyllan.', 'farfar'), { typ: 'ga_till', mal: 'radio' }, R('Klart.')] });
  await page.locator('#plattan .replik-ruta').click({ timeout: 8000 });
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('ga_till');
  // gå mot radion tills handen syns, och se hur långt bort han är då
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('radio')), sk = (await page.evaluate(() => window.__ORDSTAVEN.skala())).cssSkala;
  await page.mouse.click(o.x, o.y + 35 * sk); // 35 av världens pixlar under radion, i alla skalor
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  const avstand = await page.evaluate(() => { const r = window.__ORDSTAVEN.ruta('radio'), p = window.__ORDSTAVEN.position(); return Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.b)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h))); });
  expect(avstand).toBeGreaterThan(24); // längre bort än den vanliga räckvidden (1,5 rutor)
  expect(avstand).toBeLessThanOrEqual(34);
  await page.locator('#handknapp button').click();
  await expect.poll(async () => (await steg(page))?.typ, { timeout: 8000 }).toBe('replik');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[hand\] radio/);
});

test('s21b: Farfar står vid ytterdörren, vänder sig mot hjälten och säger hej då', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge.namn = 'KNOPP';
    Object.assign(av, { kapitelId: 'kap-00', scenId: 's21b_hallen_ut', spolaTill: 's21b_hallen_ut', spolat: [], startad: false, scen: 23 }); delete av.steg;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s21b_hallen_ut');
  // först "Var var vi?" (omstarten), sedan hejdå
  await framTill(page, () => /HEJ DÅ/.test(document.querySelector('#plattan .replik-ruta')?.textContent || ''));
  expect(await page.evaluate(() => window.__ORDSTAVEN.rutaPaSkarm('farfar_vid_dorren'))).not.toBeNull();
  const s = await page.evaluate(() => window.__ORDSTAVEN.samtal('farfar_vid_dorren'));
  // hjälten står till vänster om dörren: Farfar vänder sig åt vänster, mot honom (och vinkar, 51.4)
  expect(s.figur).toMatch(/^farfar_morgon_((vanster|ner|upp)_01|vinka_(vanster|ner)_0[12])$/);
  expect(s.figur).not.toBe('farfar_morgon_hoger_01');
  await page.screenshot({ path: 'test-results/s21b-farfar-vid-dorren.png' });
  await framTill(page, () => window.__ORDSTAVEN.steg()?.typ === 'ga_till');
});

test('Var var vi (F2): i början av ett pass den korta med ordet, i stället för vid_omstart', async ({ page }) => {
  const vvv = [{ pass: 1, ord: { ord: 'apa', bild: 'apa' }, kort: [{ talare: 'farfar', text: 'Kort påminnelse som blir två rader.' }], lang: [{ talare: 'farfar', text: 'Lång ett.' }, { talare: 'farfar', text: 'Lång två.' }] }];
  await provscen(page, { id: 't_vvv', pass: 1, rum: 'koket', tillstand: 'natt', vid_omstart: R('Gammal.', 'farfar'), steg: [R('Klart.')] },
    (t) => { t.aventyr['den-gomda-dalen'].startad = true; }, { var_var_vi: vvv });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KORT PÅMINNELSE SOM BLIR TVÅ RADER.', { timeout: 8000 });
  await expect(page.locator('#plattan .replik-ruta .vvv-ord .vvv-text')).toHaveText('APA');
  // rutan med ordet ryms i fönstret, också i remsan under spelytan (0.45.0)
  const ruta = await page.locator('#plattan').boundingBox();
  expect(ruta && ruta.y + ruta.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight) + 1);
  await page.screenshot({ path: 'test-results/var-var-vi-kort.png' });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 8000 });
  await expect(page.locator('#plattan .vvv-ord')).toHaveCount(0);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[var var vi] kap-00 pass 1, kort');
});

test('Var var vi (F2): mitt i ett pass efter lång tid den långa, och sedan scenens vid_omstart', async ({ page }) => {
  const vvv = [{ pass: 1, ord: { ord: 'apa' }, kort: [{ talare: 'farfar', text: 'Kort påminnelse.' }], lang: [{ talare: 'farfar', text: 'Lång ett.', via: 'radio' }, { talare: 'farfar', text: 'Lång två.', via: 'radio' }] }];
  await provscen(page, { id: 't_vvv2', pass: 1, rum: 'koket', tillstand: 'natt', vid_omstart: R('Gammal.', 'farfar'), steg: [R('Ett.'), R('Två.')] },
    (t) => { const av = t.aventyr['den-gomda-dalen']; av.startad = true; av.scenId = 't_vvv2'; av.steg = 1; }, { var_var_vi: vvv }, '&sedan=5');
  const text = page.locator('#plattan .replik-ruta .text');
  for (const t of ['LÅNG ETT.', 'LÅNG TVÅ.', 'GAMMAL.', 'TVÅ.']) {
    await expect(text).toHaveText(t, { timeout: 8000 });
    if (t === 'LÅNG ETT.') { await expect(page.locator('#plattan .replik-ruta.genom-radio .vvv-text')).toHaveText('APA'); await page.screenshot({ path: 'test-results/var-var-vi-lang.png' }); }
    if (t !== 'TVÅ.') await page.click('#plattan .replik-ruta');
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[var var vi] kap-00 pass 1, lång');
});

test('Var var vi (F2): ett pass utan post har bara vid_omstart, som förut', async ({ page }) => {
  await provscen(page, { id: 't_vvv3', pass: 1, rum: 'koket', tillstand: 'natt', vid_omstart: R('Gammal.', 'farfar'), steg: [R('Klart.')] },
    (t) => { t.aventyr['den-gomda-dalen'].startad = true; }, {}, '&sedan=9');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('GAMMAL.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toContain('[var var vi]');
});

test('menyn sätter tillbaka lärandet till passets början, utan spår av det som kom efter (F3, 32.2)', async ({ page }) => {
  test.setTimeout(60000);
  await prologenKlar(page, (t) => {
    const av = t.aventyr['den-gomda-dalen'];
    const post = (niva) => ({ niva, streak: 0, miss: 0, uppgifter: 3, forstaForsok: 3, hjalp: 0, aa: 0 });
    // en vuxen har spelat kapitel 1 snabbt i spelarens app: nivån har gått upp till L4
    t.spelare.larande.lasning = { P1_las_och_valj: post(4) };
    t.spelare.larande.historik = [{ pussel_id: 'p0_dinomat', typ: 'P1_las_och_valj', niva: 'L2', ratt: true, nar: 1000 }, { pussel_id: 'k1_skylt', typ: 'P1_las_och_valj', niva: 'L3', ratt: true, nar: 5000 }];
    const bild = (kapitel, pass, ordning, tid, niva) => ({ kapitel, pass, ordning, tid, larande: { lasning: { P1_las_och_valj: post(niva) }, skrivning: {}, ord: {}, matte: {} } });
    av.passbilder = [bild('kap-00', 3, 3, 3000, 2), bild('kap-01', 1, 1001, 4000, 3)];
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  // passen utan bild av lärandet är märkta
  await expect(page.locator('#vuxenmeny .pass-start[data-bild="nej"]')).toHaveText(['Prologen, pass 2 *', 'Skogen, pass 2 *', 'Träsket, pass 1 *', 'Träsket, pass 2 *', 'Träsket, pass 3 *']);
  await expect(page.locator('#vuxenmeny .utan-bild')).toBeVisible();
  await page.screenshot({ path: 'test-results/meny-larandet.png' });
  await Promise.all([page.waitForEvent('load'), page.locator('#vuxenmeny .pass-start', { hasText: 'Prologen, pass 3' }).click()]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  let t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.larande.lasning.P1_las_och_valj.niva).toBe(2);
  expect(t.spelare.larande.historik.map((h) => h.nar)).toEqual([1000]);
  expect(t.aventyr['den-gomda-dalen'].passbilder.map((b) => `${b.kapitel}:${b.pass}`)).toEqual(['kap-00:3']);
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/sparningen satt tillbaka till passets början.*"larande":"bild"/);
  // passet börjar: en ny bild av lärandet, med nivån som den är nu
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('s19_morgon');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[lärandet] bild vid kap-00 pass 3');
  t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.aventyr['den-gomda-dalen'].passbilder.map((b) => `${b.kapitel}:${b.pass}:L${b.larande.lasning.P1_las_och_valj.niva}`)).toEqual(['kap-00:3:L2']);
});

test('menyn låser kapitel 1 igen: sparningen står i slutet av prologen, utan något från kapitlet, och slutrutan kommer (F3)', async ({ page }) => {
  test.setTimeout(60000);
  await prologenKlar(page, (t) => {
    const av = t.aventyr['den-gomda-dalen'];
    const post = (niva) => ({ niva, streak: 0, miss: 0, uppgifter: 3, forstaForsok: 3, hjalp: 0, aa: 0 });
    // mitt i kapitel 1, med SVÄRD och kartbit 2
    av.kapitelId = 'kap-01'; av.scenId = 'k1s07_stigarna'; av.scen = 5; av.steg = 0; av.kartbitar = [1, 2]; av.spolat = ['kap-00'];
    t.spelare.hjalte.formler = ['LJUS', 'SVÄRD'];
    t.installningar = { ...t.installningar, oppnadeKapitel: ['kap-01'] };
    t.spelare.larande.lasning = { P1_las_och_valj: post(3) };
    av.passbilder = [{ kapitel: 'kap-01', pass: 1, ordning: 1001, tid: 4000, larande: { lasning: { P1_las_och_valj: post(2) }, skrivning: {}, ord: {}, matte: {} } }];
  });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await Promise.all([page.waitForEvent('load'), page.locator('#vuxenmeny .kapitel-oppet[data-kapitel="kap-01"]').click()]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.installningar.oppnadeKapitel || []).not.toContain('kap-01');
  expect(t.spelare.larande.lasning.P1_las_och_valj.niva).toBe(2);
  expect(t.spelare.hjalte.namn).toBe('TESTA');
  await page.click('.start-knapp');
  for (let i = 0; i < 40 && !(await page.locator('.pass-slut.kapitel-last').isVisible()); i++) {
    const r = page.locator('#plattan .replik-ruta');
    if (await r.isVisible()) await r.click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.pass-slut.kapitel-last')).toBeVisible();
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('kapitlet är låst: kap-01');
  // prologen är spolad fram igen, och inget från kapitel 1 finns kvar
  const efter = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(efter.spelare.hjalte.formler).toContain('LJUS');
  expect(efter.spelare.hjalte.formler).not.toContain('SVÄRD');
  expect(efter.aventyr['den-gomda-dalen'].kartbitar).toEqual([1]);
  expect(efter.aventyr['den-gomda-dalen'].kapitelId).toBe('kap-00');
  await page.screenshot({ path: 'test-results/kapitel-last-igen.png' });
});

test('räddningens knuff (beslut 58.2): 15 s utan tryck före första felet, en rätt bokstav startar om klockan, och efter ett fel kommer den en gång', async ({ page }) => {
  test.setTimeout(90000);
  const knuffar = async () => ((await page.evaluate(() => window.__ORDSTAVEN.logg())).match(/\[knuff\] ungen pekar på kategorin/g) || []).length;
  await provscen(page, { id: 't_apan2', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_apan' }, R('Räddad.')] }, null, { pussel: [P1('k1_apan')] });
  await expect(page.locator('#plattan .raddning-ruta .lapp')).toHaveText('MAN KLÄTTRAR UPP MED DEN.', { timeout: 8000 });
  // en rätt bokstav efter 7 s: klockan börjar om, så ingen knuff 12 s senare (förut kom den efter textens tid, ca 11 s)
  await page.waitForTimeout(7000);
  expect(await knuffar()).toBe(0);
  await bricka(page, 'S').click();
  await page.waitForTimeout(12000);
  expect(await knuffar()).toBe(0);
  // 15 s efter den rätta bokstaven kommer den
  await expect.poll(knuffar, { timeout: 8000, intervals: [250] }).toBe(1);
  // ett fel: knuffen kommer 3 s efter felreaktionen, en gång
  await bricka(page, 'O').click();
  await expect(bricka(page, 'O')).toHaveClass(/tonad/, { timeout: 5000 });
  await expect.poll(knuffar, { timeout: 10000, intervals: [250] }).toBe(2);
  // fler tryck, rätta och fel, ger ingen knuff till (förut kom den efter varje tryck)
  await bricka(page, 'R').click();
  await expect(bricka(page, 'R')).toHaveClass(/tonad/, { timeout: 5000 });
  await page.waitForTimeout(1500);
  await bricka(page, 'E').click();
  await page.waitForTimeout(600);
  await bricka(page, 'T').click();
  await page.waitForTimeout(5000);
  expect(await knuffar()).toBe(2);
  await bricka(page, 'G').click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('RÄDDAD.', { timeout: 10000 });
  expect(await knuffar()).toBe(2);
});

test('läsnivån följer med mellan kapitlen (14): prologen slutar på L4, kapitel 1 börjar på L4 och får kapitlets tak, och menyn visar och loggar nivån', async ({ page }) => {
  test.setTimeout(60000);
  const post = (niva, streak, uppgifter) => ({ niva, streak, miss: 0, uppgifter, forstaForsok: uppgifter, hjalp: 0, aa: 0 });
  // en påhittad sparning: prologen spelad med sex rätta läsval i följd, så att nivån har gått upp till L4
  await prologenKlar(page, (t) => { t.spelare.larande.lasning = { P1_las_och_valj: { niva: 4, streak: 0, miss: 0, uppgifter: 6, forstaForsok: 6, hjalp: 0, aa: 0 }, P28_packa: { niva: 2, streak: 1, miss: 0, uppgifter: 1, forstaForsok: 1, hjalp: 0, aa: 0 } }; });
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  // den vuxne öppnar kapitel 1, och spelet fortsätter dit
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="lasning"]');
  await expect(page.locator('#vuxenmeny .lasniva .niva.nu')).toHaveText('L4');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await page.locator('#vuxenmeny .kapitel-oppet[data-kapitel="kap-01"]').check();
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k1s01_brynet');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[lärandet\] bild vid kap-01 pass 1 .*"niva":"L4"/);
  let t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  // samma post, inte en ny: nivån och antalet uppgifter står kvar
  expect(t.spelare.larande.lasning.P1_las_och_valj).toMatchObject({ niva: 4, uppgifter: 6 });
  // menyn visar vad nivån betyder i kapitlet (taket L3), och ett hopp till kapitlets början flyttar den inte
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="lasning"]');
  await expect(page.locator('#vuxenmeny .niva-i-kapitlet')).toContainText('får han L3 (kapitlet har L2–L3)');
  await page.screenshot({ path: 'test-results/meny-lasniva.png' });
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await Promise.all([page.waitForEvent('load'), page.locator('#vuxenmeny .pass-start', { hasText: 'Skogen, pass 1' }).click()]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.larande.lasning.P1_las_och_valj).toMatchObject({ niva: 4, uppgifter: 6 });
  // att sätta nivån för hand står i loggen, med nivån före
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="lasning"]');
  await page.locator('#vuxenmeny .lasniva .niva', { hasText: 'L2' }).click();
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toMatch(/\[inställning\] läsnivån satt för hand: L4 → L2 .*"P28_fore":"L2"/);
});

test('en knuff före valet räknas som hjälp för nivån (beslut 62.2): tredje rätta i rad efter en knuff ger ingen ny nivå, men valet är rätt i föräldravyn', async ({ page }) => {
  test.setTimeout(60000);
  const luckor = kap01.pussel.find((p) => p.id === 'k1_luckorna');
  await provscen(page, { id: 't_knuffhjalp', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 't_luckorna2' }, R('Klart.')] },
    (t) => { t.spelare.larande.lasning = { P1_las_och_valj: { niva: 2, streak: 2, miss: 0, uppgifter: 2, forstaForsok: 2, hjalp: 0, aa: 0 } }; },
    { pussel: [{ ...luckor, id: 't_luckorna2', knuff: { ...luckor.knuff, efter_sek: 2 } }] });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#plattan .kort.lucka')).toHaveCount(3, { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[knuff] ungen sträcker fram fötterna igen');
  await page.locator('#plattan .kort.lucka', { hasText: 'BLÅ' }).click();
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 10000 });
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.larande.lasning.P1_las_och_valj).toMatchObject({ niva: 2, streak: 1, forstaForsok: 3, hjalp: 0 });
  expect(t.spelare.larande.historik.at(-1)).toMatchObject({ pussel_id: 't_luckorna2', ratt: true, hjalp_anvand: false, knuff_fore: true });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toContain('[nivå] P1_las_och_valj L2 → L3');
});


test('musiken följer platsen (27, beslut 64.5): rummet före kapitlet, steget musik, scenens tystnad, och räddningen in och ut', async ({ page }) => {
  test.setTimeout(60000);
  const musik = async () => (await page.evaluate(() => window.__ORDSTAVEN.musik())).onskad;
  const replikText = page.locator('#plattan .replik-ruta .text');
  await provscen(page, { id: 't_musik', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [R('Ett.'), { typ: 'musik', slinga: 'lagerelden' }, R('Två.')] }, null, {
    musik: 'skogen',
    rum: { vinden: { musik: 'natten' } },
    efter: [
      { id: 't_musik2', pass: 1, rum: 'hallen', tillstand: 'morgon', steg: [R('Tre.')] },
      { id: 't_musik3', pass: 1, rum: 'hallen', tillstand: 'morgon', musik: null, steg: [R('Fyra.')] },
      { id: 't_musik4', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k1_apan' }, R('Räddad.')] },
    ],
    pussel: [P1('k1_apan')],
  });
  // vinden har en egen slinga, som gäller före kapitlets
  await expect(replikText).toHaveText('ETT.', { timeout: 8000 });
  expect(await musik()).toBe('natten');
  // steget musik byter mitt i scenen
  await page.locator('#plattan .replik-ruta').click();
  await expect(replikText).toHaveText('TVÅ.', { timeout: 8000 });
  expect(await musik()).toBe('lagerelden');
  // nästa scen i hallen: hallen har ingen egen, så kapitlets slinga
  await page.locator('#plattan .replik-ruta').click();
  await expect(replikText).toHaveText('TRE.', { timeout: 10000 });
  expect(await musik()).toBe('skogen');
  // en scen med musik: null är tyst
  await page.locator('#plattan .replik-ruta').click();
  await expect(replikText).toHaveText('FYRA.', { timeout: 10000 });
  expect(await musik()).toBeNull();
  // räddningen spelar sin egen slinga och tonar tillbaka till platsens när den är klar
  await page.locator('#plattan .replik-ruta').click();
  await expect(page.locator('#plattan .raddning-ruta .lapp')).toHaveText('MAN KLÄTTRAR UPP MED DEN.', { timeout: 10000 });
  expect(await musik()).toBe('raddning');
  for (const b of 'STEG') { await bricka(page, b).click(); await page.waitForTimeout(450); }
  await expect(replikText).toHaveText('RÄDDAD.', { timeout: 10000 });
  expect(await musik()).toBe('natten');
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  for (const m of ['natten', 'lagerelden', 'skogen', 'tyst', 'raddning']) expect(logg).toContain(`[musik] ${m}`);
});

test('en mellanscen som redan syns (syns_redan, beslut 65) visar ingen ruta, och en utan bild gör det som förut', async ({ page }) => {
  test.setTimeout(60000);
  const replikText = page.locator('#plattan .replik-ruta .text');
  await provscen(page, { id: 't_syns', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [
    { typ: 'mellanscen', beskrivning: 'Det här syns redan i rummet.', syns_redan: true }, R('Ett.'),
    { typ: 'mellanscen', beskrivning: 'Det här syns inte än.' }, R('Två.'),
  ] });
  await expect(replikText).toHaveText('ETT.', { timeout: 8000 });
  // rutan har aldrig haft texten (den står kvar i elementet när rutan döljs)
  expect(await page.locator('#regi').textContent()).not.toContain('syns redan');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[mellanscen] syns redan');
  await page.locator('#plattan .replik-ruta').click();
  await expect(page.locator('#regi')).toHaveText('Det här syns inte än.', { timeout: 8000 });
  await expect(replikText).toHaveText('TVÅ.', { timeout: 10000 });
});

test('en reaktion och en knuff som redan syns (syns_redan, beslut 67.3) visar ingen ruta, och en utan gör det som förut', async ({ page }) => {
  test.setTimeout(60000);
  const pussel = {
    id: 't_regi', typ: 'P1_las_och_valj', knuff: { handling: 'frågan blinkar', syns_redan: true, efter_sek: 3 },
    varianter: { L1: { text: 'Välj bil.', alternativ: [
      { id: 'bil', ord: 'bil', ratt: true },
      { id: 'sol', ord: 'sol', vid_valj: { reaktion: 'en sol rullar ut', syns_redan: true, replik: R('Ett.') } },
      { id: 'ost', ord: 'ost', vid_valj: { reaktion: 'ost ploppar ut', replik: R('Två.') } },
    ] } },
  };
  await provscen(page, { id: 't_regi_scen', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 't_regi' }, R('Klart.')] }, null, { pussel: [pussel] });
  await expect(page.locator('#plattan .kort[data-id="sol"]')).toBeVisible({ timeout: 10000 });
  // knuffen kommer (loggen), men rutan får aldrig texten
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('frågan blinkar');
  expect(await page.locator('#regi').textContent()).not.toContain('frågan blinkar');
  await page.click('#plattan .kort[data-id="sol"]');
  await expect(page.locator('#plattan .svar-rad .text').first()).toHaveText('ETT.', { timeout: 8000 });
  expect(await page.locator('#regi').textContent()).not.toContain('en sol');
  await page.waitForTimeout(1500);
  await page.click('#plattan .kort[data-id="ost"]');
  await expect(page.locator('#regi')).toHaveText('ost ploppar ut', { timeout: 8000 });
});

test('Farfar i dörren och ungen som springer före (67.2), med figurerna som finns: ingen ruta', async ({ page }) => {
  test.setTimeout(60000);
  const replikText = page.locator('#plattan .replik-ruta .text');
  await provscen(page, { id: 't_farfar', pass: 1, rum: 'sovrummet', tillstand: 'natt', steg: [
    { typ: 'mellanscen', beskrivning: 'Farfar står i dörren i morgonrock.', bild: 'farfar_i_dorren' }, { typ: 'replik', talare: 'farfar', text: 'Hörde du?', upplast: true },
    { typ: 'mellanscen', beskrivning: 'Farfar går ut i hallen.', bild: 'farfar_gar_ut' }, R('Gå ut i hallen!'),
  ] });
  await expect(replikText).toHaveText('HÖRDE DU?', { timeout: 8000 });
  // han står i dörröppningen i morgonrocken, och rutan har aldrig haft texten
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.farfarIDorren()), { timeout: 3000 }).toMatchObject({ x: 159, y: 54, bild: 'farfar_natt_ner_01' });
  expect(await page.locator('#regi').textContent()).not.toContain('Farfar');
  await page.screenshot({ path: 'test-results/farfar-i-dorren.png' });
  await page.locator('#plattan .replik-ruta').click();
  await expect(replikText).toHaveText('GÅ UT I HALLEN!', { timeout: 8000 });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.farfarIDorren()), { timeout: 3000 }).toBe(null);
  expect(await page.locator('#regi').textContent()).not.toContain('Farfar');
  // ungen springer till grinden och väntar där
  await provscen(page, { id: 't_grinden', pass: 1, rum: 'tradgarden', steg: [
    { typ: 'mellanscen', beskrivning: 'Ungen springer till grinden och väntar.', unge_till: 'grind' }, R('Där är grinden.'),
  ] });
  await expect(replikText).toHaveText('DÄR ÄR GRINDEN.', { timeout: 8000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('ungen springer till grind');
  const grind = await page.evaluate(() => window.__ORDSTAVEN.ruta('grind'));
  const mal = await page.evaluate(() => window.__ORDSTAVEN.ungeMal());
  expect(Math.hypot(mal.x - (grind.x + grind.b / 2), mal.y - (grind.y + grind.h / 2))).toBeLessThan(40);
  expect(await page.locator('#regi').textContent()).not.toContain('grinden');
});

test('skogsbrynet efter hugget (beslut 66.1): från liangången norrut och österut till buskarna, och tillbaka, med piltangenterna', async ({ page }) => {
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
    await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  await page.waitForTimeout(500);
  // sparat i k1s02 när han ska gå dit gråten hörs: lianerna är huggna, hålet i häcken syns, och buskarna är redan gjorda
  // (så att han kan gå tillbaka direkt)
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const a = t.aventyr['den-gomda-dalen'];
    a.scenId = 'k1s02_lianerna'; a.scen = 1; a.steg = 17; a.visade = { ...(a.visade || {}), skogsbrynet: ['stig_genom_hacken'] };
    a.frivilligt = [...new Set([...(a.frivilligt || []), 'k1s03_buskarna'])];
    t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'SVÄRD'])];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb&kapitel=kap-01');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  // "Var var vi?" och repliken före målet klickas fram
  for (let i = 0; i < 60 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.mal)) !== 'stig_glantan'; i++) {
    const v = page.locator('#plattan:not([hidden]) .vidare'); if (await v.isVisible()) await v.click().catch(() => {}); else await page.waitForTimeout(200);
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.mal)).toBe('stig_glantan');
  const pos = () => page.evaluate(() => window.__ORDSTAVEN.position());
  const rummet = () => page.evaluate(() => (window.__ORDSTAVEN.rumsobjekt().includes('stig_lianerna') ? 'buskarna' : window.__ORDSTAVEN.rumsobjekt().includes('stig_buskarna') ? 'skogsbrynet' : 'annat'));
  const tryck = async (t, ms) => { await page.keyboard.down(t); await page.waitForTimeout(ms); await page.keyboard.up(t); await page.waitForTimeout(60); };
  /** Gå mot en punkt med piltangenterna (x-led först, eller y-led), och stanna om han står still. */
  const gaTill = async (x, y, forstY = false) => {
    for (let i = 0; i < 40; i++) {
      for (const v of await page.locator('#plattan:not([hidden]) .vidare').all()) await v.click().catch(() => {});
      const p = await pos();
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return p;
      const yled = forstY ? Math.abs(dy) >= 3 : Math.abs(dx) < 3;
      if (yled) await tryck(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.min(400, Math.abs(dy) * 12));
      else await tryck(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(400, Math.abs(dx) * 12));
      const q = await pos();
      if (Math.abs(q.x - p.x) < 0.5 && Math.abs(q.y - p.y) < 0.5) return q;
    }
    return pos();
  };
  await tryck('ArrowRight', 200);
  // genom hålet i häcken, runt stubben och formelträdet, upp genom liangången och österut i gången norr om snåret
  for (const [x, y, fy] of [[64, 126, true], [286, 126, false], [286, 106, true], [332, 106, false], [332, 140, true], [390, 140, false], [390, 104, true], [464, 104, false], [464, 44, true], [600, 44, false]]) {
    const p = await gaTill(x, y, fy);
    expect(Math.hypot(p.x - x, p.y - y), `fastnade vid ${Math.round(p.x)},${Math.round(p.y)} på väg mot ${x},${y}`).toBeLessThan(6);
  }
  expect(await rummet()).toBe('skogsbrynet');
  await gaTill(600, 38, true);
  await gaTill(640, 38);
  await expect.poll(rummet, { timeout: 10000 }).toBe('buskarna');
  // och tillbaka: ut åt väster, in i skogsbrynet vid stigen, och till liangången
  await gaTill(0, (await pos()).y);
  await expect.poll(rummet, { timeout: 10000 }).toBe('skogsbrynet');
  for (const [x, y, fy] of [[560, 44, true], [464, 44, false], [464, 104, true]]) {
    const p = await gaTill(x, y, fy);
    expect(Math.hypot(p.x - x, p.y - y), `fastnade vid ${Math.round(p.x)},${Math.round(p.y)} på väg tillbaka mot ${x},${y}`).toBeLessThan(6);
  }
  expect(await rummet()).toBe('skogsbrynet');
});

test('gläntans träd i L3 har Stils bilder (beslut 66.2): inget av de tre träden ritas som gråbox', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('./?snabb&ny&kapitel=kap-01');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (const namn of ['TESTA', 'KNOPP']) {
    await expect(page.locator('#plattan :is(.dop-ruta, .replik-ruta)')).toBeVisible({ timeout: 10000 });
    if (await page.locator('#plattan .replik-ruta').isVisible()) await page.click('#plattan .replik-ruta');
    await expect(page.locator('#plattan .dop-ruta')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(200);
    await page.keyboard.type(namn);
    await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  await page.waitForTimeout(500);
  // sparat i k1s07 med läsnivå L3: varianten med det stora gamla, det stora unga och det lilla gamla trädet
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const a = t.aventyr['den-gomda-dalen'];
    a.scenId = 'k1s07_stigarna'; a.scen = 5; a.steg = 0;
    const l = t.spelare.larande.lasning; l.P1_las_och_valj = { ...(l.P1_las_och_valj || {}), niva: 3 };
    t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'SVÄRD'])];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb&kapitel=kap-01');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().includes('stort_gammalt_trad')), { timeout: 15000 }).toBe(true);
  // träden som står på samma plats i kartan är nivåvarianter (D1): L2:s träd står inte där samtidigt
  const ids = await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt());
  for (const l2 of ['gammalt_trad', 'ungt_trad', 'ungt_trad_2']) expect(ids, l2).not.toContain(l2);
  const bilder = await page.evaluate(() => ['stort_gammalt_trad', 'stort_ungt_trad', 'litet_gammalt_trad'].map((id) => window.__ORDSTAVEN.bildFor(id)));
  expect(bilder).toEqual(['trad_stort_gammalt', 'trad_stort_ungt', 'trad_litet_gammalt']);
  // L2:s träd syns inte i L3
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => /^(gammalt|ungt)_trad/.test(id)))).toEqual([]);
  await page.screenshot({ path: 'test-results/glantan-l3-traden.png' });
});

test('SALDO i formeln med tangentbordet (77.2): ett riktigt svenskt ord är aldrig "pff", och ett grovt ord är ett försök som inte syns i loggen', async ({ page }) => {
  test.setTimeout(90000);
  const kap2 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
  const over = kap2.pussel.find((p) => p.id === 'k2_over');
  await provscen(page, { id: 't_saldo', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k2_over' }, R('Klart.')] }, (t) => { t.spelare.hjalte.formler = ['LJUS', 'SVÄRD']; }, { pussel: [over] });
  const falt = page.locator('#plattan .formel-skriv .platser .plats');
  await page.locator('#plattan .replik-ruta').click({ timeout: 10000 }).catch(() => {});
  await expect(falt).toHaveCount(3, { timeout: 10000 });
  const logg = () => page.evaluate(() => window.__ORDSTAVEN.logg());
  // KATTUNGE står inte i spelets ordlistor, men i SALDO
  await page.keyboard.type('KATTUNGE'); await page.keyboard.press('Enter');
  await expect.poll(logg, { timeout: 8000 }).toContain('k2_over: KATTUNGE (ord)');
  await expect(falt.first()).toHaveText('', { timeout: 15000 });
  // ett grovt ord: ett vanligt försök (ledbilden tänds), och ordet står inte i loggen
  await page.keyboard.type('KUK'); await page.keyboard.press('Enter');
  await expect.poll(logg, { timeout: 8000 }).toContain('k2_over: ett ord som inte visas (spärrat)');
  await expect(falt.first()).toHaveText('', { timeout: 15000 });
  expect(await logg()).not.toContain('KUK');
  expect((await logg()).split('\n').filter((r) => r.includes('k2_over:') && r.includes('(fel)')).length).toBe(0);
});

test('formeln med tangentbordet (kapitel 2, del 2): "pff" bara för det som inte är ett ord, och ordet han skrev blir det som händer', async ({ page }) => {
  test.setTimeout(90000);
  const kap2 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
  // förebilden vid första felet (vid_fel), oberoende av vad datan säger nu: trappan har ett eget test
  const over = { ...kap2.pussel.find((p) => p.id === 'k2_over'), ledbild: undefined };
  over.forebild = { ...over.forebild, visas: 'vid_fel' };
  await provscen(page, { id: 't_skriv', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k2_over' }, R('Klart.')] }, (t) => { t.spelare.hjalte.formler = ['LJUS', 'SVÄRD']; }, { pussel: [over] });
  // svaren i rutan (de står bara en kort stund i snabbläget)
  await page.evaluate(() => {
    window.__svar = [];
    new MutationObserver(() => document.querySelectorAll('#plattan .svar-rad .text').forEach((e) => { if (!window.__svar.includes(e.textContent)) window.__svar.push(e.textContent); })).observe(document.querySelector('#plattan'), { childList: true, subtree: true });
  });
  const falt = page.locator('#plattan .formel-skriv .platser .plats');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SKRIV ETT ORD MED STAVEN!', { timeout: 10000 });
  await page.locator('#plattan .replik-ruta').click();
  await expect(falt).toHaveCount(3, { timeout: 10000 }); // BRO: tre fält
  const logg = () => page.evaluate(() => window.__ORDSTAVEN.logg());
  // Å, Ä och Ö som från ett svenskt tangentbord (Playwrights type skickar dem som text, utan tangent)
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const skriv = async (ord, sort) => {
    await typ(ord); await page.keyboard.press('Enter');
    await expect.poll(logg, { timeout: 8000 }).toContain(`k2_over: ${ord} (${sort})`);
    await expect(falt.first()).toHaveText('', { timeout: 15000 }); // fälten är tomma igen efter svaret
  };
  const svar = () => page.evaluate(() => window.__svar);
  // inget ord: "pff", och förebilden tänds
  await skriv('XQZ', 'fel');
  await expect.poll(svar).toContainEqual(expect.stringContaining('PFF'));
  await expect(page.locator('#plattan .forebild')).toBeVisible();
  // fälten växer när han skriver fler bokstäver, och förebilden täcks medan han skriver (69.3)
  await page.keyboard.type('FLOT');
  await expect(falt).toHaveCount(4);
  await expect(page.locator('#plattan .forebild')).toHaveClass(/tonad/);
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  await expect(falt).toHaveCount(3);
  await expect(page.locator('#plattan .forebild')).not.toHaveClass(/tonad/);
  // ett ord som passar men inte hjälper: dess egen reaktion, aldrig "pff"
  await skriv('BÅT', 'rimligt');
  await expect.poll(svar).toContain('EN BÅT! MEN DEN ÄR FÖR LITEN.');
  // ett annat riktigt ord: det vanliga svaret
  await skriv('APA', 'ord');
  await expect.poll(svar).toContain('BRA ORD! MEN DET HJÄLPER INTE HÄR.');
  expect((await svar()).filter((t) => t.includes('PFF'))).toHaveLength(1);
  // STEGE löser det, och ordet sparas för texten men ristas inte in på staven
  await page.keyboard.type('STEGE'); await page.keyboard.press('Enter');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 15000 });
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.aventyr['den-gomda-dalen'].skrivet).toEqual({ k2_over: 'STEGE' });
  expect(t.spelare.hjalte.formler).toEqual(['LJUS', 'SVÄRD']);
  expect(await logg()).toContain('k2_over: STEGE (formel)');
});


test('hjälpens trappa i formeln med tangentbordet (69.3 och 76.2): varje försök tar ett steg, bilden, sedan ledbilden, och förebilden efter två försök', async ({ page }) => {
  test.setTimeout(90000);
  const kap2 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
  // knuffen kommer inte under det här testet (den har ett eget test)
  const over = { ...kap2.pussel.find((p) => p.id === 'k2_over'), ledbild: 'tankebubbla_bro', knuff: { handling: 'bilden glimtar', efter_sek: 600 } };
  over.forebild = { text: 'BRO', upplast: false, visas: 'andra_felet' };
  await provscen(page, { id: 't_trappa', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k2_over' }, R('Klart.')] }, (t) => { t.spelare.hjalte.formler = ['LJUS', 'SVÄRD']; }, { pussel: [over] });
  const falt = page.locator('#plattan .formel-skriv .platser .plats');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SKRIV ETT ORD MED STAVEN!', { timeout: 10000 });
  await page.locator('#plattan .replik-ruta').click();
  await expect(falt).toHaveCount(3, { timeout: 10000 });
  // instruktionen står överst med stjärnan och högtalaren (76.2, A5)
  await expect(page.locator('#plattan .formel-skriv .fraga-rad .text')).toHaveText('SKRIV ETT ORD MED STAVEN!');
  await expect(page.locator('#plattan .formel-skriv .fraga-rad .portratt.stjarna')).toHaveCount(1);
  await expect(page.locator('#plattan .formel-skriv .fraga-rad .hogtalare')).toHaveCount(1);
  const logg = () => page.evaluate(() => window.__ORDSTAVEN.logg());
  const forebild = page.locator('#plattan .forebild'), ledbild = page.locator('#plattan .formel-bild.ledbild');
  await expect(forebild).toHaveCount(0); await expect(ledbild).toHaveCount(0);
  const skriv = async (ord, sort) => {
    await page.keyboard.type(ord); await page.keyboard.press('Enter');
    await expect.poll(logg, { timeout: 8000 }).toContain(`k2_over: ${ord} (${sort})`);
    await expect(page.locator('#plattan .platser .plats.fylld')).toHaveCount(0, { timeout: 15000 }); // tomt igen
  };
  // första försöket, ett riktigt ord som inte hjälper: inget "pff", men trappan tar ett steg till bron i molnet
  await skriv('APA', 'ord');
  await expect(ledbild).toBeVisible();
  await expect(ledbild.locator('.bubbla')).toHaveCount(1);
  await expect(forebild).toHaveCount(0);
  await expect(page.locator('#plattan .plats.tand')).toHaveCount(0);
  // andra försöket, ett nästan (BOR): nu förebilden
  await skriv('BOR', 'nastan');
  await expect(forebild).toBeVisible();
  await page.screenshot({ path: 'test-results/formel-over-vattnet.png' });
  await expect(page.locator('#plattan .plats.tand')).toHaveCount(0); // nästan utan tand tänder ingen bokstav (69.3)
  await expect(forebild).not.toHaveClass(/tonad/);
  // förebilden är ett ord nosen kan läsa (76.2, A5)
  await expect(forebild.locator('.ord[data-ord="BRO"]')).toHaveCount(1);
  // nära stavning (BRÅ för BRO): "nästan", och förebilden markerar bokstaven som skiljer
  await page.keyboard.type('BR'); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'å', bubbles: true }))); await page.keyboard.press('Enter');
  await expect.poll(logg, { timeout: 8000 }).toContain('k2_over: BRÅ (nastan)');
  await expect(page.locator('#plattan .platser .plats.fylld')).toHaveCount(0, { timeout: 15000 });
  await expect(forebild.locator('.bokstav.skiljer')).toHaveText('O');
  await page.screenshot({ path: 'test-results/formel-nara-stavning.png' });
  // täck: den tonas bort när han skriver, och syns igen när fälten är tomma
  await page.keyboard.type('B');
  await expect(forebild).toHaveClass(/tonad/);
  await page.keyboard.press('Backspace');
  await expect(forebild).not.toHaveClass(/tonad/);
  // kolla: förebilden lyser över hans ord
  await page.keyboard.type('BRO'); await page.keyboard.press('Enter');
  await expect(page.locator('#plattan .formel-luft-ruta .forebild.kolla')).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 15000 });
  const l = await logg();
  expect(l).toContain('k2_over: ledbilden tankebubbla_bro tänds');
  expect(l).toContain('k2_over: förebilden tänds (andra felet)');
  expect(l).toContain('k2_over: förebilden tonas bort (täck)');
  expect(l).toContain('k2_over: klar med förebild');
  expect(l).not.toContain('k2_over: BRÅ (fel)');
});

test('knuffen i formeln kommer igen och klättrar (76.2, A3): bilden glimtar, sedan ledbilden och sedan förebilden', async ({ page }) => {
  test.setTimeout(60000);
  const kap2 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
  const over = { ...kap2.pussel.find((p) => p.id === 'k2_over'), ledbild: 'tankebubbla_bro', knuff: { handling: 'bilden glimtar', efter_sek: 1, syns_redan: true } };
  over.forebild = { text: 'BRO', upplast: false, visas: 'andra_felet' };
  await provscen(page, { id: 't_knuff', pass: 1, rum: 'vinden', tillstand: 'natt_upplyst', steg: [{ typ: 'pussel', pussel_id: 'k2_over' }, R('Klart.')] }, (t) => { t.spelare.hjalte.formler = ['LJUS', 'SVÄRD']; }, { pussel: [over] });
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('SKRIV ETT ORD MED STAVEN!', { timeout: 10000 });
  await page.locator('#plattan .replik-ruta').click();
  const logg = () => page.evaluate(() => window.__ORDSTAVEN.logg());
  await expect.poll(logg, { timeout: 10000 }).toContain('k2_over: ledbilden tankebubbla_bro tänds (knuff)');
  await expect(page.locator('#plattan .formel-bild.ledbild')).toBeVisible();
  await expect.poll(logg, { timeout: 10000 }).toContain('k2_over: förebilden tänds (knuff)');
  await expect(page.locator('#plattan .forebild')).toBeVisible();
  // han kan alltid skriva av ordet: det kör aldrig fast
  await page.keyboard.type('BRO'); await page.keyboard.press('Enter');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('KLART.', { timeout: 15000 });
});
test('kapitel 2 går att gå in i (del 2): SVÄRD och vassväggen, skylten, vattnet, BRO över vattnet och in i byn, med piltangenterna', async ({ page }) => {
  const kap2data = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
  test.setTimeout(150000);
  await page.goto('./?snabb&ny&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (const namn of ['TESTA', 'KNOPP']) {
    for (let i = 0; i < 30 && !(await page.locator('#plattan .dop-ruta').isVisible()); i++) { await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(150); }
    await page.waitForTimeout(200); await page.keyboard.type(namn); await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  const pos = () => page.evaluate(() => window.__ORDSTAVEN.position());
  const tryck = async (t, ms) => { await page.keyboard.down(t); await page.waitForTimeout(ms); await page.keyboard.up(t); await page.waitForTimeout(60); };
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  /** Gå mot en punkt med piltangenterna, x-led först. */
  const gaTill = async (x, y) => {
    for (let i = 0; i < 40; i++) {
      await vidare();
      const p = await pos(), dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (Math.abs(dx) >= 4) await tryck(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(400, Math.abs(dx) * 12));
      else await tryck(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.min(400, Math.abs(dy) * 12));
    }
  };
  const gjort = new Set();
  for (let i = 0; i < 120; i++) {
    const [scen, st] = await page.evaluate(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen !== 'k2s01_kanten') break;
    const nyckel = `${st?.typ}:${st?.mal || st?.foremal || st?.pussel_id || ''}`;
    if (st?.typ === 'las_skylt' && !gjort.has(nyckel)) { gjort.add(nyckel); await gaTill(139, 90); continue; }
    // vassväggen (75.3): han hugger tussarna i gången med Mellanslag, och går sedan genom gången
    if (st?.typ === 'pussel' && st.pussel_id === 'k2_vassvaggen' && !(await page.locator('#plattan').isVisible())) {
      const p = kap2data.pussel.find((x) => x.id === 'k2_vassvaggen');
      const gang = p.innehall.map((x, i) => (x === p.falt.klar_nar ? `vass_tat_${i}` : null)).filter(Boolean);
      const kvar = await page.evaluate((g) => g.map((id) => window.__ORDSTAVEN.ruta(id)).filter(Boolean).sort((a, b) => a.x - b.x || a.y - b.y), gang);
      if (kvar.length) { await gaTill(kvar[0].x - 8, kvar[0].y + kvar[0].h / 2); await page.keyboard.press('Space'); await page.waitForTimeout(400); }
      else await gaTill(140, 115);
      continue;
    }
    // ungen sitter fast i leran (69.1): han går dit, mot ungen, tills han når den
    if (st?.typ === 'ga_till' && st.mal === 'unge') { const u = await page.evaluate(() => window.__ORDSTAVEN.ungePos()); await gaTill(u.x - 16, u.y); continue; } // från vänster, utanför leran
    if (st?.typ === 'ga_till' && st.mal === 'vattnet' && !gjort.has(nyckel)) { gjort.add(nyckel); await gaTill(140, 96); await gaTill(300, 96); await gaTill(452, 96); await page.keyboard.press('Space'); continue; }
    if (st?.typ === 'ga_till' && st.mal === 'stig_byn') { await gaTill(470, 96); await gaTill(636, 96); continue; }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      // vassen först (71.6): SVÄRD, med Ä som en tangent; sedan BRO över vattnet
      if (st?.pussel_id === 'k2_svard') { await page.keyboard.type('SV'); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ä', bubbles: true }))); await page.keyboard.type('RD'); }
      else await page.keyboard.type('BRO');
      await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    await vidare(); await page.waitForTimeout(150);
  }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('k2s02_byn');
  expect(await page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('stig_kanten');
  const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(t.aventyr['den-gomda-dalen'].skrivet).toMatchObject({ k2_over: 'BRO' });
  expect(t.spelare.hjalte.formler).not.toContain('BRO');
  await page.screenshot({ path: 'test-results/kap2-byn.png' });
});

test('navet i kapitel 2 (del 3): dammen lockar, bryggan först, halvan bärs till ramen i byn, passet slutar, och pass 3 börjar med halvan som är kvar', async ({ page }) => {
  test.setTimeout(180000);
  // en sparning i kapitel 2, framme vid navet på torget efter skyltarna (repen har fallit)
  await page.goto('./?snabb&ny&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    // kapitlen före spolas fram när sidan laddas (namnen finns, så inget dop frågas efter)
    Object.assign(av, { kapitelId: 'kap-02', scen: 2, scenId: 'k2s03_torget', steg: 6, pass: 2, startad: true, rumstillstand: { byn: 'fri' }, skrivet: { k2_over: 'BRO' }, visade: { byn: ['fjader', 'tant_rosa', 'brevram'] } });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    delete av.nav; delete av.effekt;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const scen = () => page.evaluate(() => window.__ORDSTAVEN.scen());
  const steg = () => page.evaluate(() => window.__ORDSTAVEN.steg());
  const logg = () => page.evaluate(() => window.__ORDSTAVEN.logg());
  const av = () => page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen']);
  /** Gå mot ett föremål som ett tryck på marken: mitt i en utgång, framför (under) en sak. */
  const gaMot = (id, dy = 0) => page.evaluate(([id, dy]) => { const o = window.__ORDSTAVEN.ruta(id); if (!o) return false; window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.sort === 'utgang' ? o.y + o.h / 2 : o.y + o.h + 6 + dy); return true; }, [id, dy]);
  const tills = async (villkor, gor, n = 80) => { for (let i = 0; i < n; i++) { if (await villkor()) return; await gor(); await page.waitForTimeout(200); } throw new Error('kom inte fram'); };

  // pass 2 börjar i navet: Farfars påminnelse, sedan navet med båda grenarna
  await tills(async () => (await steg())?.typ === 'nav', vidare);
  expect(await logg()).toContain('[var var vi] kap-02 pass 2');
  expect(await page.locator('#tanke').isVisible()).toBe(true);
  // förbi dammens stig: grodorna lockar, och ungen springer dit (repen har fallit, så han kan gå dit)
  await page.evaluate(() => { const o = window.__ORDSTAVEN.ruta('stig_dammen'); window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 28); });
  await expect.poll(logg, { timeout: 15000 }).toContain('[lockar] k2s06_dammen vid stig_dammen');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.ungeMal()?.x)).toBe(566); // mitt för stig_dammen
  // bryggan först
  await tills(async () => (await scen()) === 'k2s04_bryggan', () => gaMot('stig_bryggan'));
  expect(await logg()).toContain('[vägval] gren k2s04_bryggan först');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('brygga');
  // scenen vid bryggan: ett läsval på Farfars halva (k2_halvan, 76.4), och sedan bär han den till ramen i byn
  let lyste = [];
  const halvanFel = page.locator('#plattan .kort[data-id="under"]');
  let feltProvat = false;
  for (let i = 0; i < 200; i++) {
    const st = await steg();
    if ((await scen()) !== 'k2s04_bryggan') break;
    // INTE i guld när han har valt rätt (lys_ord, 2.43)
    if (await page.locator('#plattan .ord.lyser').count()) lyste = [...new Set([...lyste, ...(await page.locator('#plattan .ord.lyser').allTextContents())])];
    if (st?.typ === 'pussel' && st.pussel_id === 'k2_halvan' && (await halvanFel.isVisible().catch(() => false))) {
      // först baronens mening (fel, han nickar och gräver), sedan den som står på brevet
      if (!feltProvat) { feltProvat = true; await halvanFel.click(); await page.waitForTimeout(400); continue; }
      await page.locator('#plattan .kort[data-id="inte_under"]').click({ timeout: 1000 }).catch(() => {});
      for (let j = 0; j < 20 && !lyste.length; j++) { lyste = await page.locator('#plattan .ord.lyser').allTextContents(); await page.waitForTimeout(100); }
      continue;
    }
    if (await page.locator('#plattan').isVisible()) await vidare();
    else if (st?.typ === 'las_skylt') await gaMot(st.foremal);
    else if (st?.typ === 'bara') {
      const har = await page.evaluate((m) => !!window.__ORDSTAVEN.ruta(m), st.till);
      if (!har) await gaMot('stig_byn_bryggan');
      else { await gaMot(st.till); await page.waitForTimeout(400); await page.keyboard.press('Space'); }
    } else await vidare();
    await page.waitForTimeout(200);
  }
  expect(await logg()).toContain('[bära] bryggan → byn');
  expect(lyste).toContain('INTE');
  expect(await logg()).toMatch(/k2_halvan: INTE lyser/);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt())).toContain('brevram');
  // tillbaka i navet: Tant Rosa, passets slut (▶ fortsätter), och navet med vassen kvar
  await tills(async () => (await steg())?.typ === 'nav', vidare);
  let a = await av();
  expect(a.nav).toMatchObject({ scen: 'k2s03_torget', klara: ['k2s04_bryggan'], pass: 3 });
  expect(a.pass).toBe(3);
  expect(a.flyttad).toBeUndefined();
  await page.screenshot({ path: 'test-results/kap2-navet.png' });
  // FORTSÄTT: pass 3 börjar med halvan som är kvar (vassen), inte med skyltarna
  await page.goto('./?snabb&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await tills(async () => (await steg())?.typ === 'nav', vidare);
  const l = await logg();
  expect(l).toContain('[var var vi] kap-02 pass 3');
  expect(l).not.toContain('Baronen satte upp skyltar');
  a = await av();
  expect(a.nav.klara).toEqual(['k2s04_bryggan']);
  await tills(async () => (await scen()) === 'k2s05_vassen', () => gaMot('stig_vassen'));
});

test('brevet i Tant Rosas hus (kapitel 2, del 4): första meningen är redan läst, och L4 efter grodan i L4 eller på nivå L4', async ({ page }) => {
  test.setTimeout(90000);
  const sparning = async (grodan, niva = 4) => {
    await page.goto('./?snabb&ny&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.evaluate(([grodan, niva]) => {
      const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
      Object.assign(av, { kapitelId: 'kap-02', scen: 7, scenId: 'k2s08_huset', steg: 3, pass: 3, startad: true, rumstillstand: { byn: 'fri' }, skrivet: { k2_over: 'BRO' } });
      t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
      const post = (niva) => ({ niva, streak: 0, miss: 0, uppgifter: 3, forstaForsok: 3, hjalp: 0, aa: 0 });
      t.spelare.larande.lasning = { P1_las_och_valj: post(niva) };
      t.spelare.larande.historik = grodan ? [{ pussel_id: 'k2_grodan', typ: 'P1_las_och_valj', niva: 'L4', ratt: true, nar: 1000 }] : [];
      localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    }, [grodan, niva]);
    await page.goto('./?snabb&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.click('.start-knapp');
    // fram till läsvalet (det sätter varianten), utan att stänga brevet
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.__ORDSTAVEN.variant())); i++) {
      for (const v of await page.locator('#plattan:not([hidden]) .replik-ruta').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(200);
    }
  };
  // nivån är L3, och grodan är inte löst i L4: tavlorna får L3 (med eller_niva gäller L4 när nivån är L4, 76.4).
  // Brevet läses först på läsplattan (tre meningar ryms inte i bubblan), och den första meningen har han redan läst
  await sparning(false, 3);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.variant())).toBe('L3');
  const brev = page.locator('#plattan .lapp .rad');
  await expect(brev).toHaveCount(3);
  await expect(brev.first()).toHaveClass(/redan-last/);
  await expect(brev.first()).toHaveText('BITEN ÄR INTE UNDER BRYGGAN.');
  await expect(page.locator('#plattan .lapp .rad.redan-last')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/kap2-brevet.png' });
  // sedan står papperet i bubblan, och ett tryck på det öppnar brevet igen
  await page.locator('#plattan .vidare').click();
  await expect(page.locator('#tanke .tanke-lapp')).toBeVisible({ timeout: 10000 });
  await page.locator('#tanke .tanke-lapp').click();
  await expect(page.locator('#plattan .lapp .rad')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/kap2-brevet-igen.png' });
  // nivån är L4 utan grodan: L4 (eller_niva, 76.4)
  await sparning(false, 4);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.variant())).toBe('L4');
  // efter grodan i L4: L4
  await sparning(true);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.variant())).toBe('L4');
});

test('byborna (kapitel 2, del 5): ett tryck ger en vinkning och ordet i en bubbla en stund, efter byns tillstånd', async ({ page }) => {
  test.setTimeout(90000);
  const iByn = async (tillstand) => {
    await page.goto('./?snabb&ny&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.evaluate((tillstand) => {
      const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
      Object.assign(av, { kapitelId: 'kap-02', scen: 2, scenId: 'k2s03_torget', steg: 6, pass: 2, startad: true, rumstillstand: { byn: tillstand }, skrivet: { k2_over: 'BRO' } });
      t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
      localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    }, tillstand);
    await page.goto('./?snabb&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.click('.start-knapp');
    for (let i = 0; i < 40 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'nav'; i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.waitForFunction(() => !window.__ORDSTAVEN.fryst() && document.querySelector('#plattan').hidden);
  };
  const tryckPaFiskaren = async () => { const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('fiskaren')); await page.mouse.click(o.x, o.y); };
  await iByn('fri');
  await tryckPaFiskaren();
  await expect(page.locator('#rop')).toBeVisible();
  await expect(page.locator('#rop')).toHaveText('FISK');
  await page.screenshot({ path: 'test-results/kap2-bubblan.png' });
  await expect(page.locator('#rop')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[bubbla] fiskaren: fisk');
  // trycket räknas inte som något: navet står kvar
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)).toBe('nav');
  await iByn('rep');
  await tryckPaFiskaren();
  await expect(page.locator('#rop')).toHaveText('SUCK');
});

test('ekorren på kortet (Teknik 31, R67–R70): en felreaktion med bild visar ekorren bredvid kortet och ingen text för den vuxne', async ({ page }) => {
  const fel = { reaktion: 'ekorren tittar ut och skakar på huvudet', bild: 'ekorre_skakar', replik: R('Inte där. Läs lappen igen.') };
  await provscen(page, { id: 't_ekorre', pass: 1, rum: 'kontoret', steg: [{ typ: 'pussel', pussel_id: 't_lappen' }, R('Klart.')] }, null, {
    pussel: [{ id: 't_lappen', typ: 'P1_las_och_valj', papper: 'lapp', instruktion: R('Var väntar baronen?'),
      varianter: { L1: { text: 'Skata! Jag väntar vid bron.', alternativ: [{ id: 'bro', bild: 'bro', ratt: true }, { id: 'trad', bild: 'trad', vid_valj: fel }, { id: 'sten', bild: 'sten', vid_valj: fel }] } } }],
  });
  for (let i = 0; i < 20 && !(await page.locator('#plattan .kort[data-id="trad"]').isVisible()); i++) { await page.locator('#plattan .replik-ruta').click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(200); }
  await page.locator('#plattan .kort[data-id="trad"]').click();
  await expect(page.locator('.kort-figur')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(700);
  const ruta = await page.locator('.kort-figur').boundingBox();
  expect(ruta.width).toBeGreaterThan(20);
  await page.screenshot({ path: 'test-results/ekorren-pa-kortet.png' });
  expect(await page.locator('#regi').isVisible()).toBe(false);
  await expect(page.locator('.kort-figur')).toHaveCount(0, { timeout: 5000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[reaktion] ekorre_skakar på kortet');
});
