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
  for (let k = 0; k < 30; k++) {
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
  // åt vänster: hjälten börjar vid stegen, till höger är väggen
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await pos(page)).x, { timeout: 20000 }).toBeLessThan(fore.x - 20); // långsamma testdatorer: lång väntan
  await page.keyboard.up('ArrowLeft');
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
  // på iPad skrollar menyn med fingret (sidan skrollar aldrig, men menyn gör det), och sista knappen går att nå
  const drag = await page.evaluate(() => {
    const prov = (el) => { const e = new Event('touchmove', { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; };
    // INSTÄLLNINGAR (F4): delens fönster skrollar
    const m = document.querySelector('#vuxenmeny .innehall');
    return { meny: prov(m.querySelector('*') || m), varld: prov(document.getElementById('varld')), skrollar: getComputedStyle(m).overflowY, touch: getComputedStyle(m).touchAction };
  });
  expect(drag).toEqual({ meny: false, varld: true, skrollar: 'auto', touch: 'pan-y' });
  // INSTÄLLNINGAR i SNES-stil (F4): rubriken, delarna i en kolumn med markören och den valda delen till höger
  await expect(page.locator('#vuxenmeny h2')).toHaveText('INSTÄLLNINGAR');
  await expect(page.locator('#vuxenmeny .del')).toHaveText(['SPELARE', 'PASS OCH KAPITEL', 'LÄSNING', 'LJUD OCH RÖST', 'SKÄRM', 'SPARFIL', 'FRAMSTEG', 'OM SPELET', 'TESTLÄGE']);
  await page.click('#vuxenmeny .del[data-del="ljud"]');
  await expect(page.locator('#vuxenmeny .del.vald')).toHaveText('LJUD OCH RÖST');
  await expect(page.locator('#vuxenmeny .menydel[data-del="ljud"]')).toBeVisible();
  await expect(page.locator('#vuxenmeny .menydel[data-del="spelare"]')).toBeHidden();
  expect(await page.locator('#vuxenmeny .installningar').boundingBox()).toEqual(await page.locator('#varld').boundingBox());
  await page.screenshot({ path: 'test-results/installningar.png' });
  await page.click('#vuxenmeny .stang');
  await expect(page.locator('#vuxenmeny')).toBeHidden();
  await expect(page.locator('.start-knapp')).toBeVisible();
  // i spelet: hoppa till köket
  await page.click('.start-knapp');
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="test"]');
  await page.click('#vuxenmeny .scenlista .scen[data-i="9"]');
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
    const glidningar0 = Number(document.querySelector('#varld').dataset.glidningar || 0);
    while (performance.now() < slut) {
      ut.push({ pos: O.position(), klattrar: O.klattrar(), rum: O.rumsobjekt().includes('stege_ner') ? 'vinden' : O.rumsobjekt().includes('stege_upp') ? 'hallen' : '?', glider: !!document.querySelector('#varld .forra-rummet') || Number(document.querySelector('#varld').dataset.glidningar || 0) > glidningar0, tona: getComputedStyle(document.querySelector('#tona')).opacity });
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
  expect(new Set(uppfard.map((s) => s.pos.x)), 'mitt på stegen, ingen styrning').toEqual(new Set([312]));
  expect(spar.some((s) => s.glider), 'rummen glider, de tonas inte').toBe(true);
  expect(spar.every((s) => Number(s.tona) < 0.01)).toBe(true);
  const forstaPaVinden = spar.find((s) => s.rum === 'vinden');
  expect(forstaPaVinden.klattrar, 'han kommer fram på stegen').toBe(true);
  expect(forstaPaVinden.pos.x).toBe(268);
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
  expect(forstaIHallen.pos.x).toBe(312);
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
  await startaScen(page, 8); // hallen, dörrvalet (rätt dörr: BOK)
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'p0_dorrar'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  await expect(page.locator('#tanke')).toBeVisible();
  // alla fem skyltarna syns direkt, utan att han har gått någonstans, och alla dörrarna står på skärmen
  await expect(page.locator('#skyltar .skylt .kort').first()).toBeVisible({ timeout: 3000 });
  const texter = (await page.locator('#skyltar .skylt .kort').allTextContents()).map((t) => t.trim()).sort();
  expect(texter).toEqual(['BAD', 'BOK', 'FARFAR', 'MAT', 'SOV']);
  await expect.poll(() => page.evaluate(() => ['dorr_farfar', 'dorr_bok', 'dorr_mat', 'dorr_sov', 'dorr_bad'].every((id) => window.__ORDSTAVEN.rutaPaSkarm(id))), { timeout: 4000 }).toBe(true);
  await page.screenshot({ path: 'tests/skarmdumpar/hallen-skyltar.png' });
  // gå under BOK-dörren och håll piltangenten uppåt hela vägen: han går rakt igenom, utan ett extra tryck
  const pos = () => page.evaluate(() => window.__ORDSTAVEN.position());
  const d = await page.evaluate(() => { const o = window.__ORDSTAVEN.ruta('dorr_bok'); return o; });
  const malX = d.x + d.b / 2;
  // korridoren är smalare än entrén: först upp i höjd med korridoren
  if ((await pos()).y > 100) await hall(page, 'ArrowUp', 4000, async () => (await pos()).y <= 92);
  const hoger = (await pos()).x < malX;
  await hall(page, hoger ? 'ArrowRight' : 'ArrowLeft', 8000, async () => (hoger ? (await pos()).x >= malX - 3 : (await pos()).x <= malX + 3));
  expect(Math.abs((await pos()).x - malX), `under BOK-dörren (${JSON.stringify(await pos())}, mål ${malX})`).toBeLessThan(8);
  await hall(page, 'ArrowUp', 4000, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id ?? null)) !== 'p0_dorrar');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id ?? null), { timeout: 5000 }).not.toBe('p0_dorrar');
  // den rätta dörren öppnas i stället för att skaka (50.5)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 5000 }).toContain('[dörr] öppnas: dorr_bok');
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
  expect(await page.locator('#skyltar .skylt .kort:not(.provad)').count()).toBe(4);
});

