// Kapitel 4, Berget (beslut 118.4), i gråbox: alla tre passen från bergets fot till resan mot molnkanten. Stigarna
// hoppas med ett tryck på rätt flak (vägen räknas ut med karna/bokstavsstig.js), formlerna skrivs på tangentbordet och
// ordlåset läggs med brickorna. I stig 3 prövas lockordet klo först, och grenen sjunker tillbaka (116.2).
import { expect } from '@playwright/test';
import { test } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';
import { skapaStig, hjalpFlak, valj } from '../../src/karna/bokstavsstig.js';
const PAKET = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

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

/** Går till bokstavsstigens kant om stigen väntar på det (122.3), och väntar tills bokstäverna står. @param {any} page */
async function tillKanten(page) {
  const k = await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').stigKanten);
  if (!k) return false;
  await page.evaluate(({ x, y }) => window.__ORDSTAVEN.gaMot(x, y), k);
  // 133.6: bokstäverna står redan medan han går dit, så vänta tills han är vid kanten
  await expect.poll(() => page.evaluate(() => !window.__ORDSTAVEN.spel.scene.getScene('Rum').stigKanten), { timeout: 15000 }).toBe(true).catch(() => {});
  await page.locator('#stigord .flakord').first().waitFor({ timeout: 15000 }).catch(() => {});
  return true;
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
    // 122.3: han går själv till stigens kant, och bokstäverna kommer när han är där
    if (p?.typ === 'P18_bokstavsstig') await tillKanten(page);
    // bokstavsstigen: ett tryck på nästa rätta flak (klo först i stig 3)
    if (p?.typ === 'P18_bokstavsstig' && await page.locator('#stigord .flakord').first().isVisible().catch(() => false)) {
      if (!stigar.has(p.id)) stigar.set(p.id, stigVag(p));
      if (p.id === 'k4_stig3' && !klo) {
        klo = true;
        // 124.4: k, l och sedan o, som knakar (u och o står intill varandra efter l)
        await page.locator('#stigord .flakord[data-ruta="0,1"]').click(); await page.waitForTimeout(500);
        await page.locator('#stigord .flakord[data-ruta="1,0"]').click(); await page.waitForTimeout(500);
        await page.locator('#stigord .flakord[data-ruta="2,1"]').click(); await page.waitForTimeout(2500);
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
  for (const r of ['ankomst_berget', 'baronen_kikare_berg', 'luftskeppet glider förbi över stigen', 'blocket_lyfts', 'fel knut', 'rätt knut', 'baronen hejar', 'blocket rycks loss', 'snöraset i ett svep', 'raset nedför berget', 'stor_skold_ras', 'mynningen_stangs', 'de springer in i grottan', 'snön täpper till öppningen', 'raset på långt håll', 'ungen kryper bakom hjälten', 'tystnad när snön stannar', 'ungen kikar fram']) await expect.poll(regi, { timeout: 20000 }).toContain(r);
  expect(loggen).toContain('[stig] k4_stig1: ungen skuttar i spåret');
});

test('kapitel 4: raset på långt håll, tystnaden, ungen bakom hjälten och ungens ögon i mörkret (126.6–126.7)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  const steg = kap.scener.find((s) => s.id === 'k4s02_mynningen').steg.findIndex((s) => s.typ === 'mellanscen' && s.bild === 'blocket_lyfts');
  await starta(page, 'k4s02_mynningen', steg);
  const zoom = () => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').cameras.main.zoom);
  // kameran visar hela berget med figurerna små, och textlagret i världen är gömt under tiden
  for (let i = 0; i < 80 && (await zoom()) !== 0.5; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(await zoom()).toBe(0.5);
  await expect(page.locator('#varldslager')).toHaveClass(/fjarran/);
  await page.screenshot({ path: 'test-results/kap4-raset-langt-hall.png' });
  // när snön stannar är kameran tillbaka hos dem, och ungen sitter bakom hjälten
  await expect.poll(zoom, { timeout: 30000 }).toBe(1);
  await expect(page.locator('#varldslager')).not.toHaveClass(/fjarran/);
  const r = await page.evaluate(() => { const x = window.__ORDSTAVEN.spel.scene.getScene('Rum'); return { h: x.pos, u: x.ungePos }; });
  expect(r.u.y).toBeGreaterThan(r.h.y);
  expect(Math.abs(r.u.x - r.h.x)).toBeLessThan(14);
  await page.screenshot({ path: 'test-results/kap4-raset-snon-stannar.png' });
  const regi = async () => (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const t of ['raset på långt håll', 'ungen kryper bakom hjälten', 'tystnad när snön stannar', 'ungen kikar fram']) await expect.poll(regi, { timeout: 15000 }).toContain(t);
  // ungens ögon tänds i det svarta, och ungen blinkar med ett litet ljud
  await page.evaluate(() => window.__ORDSTAVEN.regi('ungens_ogon'));
  await expect.poll(regi, { timeout: 8000 }).toContain('ungens ögon tänds i mörkret');
  await expect.poll(regi, { timeout: 8000 }).toMatch(/ljud:(unge_blink|lucka_pip)/);
});

test('kapitel 4 pass 2: mörkret, LJUS, gemenernas vägg, salen med stig 2 och valvet (124.2)', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(240000);
  await starta(page, 'k4s03_gangen');
  const scener = await spelaPasset(page, 'pass2');
  // 124.12.2: passet slutar när de kommer in i galleriet (Där är mina ledtrådar!), och gåtan är pass 3
  expect(scener).toEqual(['k4s03_gangen', 'k4s03_salen', 'k4s03_valvet']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[skylt] vagg_gemener');
  expect(loggen).toContain('[stig] k4_stig2: klar');
  // orgeln i salen (127.6): en orgelton per rätt flak och ackordet när TAVLA är klar
  expect(loggen).toContain('[stig] k4_stig2: orgel_ackord');
  expect(loggen).toContain('[stig] k4_stig_valv: klar');
  expect(loggen).toContain('[skylt] vagg_valvet');
  expect(loggen).not.toContain('k4_stig3');
  expect(loggen).not.toContain('[skylt] gata_1');
  // 124.2: grottan är fem rum i följd, och han går in i salen, valvet och galleriet genom gångarna
  for (const u of ['gang_salen_in', 'gang_valvet', 'gang_galleriet']) expect(loggen).toContain(`[framme] ${u}`);
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['mörkret', 'grottan_glittrar', 'grottan_visar_vaggen']) expect(regi).toContain(r);
});

