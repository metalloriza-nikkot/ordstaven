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
async function starta(page, scenId, steg = 0) {
  const scen = kap.scener.findIndex((s) => s.id === scenId);
  await page.goto('./?snabb&ny&kapitel=kap-04');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(({ scenId, scen, steg, pass }) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-04', scen, scenId, steg, startad: steg > 0, pass });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.hjalte.formler = ['LJUS', 'SVÄRD', 'FLYG', 'SKÖLD'];
    t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { scenId, scen, steg, pass: kap.scener[scen].pass });
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
      await expect(page.locator('#plattan .ordlas-mening')).toContainText('STENEN ÄR');
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
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['ankomst_berget', 'baronen_kikare_berg', 'blocket_lyfts', 'stor_skold_ras', 'mynningen_stangs']) expect(regi).toContain(r);
});

test('kapitel 4 pass 2: mörkret, LJUS, stig 2, gåtan och stig 3 med klo', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(240000);
  await starta(page, 'k4s03_grottan');
  const scener = await spelaPasset(page, 'pass2');
  expect(scener).toEqual(['k4s03_grottan', 'k4s04_utvagen']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[stig] k4_stig2: klar');
  expect(loggen).toMatch(/\[stig\] k4_stig3: klar, 0 fel, 1 återvändsgränder/);
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['mörkret', 'grottan_glittrar', 'grottan_visar_vaggen', 'ungen_slar_isen']) expect(regi).toContain(r);
});

test('kapitel 4 pass 3: stenarna, ordlåset VARM, kartbit fem och resan mot molnkanten', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(240000);
  await starta(page, 'k4s05_stenfaltet');
  const scener = await spelaPasset(page, 'pass3');
  expect(scener).toEqual(['k4s05_stenfaltet']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[val] k4_stenarna: sten_klubba');
  expect(loggen).toMatch(/\[val\] k4_ladan: VARM .*klar/);
  // locket: STENEN ÄR och fälten i luckan, ingen nyckel (P9 utan chiffer, 2.54)
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).not.toContain('k4_ladan: fel');
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['blocket_driva', 'fossil_svans', 'svansarna', 'ladan_oppnas', 'kartbit5_molnkant', 'skata_harmar_molnkant', 'resan_molnkant']) expect(regi).toContain(r);
});