test('pekningen: står spelaren still vid dörrarna springer ungen till rätt dörr först efter 20 sekunder (fem dörrar)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await startaScen(page, 8);
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'p0_dorrar'; k++) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click(); await page.waitForTimeout(150);
  }
  const t0 = Date.now();
  // frågan blinkar efter 9 s, men ungen pekar inte än (4 s per dörr: 20 s)
  await page.waitForTimeout(16000);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeMal()), 'ingen pekning före 20 s').toBeNull();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.ungeMal()), { timeout: 8000 }).not.toBeNull();
  expect(Date.now() - t0).toBeGreaterThan(19000);
  const mal = await page.evaluate(() => window.__ORDSTAVEN.ungeMal());
  const bok = await page.evaluate(() => window.__ORDSTAVEN.ruta('dorr_bok'));
  expect(Math.hypot(mal.x - (bok.x + bok.b / 2), mal.y - (bok.y + bok.h)), 'vid BOK-dörren').toBeLessThan(45);
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

test('styrbilden för att använda: Mellanslag första gången i passet', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await tillScen(page, 3); // gå till lådan med staven
  const l = await page.evaluate(() => window.__ORDSTAVEN.objekt('lada_med_stav'));
  await page.mouse.click(l.x, l.y);
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#styrhjalp.mellanslag')).toBeVisible();
  // Stils ritade tangent (50.3), inte en tom ruta (47.8): bilden är laddad och syns
  await expect(page.locator('#styrhjalp .tangent-bild.mellanslag img.uppe')).toBeVisible();
  expect(await page.locator('#styrhjalp .tangent-bild.mellanslag img.uppe').evaluate((i) => i.complete && i.naturalWidth)).toBe(48);
  await page.screenshot({ path: 'test-results/mellanslag-vid-handen.png' });
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
    if (st?.typ === 'ga_till' || st?.typ === 'bara') { const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), st.mal || st.till); await page.mouse.click(o.x, o.y); await page.waitForTimeout(800); const h = page.locator('#handknapp'); if (await h.isVisible()) await page.keyboard.press('Space'); }
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.bok-ruta')).toBeVisible();
  // han sitter i fåtöljen medan sagan läses (34.4)
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[hjälten] sätter sig: fatolj_vanster');
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('fatolj_vanster'))).toBe('hjalte_fatolj_vanster');
  // Stils bild i boken (110 × 70) i hela steg, i stället för emojin (10f)
  const bild = page.locator('.bok-bild > .bild.bildkort');
  await expect(bild).toBeVisible();
  const bb = await bild.boundingBox(); expect(Math.round((bb.width / bb.height) * 70)).toBe(110);
  await page.screenshot({ path: 'test-results/bok-bild.png' });
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
    lada_lang_overst: [{ x: 240, y: 66 }, { x: 268, y: 88 }],
    lada_lang_mitten: [{ x: 208, y: 60 }, { x: 150, y: 60 }, { x: 179, y: 82 }],
    lada_lang_nederst: [{ x: 82, y: 108 }, { x: 53, y: 130 }],
  };
  for (const [lada, lista] of Object.entries(platser)) {
    for (const p of lista) {
      await startaScen(page, s11);
      await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) === 'p0_dinomat');
      // lådorna har Stils bilder i den variant han får (L2: röd, blå och gul)
      if (lada === 'lada_lang_overst' && p === lista[0]) {
        expect(await page.evaluate(() => ['lada_lang_overst', 'lada_lang_mitten', 'lada_lang_nederst'].map((id) => window.__ORDSTAVEN.bildFor(id)))).toEqual(['lada_gul', 'lada_rod', 'lada_bla']);
        await page.screenshot({ path: 'test-results/dinomat-ladorna.png' });
        // frågans två rader i molnet står under varandra
        const rader = await page.locator('#tanke .moln-text .rad').evaluateAll((r) => r.map((x) => x.getBoundingClientRect().top));
        if (rader.length > 1) expect(rader[1]).toBeGreaterThan(rader[0]);
      }
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
  // rumsbytet (glidningen använder en bild av rummet) fungerar med canvas: gå ut genom dörren i bakväggen
  const dorr = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_hallen'));
  await page.mouse.click(dorr.x, dorr.y);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 60000 }).toBe('s01b_hallen');
  // förbi instruktionen (prologen v0.13: "Klättra upp för stegen!")
  // (just efter rumsbytet kan steget fortfarande vara förra rummets ga_till, så vänta också tills repliken är borta)
  const iMalet = () => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ === 'ga_till' && window.__ORDSTAVEN.steg()?.mal === 'stege_upp' && !document.querySelector('#plattan .replik-ruta'));
  for (const t0 = Date.now(); Date.now() - t0 < 30000 && !(await iMalet());) {
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)).toBe('ga_till');
  await expect(page.locator('#skyltar .skylt')).toHaveCount(5, { timeout: 8000 });
  await page.screenshot({ path: 'tests/skarmdumpar/canvas-hallen.png' });
  expect(fel).toEqual([]);
});

