// Stils mellanscener som regier i rummet (Teknik 31, beslut 68.5): varje regi går i sitt rum, med Stils bilder.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const las = (k) => JSON.parse(readFileSync(new URL(`../../content/den-gomda-dalen/${k}.json`, import.meta.url), 'utf8'));

/** En sparning i en scen (namnen finns, kapitlen före spolas fram), och spelet startat där. */
async function sparadI(page, kap, scenId) {
  const k = las(kap);
  await page.goto(`./?snabb&ny&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([kap, scenId, scen]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: kap, scen, scenId, steg: 0, startad: false });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'LJUS', 'SVÄRD'])];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [kap, scenId, k.scener.findIndex((s) => s.id === scenId)]);
  await page.goto(`./?snabb&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe(scenId);
  await page.waitForTimeout(1200);
}
const regi = (page, bild) => page.evaluate((b) => window.__ORDSTAVEN.regi(b), bild);
/** Gå till en plats: repliker och rutor på vägen klickas bort (berättelsen går vidare som när han spelar). */
async function gaTill(page, x, y, klar) {
  for (let i = 0; i < 80; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.evaluate(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [x, y]);
    await page.waitForTimeout(250);
    if (klar(await page.evaluate(() => window.__ORDSTAVEN.position()))) return;
  }
  throw new Error(`kom inte fram till ${x}, ${y}`);
}

test('Stils mellanscener (Teknik 31): ungens lägen, ekorren, apan, Farfar och SVÄRD som ristas', async ({ page }) => {
  test.setTimeout(150000);
  // skogsbrynet (k1s02): ungen biter i lianen, lyssnar mot norr, ekorren skakar skal över ungen, och SVÄRD ristas
  await sparadI(page, 'kap-01', 'k1s02_lianerna');
  expect(await regi(page, 'unge_biter')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_biter_(hoger|vanster|upp)_0[12]$/);
  await page.waitForTimeout(1400);
  expect(await regi(page, 'unge_lyssnar_upp')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_lyssnar_upp_0[12]$/);
  await page.waitForTimeout(1600);
  expect(await regi(page, 'ekorre_knacker')).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren'))).toMatch(/^ekorre_skaka_(hoger|vanster)_0[12]$/);
  // som förut, och slingan går igen (spelets klocka går långsammare än väggklockan i canvas-läget, därför poll)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren')), { timeout: 10000 }).toMatch(/^ekorre_gren_0[12]$/);
  expect(await regi(page, 'stav_ristas')).toBeGreaterThan(2000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/regi-stav-ristas.png' });
  await page.waitForTimeout(1500);
  for (const l of ['unge_fnissar', 'unge_fnissar_mun', 'unge_kryper_ihop', 'unge_gaspar', 'unge_lyssnar']) { expect(await regi(page, l), l).toBeGreaterThan(0); await page.waitForTimeout(1800); }
  // gläntan (k1s05): apan i nätet suckar
  await sparadI(page, 'kap-01', 'k1s05_glantan');
  expect(await regi(page, 'apa_suckar')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('apan_i_nat'))).toMatch(/^apa_sucka_0[12]$/);
  // kontoret (s09): Farfar skriver och gäspar
  await sparadI(page, 'kap-00', 's09_lappen');
  expect(await regi(page, 'farfar_skriver')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toMatch(/^farfar_fatolj_skriver_0[12]$/);
  await page.waitForTimeout(2600);
  expect(await regi(page, 'farfar_gaspar')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toBe('farfar_fatolj_gaspar_01');
  await page.screenshot({ path: 'test-results/regi-farfar-gaspar.png' });
  // en regi som inte finns gör ingenting (då visar spelet beskrivningen)
  expect(await regi(page, 'unge_finns_inte')).toBe(0);
});

test('kapitel 2:s mellanscener i gråboxen (Teknik 32, 69.1): ungen sjunker i leran och dras upp, och luftskeppet river brevet', async ({ page }) => {
  test.setTimeout(120000);
  // träskkanten: ungen skuttar ut i leran och sjunker, och sitter fast tills den dras upp
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  const O = (f, a) => page.evaluate(f, a);
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker', 'leran'))).toBeGreaterThan(1000);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeDjup()), { timeout: 8000 }).toBe(12);
  const [u, l] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u.x).toBeGreaterThanOrEqual(l.x); expect(u.x).toBeLessThanOrEqual(l.x + l.b);
  expect(u.y).toBeGreaterThanOrEqual(l.y); expect(u.y).toBeLessThanOrEqual(l.y + l.h);
  expect(await O(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_radd_ner_0[12]$/);
  await page.screenshot({ path: 'test-results/regi-unge-i-leran.png' });
  // utan unge_till gör regin ingenting (och då visar spelet beskrivningen)
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker'))).toBe(0);
  // hjälten går dit, och ungen står kvar i leran
  await O(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x, u.y - 20); });
  await page.waitForTimeout(1500);
  const u2 = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.round(u2.x)).toBe(Math.round(u.x)); expect(Math.round(u2.y)).toBe(Math.round(u.y));
  expect(await O(() => window.__ORDSTAVEN.regi('unge_dras_upp'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeFast()), { timeout: 8000 }).toBe(false);
  expect(await O(() => window.__ORDSTAVEN.ungeDjup())).toBe(0);
  const [u3, l3] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u3.x >= l3.x && u3.x <= l3.x + l3.b && u3.y >= l3.y && u3.y <= l3.y + l3.h).toBe(false); // ute ur leran
  // byn: luftskeppet glider in, brevet rivs, och luftskeppet far mot bryggan
  await sparadI(page, 'kap-02', 'k2s02_byn');
  expect(await O(() => window.__ORDSTAVEN.regi('luftskepp_river_brevet'))).toBeGreaterThan(4000);
  await page.waitForTimeout(3000);
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('luftskeppet river brevet');
  await page.screenshot({ path: 'test-results/regi-luftskeppet-river-brevet.png' });
  expect(await O(() => window.__ORDSTAVEN.grafik().luftskepp)).toMatch(/^luftskepp_/);
});

