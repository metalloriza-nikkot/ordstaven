// Kapitel 3 i gråbox, steg 1 (beslut 87.9.3): pass 1 spelas från floden till ön, som en spelare med tryck på marken
// och tangentbordet. Hornet räknar tryck, ön stiger (tillstand_efter), SVÄRD hugger tången, han lyfter på mossan och
// läser skylten i två steg. Kapitlet står inte i listan än, så det öppnas med ?kapitel=kap-03 (för den vuxne).
import { test, expect } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-03.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));

/** Starta kapitel 3 vid en scen, med namnen klara. @param {any} page @param {string} scenId */
async function starta(page, scenId, scen = 0, steg = 0) {
  await page.goto('./?snabb&ny&kapitel=kap-03');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(({ scenId, scen, steg }) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-03', scen, scenId, steg, startad: steg > 0, pass: scen ? 2 : 1 });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.hjalte.formler = ['LJUS', 'SVÄRD', 'FLYG'];
    t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { scenId, scen, steg });
  await page.goto('./?snabb&kapitel=kap-03');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
}

test('kapitel 3 pass 1 går att spela från floden till ön (gråbox, steg 1)', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(240000);
  await starta(page, 'k3s01_floden');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const gaMot = (id) => ev((id) => { const o = window.__ORDSTAVEN.ruta(id); if (!o) return false; window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 6); return true; }, id);
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => { await gaMot(id); await page.waitForTimeout(500); if (await page.locator('#plattan').isVisible()) return; await page.keyboard.press('Space'); };
  const scener = [];
  let hornet = 0, forstaTut = false, onSedd = false;
  for (let i = 0; i < 500; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) break;
    if (!onSedd && scen === 'k3s01_floden' && (await ev(() => window.__ORDSTAVEN.ruta('tang_gardin')))) {
      onSedd = true; await page.screenshot({ path: 'test-results/kap3-floden-on.png' });
    }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      const p = pussel.get(st?.pussel_id);
      await typ(p.svar); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    if (await page.locator('#plattan .kortrad .kort').first().isVisible().catch(() => false) && st?.typ === 'pussel' && pussel.get(st.pussel_id)?.typ === 'P1_las_och_valj') {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const p = pussel.get(st.pussel_id); const ratt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ.find((a) => a.ratt);
      await page.locator(`#plattan .kort[data-id="${ratt.id}"]`).click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(600); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (st?.typ === 'prata') await gaMot(st.figur);
    else if (p?.typ === 'P29_tryck') {
      // först två tut (fel: alla tittar undrande upp), sedan ett
      if (hornet === 0) { await gaMot(p.foremal); await page.waitForTimeout(600); }
      const tut = hornet === 0 ? 2 : 1;
      if (!forstaTut) { forstaTut = true; await page.screenshot({ path: 'test-results/kap3-hornet.png' }); }
      for (let n = 0; n < tut; n++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
      hornet++;
      await page.waitForTimeout(4500); // tystnaden räknas med spelets klocka
      continue;
    } else if (p?.typ === 'P26_krukorna') {
      const kvar = await ev((ids) => ids.filter((id) => !window.__ORDSTAVEN.logg().includes(`[lyfta] ${id}:`)), p.foremal);
      if (kvar.length) await anvand(kvar[0]);
    }
    await page.waitForTimeout(250);
  }
  expect(scener).toEqual(['k3s01_floden', 'k3s02_on']);
  await page.screenshot({ path: 'test-results/kap3-on.png' });
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  // hornet: två tut var fel med sin reaktion, och ett tut löste pusslet
  expect(loggen).toContain('k3_hornet: 2 tryck');
  expect(loggen).toContain('k3_hornet: 1 tryck');
  expect(loggen).toContain('[rummet] floden: on');
  // mossan: han lyfte med handen (inget sving), och skylten låg under den fjärde
  const lyft = loggen.split('\n').filter((r) => r.includes('[lyfta] tuva_'));
  expect(lyft).toHaveLength(4);
  expect(lyft[3]).toMatch(/: skylt$/);
  expect(loggen).not.toMatch(/\[svinga\] tuva_/);
  const t = await ev(() => window.__ORDSTAVEN.tillstand());
  expect(t.aventyr['den-gomda-dalen'].rumstillstand.floden).toBe('on');
});

test('flodmannen säger ahoj! i gemener (87.7)', async ({ page }) => {
  test.setTimeout(90000);
  await starta(page, 'k3s01_floden');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // fram till hornet: mellanscenerna, och skepparen som kallar (han går dit)
  for (let i = 0; i < 120 && (await ev(() => window.__ORDSTAVEN.steg()?.pussel_id)) !== 'k3_hornet'; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    if ((await ev(() => window.__ORDSTAVEN.steg()?.typ)) === 'prata') await ev(() => { const o = window.__ORDSTAVEN.ruta('skepparen'); window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 6); });
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst() && document.querySelector('#plattan').hidden);
  const p = await ev(() => window.__ORDSTAVEN.objekt('flodman'));
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#rop')).toBeVisible();
  await expect(page.locator('#rop')).toHaveText('ahoj!');
  expect(await ev(() => window.__ORDSTAVEN.logg())).toContain('[bubbla] flodman: ahoj!');
  await page.screenshot({ path: 'test-results/kap3-ahoj.png' });
});