test('?logg: rutan för den vuxne sparar loggen som fil, också när spelet aldrig kommer igång (1e)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm' && info.project.name !== 'mac-safari', 'Chromium och Safari räcker');
  // 1. spelet kommer inte igång: spelets skript går inte att ladda (som en tom brun ram)
  await page.route(/\/assets\/main-[^/]*\.js$/, (r) => r.abort());
  await page.goto('./?logg');
  await expect(page.locator('#startlogg')).toBeVisible();
  const text = await page.locator('#startlogg .startlogg-text').inputValue();
  expect(text).toContain('Spelet igång: nej');
  expect(text).toMatch(/kunde inte ladda: .*main-/);
  const [fil] = await Promise.all([page.waitForEvent('download'), page.click('#startlogg .startlogg-spara')]);
  expect(fil.suggestedFilename()).toMatch(/^ordstaven-startlogg-\d{8}-\d{4}\.txt$/);
  await expect(page.locator('#startlogg .startlogg-svar')).toContainText('Sparad');
  // 2. spelet går: rutan tar spelets egen logg, och Stäng tar bort den
  await page.unroute(/\/assets\/main-[^/]*\.js$/);
  await page.goto('./?logg&snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('#startlogg .startlogg-kopiera').catch(() => {});
  const t2 = await page.locator('#startlogg .startlogg-text').inputValue();
  expect(t2).toContain('Spelet igång: ja');
  expect(t2).toContain('== SPELETS LOGG ==');
  expect(t2).toContain('felsökningslogg');
  await page.screenshot({ path: 'test-results/startlogg.png' });
  await page.click('#startlogg .startlogg-stang');
  await expect(page.locator('#startlogg')).toHaveCount(0);
  // utan ?logg syns ingen ruta
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await expect(page.locator('#startlogg')).toHaveCount(0);
});

