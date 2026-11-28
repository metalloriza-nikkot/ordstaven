// Kapitel 5, Dalen bakom molnen (beslut 139.8), i gråbox: alla tre passen från molnkanten till slutbilderna.
// Fäktningen väljer rätt kort (och ett fel först i rond 2, där kortet har ett eget svar, 139.4), lapparna läses och
// stängs, mästarprovet stryker en stig per rad, formlerna skrivs på tangentbordet, och ROPA och kramen är ett tryck på
// ungen. Kapitlet är låst, så slutrutan för ett låst kapitel kommer efter pass 1 och 2.
import { expect } from '@playwright/test';
import { test } from './hjalp/klocka.js';
import { provaUngenEfterVarje } from './hjalp/ungen.js';
import { readFileSync, writeFileSync } from 'node:fs';
provaUngenEfterVarje(test);

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-05.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));
const norm = (/** @type {string} */ s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');

/** Går mot föremålets sida (som i kapitel 3 och 4). */
function gaMotSida(id) {
  const o = window.__ORDSTAVEN.ruta(id); if (!o) return false;
  const p = o.sida === 'vanster' ? [o.x - 9, o.y + o.h - 1] : o.sida === 'hoger' ? [o.x + o.b + 9, o.y + o.h - 1] : o.sida === 'over' ? [o.x + o.b / 2, o.y - 2] : [o.x + o.b / 2, o.y + o.h + 6];
  const r = window.__ORDSTAVEN.spel.scene.getScene('Rum');
  if (o.sida === 'alla' && !r.hinder.vag(r.pos, { x: p[0], y: p[1] }).length) { const f = r.standplats(r.ruta(id)); window.__ORDSTAVEN.gaMot(f.x, f.y); return true; }
  window.__ORDSTAVEN.gaMot(p[0], p[1]); return true;
}

/** Ett tryck på ungen (kramen och ROPA). @param {any} page */
async function tryckPaUngen(page) {
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst(), null, { timeout: 10000 }).catch(() => {});
  const p = await page.evaluate(() => { const u = window.__ORDSTAVEN.ungePos(); return window.__ORDSTAVEN.varldTillSkarm(u.x, u.y - 8); });
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(1200);
}

/** Starta kapitel 5 vid en scen, med namnen och formlerna klara. @param {any} page @param {string} scenId */
async function starta(page, scenId, steg = 0) {
  const scen = kap.scener.findIndex((s) => s.id === scenId);
  await page.goto('./?snabb&ny&kapitel=kap-05');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(({ scenId, scen, steg, pass }) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-05', scen, scenId, steg, startad: steg > 0, pass });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.hjalte.formler = ['LJUS', 'SVÄRD', 'FLYG', 'SKÖLD', 'STOR SKÖLD'];
    t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { scenId, scen, steg, pass: kap.scener[scen].pass });
  await page.goto('./?snabb&kapitel=kap-05');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
}

/**
 * Spelar från där spelet står tills passets slut. Med hemligheter går han också till de frivilliga scenerna.
 * @returns {Promise<{ scener: string[], rondFel: string[] }>}
 */
