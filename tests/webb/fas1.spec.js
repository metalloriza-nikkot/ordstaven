// Grunden: skalan är hel, texten är Lexend, hjälten går med piltangenter och tryck,
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
    av.scen = i; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP';
    Object.assign(av, x.av || {}); av.ui = { ...av.ui, ...(x.ui || {}) }; t.installningar = { ...t.installningar, ...(x.inst || {}) };
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

test('textlagret använder Lexend, och versionsraden täcker aldrig rummet', async ({ page }) => {
  await starta(page);
  const prov = page.locator('#textlager .typsnittsprov');
  await expect(prov).toHaveText('ÅÄÖ');
  const stil = await prov.evaluate((e) => ({ familj: getComputedStyle(e).fontFamily, storlek: parseFloat(getComputedStyle(e).fontSize), laddad: document.fonts.check('32px Lexend') }));
  expect(stil.familj).toContain('Lexend');
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
  await tillScen(page, 3); // vinden, gå till lådan med staven
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
  await tillScen(page, 3);
  const pt = await page.evaluate(() => window.__ORDSTAVEN.objekt('lada_med_stav'));
  const tryck = () => (info.project.use.hasTouch ? page.touchscreen.tap(pt.x, pt.y) : page.mouse.click(pt.x, pt.y));
  // på avstånd glimtar det som går att använda
  expect(await page.evaluate(() => window.__ORDSTAVEN.interaktiva())).toContain('lada_med_stav');
  await expect(page.locator('#handknapp')).toBeHidden();
  await tryck();
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 30000 });
  // första gången han står vid något som går att använda: styrbilden för att använda (Mellanslag eller ett tryck)
  await expect(page.locator(info.project.use.hasTouch ? '#styrhjalp.tryck' : '#styrhjalp.mellanslag')).toBeVisible();
  // att stå vid lådan räcker inte
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s02_glimten');
  await page.screenshot({ path: `tests/skarmdumpar/nara-${info.project.name}.png` });
  await tryck();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('s03_staven');
});

test('styrbilden för att gå visas i spelets första steg (sovrummet) och försvinner när hjälten går', async ({ page }, info) => {
  test.setTimeout(60000);
  await tillScen(page, 1);
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s01_natten');
  await expect(page.locator(info.project.use.hasTouch ? '#styrhjalp.tryck' : '#styrhjalp.pilar')).toBeVisible();
  await page.screenshot({ path: `tests/skarmdumpar/styrhjalp-${info.project.name}.png` });
  const pt = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_hallen'));
  if (info.project.use.hasTouch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
  await expect(page.locator('#styrhjalp')).toBeHidden({ timeout: 10000 });
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
  await page.mouse.down(); await page.waitForTimeout(1600); await page.mouse.up(); // marginal mot 800 ms på en belastad testmaskin
  await expect(page.locator('#vuxenmeny .meny')).toBeVisible();
  await page.click('#vuxenmeny .stang');
  await expect(page.locator('#vuxenmeny')).toBeHidden();
  await expect(page.locator('.start-knapp')).toBeVisible();
  // i spelet: hoppa till köket
  await page.click('.start-knapp');
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .scen[data-i="9"]');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s08_farfar');
});

test('nosen: skakar när det inte finns något att nosa på, och läser hela ordet', async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await tillScen(page, 3);
  await page.evaluate(() => { const t = window.__ORDSTAVEN.tillstand(); t.aventyr['den-gomda-dalen'].ui.nosknappen = true; });
  await page.evaluate(() => document.querySelector('#hud-nos').hidden = false);
  await page.click('#hud-nos');
  await expect(page.locator('#hud-nos')).toHaveClass(/nej/);
  // på en replik: nosen läser hela ordet direkt, utan ljudningsremsan (till fas 4), och repliken går inte vidare
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect(page.locator('#plattan .replik-ruta')).toBeVisible();
  await page.evaluate(() => document.querySelector('#hud-nos').hidden = false);
  await page.click('#hud-nos');
  await page.locator('#plattan .ord').first().click();
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('"helord":true')).toBe(true);
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
  await tillScen(page, 3, { av: { bar: 1 }, ui: { barraknaren: true } });
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