test('kapitel 3 pass 2: snäckorna, skalkanten mitt i letandet, chiffret, fenan och kramen (steg 2)', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(240000);
  await starta(page, 'k3s03_sandbanken', kap.scener.findIndex((s) => s.id === 'k3s03_sandbanken'));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const gaMot = (id) => ev((id) => { const o = window.__ORDSTAVEN.ruta(id); if (!o) return false; window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 6); return true; }, id);
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => { await gaMot(id); await page.waitForTimeout(500); if (await page.locator('#plattan').isVisible()) return; await page.keyboard.press('Space'); };
  const chiffer = pussel.get('k3_chiffret').chiffer;
  const nyckel = new Map(chiffer.nyckel.map((n) => [n.tecken, n.bokstav]));
  let skalkant = false, chifferBild = false, felSkrivet = false;
  for (let i = 0; i < 500; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) break;
    if (await page.locator('#plattan .meddelande-ruta').isVisible()) {
      if (!chifferBild) {
        chifferBild = true; await page.screenshot({ path: 'test-results/kap3-chiffret.png' });
        // allt ryms på skärmen (79.2): instruktionen, tecknen och nyckeln
        const ruta = await page.locator('#plattan .meddelande-ruta').boundingBox();
        const vy = page.viewportSize();
        expect(ruta.y).toBeGreaterThanOrEqual(0);
        expect(ruta.y + ruta.height).toBeLessThanOrEqual(vy.height);
        expect((await page.locator('#plattan .meddelande-ruta .fraga-rad').boundingBox()).y).toBeGreaterThanOrEqual(0);
      }
      // ett fel först (rutan skakar), sedan hela meddelandet
      if (!felSkrivet) { felSkrivet = true; await typ('Q'); await page.waitForTimeout(800); }
      await typ(chiffer.tecken.filter((t) => t !== ' ').map((t) => nyckel.get(t)).join(''));
      await page.waitForTimeout(3000); continue;
    }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      const p = pussel.get(st?.pussel_id);
      await typ(p.svar); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (st?.typ === 'ga_till' && st.mal === 'unge') await ev(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x + 14, u.y); });
    else if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (p?.typ === 'P26_krukorna') {
      const loggen = await ev(() => window.__ORDSTAVEN.logg());
      // efter första snäckan går han till skalets kant: den frivilliga scenen börjar där
      if (!skalkant && loggen.includes('[svinga] snacka_')) { skalkant = true; await gaMot('skalkant'); await page.waitForTimeout(1500); continue; }
      const kvar = p.foremal.filter((id) => !loggen.includes(`[svinga] ${id}:`));
      if (kvar.length) await anvand(kvar[0]);
    } else if (p?.i_rummet) {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const m = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ.find((a) => a.ratt).objekt;
      await anvand(m);
    }
    await page.waitForTimeout(250);
  }
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  // skalkanten: scenen spelades mitt i letandet, med LJUS och sidan i Dinoboken, och letandet fortsatte
  expect(loggen).toContain('[frivilligt] scen k3s06_skalkant vid skalkant');
  expect(loggen).toContain('[frivilligt] scen k3s06_skalkant klar, tillbaka till pussel');
  expect(loggen).toMatch(/\[val\] k3_morkret|k3_morkret/);
  // chiffret: ett fel på första tecknet, och sedan tio tecken med loggen per tecken
  expect(loggen).toContain('[val] k3_chiffret: Q vid tecken vag');
  expect(loggen.split('\n').filter((r) => r.includes('[tecken] k3_chiffret'))).toHaveLength(10);
  expect(loggen).toContain('[val] k3_chiffret: UNDER FENAN');
  const t = await ev(() => window.__ORDSTAVEN.tillstand());
  const av = t.aventyr['den-gomda-dalen'];
  expect(av.frivilligt).toContain('k3s06_skalkant');
  expect(av.rumstillstand.sandbanken).toBe('fena_uppe');
  await page.screenshot({ path: 'test-results/kap3-pass2-slut.png' });
});

test('chiffret ryms på skärmen i alla storlekar, med instruktionen överst (79.2)', async ({ page }) => {
  test.setTimeout(60000);
  const sc = kap.scener.findIndex((s) => s.id === 'k3s03_sandbanken');
  await starta(page, 'k3s03_sandbanken', sc, kap.scener[sc].steg.findIndex((x) => x.pussel_id === 'k3_chiffret'));
  for (let i = 0; i < 60 && !(await page.locator('#plattan .meddelande-ruta').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  const ruta = await page.locator('#plattan .meddelande-ruta').boundingBox();
  const vy = page.viewportSize();
  expect(ruta.y).toBeGreaterThanOrEqual(0);
  expect(ruta.x).toBeGreaterThanOrEqual(0);
  expect(ruta.y + ruta.height).toBeLessThanOrEqual(vy.height);
  expect(ruta.x + ruta.width).toBeLessThanOrEqual(vy.width);
  for (const el of await page.locator('#plattan .meddelande-ruta :is(.fraga-rad, .med-ruta, .kod-par)').all()) {
    const b = await el.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(vy.height);
  }
});