test('vassen i gråboxen (Teknik 32 och 34, 71.3): bubblorna, halvan till handen, ungen på stocken, FLYG tar stocken i land', async ({ page }) => {
  test.setTimeout(120000);
  await sparadI(page, 'kap-02', 'k2s05_vassen');
  const O = (f, a) => page.evaluate(f, a);
  expect(await O(() => window.__ORDSTAVEN.regi('bubblor_fran_blommorna'))).toBeGreaterThan(0);
  expect(await O(() => window.__ORDSTAVEN.regi('halvan_flyger_till_handen'))).toBeGreaterThan(0);
  await page.waitForTimeout(2300);
  // han har gått till stranden efter halvan (ga_till brev_halva_vatten)
  await gaTill(page, 580, 110, (p) => p.x > 560);
  // jättehoppet: ungen landar på stocken, och stocken glider ut med den. Inget följer hjälten.
  const s0 = await O(() => window.__ORDSTAVEN.ruta('stock_vassen'));
  expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_pa_stocken'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()), { timeout: 10000 }).toEqual({ foljer: false, r: 0, styrd: false });
  const u = await O(() => window.__ORDSTAVEN.ungePos());
  expect(u.x).toBeGreaterThan(s0.x + s0.b / 2 + 4); // ute på vattnet
  await page.screenshot({ path: 'test-results/regi-unge-pa-stocken.png' });
  expect(await O(() => window.__ORDSTAVEN.regi('unge_piper_pa_stocken'))).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  expect(await O(() => window.__ORDSTAVEN.regi('stocken_flyger_till_stranden'))).toBeGreaterThan(0);
  await page.waitForTimeout(1800);
  const u2 = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.abs(u2.y - (s0.y + s0.h / 2 + 2))).toBeLessThan(4); // stocken är tillbaka vid stranden
  expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_i_land'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()), { timeout: 8000 }).toBeNull();
  await page.screenshot({ path: 'test-results/regi-unge-i-land.png' });
  const regi = (await O(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['blommorna blåser bubblor', 'halvan flyger till handen', 'ungen hoppar på stocken', 'ungen piper på stocken', 'stocken flyger till stranden', 'ungen hoppar i land']) expect(regi).toContain(r);
});