test('kapitel 4 pass 3: gåtan i galleriet, stig 3 med klo, klippan, stenarna, ordlåset VARM och resan mot molnkanten', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 3');
  test.setTimeout(360000);
  await starta(page, 'k4s03_galleriet');
  const scener = await spelaPasset(page, 'pass3');
  expect(scener).toEqual(['k4s03_galleriet', 'k4s04_utvagen', 'k4s05_klippan', 'k4s05_stenfaltet']);
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  for (const g of ['gata_1', 'gata_2', 'gata_3']) expect(loggen).toContain(`[skylt] ${g}`);
  // 124.12.3: gåtan är hans lapp efter galleriet (kan_oppnas_igen)
  expect(await page.evaluate(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].lappar)).toContain('k4_stenarna');
  // 124.4: klo knakar på o (ett fel), och ingen återvändsgränd går att nå
  expect(loggen).toMatch(/\[stig\] k4_stig3: klar, 1 fel, 0 återvändsgränder/);
  // den vuxnes logg på 0.107.0: lådan under stenen är gömd, och han går dit när den har kommit fram
  expect(loggen).toContain('[letar] lada_farfar');
  expect(loggen).not.toContain('[FEL]');
  expect(loggen).toMatch(/\[formel\] k4_klippan: stege_klippan/);
  expect(loggen).toContain('[val] k4_stenarna: sten_klubba');
  expect(loggen).toMatch(/\[val\] k4_ladan: VARM .*klar/);
  // locket: STENEN ÄR och fälten i luckan, ingen nyckel (P9 utan chiffer, 2.54)
  expect(loggen).not.toContain('k4_ladan: fel');
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  for (const r of ['ungen_slar_isen', 'klippan: stege upp', 'blocket_driva', 'fossil_svans', 'svansarna', 'ladan_oppnas', 'kartbit5_molnkant', 'skata_harmar_molnkant', 'resan_molnkant']) expect(regi).toContain(r);
});

