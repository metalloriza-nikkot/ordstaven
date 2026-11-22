// Kapitel 4, Berget (beslut 118.4), i gråbox: alla tre passen från bergets fot till resan mot molnkanten. Stigarna
// hoppas med ett tryck på rätt flak (vägen räknas ut med karna/bokstavsstig.js), formlerna skrivs på tangentbordet och
// ordlåset läggs med brickorna. I stig 3 prövas lockordet klo först, och grenen sjunker tillbaka (116.2).
import { expect } from '@playwright/test';
import { test } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';
import { skapaStig, hjalpFlak, valj } from '../../src/karna/bokstavsstig.js';

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-04.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));

/** Vägen genom en stig, flak för flak ({ r: steg, k: rad }). @param {any} p */
function stigVag(p) {
  const s = skapaStig(p), vag = [];
  for (let i = 0; i < 20 && !s.klar; i++) { const h = hjalpFlak(s); if (!h) break; vag.push(h); valj(s, h); }
  return vag;
}

/** Går mot föremålets sida (som i kapitel 3). */
function gaMotSida(id) {
  const o = window.__ORDSTAVEN.ruta(id); if (!o) return false;
  const p = o.sida === 'vanster' ? [o.x - 9, o.y + o.h - 1] : o.sida === 'hoger' ? [o.x + o.b + 9, o.y + o.h - 1] : o.sida === 'over' ? [o.x + o.b / 2, o.y - 2] : [o.x + o.b / 2, o.y + o.h + 6];
  const r = window.__ORDSTAVEN.spel.scene.getScene('Rum');
  if (o.sida === 'alla' && !r.hinder.vag(r.pos, { x: p[0], y: p[1] }).length) { const f = r.standplats(r.ruta(id)); window.__ORDSTAVEN.gaMot(f.x, f.y); return true; }
  window.__ORDSTAVEN.gaMot(p[0], p[1]); return true;
}

/** Starta kapitel 4 vid en scen, med namnen klara. @param {any} page @param {string} scenId */
async function starta(page, scenId, steg = 0, rumstillstand = {}) {
  const scen = kap.scener.findIndex((s) => s.id === scenId);
  await page.goto('./?snabb&ny&kapitel=kap-04');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(({ scenId, scen, steg, pass, rumstillstand }) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-04', scen, scenId, steg, startad: steg > 0, pass });
    av.rumstillstand = { ...(av.rumstillstand || {}), ...rumstillstand };
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.hjalte.formler = ['LJUS', 'SVÄRD', 'FLYG', 'SKÖLD'];
    t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { scenId, scen, steg, pass: kap.scener[scen].pass, rumstillstand });
  await page.goto('./?snabb&kapitel=kap-04');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
}

/** Spelar från där spelet står tills passets slut. Klo prövas först i stig 3. @returns {Promise<string[]>} scenerna */
async function spelaPasset(page, namn) {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => {
    await ev(gaMotSida, id);
    let fore = null;
    for (let t = 0; t < 25; t++) {
      await page.waitForTimeout(200);
      const q = await ev(() => window.__ORDSTAVEN.position());
      if (fore && Math.hypot(q.x - fore.x, q.y - fore.y) < 0.5) break;
      fore = q;
    }
    if (await page.locator('#plattan').isVisible()) return;
    await page.keyboard.press('Space');
  };
  const scener = [], bilder = new Set();
  /** @type {Map<string, { r: number, k: number }[]>} */ const stigar = new Map();
  let klo = false;
  for (let i = 0; i < 600; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) break;
    const r = kap.scener.find((x) => x.id === scen)?.rum;
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (r && !bilder.has(`${r}-${st?.typ}`) && !(await page.locator('#plattan').isVisible()) && st?.typ !== 'mellanscen') {
      bilder.add(`${r}-${st?.typ}`); await page.screenshot({ path: `test-results/kap4-${namn}-${r}-${st?.pussel_id || st?.typ}.png` });
    }
    // bokstavsstigen: ett tryck på nästa rätta flak (klo först i stig 3)
    if (p?.typ === 'P18_bokstavsstig' && await page.locator('#stigord .flakord').first().isVisible().catch(() => false)) {
      if (!stigar.has(p.id)) stigar.set(p.id, stigVag(p));
      if (p.id === 'k4_stig3' && !klo) {
        klo = true;
        await page.locator('#stigord .flakord[data-ruta="0,1"]').click(); await page.waitForTimeout(500);
        await page.locator('#stigord .flakord[data-ruta="1,2"]').click(); await page.waitForTimeout(2500);
        await page.screenshot({ path: `test-results/kap4-${namn}-klo.png` });
        continue;
      }
      // nästa flak på vägen: det första som inte är trampat (klass trampad)
      const vag = stigar.get(p.id);
      const trampade = await page.locator('#stigord .flakord.trampad').evaluateAll((l) => l.map((e) => e.dataset.ruta));
      const nasta = vag.find((q) => !trampade.includes(`${q.r},${q.k}`));
      if (nasta) await page.locator(`#stigord .flakord[data-ruta="${nasta.r},${nasta.k}"]`).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      await typ(p.formler[0].ord.replace(' ', '')); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    if (p?.typ === 'P9_kodlas' && await page.locator('#plattan .bricka[data-id]').first().isVisible()) {
      await expect(page.locator('#plattan .ordlas')).toContainText('STENEN ÄR INTE KALL.');
      await expect(page.locator('#plattan .ordlas-mening')).toContainText('DEN ÄR');
      expect(await page.locator('#plattan .kod-nyckel').count()).toBe(0);
      await page.screenshot({ path: `test-results/kap4-${namn}-ordlas.png` });
      for (const b of p.svar.toUpperCase()) await page.locator('#plattan .bricka[data-id]:not(.anvand)', { hasText: new RegExp(`^${b}$`) }).first().click();
      await page.waitForTimeout(1500); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (st?.typ === 'las_skylt') await anvand(st.foremal);
    else if (p?.typ === 'P26_krukorna') {
      const loggen = await ev(() => window.__ORDSTAVEN.logg());
      const kvar = p.foremal.filter((id) => !loggen.includes(`[lyfta] ${id}:`));
      if (kvar.length) await anvand(kvar[0]);
    } else if (p?.i_rummet) {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const alt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ;
      await anvand(alt.find((a) => a.ratt).objekt);
    }
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `test-results/kap4-${namn}-slut.png` });
  return scener;
}