/** Följ hjälten genom ett rumsbyte på stegen: var han är, om han klättrar och om förra rummet glider undan. */
async function folj(page, ms) {
  return page.evaluate(async (tid) => {
    const O = window.__ORDSTAVEN; const ut = []; const slut = performance.now() + tid;
    while (performance.now() < slut) {
      ut.push({ pos: O.position(), klattrar: O.klattrar(), rum: O.rumsobjekt().includes('stege_ner') ? 'vinden' : O.rumsobjekt().includes('stege_upp') ? 'hallen' : '?', glider: !!document.querySelector('#varld .forra-rummet'), tona: getComputedStyle(document.querySelector('#tona')).opacity });
      await new Promise((r) => setTimeout(r, 25));
    }
    return ut;
  }, ms);
}

test('stegen: hallen → vinden → hallen, han klättrar själv och kommer fram på stegen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  // upp: hallen (s10), gå till stegen
  await tillScen(page, 11);
  const upp = await page.evaluate(() => window.__ORDSTAVEN.objekt('stege_upp'));
  await page.mouse.click(upp.x, upp.y);
  let spar = await folj(page, 5000);
  const uppfard = spar.filter((s) => s.klattrar && s.rum === 'hallen');
  expect(uppfard.length, 'han klättrar uppför stegen i hallen').toBeGreaterThan(0);
  expect(new Set(uppfard.map((s) => s.pos.x)), 'mitt på stegen, ingen styrning').toEqual(new Set([160]));
  expect(spar.some((s) => s.glider), 'rummen glider, de tonas inte').toBe(true);
  expect(spar.every((s) => Number(s.tona) < 0.01)).toBe(true);
  const forstaPaVinden = spar.find((s) => s.rum === 'vinden');
  expect(forstaPaVinden.klattrar, 'han kommer fram på stegen').toBe(true);
  expect(forstaPaVinden.pos.x).toBe(52);
  expect(spar.at(-1).rum).toBe('vinden');
  expect(spar.at(-1).klattrar).toBe(false);

  // ner: vinden (s06, sista steget), gå till luckan
  await tillScen(page, 7, { av: { scenId: 's06_namnet', steg: 4 } });
  // efter FORTSÄTT står han vid luckan: att stå där räcker inte, han klättrar först när spelaren trycker på stegen
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__ORDSTAVEN.scen())).toBe('s06_namnet');
  const ner = await page.evaluate(() => window.__ORDSTAVEN.objekt('stege_ner'));
  await page.mouse.click(ner.x, ner.y);
  spar = await folj(page, 5000);
  expect(spar.filter((s) => s.klattrar && s.rum === 'vinden').length, 'han klättrar ner genom luckan').toBeGreaterThan(0);
  const forstaIHallen = spar.find((s) => s.rum === 'hallen');
  expect(forstaIHallen.klattrar).toBe(true);
  expect(forstaIHallen.pos.x).toBe(160);
  expect(spar.some((s) => s.glider)).toBe(true);
  expect(spar.at(-1).rum).toBe('hallen');
  expect(spar.at(-1).klattrar).toBe(false);
  await page.screenshot({ path: 'tests/skarmdumpar/stegen-hallen.png' });
});

test('fri lek utan knapp: går hjälten mot grinden går berättelsen vidare', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await starta(page, '?snabb&ny');
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 24; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  await page.click('.start-knapp');
  for (let k = 0; k < 10 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'fritt'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)).toBe('fritt');
  expect(await page.locator('.vidare-hornet').count()).toBe(0); // ingen knapp
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), 'står han still händer inget på en stund').toBe('fritt');
  const g = await page.evaluate(() => window.__ORDSTAVEN.objekt('grind'));
  await page.mouse.click(g.x, g.y);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), { timeout: 10000 }).not.toBe('fritt');
});

test('etiketterna för den vuxne: avstängda från början och aldrig under ett pussel', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  const synliga = () => page.locator('#etiketter:not([hidden]) .etikett-obj').count();
  // från början: avstängda, i rummet och i menyn
  await tillScen(page, 3);
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().installningar.vuxenEtiketter)).toBe(false);
  expect(await synliga()).toBe(0);
  // den vuxne slår på dem, och dörrvalet börjar
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 8; delete av.scenId; delete av.steg; av.startad = false; t.installningar.vuxenEtiketter = true;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  await page.click('.start-knapp');
  // s07: mellanscen och replik, sedan dörrvalet. Under hela valet syns inga etiketter, inte ens på annat än dörrarna.
  let iPussel = 0;
  for (let k = 0; k < 60; k++) {
    const l = await page.evaluate(() => ({ typ: window.__ORDSTAVEN.steg()?.typ, n: document.querySelectorAll('#etiketter:not([hidden]) .etikett-obj').length, dorr: [...document.querySelectorAll('#etiketter .etikett-obj')].some((e) => /dorr/.test(e.textContent)) }));
    expect(l.dorr, 'aldrig etiketter på dörrar').toBe(false);
    if (l.typ === 'pussel') { iPussel++; expect(l.n, 'inga etiketter under pusslet').toBe(0); }
    if (iPussel > 10) break;
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(100);
  }
  expect(iPussel).toBeGreaterThan(10);
});