/** Klickar fram repliker ("Var var vi?" och instruktionen) tills det som söks syns. */
/** Stigen är redo: han är vid kanten, instruktionen är stängd och bokstäverna står (133.6). @param {any} page */
async function stigRedo(page) {
  const redo = async () => (await page.locator('#stigord .flakord').first().isVisible().catch(() => false)) && await page.locator('#plattan').isHidden()
    && await page.evaluate(() => !window.__ORDSTAVEN.spel.scene.getScene('Rum').stigKanten);
  for (let i = 0; i < 100 && !(await redo()); i++) {
    const k = await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').stigKanten);
    if (k) await page.evaluate(({ x, y }) => window.__ORDSTAVEN.gaMot(x, y), k);
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await expect(page.locator('#stigord .flakord').first()).toBeVisible();
}

async function tills(page, sel, ms = 30000) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return;
    if (sel.includes('flakord')) await tillKanten(page);
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
  await stigRedo(page);
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
  await stigRedo(page);
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

test('kapitel 4: stig 4 i tandgrottan, och han hoppar tillbaka till stranden (124.12.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(150000);
  // i galleriet: tanden glimtar genom isen vid öppningen, och där lockar det. Han går ut genom öppningen, och den
  // frivilliga scenen spelas i tandgrottan (ett eget rum). Sedan går han tillbaka till galleriet
  await starta(page, 'k4s03_galleriet');
  for (let i = 0; i < 60 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); r.pos = { x: 260, y: 300 }; r.placera(); });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[lockar] k4s03_tanden vid oppning_tandgrottan');
  await page.evaluate(gaMotSida, 'oppning_tandgrottan');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('scen k4s03_tanden');
  // speldosan (127.6, Innehålls pass 132): rummets slinga spelar i tandgrottan
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[musik] tandgrottan');
  await stigRedo(page);
  await page.evaluate(() => {
    const e = document.querySelector('#fynd'); window.__fynd = null;
    new MutationObserver(() => { if (!e.hidden && e.querySelector('.fynd-kort') && !window.__fynd) window.__fynd = { text: e.querySelector('.fynd-text')?.textContent ?? '', bild: e.querySelector('.fynd-bild [data-bild]')?.getAttribute('data-bild') ?? null }; }).observe(e, { attributes: true, childList: true, subtree: true });
  });
  const forsta = await page.evaluate(() => window.__ORDSTAVEN.position());
  await page.screenshot({ path: 'test-results/kap4-stig4.png' });
  for (const q of stigVag(pussel.get('k4_stig4'))) { await page.locator(`#stigord .flakord[data-ruta="${q.r},${q.k}"]`).click(); await page.waitForTimeout(700); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('k4_stig4: tillbaka över stigen, 4 flak');
  const efter = await page.evaluate(() => window.__ORDSTAVEN.position());
  expect(Math.abs(efter.x - forsta.x)).toBeLessThan(4);
  // 133.10: fyndögonblicket. Hjälten håller upp tanden, fanfaren spelar, och sidan visas i närbild med sitt ord
  // (i snabbläget står det kort, så det fångas när det syns)
  for (const slut = Date.now() + 30000; Date.now() < slut && !(await page.evaluate(() => window.__fynd));) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  const fynd = await page.evaluate(() => window.__fynd);
  expect(fynd.text).toContain('EN STOR TAND');
  expect(fynd.bild).toBe('tand_isen');
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi).toContain('fyndet hålls upp');
  await page.screenshot({ path: 'test-results/kap4-stig4-tanden.png' });
  await expect(page.locator('#fynd')).toBeHidden({ timeout: 6000 });
  expect(await page.evaluate(() => window.__ORDSTAVEN.logg())).toContain('[fynd] dinoboken: tand_isen');
});