test('kapitel 4 pass 1: skyltarna, stig 1, snön, Farfars sten och STOR SKÖLD mot raset', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(240000);
  await starta(page, 'k4s01_foten');
  const scener = await spelaPasset(page, 'pass1');
  expect(scener).toEqual(['k4s01_foten', 'k4s02_mynningen']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[stig] k4_stig1: klar');
  expect(loggen).toMatch(/\[formel\] k4_stor_skold: klar/);
  // raset är en scen på ca 12 s (121.2), och i testläget hinner passet längre än regin: vänta in hela scenen
  const regi = async () => (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['ankomst_berget', 'baronen_kikare_berg', 'luftskeppet glider förbi över stigen', 'blocket_lyfts', 'fel knut', 'rätt knut', 'baronen hejar', 'blocket rycks loss', 'snöraset i ett svep', 'stor_skold_ras', 'mynningen_stangs']) await expect.poll(regi, { timeout: 20000 }).toContain(r);
  expect(loggen).toContain('[stig] k4_stig1: ungen skuttar i spåret');
});

test('kapitel 4 pass 2: mörkret, LJUS, gemenernas vägg, stig 2 och gåtan (120.3)', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(240000);
  await starta(page, 'k4s03_grottan');
  const scener = await spelaPasset(page, 'pass2');
  // passet slutar när gåtan står i boken (Men hur kommer de ut?), och stig 3 är pass 3
  expect(scener).toEqual(['k4s03_grottan']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[skylt] vagg_gemener');
  expect(loggen).toContain('[stig] k4_stig2: klar');
  expect(loggen).not.toContain('k4_stig3');
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['mörkret', 'grottan_glittrar', 'grottan_visar_vaggen']) expect(regi).toContain(r);
});

test('kapitel 4 pass 3: stig 3 med klo, klippan, stenarna, ordlåset VARM och resan mot molnkanten', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(300000);
  await starta(page, 'k4s04_utvagen');
  const scener = await spelaPasset(page, 'pass3');
  expect(scener).toEqual(['k4s04_utvagen', 'k4s05_klippan', 'k4s05_stenfaltet']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toMatch(/\[stig\] k4_stig3: klar, 0 fel, 1 återvändsgränder/);
  expect(loggen).toMatch(/\[formel\] k4_klippan: stege_klippan/);
  expect(loggen).toContain('[val] k4_stenarna: sten_klubba');
  expect(loggen).toMatch(/\[val\] k4_ladan: VARM .*klar/);
  // locket: STENEN ÄR och fälten i luckan, ingen nyckel (P9 utan chiffer, 2.54)
  expect(loggen).not.toContain('k4_ladan: fel');
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['ungen_slar_isen', 'klippan: stege upp', 'blocket_driva', 'fossil_svans', 'svansarna', 'ladan_oppnas', 'kartbit5_molnkant', 'skata_harmar_molnkant', 'resan_molnkant']) expect(regi).toContain(r);
});

/** Klickar fram repliker ("Var var vi?" och instruktionen) tills det som söks syns. */
async function tills(page, sel, ms = 30000) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return;
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  throw new Error(`${sel} syns inte`);
}