test('etiketterna syns när den vuxne har slagit på dem och spelaren går i rummet', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await tillScen(page, 3, { inst: { vuxenEtiketter: true } });
  await expect(page.locator('#etiketter:not([hidden]) .etikett-obj').first()).toBeVisible();
  expect(await page.locator('#etiketter .etikett-obj', { hasText: 'stege' }).count(), 'aldrig på utgångar').toBe(0);
});

/** Starta en scen direkt (utan att vänta på ett gå-steg). @param {any} page @param {number} index */
async function startaScen(page, index) {
  await starta(page, '?snabb&ny');
  await page.evaluate((i) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = i; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, index);
  await starta(page);
  await page.click('.start-knapp');
}

/** Håll en piltangent tills hjälten står still (mot en vägg) eller tills villkoret gäller. */
async function hall(page, tangent, ms, klar = () => false) {
  await page.keyboard.down(tangent);
  const slut = Date.now() + ms;
  while (Date.now() < slut) { if (await klar()) break; await page.waitForTimeout(40); }
  await page.keyboard.up(tangent);
}

test('skyltarna syns hela tiden: han läser från mitten av hallen och går rakt igenom med piltangenten', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 8); // hallen, dörrvalet (rätt dörr: MAT)
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'p0_dorrar'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  await expect(page.locator('#tanke')).toBeVisible();
  // alla fyra skyltarna syns direkt, utan att han har gått någonstans
  await expect(page.locator('#skyltar .skylt .kort').first()).toBeVisible({ timeout: 3000 });
  const texter = (await page.locator('#skyltar .skylt .kort').allTextContents()).map((t) => t.trim()).sort();
  expect(texter).toEqual(['BAD', 'MAT', 'SOV', 'TOA']);
  await page.screenshot({ path: 'tests/skarmdumpar/hallen-skyltar.png' });
  // håll piltangenten mot MAT-dörren hela vägen: han går rakt igenom, utan ett extra tryck
  const pos = () => page.evaluate(() => window.__ORDSTAVEN.position());
  const d = await page.evaluate(() => { const o = window.__ORDSTAVEN.ruta('dorr_mat'); return o; });
  const malY = d.y + d.h - 6;
  const ner = (await pos()).y < malY;
  await hall(page, ner ? 'ArrowDown' : 'ArrowUp', 3000, async () => (ner ? (await pos()).y >= malY - 4 : (await pos()).y <= malY + 4));
  await hall(page, d.riktning === 'vanster' ? 'ArrowLeft' : 'ArrowRight', 4000, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id ?? null)) !== 'p0_dorrar');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id ?? null), { timeout: 5000 }).not.toBe('p0_dorrar');
});

test('skyltarna: ett tryck på en dörr går rakt igenom, en prövad dörr behåller sin skylt nedtonad', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 8);
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'p0_dorrar'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  const d = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_bad'));
  await page.mouse.click(d.x, d.y);
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText(/BADANKA/, { timeout: 8000 });
  await page.click('#plattan .replik-ruta');
  await expect(page.locator('#skyltar .skylt[data-objekt="dorr_bad"] .kort.provad')).toBeVisible();
  expect(await page.locator('#skyltar .skylt .kort:not(.provad)').count()).toBe(3);
});

test('pekningen: står spelaren still vid dörrarna springer ungen till rätt dörr först efter 16 sekunder', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await startaScen(page, 8);
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'p0_dorrar'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  const t0 = Date.now();
  // frågan blinkar efter 9 s, men ungen pekar inte än
  await page.waitForTimeout(12000);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal()), 'ingen pekning före 16 s').toBeNull();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.ungeMal()), { timeout: 8000 }).not.toBeNull();
  expect(Date.now() - t0).toBeGreaterThan(15000);
  const mal = await page.evaluate(() => window.__ORDSTAVEN.ungeMal());
  const mat = await page.evaluate(() => window.__ORDSTAVEN.ruta('dorr_mat'));
  expect(Math.hypot(mal.x - (mat.x + mat.b), mal.y - (mat.y + mat.h / 2)), 'vid MAT-dörren').toBeLessThan(45);
  // knuffens beskrivning (för den vuxne) visas inte när ungen själv pekar
  expect(await page.locator('#regi:not([hidden])').count()).toBe(0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/skarmdumpar/ungen-pekar.png' });
});