test('krukorna går sönder med Stils bilder: spricker, delar sig och skärvorna ligger kvar (36.8)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await startaScen(page, 14); // s13_krukorna
  await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) === 'p0_krukor');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => id.startsWith('sex_krukor_')).length), { timeout: 8000 }).toBe(6);
  const id = 'sex_krukor_0';
  expect(await page.evaluate((x) => window.__ORDSTAVEN.bildFor(x), id)).toBe('kruka');
  const o = await page.evaluate((x) => window.__ORDSTAVEN.objekt(x), id);
  await page.mouse.click(o.x, o.y);
  await expect(page.locator(`#handknapp[data-objekt="${id}"]`)).toBeVisible({ timeout: 10000 });
  const bilder = page.evaluate((x) => new Promise((klar) => { const sett = []; const t0 = performance.now();
    const steg = () => { const b = window.__ORDSTAVEN.bildFor(x); if (b && sett[sett.length - 1] !== b) sett.push(b); if (b === 'kruka_skarvor' || performance.now() - t0 > 4000) klar(sett); else requestAnimationFrame(steg); }; steg(); }), id);
  await page.keyboard.press('Space');
  const sett = await bilder;
  expect(sett).toEqual(['kruka', 'kruka_spricker_01', 'kruka_spricker_02', 'kruka_spricker_03', 'kruka_skarvor']);
  await page.screenshot({ path: 'test-results/kruka-skarvor.png' });
});

test('dörren öppnas när han går igenom den (31.7)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await startaScen(page, 1); // s01_natten: ut i hallen
  await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.mal)) === 'dorr_hallen');
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('dorr_hallen'))).toBe('dorr');
  const bilder = page.evaluate(() => new Promise((klar) => { const sett = []; const t0 = performance.now();
    const steg = () => { const b = window.__ORDSTAVEN.bildFor('dorr_hallen'); if (b && sett[sett.length - 1] !== b) sett.push(b); if (b === 'dorr_oppnas_03' || performance.now() - t0 > 8000) klar(sett); else requestAnimationFrame(steg); }; steg(); }));
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_hallen'));
  await page.mouse.click(o.x, o.y);
  expect(await bilder).toEqual(['dorr', 'dorr_oppnas_01', 'dorr_oppnas_02', 'dorr_oppnas_03']);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[dörr] öppnas: dorr_hallen');
});

test('ägget i lådan: ljuset och kläckningen med Stils bilder, och skalet ligger kvar (36.7)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(90000);
  // s05_klackningen, med LJUS (annars är vinden mörk och lådan syns inte)
  await starta(page, '?snabb&ny');
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 6; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.hjalte.formler = ['LJUS']; av.rumstillstand = { ...(av.rumstillstand || {}), vinden: 'natt_upplyst' };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  await page.click('.start-knapp');
  await page.evaluate(() => { window.__agg = []; const steg = () => { const b = window.__ORDSTAVEN.bildFor('lada_med_agg'); if (b && window.__agg[window.__agg.length - 1] !== b) window.__agg.push(b); requestAnimationFrame(steg); }; steg(); });
  await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.scen())) === 's06_namnet', 200);
  const sett = await page.evaluate(() => window.__agg);
  for (const b of ['agg_01', 'agg_lyser_01', 'agg_knack_01', 'agg_skal']) expect(sett, b).toContain(b);
  expect(sett[sett.length - 1]).toBe('agg_skal');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[mellanscen] agg_klackning');
  await page.screenshot({ path: 'test-results/agget-skal.png' });
});

test('hjälten i s00 är Stils figur i de valda färgerna (10f)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await starta(page, '?snabb&ny');
  await page.click('.start-knapp');
  await framTill(page, () => page.locator('.hjalte-ruta').isVisible());
  const bild = page.locator('.hjalte-ruta img.hjalte-sprite');
  await expect(bild).toBeVisible();
  const fore = await bild.getAttribute('src');
  await page.click('.hjalte-ruta .valrad[data-del="drakt"] .farg >> nth=1');
  await expect.poll(() => page.locator('.hjalte-ruta img.hjalte-sprite').getAttribute('src')).not.toBe(fore);
  const bb = await page.locator('.hjalte-ruta img.hjalte-sprite').boundingBox();
  expect(Math.round((bb.height / bb.width) * 16)).toBe(24);
  await page.screenshot({ path: 'test-results/hjalte-s00.png' });
});