test('kapitel 4: F1 i gången, isklumparna och Farfars kompass (124.3)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(150000);
  // efter LJUS: han ska till väggen med paren, men vid svängen lockar isfickan, och där lyfter han isklumparna
  const steg = kap.scener.find((s) => s.id === 'k4s03_gangen').steg.findIndex((s) => s.typ === 'ga_till');
  await starta(page, 'k4s03_gangen', steg, { berget_gangen: 'ljus' });
  for (let i = 0; i < 40 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); r.pos = { x: 100, y: 176 }; r.placera(); });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[lockar] k4s03_isfickan vid isficka');
  await page.evaluate(gaMotSida, 'isficka');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('scen k4s03_isfickan vid isficka');
  for (const id of ['isklump_1', 'isklump_2', 'isklump_3']) {
    await tills(page, '#plattan[hidden]', 15000).catch(() => {});
    await page.evaluate(gaMotSida, id); await page.waitForTimeout(2200); await page.keyboard.press('Space'); await page.waitForTimeout(1200);
  }
  const slut = Date.now() + 30000;
  while (Date.now() < slut && !(await page.evaluate(() => window.__ORDSTAVEN.logg())).includes('scen k4s03_isfickan klar')) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('scen k4s03_isfickan klar');
  // 133.10: gåvan får fyndögonblicket också
  expect(loggen).toContain('[fynd] ryggsack: farfars_kompass');
  await page.screenshot({ path: 'test-results/kap4-f1-kompassen.png' });
  // 128.4 (LASMIG_126): kompassen hänger på ryggsäcken, och lagret följer hans håll
  const kompass = await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); return r.kompass?.frame?.name ?? null; });
  expect(kompass).toMatch(/^kompass_rygg_(upp|ner|hoger|vanster)_01$/);
  for (const [x, namn] of [[60, 'vanster'], [200, 'hoger']]) {
    await page.evaluate((x) => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); window.__ORDSTAVEN.gaMot(x, r.pos.y); }, x);
    await page.waitForTimeout(900);
    await page.locator('canvas').first().screenshot({ path: `test-results/kap4-kompass-${namn}.png` });
  }
});

// 128.4: kapitlets rum med Stils bilder (lev127). Varje rum har sin bild (i gången den mörka i tillståndet mork), det
// som är målat ritas inte en gång till, och de rörliga sakerna står där. Bilden av hela rummet går till Stil.
test('kapitel 4: rummens bilder och det som rör sig (128.4, LASMIG_127)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'bilderna är desamma överallt');
  test.setTimeout(240000);
  const rummen = [
    ['k4s01_foten', 'berget_stigen', 'rum_berget_stigen', []],
    ['k4s03_gangen', 'berget_gangen', 'rum_berget_gangen_mork', ['f1_ljus']],
    ['k4s03_gangen', 'berget_gangen', 'rum_berget_gangen', ['f1_ljus', 'isklump_1'], 3],
    ['k4s03_salen', 'berget_salen', 'rum_berget_salen', ['orgel_blank', 'tavla_farfar']],
    ['k4s03_valvet', 'berget_valvet', 'rum_berget_valvet', ['valv_ljus']],
    // tandgrottan nås bara genom galleriet (testet av stig 4 visar den)
    ['k4s03_galleriet', 'berget_galleriet', 'rum_berget_galleriet', ['isblock']],
    ['k4s04_utvagen', 'berget_sprickan', 'rum_berget_sprickan', ['snoflingor']],
    ['k4s05_stenfaltet', 'berget_stenfalt', 'rum_berget_stenfalt', []],
  ];
  for (const [scen, rum, golv, rorliga, steg = 0] of rummen) {
    // gången tänd: efter LJUS (steg 3 i k4s03_gangen)
    await starta(page, scen, steg, steg ? { berget_gangen: 'ljus' } : {});
    await page.waitForFunction((r) => window.__ORDSTAVEN.spel.scene.getScene('Rum').rumId === r, rum, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const g = await page.evaluate(() => window.__ORDSTAVEN.grafik());
    expect(g.golv, rum).toBe(golv);
    // etiketten i hörnet är versionen som byggdes (130.4): skärmdumparna till Stil ska visa rätt version
    await expect(page.locator('.etikett.version')).toHaveText(`ORDSTAVEN ${PAKET.version}`);
    const info2 = await page.evaluate((ids) => {
      const r = window.__ORDSTAVEN.spel.scene.getScene('Rum');
      // det som är målat har ingen egen bild (en osynlig ruta), och de rörliga har sin bild
      const malade = r.objekt.filter((o) => o.iBilden && !o.ankare).filter((o) => r.ritade.get(o.id)?.texture).map((o) => o.id);
      const bilder = ids.map((id) => [id, r.ritade.get(id)?.frame?.name ?? null]);
      // hela rummet i bild: kameran zoomar ut tills rummet ryms
      const c = r.cameras.main, B = r.storlek.bredd, H = r.storlek.hojd;
      c.stopFollow(); c.setZoom(Math.min(1, 320 / B, 192 / H)); c.centerOn(B / 2, H / 2); r.smutsig = true;
      return { malade, bilder };
    }, rorliga);
    expect(info2.malade, `${rum}: målat i bilden men ritat igen`).toEqual([]);
    for (const [id, ram] of info2.bilder) expect(ram, `${rum} ${id}`).not.toBeNull();
    // läsplattan döljs bara för bilden
    await page.evaluate(() => { for (const e of document.querySelectorAll('#plattan, .replik-ruta')) e.style.visibility = 'hidden'; });
    await page.waitForTimeout(400);
    await page.locator('canvas').first().screenshot({ path: `test-results/kap4-rum-${scen.replace('k4s0', '')}-${golv.replace('rum_', '')}.png` });
  }
});