/** Lägger fält på ett pussel i kapitlet som spelet har läst (119.4: motorn prövas innan Innehålls data finns). */
async function pusselFalt(page, id, falt) {
  await page.waitForFunction((id) => window.__ORDSTAVEN.kapitel()?.pussel?.some((p) => p.id === id), id);
  await page.evaluate(({ id, falt }) => { const p = window.__ORDSTAVEN.kapitel().pussel.find((x) => x.id === id); for (const [k, v] of Object.entries(falt)) if (p[k] === undefined) p[k] = v; }, { id, falt });
}

test('kapitel 4: stig 1 går uppför, och ungen skuttar i spåret när hjälten är över (119.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  await starta(page, 'k4s01_foten', 4);
  await tills(page, '#stigord .flakord');
  const p = pussel.get('k4_stig1'), vag = stigVag(p);
  // stegen ligger nedifrån och upp: det första flaket står längre ned i rummet än det sista
  const forsta = await page.evaluate(() => window.__ORDSTAVEN.position());
  const yFlak = async (q) => (await page.locator(`#stigord .flakord[data-ruta="${q.r},${q.k}"]`).boundingBox()).y;
  expect(await yFlak(vag[0])).toBeGreaterThan(await yFlak(vag.at(-1)));
  await page.screenshot({ path: 'test-results/kap4-stig1-uppfor.png' });
  for (const q of vag) { await page.locator(`#stigord .flakord[data-ruta="${q.r},${q.k}"]`).click(); await page.waitForTimeout(700); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('ungen skuttar i spåret, 3 flak');
  const efter = await page.evaluate(() => window.__ORDSTAVEN.position());
  expect(efter.y).toBeLessThan(forsta.y - 60);
});

test('kapitel 4: hjälptrappan i stig 3 kommer ett steg i taget (119.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  await starta(page, 'k4s04_utvagen', 1);
  await tills(page, '#stigord .flakord');
  const versal = page.locator('#stigord .stigord-versal');
  await expect(versal).toHaveCount(0);
  // gåtans rad står inte vid stigen från början, och efter ett fel glimtar väggen och ungen viftar med svansen
  await page.locator('#stigord .flakord[data-ruta="0,0"]').click();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('hjälptrappan steg 1');
  await expect(versal).toHaveCount(0);
  await page.waitForTimeout(1800);
  await page.locator('#stigord .flakord[data-ruta="0,2"]').click();
  await expect(versal).toContainText('SVANSEN HAR EN KLUBBA', { timeout: 8000 });
  await page.screenshot({ path: 'test-results/kap4-hjalptrappan.png' });
  await page.waitForTimeout(600);
  await page.locator('#stigord .flakord[data-ruta="0,0"]').click();
  await expect(versal).toHaveText(/^\s*KLUBBA\s*$/, { timeout: 8000 });
});

test('kapitel 4: gåtan står på läsplattan på stenfältet (119.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  await starta(page, 'k4s05_stenfaltet', 3);
  // gåtans tre rader läses först på läsplattan, och sedan öppnar papperet i molnet dem igen
  const slut = Date.now() + 30000;
  while (Date.now() < slut && !(await page.locator('#plattan').textContent().catch(() => '')).includes('SVANSEN HAR EN KLUBBA')) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await expect(page.locator('#plattan')).toContainText('STENEN ÄR VARM');
  await page.screenshot({ path: 'test-results/kap4-gatan.png' });
  await page.locator('#plattan .vidare').click();
  await tills(page, '#tanke .tanke-lapp');
  await page.locator('#tanke .tanke-lapp').click();
  await expect(page.locator('#plattan')).toContainText('DEN HAR EN SVANS', { timeout: 8000 });
});

test('kapitel 4: stig 4 i F3 (tand), och han hoppar tillbaka till stranden (121.3)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  // i galleriet (D) efter stig 2: han går till ristningen på västra stranden i F3, och den frivilliga scenen börjar
  await starta(page, 'k4s03_grottan', 8, { berget_grottan: 'ljus' });
  for (let i = 0; i < 60 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); r.pos = { x: 430, y: 280 }; r.placera(); });
  await page.evaluate(gaMotSida, 'ristning_tand');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Space');
  await tills(page, '#stigord .flakord');
  const forsta = await page.evaluate(() => window.__ORDSTAVEN.position());
  await page.screenshot({ path: 'test-results/kap4-stig4.png' });
  for (const q of stigVag(pussel.get('k4_stig4'))) { await page.locator(`#stigord .flakord[data-ruta="${q.r},${q.k}"]`).click(); await page.waitForTimeout(700); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('k4_stig4: tillbaka över stigen, 4 flak');
  const efter = await page.evaluate(() => window.__ORDSTAVEN.position());
  expect(Math.abs(efter.x - forsta.x)).toBeLessThan(4);
  await tills(page, '#plattan .dinobok, #plattan .bok-sida, #plattan .vidare', 20000);
  await page.screenshot({ path: 'test-results/kap4-stig4-tanden.png' });
});