test('boken: han bär boken och den hamnar hos Farfar, som tar emot den och läser, och fåtöljen är tom när han reser sig (50.5, 51.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(90000);
  await startaScen(page, 17); // s16_godnattsagan
  // aldrig två hjältar (56.2): han i fåtöljen och han själv syns aldrig samtidigt
  await page.evaluate(() => { const w = /** @type {any} */ (window); w.__maxHjaltar = 0; w.__hjaltarTid = setInterval(() => { w.__maxHjaltar = Math.max(w.__maxHjaltar, w.__ORDSTAVEN.hjaltar()); }, 20); });
  let sagBok = false;
  const farfar = new Set(); // Farfars bilder i fåtöljen (51.4): tar emot boken och läser
  for (let k = 0; k < 160; k++) {
    farfar.add(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen')));
    const st = await page.evaluate(() => window.__ORDSTAVEN.steg());
    if (st?.typ === 'ga_till' && st.mal === 'dorr_hallen') break;
    if (st?.typ === 'bara') {
      // han bär bokens bild, inte gråboxens filt, och boken är inte kvar i hyllan
      await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.burenBild())).toBe('expeditionsbok');
      sagBok = true;
    }
    if (st?.typ === 'ga_till' || st?.typ === 'bara') { const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), st.mal || st.till); await page.mouse.click(o.x, o.y); await page.waitForTimeout(800); const h = page.locator('#handknapp'); if (await h.isVisible()) await page.keyboard.press('Space'); }
    if (await page.locator('.bok-ruta').isVisible()) { const st2 = page.locator('.bok-knappar .stang, .bok-knappar .klar, .bok-knappar .fram'); if (await st2.first().isVisible()) await st2.first().click().catch(() => {}); }
    const r = await page.$('#plattan .replik-ruta'); if (r) await r.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  expect(sagBok).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.burenBild())).toBeNull(); // Farfar har boken
  // Farfar tog emot boken och läser i den (51.4)
  expect([...farfar].some((b) => /^farfar_fatolj_(ta_emot|las)_0/.test(b || ''))).toBe(true);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toMatch(/^farfar_fatolj_las_0[12]$/);
  // han reser sig när han ska gå: fåtöljen är tom, och han syns
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('fatolj_vanster')), { timeout: 5000 }).toBe('fatolj_vanster');
  await page.screenshot({ path: 'test-results/fatoljen-tom.png' });
  expect(await page.evaluate(() => /** @type {any} */ (window).__maxHjaltar)).toBe(1);
});

test('lappknappen öppnar Farfars lista medan han väljer stig, och uppdragslappen annars (51.2)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(90000);
  // s22_tradgarden, med Farfars två lappar (dinomaten och packlistan), som när han har spelat hit
  await starta(page, '?snabb&ny');
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 24; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; av.lappar = ['p0_dinomat', 'p0_packlista'];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  await page.click('.start-knapp');
  await framTill(page, async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)) === 'p0_skylten', 300);
  await expect(page.locator('#hud-lapp')).toBeVisible();
  await expect(page.locator('#plattan')).toBeHidden({ timeout: 8000 });
  await page.click('#hud-lapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 5000 }).toContain('[lappen] Farfars lapp: p0_packlista');
  await expect(page.locator('#plattan')).toBeVisible();
  await expect(page.locator('#uppdragslapp')).toBeHidden();
  await page.screenshot({ path: 'test-results/lappknappen-listan.png' });
});