// ------------------------------------------------------------------ 133.13.1: felen från den vuxnes spelning av 0.112.0

/** Klickar fram repliker tills steget har typen typ. @param {any} page @param {string} typ */
async function tillsSteg(page, typ, varv = 60) {
  for (let i = 0; i < varv && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== typ; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

test('kapitel 4: vid gaffeln visar kameran alla tre vägarnas mål lika länge, och luftskeppet syns först efter valet (133.2)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  await starta(page, 'k4s01_foten');
  // ankomsten glider inte upp mot toppen och visar inget luftskepp
  await tillsSteg(page, 'pussel');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 30000 }).toContain('vägens mål isgrottan');
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  const rader = loggen.split('\n').filter((r) => /vägens mål/.test(r));
  expect(rader.map((r) => r.replace(/.*vägens mål /, '').trim())).toEqual(['eldgrottan', 'issjon', 'isgrottan']);
  // ingen av dem pekas ut, och baronen syns inte förrän han har valt
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).k4Skepp).toBeNull();
  await page.screenshot({ path: 'test-results/kap4-133-gaffeln.png' });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id), { timeout: 15000 }).toBe('k4_skyltarna');
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).k4Skepp).toBeNull();
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n')).not.toMatch(/luftskepp/);
});

test('kapitel 4: luftskeppet är Stils med baronen och Herr Skata, aldrig gråbox (133.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  const skepp = async () => (await page.evaluate(() => window.__ORDSTAVEN.grafik())).k4Skepp;
  // stigen: baronen läser stenen med kikaren, och blocket lyfts
  await starta(page, 'k4s02_mynningen');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__ORDSTAVEN.regi('baronen_kikare_berg'));
  await expect.poll(skepp).toBe('luftskepp_ser_kartan');
  await page.screenshot({ path: 'test-results/kap4-133-luftskepp-kikaren.png' });
  await expect.poll(skepp, { timeout: 5000 }).toBe('luftskepp_skata_landar');
  await page.evaluate(() => window.__ORDSTAVEN.regi('blocket_lyfts'));
  // Herr Skata flyger ut med repet, och baronen står ensam i gondolen tills den är tillbaka
  await expect.poll(skepp, { timeout: 5000 }).toBe('luftskepp_glider_01');
  await page.screenshot({ path: 'test-results/kap4-133-luftskepp-blocket.png' });
  await expect.poll(skepp, { timeout: 10000 }).toBe('luftskepp_skata_landar');
  // stenfältet: blocket i drivan och Herr Skata som flyger till skeppet
  const steg = kap.scener.find((s) => s.id === 'k4s05_stenfaltet').steg.findIndex((s) => s.typ !== 'replik');
  await starta(page, 'k4s05_stenfaltet', Math.max(0, steg));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__ORDSTAVEN.regi('blocket_driva'));
  await expect.poll(skepp).toMatch(/^luftskepp_/);
  await page.screenshot({ path: 'test-results/kap4-133-luftskepp-stenfaltet.png' });
  await page.evaluate(() => window.__ORDSTAVEN.regi('skata_harmar_molnkant'));
  await expect.poll(skepp, { timeout: 8000 }).toBe('luftskepp_skata_landar');
  // inget i kapitlet ritar luftskeppet i gråbox
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join('\n');
  expect(regi).toContain('blocket_driva');
  expect(await skepp()).not.toBe('gråbox');
});