test('formeln: en bokstavstangent lägger motsvarande bricka (LJUS på datorn)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 4);
  for (let k = 0; k < 20 && !(await page.locator('.formel-ruta').isVisible()); k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  await expect(page.locator('.formel-ruta')).toBeVisible();
  await page.keyboard.press('KeyL');
  await expect(page.locator('.formel-ruta .plats').first()).toHaveText('L');
  for (const t of ['KeyJ', 'KeyU', 'KeyS']) await page.keyboard.press(t);
  await expect(page.locator('.formel-ruta')).toBeHidden({ timeout: 5000 });
});

test('mellanscenens text är en regianvisning: liten, i vanlig skrift, aldrig på läsplattan', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await starta(page, '?snabb&ny');
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 8; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  // fånga regirutan när den visas (i snabbläget syns den bara ett ögonblick)
  await page.evaluate(() => {
    const e = document.querySelector('#regi');
    window.__regi = null;
    new MutationObserver(() => { if (!e.hidden && !window.__regi) window.__regi = { storlek: parseFloat(getComputedStyle(e).fontSize), text: e.textContent, iPlattan: !!e.closest('#plattan') }; }).observe(e, { attributes: true, childList: true });
  });
  await page.click('.start-knapp');
  for (let k = 0; k < 20 && !(await page.evaluate(() => window.__regi)); k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {}); await page.waitForTimeout(100);
  }
  await expect.poll(() => page.evaluate(() => window.__regi), { timeout: 5000 }).not.toBeNull();
  const s = await page.evaluate(() => window.__regi);
  expect(s.storlek).toBeLessThanOrEqual(14);
  expect(s.iPlattan).toBe(false);
  expect(s.text).not.toBe(s.text.toUpperCase()); // vanlig skrift, inte versaler som speltexten
});

/** Klicka igenom repliker tills villkoret gäller. */
async function framTill(page, villkor, varv = 60) {
  for (let k = 0; k < varv; k++) {
    if (await villkor()) return;
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    // prata: gå fram till figuren som kallar
    const st = await page.evaluate(() => window.__ORDSTAVEN.steg());
    if (st?.typ === 'prata') { const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), st.figur); if (o) await page.mouse.click(o.x, o.y); await page.waitForTimeout(400); }
    await page.waitForTimeout(120);
  }
  throw new Error('kom inte fram');
}

test('styrbilden för att använda: Mellanslag första gången, sedan aldrig igen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await tillScen(page, 3); // gå till lådan med staven
  const l = await page.evaluate(() => window.__ORDSTAVEN.objekt('lada_med_stav'));
  await page.mouse.click(l.x, l.y);
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#styrhjalp.mellanslag')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#styrhjalp.mellanslag')).toBeHidden();
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].ui.styrAnvand)).toBe(true);
});

test('packlistan: en bock per packad rad, sista raden lyser och sakerna tonas ut när allt är packat', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 22);
  await framTill(page, () => page.locator('#plattan .kortrad').isVisible());
  const ratt = ['filt', 'rod_filt', 'bar', 'rep'];
  let n = 0;
  for (const id of ratt) {
    const k = page.locator(`#plattan .kort[data-id="${id}"]:not(.vald)`);
    if (!(await k.count())) continue;
    await k.click(); n++;
    if (n < 3) await expect(page.locator('#plattan .lapp .rad.bockad')).toHaveCount(n, { timeout: 3000 });
  }
  await expect(page.locator('#plattan .lapp .rad.bockad')).toHaveCount(3, { timeout: 3000 });
  await expect(page.locator('#plattan .lapp .rad.lyser')).toHaveText(/SKOGEN/);
  await expect(page.locator('#plattan .kortrad.packat')).toBeVisible();
  await page.screenshot({ path: 'tests/skarmdumpar/packat.png' });
});