test('startskärmen (F1, F4): fotot är FORTSÄTT, NYTT ÄVENTYR är en bok med två tryck och samma hjälte, plusset en ny spelare, och inget raderas', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(90000);
  // första gången: bara den stora boken med pilen, inga spelare och inga ord
  await starta(page, '?snabb&ny');
  await expect(page.locator('.start-knapp')).toHaveAttribute('aria-label', 'Starta');
  await expect(page.locator('.startbord .spelarkort')).toHaveCount(0);
  await expect(page.locator('.skylt-namn')).toHaveText('ORDSTAVEN');
  // Stils bilder i hela steg: bordet är 320 × 192 av världens pixlar och fyller spelytan
  const bord = await page.locator('.startbord img.bord').boundingBox();
  const varld = await page.locator('#varld').boundingBox();
  expect(bord).toEqual(varld);
  const dpr = await page.evaluate(() => devicePixelRatio);
  expect(Number.isInteger(Math.round((bord.width * dpr) / 320 * 1000) / 1000)).toBe(true);
  await page.screenshot({ path: 'test-results/start-forsta.png' });
  // en hjälte som har spelat en bit (påhittat namn), med ett foto av rummet där han är
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'Ture'; t.spelare.hjalte.utseende = { hudfarg: 1, drakt: 2 }; t.spelare.unge.namn = 'KNOPP';
    t.spelare.larande.lasning = { P1_las_och_valj: { niva: 3, streak: 0, miss: 0, forstaForsok: 4 } };
    av.scen = 5; av.scenId = 's05'; av.startad = true;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page);
  const fortsatt = page.locator('.start-knapp.fortsatt');
  await expect(fortsatt).toBeVisible();
  // inget foto än: hjälten och ungen står i ramen
  await expect(fortsatt.locator('.foto.tom img')).toHaveCount(2);
  await expect(page.locator('.startbord .unge')).toBeVisible();
  await expect(page.locator('.spelarkort.vald')).toContainText('TURE');
  await expect(page.locator('.start-ord')).toHaveCount(0); // inga ord under knapparna (62.5)
  await page.screenshot({ path: 'test-results/start-fortsatt.png' });
  const utanTid = () => page.evaluate(() => { const t = JSON.parse(localStorage.getItem('ordstaven_spar') || 'null'); delete t.sparad; return t; });
  const fore = await utanTid();
  // NYTT ÄVENTYR, första trycket: boken lyfts fram, resten tonas ned, och inget händer
  await page.click('.nytt-aventyr');
  await expect(page.locator('.startbord.lyft')).toBeVisible();
  await expect(page.locator('.ny-bok .bekrafta')).toBeVisible();
  await page.screenshot({ path: 'test-results/start-nytt-lyft.png' });
  expect(await page.evaluate(() => localStorage.getItem('ordstaven_platser'))).toBeNull();
  // pilen bakåt lägger tillbaka boken, och ett tryck på fotot då startar inget (det lägger bara tillbaka boken)
  await page.click('.ny-bok .tillbaka');
  await expect(page.locator('.startbord.lyft')).toHaveCount(0);
  await page.click('.nytt-aventyr');
  await page.locator('.start-knapp.fortsatt').click({ force: true });
  await expect(page.locator('.startbord.lyft')).toHaveCount(0);
  await expect(page.locator('#skarm')).toBeVisible();
  // bocken: samma hjälte och samma läsnivå på en egen plats, äventyret från början, och den gamla sparningen är orörd
  await page.click('.nytt-aventyr');
  await Promise.all([page.waitForEvent('load'), page.click('.ny-bok .bekrafta')]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.spel.scene.isActive('Rum'));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_platser') || 'null'))).toMatchObject({ aktiv: 'p2', platser: ['1', 'p2'] });
  expect(await utanTid()).toEqual(fore);
  const ny = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
  expect(ny.spelare.hjalte.namn).toBe('Ture');
  expect(ny.spelare.hjalte.id).toBe(fore.spelare.hjalte.id);
  expect(ny.spelare.larande.lasning.P1_las_och_valj.niva).toBe(3);
  expect(ny.spelare.unge.namn).toBe('');
  const nyttAv = ny.aventyr['den-gomda-dalen'] || {};
  expect([nyttAv.scenId, nyttAv.startad, nyttAv.scen ?? 0]).toEqual([undefined, undefined, 0]);
  // samma hjälte syns en gång: den nya platsen, som spelas
  await expect(page.locator('.startbord .spelarkort')).toHaveCount(1);
  await expect(page.locator('.spelarkort.vald')).toHaveAttribute('data-plats', 'p2');
  await expect(page.locator('.start-knapp.fortsatt .foto.tom img')).toHaveCount(1); // hjälten, ingen unge än
  // plusset: en ny spelare på en egen plats, utan namn, och de andra hjältarna att byta tillbaka till
  await Promise.all([page.waitForEvent('load'), page.click('.ny-spelare')]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.spel.scene.isActive('Rum'));
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().spelare.hjalte.namn)).toBe('');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_platser') || 'null'))).toMatchObject({ aktiv: 'p3', platser: ['1', 'p2', 'p3'] });
  await expect(page.locator('.start-knapp')).toHaveAttribute('aria-label', 'Starta');
  await expect(page.locator('.startbord .spelarkort')).toHaveCount(1);
  await expect(page.locator('.ny-spelare')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/start-ny-spelare.png' });
  // tillbaka till hjälten: den senast sparade platsen med honom
  await Promise.all([page.waitForEvent('load'), page.click('.startbord .spelarkort[data-plats="p2"]')]);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning && window.__ORDSTAVEN.spel.scene.isActive('Rum'));
  await expect(page.locator('.start-knapp.fortsatt')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_platser') || 'null').aktiv)).toBe('p2');
  // INSTÄLLNINGAR: alla platser, och den som inte spelas kan tas bort med två klick (den hamnar i sin backup)
  await page.click('.start-knapp');
  await page.keyboard.press('Control+Shift+M');
  const grupp = page.locator('.menygrupp.spelare');
  await expect(grupp).toContainText('TURE');
  await expect(grupp.locator('.spelare-rad')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/meny-spelare.png' });
  await grupp.locator('.spelare-rad[data-plats="p3"] .spelare-bort').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_platser') || 'null').platser)).toEqual(['1', 'p2', 'p3']);
  await grupp.locator('.spelare-rad[data-plats="p3"] .spelare-bort').click();
  await expect(page.locator('.menygrupp.spelare .spelare-rad')).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordstaven_platser') || 'null').platser)).toEqual(['1', 'p2']);
  expect(await page.evaluate(() => localStorage.getItem('ordstaven_spar_p3_backup'))).not.toBeNull();
});