test('kapitel 4: bokstäverna står på flaken innan instruktionen kommer (133.6)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  const steg = kap.scener.find((s) => s.id === 'k4s01_foten').steg.findIndex((s) => s.pussel_id === 'k4_stig1');
  await starta(page, 'k4s01_foten', steg);
  await tillsSteg(page, 'pussel');
  // han står en bit från kanten: instruktionen står i molnet, och bokstäverna står redan på flaken
  await expect.poll(() => page.evaluate(() => !!window.__ORDSTAVEN.spel.scene.getScene('Rum').stigKanten), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#stigord .flakord').first()).toBeVisible();
  const flak = await page.locator('#stigord .flakord').allTextContents();
  expect(flak.join('')).toMatch(/[up]/);
  await expect(page.locator('#tanke .instruktion')).toBeVisible();
  // 135.6: UPP står på ett eget ordkort i molnet
  await expect(page.locator('#tanke .moln-ord')).toHaveText('UPP');
  await page.screenshot({ path: 'test-results/kap4-133-flaken.png' });
  // ett tryck på ett flak innan han är vid kanten tar honom dit, och sedan börjar stigen
  await page.locator('#stigord .flakord').first().click();
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('k4_stig1: han är vid kanten');
  // instruktionen läses igen vid kanten, och bokstäverna står kvar medan den läses
  await expect(page.locator('#plattan.replik')).toBeVisible();
  await expect(page.locator('#plattan .vvv-ord')).toHaveText('UPP');
  await expect(page.locator('#stigord .flakord').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/kap4-133-flaken-kanten.png' });
});

test('kapitel 4: ungen går runt grottans väggar, aldrig igenom dem (133.7)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  const steg = kap.scener.find((s) => s.id === 'k4s03_gangen').steg.findIndex((s) => s.typ === 'ga_till');
  await starta(page, 'k4s03_gangen', steg, { berget_gangen: 'ljus' });
  await tillsSteg(page, 'ga_till');
  // ungen ställs där en vägg står mellan den och hjälten, men där det finns en väg runt
  const satt = await page.evaluate(() => {
    const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'), h = r.hinder, pos = r.pos;
    for (let y = 30; y < r.storlek.hojd - 4; y += 4) for (let x = 12; x < r.storlek.bredd - 12; x += 4) {
      const p = { x, y };
      const d = Math.hypot(x - pos.x, y - pos.y);
      if (d < 60 || d > 200 || !h.fri(p) || h.sikt(p, pos)) continue;
      const v = h.vag(p, pos);
      if (v.length >= 2) { r.ungePos = p; r.placera(); return { p, pos: { ...pos } }; }
    }
    return null;
  });
  expect(satt, 'en plats bakom en vägg').not.toBeNull();
  const fel = [];
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(100);
    const u = await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); return { p: { ...r.ungePos }, fri: r.hinder.fri(r.ungePos) }; });
    if (!u.fri) fel.push(u.p);
  }
  expect(fel, 'ungen stod i en vägg').toEqual([]);
  const slut = await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); return Math.hypot(r.ungePos.x - r.pos.x, r.ungePos.y - r.pos.y); });
  expect(slut).toBeLessThan(40);
  await page.screenshot({ path: 'test-results/kap4-133-ungen.png' });
});

test('kapitel 4: lockelsen i grottan visar ingen text för den vuxne, och molnet visar inte nästa rums steg (133.8–133.9)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(120000);
  const steg = kap.scener.find((s) => s.id === 'k4s03_gangen').steg.findIndex((s) => s.typ === 'ga_till');
  await starta(page, 'k4s03_gangen', steg, { berget_gangen: 'ljus' });
  await page.evaluate(() => {
    const e = document.querySelector('#regi'); window.__regiText = [];
    new MutationObserver(() => { if (!e.hidden && e.textContent) window.__regiText.push(e.textContent); }).observe(e, { attributes: true, childList: true, characterData: true, subtree: true });
  });
  await tillsSteg(page, 'ga_till');
  await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); r.pos = { x: 100, y: 176 }; r.placera(); });
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain('[lockar] k4s03_isfickan vid isficka');
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.__regiText)).toEqual([]);
  await expect(page.locator('#regi')).toBeHidden();
  // 133.9: HOPPA ÖVER VATTNET görs i salen, så molnet i gången visar det inte
  const moln = await page.locator('#tanke').textContent();
  expect(moln || '').not.toMatch(/HOPPA ÖVER VATTNET/);
  await page.screenshot({ path: 'test-results/kap4-133-gangen.png' });
});