test('boken: uppslag 1 läses av sig själv och sedan glimtar sidhörnet', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 17);
  for (let k = 0; k < 80 && !(await page.locator('.bok-ruta').isVisible()); k++) {
    const st = await page.evaluate(() => window.__ORDSTAVEN.steg());
    if (st?.typ === 'ga_till') { const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), st.mal); await page.mouse.click(o.x, o.y); await page.waitForTimeout(800); const h = page.locator('#handknapp'); if (await h.isVisible()) await page.keyboard.press('Space'); }
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.bok-ruta')).toBeVisible();
  await expect(page.locator('.bok-knappar .fram.glimtar')).toBeVisible({ timeout: 8000 });
});

test('passets slut: den sovande ungen betyder sluta för idag, ingen dörr', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await startaScen(page, 9);
  await framTill(page, () => page.locator('.pass-slut .fortsatt').isVisible());
  await expect(page.locator('.pass-slut .paus .unge-sover')).toBeVisible();
  expect(await page.locator('.pass-slut').textContent()).not.toMatch(/🚪/);
  await page.screenshot({ path: 'tests/skarmdumpar/pass-slut.png' });
});

test('dinomatens lådor: hjälten står vid en låda från olika håll, bara den är markerad, och just den öppnas (grind A)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(180000);
  const s11 = 12; // s11_ladorna
  // lådans id i kartan → alternativets id i varianten L2 (spelarens startnivå)
  const alt = { lada_lang_overst: 'gul', lada_lang_mitten: 'rod', lada_lang_nederst: 'bla' };
  // platser runt varje låda (rumspixlar, fötterna): från sidan, ovanför och nedanför där det går att stå
  const platser = {
    lada_lang_overst: [{ x: 80, y: 66 }, { x: 52, y: 88 }],
    lada_lang_mitten: [{ x: 112, y: 60 }, { x: 170, y: 60 }, { x: 141, y: 82 }],
    lada_lang_nederst: [{ x: 242, y: 108 }, { x: 271, y: 130 }],
  };
  for (const [lada, lista] of Object.entries(platser)) {
    for (const p of lista) {
      await startaScen(page, s11);
      await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) === 'p0_dinomat');
      const s = await page.evaluate(() => window.__ORDSTAVEN.skala());
      await page.mouse.click(s.vanster + p.x * s.cssSkala, s.topp + p.y * s.cssSkala);
      // markeringen (handen) syns vid just den här lådan innan han trycker
      await expect(page.locator(`#handknapp[data-objekt="${lada}"]`), `${lada} från (${p.x},${p.y})`).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#handknapp:not([hidden])')).toHaveCount(1);
      await page.keyboard.press('Space');
      await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).match(/\[val\] p0_dinomat: (\w+)/)?.[1], { timeout: 8000 }).toBe(alt[lada]);
    }
  }
});

test('utan WebGL: canvas-ritningen visar rummet, mörkret, skyltarna och rumsbytet, och håller farten på en långsam dator', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(150000);
  const fel = [];
  page.on('pageerror', (e) => fel.push(String(e)));
  await page.goto('./?snabb&ny&canvas');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ritning())).toBe('canvas');
  await page.click('.start-knapp');
  // förbi skapa hjälten och namnet
  for (let k = 0; k < 60 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; k++) {
    if (await page.locator('.hjalte-ruta').isVisible()) { await page.click('.hjalte-ruta .farg >> nth=1'); await page.click('.hjalte-ruta .klar'); }
    else if (await page.locator('.dop-ruta').isVisible()) { await page.keyboard.type('TESTA'); await page.keyboard.press('Enter'); }
    else { const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {}); }
    await page.waitForTimeout(150);
  }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), { timeout: 20000 }).toBe('ga_till');
  // långsam dator: processorn fyra gånger långsammare, och hjälten går en stund
  const c = await page.context().newCDPSession(page);
  await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const mat = () => page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  const f1 = await mat(), fps = await mat(); // den första mätningen värmer upp
  console.log('canvas, 4× långsammare: bildrutor per sekund', f1, fps);
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.screenshot({ path: 'tests/skarmdumpar/canvas-sovrummet.png' });
  // bara en röktest: testmaskinen ritar i mjukvara och delas med andra tester, så gränsen är låg
  expect(fps, 'bildrutor per sekund med canvas, 4× långsammare processor').toBeGreaterThan(15);
  // rumsbytet (glidningen använder en bild av rummet) fungerar med canvas: gå ut genom dörren till vänster
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 60000 }).toBe('s01b_hallen');
  await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#skyltar .skylt')).toHaveCount(4, { timeout: 8000 });
  await page.screenshot({ path: 'tests/skarmdumpar/canvas-hallen.png' });
  expect(fel).toEqual([]);
});