test('REP, BRO och STEGE tar också ungen i land (71.3), och SVÄRD hugger genom vassen (71.6)', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  for (const [ord, namn] of [['rep_till_ungen', 'repet drar in stocken'], ['bro_till_stocken', 'en bro till stocken'], ['stege_till_stocken', 'en stege till stocken']]) {
    await sparadI(page, 'kap-02', 'k2s05_vassen');
    await gaTill(page, 580, 110, (p) => p.x > 560);
    expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_pa_stocken'))).toBeGreaterThan(0);
    await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()?.styrd), { timeout: 10000 }).toBe(false);
    expect(await O((r) => window.__ORDSTAVEN.regi(r), ord)).toBeGreaterThan(0);
    await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()?.styrd), { timeout: 10000 }).toBe(false);
    if (ord !== 'rep_till_ungen') expect(await O(() => window.__ORDSTAVEN.ungeSvavar()?.foljer)).toBe(false);
    expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain(namn);
    await page.screenshot({ path: `test-results/regi-${ord}.png` });
  }
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  expect(await O(() => window.__ORDSTAVEN.regi('litet_svard_kittlar_vassen'))).toBeGreaterThan(0);
  expect(await O(() => window.__ORDSTAVEN.regi('svard_hugger_genom_vassen'))).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/regi-svard-i-vassen.png' });
  await page.waitForTimeout(1400);
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('svärdet hugger genom vassen');
});

test('kvällen i byn (71.5, 71.6): LJUS tänder lyktorna, elden tänds, byborna står vid elden; Tant Rosa når inte tavlan (71.4)', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  await sparadI(page, 'kap-02', 'k2s10_elden');
  await page.waitForTimeout(800);
  const [eld, fisk] = await O(() => [window.__ORDSTAVEN.ruta('lagereld'), window.__ORDSTAVEN.ruta('fiskaren')]);
  expect(eld && fisk).toBeTruthy();
  expect(Math.hypot(fisk.x + fisk.b / 2 - (eld.x + eld.b / 2), fisk.y + fisk.h - (eld.y + eld.h / 2))).toBeLessThan(60);
  // LJUS skrivs som när han spelar: formelns effekt är regin (ljuset hoppar från staven till lyktorna)
  for (let i = 0; i < 60 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await expect(page.locator('#plattan .formel-skriv')).toBeVisible();
  await page.keyboard.type('LJUS'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await O(() => window.__ORDSTAVEN.grafik())).regi, { timeout: 10000 }).toContain('ljuset hoppar mellan lyktorna');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test-results/regi-lyktorna.png' }); // kameran följer ljuset ned mot udden
  // Gå till elden: han går dit, och Fiskaren tänder elden (mellanscenen elden_tands)
  await gaTill(page, 566, 312, (p) => p.y > 300 && p.x > 540);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await O(() => window.__ORDSTAVEN.grafik())).regi, { timeout: 15000 }).toContain('elden tänds');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/regi-elden-tands.png' });
  const regi = (await O(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['ljuset hoppar mellan lyktorna', 'elden tänds']) expect(regi).toContain(r);
  await sparadI(page, 'kap-02', 'k2s08_huset');
  await page.waitForTimeout(800);
  const tavla = await O(() => window.__ORDSTAVEN.ruta(window.__ORDSTAVEN.rumsobjekt().find((id) => /tavla/.test(id))));
  if (tavla) expect(tavla.y).toBeLessThan(40); // högt uppe på väggen
  expect(await O(() => window.__ORDSTAVEN.regi('tant_rosa_nar_inte'))).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/regi-tant-rosa-nar-inte.png' });
});