test('startskärmens foto (F4): rummet där han är, 160 × 96 runt hjälten, och det är FORTSÄTT nästa gång', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await starta(page, '?snabb&ny&foto'); // fotot tas inte i snabbläget utan ?foto
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    t.spelare.hjalte.namn = 'Ture'; t.spelare.unge.namn = 'KNOPP';
    av.scen = 5; delete av.scenId; av.startad = false;
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await starta(page, '?snabb&foto');
  await page.click('.start-knapp');
  await page.waitForFunction(() => !!localStorage.getItem('ordstaven_spar_foto'), null, { timeout: 15000 });
  const matt = await page.evaluate(() => new Promise((klar) => { const i = new Image(); i.onload = () => klar([i.naturalWidth, i.naturalHeight]); i.src = localStorage.getItem('ordstaven_spar_foto'); }));
  expect(matt).toEqual([160, 96]);
  const foto = await page.evaluate(() => localStorage.getItem('ordstaven_spar_foto'));
  expect(foto.length).toBeLessThan(40000); // en liten bild (localStorage delas med andra spel)
  await starta(page);
  await expect(page.locator('.start-knapp.fortsatt img.foto')).toHaveAttribute('src', foto);
  await page.screenshot({ path: 'test-results/start-foto.png' });
});


test('introt (F4): natten väntar på första trycket, sedan morgonen, namnet, kameran och blicken ned till startskärmen, och ett tryck till hoppar över', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  const fel = await starta(page, '?snabb&ny&intro');
  await expect(page.locator('.intro')).toBeVisible();
  await expect(page.locator('.intro-pil')).toBeVisible();
  // Stils bilder i hela steg över spelytan, och inget att läsa: namnet syns inte än
  expect(await page.locator('.intro').boundingBox()).toEqual(await page.locator('#varld').boundingBox());
  await expect(page.locator('.intro-bokstav.fram')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/intro-natt.png' });
  // natten väntar: inget händer utan tryck
  await page.waitForTimeout(600);
  await expect(page.locator('.startbord')).toHaveCount(0);
  await page.click('.intro');
  await expect(page.locator('.intro.morgon')).toBeVisible();
  await expect(page.locator('.intro-pil')).toBeHidden();
  await expect(page.locator('.startbord')).toBeVisible({ timeout: 15000 });
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain('[intro] första trycket');
  expect(logg).toContain('[intro] klart');
  await expect(page.locator('.skylt-namn')).toHaveText('ORDSTAVEN');
  // en gång till: ett tryck efter det första hoppar över resten, direkt till startskärmen
  await starta(page, '?snabb&intro');
  await page.click('.intro');
  await page.click('.intro');
  await expect(page.locator('.startbord')).toBeVisible();
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[intro] hoppat över');
  // irisen (62.5) stängs över skrivbordet och öppnas i rummet
  await starta(page, '?snabb&iris');
  await page.click('.start-knapp');
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('[iris] öppnad'), { timeout: 8000 }).toBe(true);
  await expect(page.locator('#iris')).toBeHidden();
  expect(fel).toEqual([]);
});