async function spelaPasset(page, namn, { hemligheter = false } = {}) {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta, .stang)').all()) await v.click({ timeout: 300 }).catch(() => {}); };
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
  const scener = [], rondFel = [], bilder = new Set();
  let felValt = false;
  const besokta = new Set();
  for (let i = 0; i < 700; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt, .pass-slut .om, .pass-slut.kapitel-last .igen, .start-knapp').first().isVisible().catch(() => false)) break;
    const sc = kap.scener.find((x) => x.id === scen);
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (sc && !bilder.has(`${sc.rum}-${st?.typ}`) && !(await page.locator('#plattan').isVisible()) && st?.typ !== 'mellanscen') {
      bilder.add(`${sc.rum}-${st?.typ}`); await page.screenshot({ path: `test-results/kap5-${namn}-${sc.rum}-${st?.pussel_id || st?.typ}.png` });
    }
    // fäktningen: korten visar texten, och utfallet hittas på korten. Rond 2: ett fel kort med eget svar först
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const d = pussel.get('k5_faktning');
      const u = d.ronder.flatMap((r) => r.utfall).find((x) => x.alternativ.every((a) => texter.includes(norm(a.text))));
      if (!u) { await page.waitForTimeout(300); continue; }
      const ratt = texter.indexOf(norm(u.alternativ.find((a) => a.ratt).text));
      const egen = u.alternativ.find((a) => !a.ratt && a.vid_fel);
      if (!felValt && egen) {
        felValt = true; rondFel.push(norm(egen.text));
        await kort.nth(texter.indexOf(norm(egen.text))).click(); await page.waitForTimeout(800);
        rondFel.push(norm(await page.locator('#plattan').innerText().catch(() => '')));
        await page.waitForTimeout(1700); continue;
      }
      await kort.nth(ratt).click(); await page.waitForTimeout(2500); continue;
    }
    if (await page.locator('#plattan :is(.formel-skriv, .formel-ruta)').first().isVisible().catch(() => false) && p?.typ === 'P11_formel') {
      await typ(p.formler[0].ord.replace(' ', '')); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); continue;
    }
    // korten på läsplattan (bona)
    if (p?.typ === 'P1_las_och_valj' && !p.i_rummet && await page.locator('#plattan .kortrad .kort').first().isVisible().catch(() => false)) {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const ratt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ.find((a) => a.ratt);
      await page.locator(`#plattan .kort[data-id="${ratt.id}"]`).click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(800); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    if (st?.vantar_pa === 'krama_ungen' || st?.vantar_pa === 'ropa') { await tryckPaUngen(page); continue; }
    // hemligheterna: han går till det som lockar när den frivilliga scenen finns i rummet och han går fritt (ett mål).
    // Scenen börjar när han står vid det (spel.js, startar_vid), och annars prövas det igen vid nästa mål
    if (hemligheter && st?.typ === 'ga_till') {
      const fri = kap.scener.find((x) => x.frivillig && x.startar_i_rum === sc?.rum && !besokta.has(x.id));
      if (fri && await ev((id) => !!window.__ORDSTAVEN.ruta(id), fri.startar_vid)) {
        await ev(gaMotSida, fri.startar_vid);
        const startade = await expect.poll(() => ev(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toContain(`scen ${fri.id}`).then(() => true, () => false);
        if (startade) besokta.add(fri.id);
        continue;
      }
    }
    if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (st?.typ === 'las_skylt') await anvand(st.foremal);
    else if (st?.typ === 'bara') await anvand(st.till);
    else if (st?.typ === 'ta_emot') await anvand(st.fran);
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
  await page.screenshot({ path: `test-results/kap5-${namn}-slut.png` });
  return { scener, rondFel };
}

test('kapitel 5 pass 1: molnkanten, skylten, fäktningen med ett eget svar på ett fel kort, och biten', async ({ page }) => {
  test.setTimeout(240000);
  await starta(page, 'k5s01_molnkanten');
  const { scener, rondFel } = await spelaPasset(page, 'pass1');
  expect(scener).toEqual(['k5s01_molnkanten']);
  // 139.4: det fel kortet i rond 2 fick sitt eget svar, inte utfallets gemensamma
  // (när Innehålls skript har satt vid_fel på korten)
  const egna = pussel.get('k5_faktning').ronder.some((r) => r.utfall.some((u) => u.alternativ.some((a) => a.vid_fel)));
  if (egna) expect(rondFel.length).toBe(2);
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toMatch(/k5_faktning/);
  await expect(page.locator('.pass-slut')).toBeVisible();
});

test('kapitel 5 pass 2: dimman, LJUS, spåren, roten med STEGE, mästarprovet och ROPA, med båda hemligheterna', async ({ page }) => {
  test.setTimeout(400000);
  await starta(page, 'k5s02_dimman');
  const { scener } = await spelaPasset(page, 'pass2', { hemligheter: true });
  expect(scener).toEqual(expect.arrayContaining(['k5s02_dimman', 'k5s03_roten', 'k5s04_glantan']));
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  writeFileSync('test-results/kap5-pass2-logg.txt', logg);
  for (const id of ['k5_ljus', 'k5_stege', 'k5_roten', 'k5_rad1', 'k5_rad2', 'k5_rad3', 'k5_gomman', 'k5_lagret']) expect(logg, id).toContain(id);
  // diset före LJUS (grått, inte svart), och gläntans vita dimma
  const regi = (await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.join(' ');
  expect(regi).toContain('dimman');
  await expect(page.locator('.pass-slut')).toBeVisible();
});

test('kapitel 5 pass 3: mamma, kramen, radion, bona, STORT LJUS, avskedet och slutbilderna', async ({ page }) => {
  test.setTimeout(300000);
  await starta(page, 'k5s05_dalen');
  // loggen före slutet (efter den sista bilden laddas sidan om till startskärmen)
  let logg = '';
  const samla = setInterval(() => page.evaluate(() => window.__ORDSTAVEN?.logg?.() ?? '').then((l) => { if (l.length > logg.length) logg = l; }, () => {}), 500);
  const { scener } = await spelaPasset(page, 'pass3');
  clearInterval(samla);
  expect(scener).toEqual(expect.arrayContaining(['k5s05_dalen', 'k5s06_aggen', 'k5s07_avskedet', 'k5s08_slutet']));
  for (const id of ['k5_bo1', 'k5_bo2', 'k5_bo3', 'k5_stort_ljus']) expect(logg, id).toContain(id);
  // 139.8: efter äventyrets sista bild kommer startskärmen, inte frågan om att fortsätta. Loggen samlas var 500:e ms,
  // så raden om slutet hinner ibland försvinna med omladdningen (ultrabred i den stora kontrollen): startskärmen avgör
  await expect(page.locator('.start-knapp')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.pass-slut')).toHaveCount(0);
});

test('golvdatorn i kapitel 5 (139.8.5): canvas och fyra gånger långsammare processor i dimman (2 × 2, dis) och i gläntans dimma', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(150000);
  const fel = [];
  page.on('pageerror', (e) => fel.push(String(e)));
  const mat = () => page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  /** @type {Record<string, number>} */ const takt = {};
  for (const [scen, mal] of [['k5s02_dimman', { x: 320, y: 60 }], ['k5s04_glantan', { x: 330, y: 150 }]]) {
    await starta(page, scen);
    await page.goto('./?snabb&kapitel=kap-05&canvas');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.click('.start-knapp');
    expect(await page.evaluate(() => window.__ORDSTAVEN.ritning())).toBe('canvas');
    for (let k = 0; k < 20; k++) { const r = await page.$('#plattan .replik-ruta'); if (!r) break; await r.click().catch(() => {}); await page.waitForTimeout(200); }
    const c = await page.context().newCDPSession(page);
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // hjälten går genom dimman medan kameran följer honom
    await page.evaluate(({ x, y }) => window.__ORDSTAVEN.gaMot(x, y), mal);
    await mat();
    takt[scen] = /** @type {number} */ (await mat());
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.locator('canvas').first().screenshot({ path: `test-results/kap5-golv-${scen}.png` });
  }
  console.log('canvas, 4× långsammare: bildrutor per sekund', takt);
  // bara en röktest: testmaskinen ritar i mjukvara. Den riktiga mätningen är den vuxnes logg från MacBooken
  for (const [scen, fps] of Object.entries(takt)) expect(fps, `bildrutor per sekund i ${scen}`).toBeGreaterThan(15);
  expect(fel).toEqual([]);
});