test('musiken (F5): menyns slinga i introt, på startskärmen, i pausmenyn och i INSTÄLLNINGAR, spelets inne i spelet, sänkt när något läses, och looppunkterna ger ingen skarv', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  const musik = () => page.evaluate(() => window.__ORDSTAVEN.musik());
  await starta(page, '?snabb&ny&intro');
  expect((await musik()).onskad).toBeNull(); // inget ljud före första trycket
  await page.click('.intro');
  expect((await musik()).onskad).toBe('meny');
  await page.click('.intro');
  await expect(page.locator('.startbord')).toBeVisible();
  expect((await musik()).onskad).toBe('meny');
  await page.click('.start-knapp');
  await expect.poll(async () => (await musik()).onskad).toBe('spel');
  // en replik i pratrutan eller läsplattan: musiken är sänkt, och höjs när den är borta
  await expect(page.locator('#remsa:not([hidden]), #plattan:not([hidden])').first()).toBeVisible({ timeout: 10000 });
  await expect.poll(async () => (await musik()).sankt).toBe(true);
  // INSTÄLLNINGAR: menyns slinga, och tillbaka till spelets
  await page.keyboard.press('Control+Shift+KeyM');
  expect((await musik()).onskad).toBe('meny');
  await page.keyboard.press('Escape');
  expect((await musik()).onskad).toBe('spel');
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[musik] spel');
  // Stils looppunkter: filerna räcker till slutpunkten, slingan är så lång som i tabellen, och ljudet efter
  // slutpunkten är samma som efter startpunkten (en halv sekund av början efter), så att skarven inte hörs
  const filer = await page.evaluate(async () => {
    const ut = {};
    for (const [namn, m] of Object.entries(window.__ORDSTAVEN.musikfiler())) {
      const ac = new OfflineAudioContext(1, 44100, 44100);
      const b = await ac.decodeAudioData(await (await fetch(m.ogg)).arrayBuffer());
      const d = b.getChannelData(0), sr = b.sampleRate, a0 = Math.round(m.loopStart * sr), a1 = Math.round(m.loopEnd * sr);
      let skillnad = 0, signal = 0;
      for (let i = 0; i < sr * 0.3; i++) { skillnad += (d[a0 + i] - d[a1 + i]) ** 2; signal += d[a0 + i] ** 2; }
      ut[namn] = { langd: b.duration, slinga: m.loopEnd - m.loopStart, skarv: Math.sqrt(skillnad / Math.max(signal, 1e-9)) };
    }
    return ut;
  });
  expect(filer.meny.slinga).toBeCloseTo(41.739, 3);
  expect(filer.spel.slinga).toBeCloseTo(48.0, 3);
  for (const f of Object.values(filer)) { expect(f.langd).toBeGreaterThanOrEqual(f.slinga + 0.5); expect(f.skarv).toBeLessThan(0.2); }
});

test('INSTÄLLNINGAR (25, beslut 62.6): röstens tempo och volym, helskärm, när sparfilen hämtades, OM SPELET, och testläget bara med ?test', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await starta(page, '?snabb&ny');
  const inst = () => page.evaluate(() => window.__ORDSTAVEN.tillstand().installningar);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="ljud"]');
  // röstens tempo: lagom från början, långsamt sparas
  await expect(page.locator('#vuxenmeny .tempo.nu')).toHaveText('LAGOM');
  await page.click('#vuxenmeny .tempo[data-v="langsamt"]');
  await expect(page.locator('#vuxenmeny .tempo.nu')).toHaveText('LÅNGSAMT');
  expect((await inst()).rostTempo).toBe('langsamt');
  // röstens volym: tio knappar, och den sjunde ger 7 av 10
  await expect(page.locator('#vuxenmeny .rost-volym .pip')).toHaveCount(10);
  await expect(page.locator('#vuxenmeny .rost-volym .pip.pa')).toHaveCount(10);
  await page.click('#vuxenmeny .rost-volym .pip[data-n="7"]');
  await expect(page.locator('#vuxenmeny .rost-volym .pip.pa')).toHaveCount(7);
  expect((await inst()).rostVolym).toBe(7);
  await page.screenshot({ path: 'test-results/installningar-ljud.png' });
  // helskärm: en knapp, eller en rad om varför det inte går
  await page.click('#vuxenmeny .del[data-del="skarm"]');
  await expect(page.locator('#vuxenmeny .menydel[data-del="skarm"]')).toContainText(/Helskärm|hemskärmen/);
  // sparfilen: när den hämtades senast
  await page.click('#vuxenmeny .del[data-del="sparfil"]');
  await expect(page.locator('#vuxenmeny .sparfil-senast')).toContainText('har inte hämtats');
  await Promise.all([page.waitForEvent('download'), page.click('#vuxenmeny .spara-fil')]);
  await expect(page.locator('#vuxenmeny .sparfil-senast')).toContainText('hämtades senast');
  expect((await inst()).sparfilSparad).toBeTruthy();
  // OM SPELET
  await page.click('#vuxenmeny .del[data-del="om"]');
  await expect(page.locator('#vuxenmeny .om-spelet')).toContainText('Inget skickas någonstans');
  await expect(page.locator('#vuxenmeny .om-spelet')).toContainText('Lexend');
  await page.screenshot({ path: 'test-results/installningar-om.png' });
  // testläget finns i snabbläget (testerna), men inte i det vanliga spelet
  await expect(page.locator('#vuxenmeny .del[data-del="test"]')).toHaveCount(1);
  await page.goto('./');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await expect(page.locator('#vuxenmeny .del')).toHaveCount(8);
  await expect(page.locator('#vuxenmeny .del[data-del="test"]')).toHaveCount(0);
  await expect(page.locator('#vuxenmeny .scen:not(.pass-start)')).toHaveCount(0);
});
