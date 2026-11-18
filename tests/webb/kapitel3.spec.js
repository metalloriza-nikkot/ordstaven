// Kapitel 3 i gråbox (beslut 87.9.3, ombyggd efter kap-03 v0.3 och manus 19 v0.4.1, beslut 100.4): de tre passen
// spelas som en spelare med tryck på marken och tangentbordet. Pass 1: SVÄRD vid hjulet, de tre tussarna, kvarnens
// tavla, säckhissen upp och det första tutet på avsatsen (102.3). Pass 2: FEM TUT. INTE TRE., ön vid bryggan, mossan, skylten, snäckorna och
// chiffret. Pass 3: fenan, kramen, tången med skalkanten mitt i, SKÖLD, ordduellen och resan. Kapitlet står inte i
// listan än, så det öppnas med ?kapitel=kap-03 (för den vuxne).
import { test, expect } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-03.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));

/**
 * Gå till ett föremål från den sida kartan säger (sida): tången vid hjulet nås från vänster. Körs i sidan.
 * @param {string} id
 */
function gaMotSida(id) {
  const o = window.__ORDSTAVEN.ruta(id); if (!o) return false;
  const p = o.sida === 'vanster' ? [o.x - 9, o.y + o.h - 1] : o.sida === 'hoger' ? [o.x + o.b + 9, o.y + o.h - 1] : o.sida === 'over' ? [o.x + o.b / 2, o.y - 2] : [o.x + o.b / 2, o.y + o.h + 6];
  // från alla håll, när han inte når saken nedifrån (tången vid vattnet på sandbanken): dit spelet går när man trycker
  // på saken, den närmaste sidan han når
  const r = window.__ORDSTAVEN.spel.scene.getScene('Rum');
  if (o.sida === 'alla' && !r.hinder.vag(r.pos, { x: p[0], y: p[1] }).length) { const f = r.standplats(r.ruta(id)); window.__ORDSTAVEN.gaMot(f.x, f.y); return true; }
  window.__ORDSTAVEN.gaMot(p[0], p[1]); return true;
}

/** Starta kapitel 3 vid en scen, med namnen klara. @param {any} page @param {string} scenId */
async function starta(page, scenId, scen = kap.scener.findIndex((s) => s.id === scenId), steg = 0) {
  await page.goto('./?snabb&ny&kapitel=kap-03');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(({ scenId, scen, steg, pass }) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-03', scen, scenId, steg, startad: steg > 0, pass });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.hjalte.formler = ['LJUS', 'SVÄRD', 'FLYG'];
    t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, { scenId, scen, steg, pass: kap.scener[scen].pass });
  await page.goto('./?snabb&kapitel=kap-03');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
}

test('kapitel 3 pass 1: SVÄRD vid hjulet, tussarna, kvarnens tavla, hissen och det första tutet på avsatsen', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(240000);
  await starta(page, 'k3s01_floden');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const gaMot = (id) => ev(gaMotSida, id);
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => {
    await gaMot(id);
    // vänta tills han står still (högst 5 s): en lång väg tar mer än en halv sekund
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
  let felValt = false;
  for (let i = 0; i < 500; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) break;
    // en skärmdump av varje rum, första gången plattan är stängd där
    const r = kap.scener.find((x) => x.id === scen)?.rum;
    if (r && !bilder.has(r) && !(await page.locator('#plattan').isVisible())) { bilder.add(r); await page.screenshot({ path: `test-results/kap3-${r}.png` }); }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      const p = pussel.get(st?.pussel_id);
      await typ(p.formler[0].ord); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (st?.typ === 'prata') await gaMot(st.figur);
    else if (st?.typ === 'tryck') { await page.waitForTimeout(400); await page.keyboard.press('Space'); }
    else if (p?.typ === 'P26_krukorna') {
      const loggen = await ev(() => window.__ORDSTAVEN.logg());
      const kvar = p.foremal.filter((id) => !loggen.includes(`[hugga] ${id}:`));
      if (kvar.length) await anvand(kvar[0]);
    } else if (p?.i_rummet) {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const alt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ;
      // rad 2: först VID den stora säcken (hissen åker utan honom), sedan PÅ
      if (p.id === 'k3_kvarn_2' && !felValt) { felValt = true; await anvand('vid_stora'); await page.waitForTimeout(1500); continue; }
      await anvand(alt.find((a) => a.ratt).objekt);
    }
    await page.waitForTimeout(250);
  }
  expect(scener).toEqual(['k3s01_floden', 'k3s02_kvarnen', 'k3s02_loftet']);
  await page.screenshot({ path: 'test-results/kap3-pass1-slut.png' });
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  // tussarna högg han själv, en i taget, och hjulet snurrar
  expect(loggen.split('\n').filter((r) => r.includes('[hugga] tang_hjul_'))).toHaveLength(3);
  // (hjulet snurrar: rummets tillstånd står i sparningen nedan)
  // tavlan öppnas på läsplattan när han kommer in i kvarnen, innan han går förbi något val (101.5)
  expect(loggen).toContain('[skylt] tavla_kvarn: öppnas när han kommer in');
  expect(loggen.indexOf('[skylt] tavla_kvarn: öppnas när han kommer in')).toBeLessThan(loggen.indexOf('[val] k3_kvarn_1'));
  // tavlan: rad 2 med ett fel först
  expect(loggen).toMatch(/k3_kvarn_2.*vid_stora/);
  // 104.7: Stils ringar vid säckarnas fyra platser medan läsvalet pågår (likadana, de avslöjar inget)
  expect(loggen).toMatch(/\[ringar\] (?=.*pa_stora)(?=.*vid_stora)(?=.*pa_lilla)(?=.*vid_lilla)/);
  // det första tutet blåser bort mjölet
  expect(loggen).toContain('[tryck] hornet');
  expect(loggen).toContain('[rummet] floden: rent');
  const av = (await ev(() => window.__ORDSTAVEN.tillstand())).aventyr['den-gomda-dalen'];
  expect(av.rumstillstand).toMatchObject({ floden: 'rent' });
  // hissen upp till avsatsen (102.3): han står uppe vid hornet, och kameran gled ut över floden vid tutet
  const regi = (await ev(() => window.__ORDSTAVEN.grafik())).regi;
  expect(loggen).toContain('[val] k3_kvarn_2: sackhiss_upp');
  expect(regi).toContain('skuggan lyssnar');
  expect(regi).toContain('kameran ut över floden');
  // 103.3: det första tutet hörs och syns (hjälten blåser i hornet), och skuggan har sitt ljud och sitt stycke
  expect(regi).toEqual(expect.arrayContaining(['pose:hjalte_blaser_hoger_02', 'ljud:skuggan', 'stycke:stycke_skuggan']));
  const pos = await ev(() => window.__ORDSTAVEN.position());
  const avsats = await ev(() => window.__ORDSTAVEN.ruta('hornet'));
  expect(pos.y).toBeLessThan(avsats.y + 20);
  expect(pos.x).toBeGreaterThan(460);
});

test('flodmannen säger ahoj! i gemener (87.7)', async ({ page }) => {
  test.setTimeout(90000);
  await starta(page, 'k3s01_floden');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // fram till skepparen som kallar: mellanscenerna, och sedan går han fritt (han går inte dit än)
  for (let i = 0; i < 120 && (await ev(() => window.__ORDSTAVEN.steg()?.typ)) !== 'prata'; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => !window.__ORDSTAVEN.fryst() && document.querySelector('#plattan').hidden);
  // skepparen ropar AHOJ! i samma ruta var nionde sekund: vänta tills hans rop är borta
  await expect(page.locator('#rop')).toBeHidden({ timeout: 8000 });
  const p = await ev(() => window.__ORDSTAVEN.objekt('flodman'));
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#rop')).toBeVisible();
  await expect(page.locator('#rop')).toHaveText('ahoj!');
  expect(await ev(() => window.__ORDSTAVEN.logg())).toContain('[bubbla] flodman: ahoj!');
  await page.screenshot({ path: 'test-results/kap3-ahoj.png' });
});

test('kapitel 3 pass 2: FEM TUT. INTE TRE., ön vid bryggan, mossan, skylten, snäckorna och chiffret', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(240000);
  await starta(page, 'k3s03_hornet');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const gaMot = (id) => ev(gaMotSida, id);
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => {
    await gaMot(id);
    // vänta tills han står still (högst 5 s): en lång väg tar mer än en halv sekund
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
  const chiffer = pussel.get('k3_chiffret').chiffer;
  const nyckel = new Map(chiffer.nyckel.map((n) => [n.tecken, n.bokstav]));
  const scener = [];
  let hornet = 0, chifferBild = false, felSkrivet = false, onSedd = false;
  for (let i = 0; i < 500; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) break;
    if (!onSedd && scen === 'k3s03_bryggan' && !(await page.locator('#plattan').isVisible())) { onSedd = true; await page.screenshot({ path: 'test-results/kap3-floden-on.png' }); }
    if (await page.locator('#plattan .meddelande-ruta').isVisible()) {
      if (!chifferBild) {
        chifferBild = true; await page.screenshot({ path: 'test-results/kap3-chiffret.png' });
        // Stils tecken (101.6) i raden och på nyckeln, inga emoji
        expect(await page.locator('#plattan .med-tecken img.bildkort[data-bild^="tecken_"]').count()).toBe(10);
        expect(await page.locator('#plattan .kod-nyckel img.bildkort[data-bild^="tecken_"]').count()).toBe(11);
      }
      // ett fel först (rutan skakar), sedan hela meddelandet
      if (!felSkrivet) { felSkrivet = true; await typ('Q'); await page.waitForTimeout(800); }
      await typ(chiffer.tecken.filter((t) => t !== ' ').map((t) => nyckel.get(t)).join(''));
      await page.waitForTimeout(3000); continue;
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
    else if (p?.typ === 'P29_tryck') {
      // fram till hornet först: på vägen öppnas skriften på läsplattan (han läser den och stänger), sedan igen
      const h = await ev(() => { const o = window.__ORDSTAVEN.ruta('hornet'), q = window.__ORDSTAVEN.position(); const m = o.sida === 'vanster' ? [o.x - 9, o.y + o.h - 1] : [o.x + o.b / 2, o.y + o.h + 6]; return Math.hypot(q.x - m[0], q.y - m[1]); });
      if (h > 14) { await gaMot(p.foremal); await page.waitForTimeout(1200); continue; }
      // först tre tut (frukost: flodfolket springer fram), sedan fem
      if (hornet === 0) await page.screenshot({ path: 'test-results/kap3-hornet.png' });
      const tut = hornet === 0 ? 3 : 5;
      for (let n = 0; n < tut; n++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
      hornet++;
      await page.waitForTimeout(4500); // tystnaden räknas med spelets klocka
      continue;
    } else if (p?.typ === 'P26_krukorna') {
      const loggen = await ev(() => window.__ORDSTAVEN.logg());
      const kvar = p.foremal.filter((id) => !loggen.includes(`[lyfta] ${id}:`) && !loggen.includes(`[svinga] ${id}:`));
      if (kvar.length) await anvand(kvar[0]);
    }
    await page.waitForTimeout(250);
  }
  expect(scener).toEqual(['k3s03_hornet', 'k3s03_bryggan', 'k3s04_on']);
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  // hornet: tre tut var frukost, fem löste pusslet
  expect(loggen).toContain('k3_hornet: 3 tryck');
  expect(loggen).toContain('k3_hornet: 5 tryck');
  // varje tut syns: hjälten blåser (103.3.2)
  expect((await ev(() => window.__ORDSTAVEN.grafik())).regi.filter((r) => r === 'pose:hjalte_blaser_hoger_02').length).toBeGreaterThanOrEqual(1);
  // mossan: han lyfte med handen (inget sving), och skylten låg under den fjärde
  const lyft = loggen.split('\n').filter((r) => r.includes('[lyfta] tuva_'));
  expect(lyft).toHaveLength(4);
  expect(lyft[3]).toMatch(/: skylt$/);
  expect(loggen).not.toMatch(/\[svinga\] tuva_/);
  // snäckorna på ön (manus 19 v0.4.1), och chiffret med ett fel på första tecknet och tio tecken i loggen
  expect(loggen).toMatch(/\[svinga\] snacka_\d: /);
  expect(loggen).toContain('[val] k3_chiffret: Q vid tecken vag');
  expect(loggen.split('\n').filter((r) => r.includes('[tecken] k3_chiffret'))).toHaveLength(10);
  expect(loggen).toContain('[val] k3_chiffret: UNDER FENAN');
  await page.screenshot({ path: 'test-results/kap3-pass2-slut.png' });
});

test('chiffret ryms på skärmen i alla storlekar, med instruktionen överst (79.2)', async ({ page }) => {
  test.setTimeout(60000);
  const sc = kap.scener.findIndex((s) => s.id === 'k3s04_on');
  await starta(page, 'k3s04_on', sc, kap.scener[sc].steg.findIndex((x) => x.pussel_id === 'k3_chiffret'));
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

test('kapitel 3 pass 3: fenan, kramen, tången med skalkanten mitt i, SKÖLD, ordduellen, resan och kartbit 4', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(300000);
  await starta(page, 'k3s05_sandbanken');
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  const gaMot = (id) => ev(gaMotSida, id);
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const anvand = async (id) => {
    await gaMot(id);
    // vänta tills han står still (högst 5 s): en lång väg tar mer än en halv sekund
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
  const duell = pussel.get('k3_duellen');
  const norm = (s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');
  let rond = 0, felValt = false, duellBild = false, slut = false, skalkant = false;
  for (let i = 0; i < 700; i++) {
    const st = await ev(() => window.__ORDSTAVEN.steg());
    if (await page.locator('.pass-slut .fortsatt, .pass-slut .om').first().isVisible().catch(() => false)) { slut = true; break; }
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      if (!duellBild && rond === 2) {
        duellBild = true; await page.screenshot({ path: 'test-results/kap3-duellen.png' });
        // sköld|padda är ett ord med en glipa: delarna står på samma rad, och nosen läser en del i taget
        const delar = page.locator('#plattan .duell-kort .sammansatt .ord');
        await expect(delar).toHaveCount(2);
        const [a, b] = [await delar.nth(0).boundingBox(), await delar.nth(1).boundingBox()];
        expect(Math.abs(a.y - b.y)).toBeLessThan(2);
      }
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const alt = duell.ronder[rond].utfall[0].alternativ;
      const ratt = texter.indexOf(norm(alt.find((a) => a.ratt).text));
      // första ronden: ett fel först (han klättrar ned), sedan rätt
      if (rond === 0 && !felValt) { felValt = true; await kort.nth(1 - ratt).click(); await page.waitForTimeout(2500); continue; }
      await kort.nth(ratt).click(); rond++;
      await page.waitForTimeout(2500); continue;
    }
    if (await page.locator('#plattan :is(.formel-skriv, .formel-ruta)').first().isVisible().catch(() => false)) {
      const p = pussel.get(st?.pussel_id); if (p?.svar) { await typ(p.svar); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); continue; }
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    const p = st?.typ === 'pussel' ? pussel.get(st.pussel_id) : null;
    if (st?.typ === 'ga_till' && st.mal === 'unge') await ev(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x + 14, u.y); });
    else if (st?.typ === 'ga_till') await anvand(st.mal);
    else if (st?.typ === 'tryck') { await page.waitForTimeout(400); await page.keyboard.press('Space'); }
    else if (p?.typ === 'P26_krukorna') {
      const loggen = await ev(() => window.__ORDSTAVEN.logg());
      // efter första tussen går han till skalets kant: den frivilliga scenen börjar där
      if (!skalkant && loggen.includes('[lyfta] tang_')) {
        // lyftet har Stils bilder och en kort paus: vänta, och gå igen om kommandot kom medan rummet stod still
        skalkant = true; await page.waitForTimeout(1200);
        await expect.poll(async () => { await gaMot('skalkant'); return ev(() => window.__ORDSTAVEN.logg().includes('[frivilligt] scen k3s05_skalkant vid')); }, { timeout: 15000, intervals: [1500] }).toBe(true);
        continue;
      }
      const kvar = p.foremal.filter((id) => !loggen.includes(`[lyfta] ${id}:`));
      if (kvar.length) await anvand(kvar[0]);
    } else if (p?.i_rummet) {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      await anvand((p.varianter[v] || Object.values(p.varianter)[0]).alternativ.find((a) => a.ratt).objekt);
    }
    await page.waitForTimeout(250);
  }
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  expect(rond).toBe(3);
  // flaskan ligger alltid under den sista tussen han lyfter (sak_i_sista)
  expect(loggen.split('\n').filter((r) => r.includes('[lyfta] tang_')).at(-1)).toMatch(/: flaska$/);
  // skalkanten: scenen spelades mitt i letandet, med LJUS och sidan i Dinoboken, och letandet fortsatte
  expect(loggen).toContain('[frivilligt] scen k3s05_skalkant vid skalkant');
  expect(loggen).toContain('[frivilligt] scen k3s05_skalkant klar, tillbaka till pussel');
  expect(loggen).toMatch(/\[val\] k3_duellen rond 1: fel/);
  for (const n of [1, 2, 3]) expect(loggen).toContain(`[rond] k3_duellen ${n}:`);
  // 104.7: ringarna vid fenans och huvudets platser medan läsvalet pågår
  expect(loggen).toMatch(/\[ringar\] (?=.*under_fenan)(?=.*bakom_fenan)(?=.*under_huvudet)(?=.*bakom_huvudet)/);
  expect(loggen).toContain('[tryck] flaska_i_handen');
  expect(loggen).toContain('[tryck] skepparen');
  const t = await ev(() => window.__ORDSTAVEN.tillstand());
  const av = t.aventyr['den-gomda-dalen'];
  expect(av.kartbitar).toContain(4);
  expect(av.frivilligt).toContain('k3s05_skalkant');
  expect(t.spelare.hjalte.formler).toContain('SKÖLD');
  expect(t.spelare.hjalte.grad).toBe('Lögnavslöjare');
  await page.screenshot({ path: 'test-results/kap3-resan.png' });
});

test('resan (97.5): kameran visar skepparen, och en piltangent visar handen och får honom att glimta', async ({ page }) => {
  test.setTimeout(90000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const scen = kap.scener.findIndex((s) => s.id === 'k3s07_resan');
  const i = kap.scener[scen].steg.findIndex((st) => st.typ === 'tryck' && st.foremal === 'skepparen');
  await starta(page, 'k3s07_resan', scen, i);
  for (let n = 0; n < 60 && (await ev(() => window.__ORDSTAVEN.steg()?.typ)) !== 'tryck'; n++) { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(250); }
  expect(await ev(() => window.__ORDSTAVEN.steg())).toMatchObject({ typ: 'tryck', foremal: 'skepparen' });
  await page.waitForTimeout(2500); // kameran glider dit
  // skepparen och handen syns i fönstret, fast hjälten står långt bort
  const o = await ev(() => window.__ORDSTAVEN.ruta('skepparen'));
  const k = await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').kamera);
  expect(o.x).toBeGreaterThanOrEqual(k.x); expect(o.x + o.b).toBeLessThanOrEqual(k.x + 320);
  const hand = page.locator('#handknapp');
  await expect(hand).toBeVisible();
  const r = await hand.boundingBox(), v = page.viewportSize();
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(v.width);
  // en piltangent: han glimtar, och loggen säger det
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  expect(await ev(() => window.__ORDSTAVEN.logg())).toContain('piltangent: skepparen glimtar');
  await page.screenshot({ path: 'test-results/kap3-resan-skepparen.png' });
  // och Mellanslag trycker på honom
  await page.keyboard.press('Space');
  await expect.poll(() => ev(() => window.__ORDSTAVEN.logg()), { timeout: 5000 }).toContain('[tryck] skepparen');
});

test('krockarna i loggen (97.6): går han mot ett hinder i mer än ca 1 s skriver loggen hindrets id', async ({ page }) => {
  test.setTimeout(60000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const scen = kap.scener.findIndex((s) => s.id === 'k3s04_on');
  await starta(page, 'k3s04_on', scen, 1);
  await expect.poll(() => ev(() => window.__ORDSTAVEN.scen()), { timeout: 20000 }).toBe('k3s04_on');
  for (let n = 0; n < 10; n++) { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(200); }
  // hjälten under en snäcka, och sedan uppåt mot den med piltangenten
  const s = await ev(() => window.__ORDSTAVEN.ruta('snacka_2'));
  const under = { x: s.x + s.b / 2, y: s.y + s.h + 10 };
  for (let n = 0; n < 40; n++) { await ev(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [under.x, under.y]); await page.waitForTimeout(150); const p = await ev(() => window.__ORDSTAVEN.position()); if (Math.hypot(p.x - under.x, p.y - under.y) < 3) break; }
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1600);
  await page.keyboard.up('ArrowUp');
  // snäckorna står tätt: fötterna kan ta i grannen först
  expect(await ev(() => window.__ORDSTAVEN.logg())).toMatch(/\[krock\] snacka_[123] .*"rum":"on"/);
  // ett kort tryck mot hindret loggas inte
  const fore = (await ev(() => window.__ORDSTAVEN.logg())).match(/\[krock\]/g).length;
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
  expect((await ev(() => window.__ORDSTAVEN.logg())).match(/\[krock\]/g).length).toBe(fore);
});

test('regierna i kapitel 3 (100.4, 101.3, 102.3 och 103.3.1): var och en går i sitt rum och syns', async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som kapitel 2 (84.6)');
  test.setTimeout(180000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const REGIER = [['k3s01_floden', ['frukost', 'skepparen_pekar', 'kartbit3_on']], ['k3s02_kvarnen', ['sackhiss_upp']], ['k3s02_loftet', ['loftet_horn', 'skuggan_lyssnar']], ['k3s03_hornet', ['tallrikar', 'skuggan_stiger', 'skuggan_dyker', 'unge_simmar', 'sackhiss_ner']],
    ['k3s04_on', ['skoldpadda_huvud', 'skylt_tecken']], ['k3s05_sandbanken', ['skoldpadda_visar_berget']], ['k3s07_resan', ['resan_kvall']]];
  for (const [scenId, regier] of REGIER) {
    // på ön börjar den där skylten syns (efter mossan), så att tecknen har sin skylt
    const sc = kap.scener.findIndex((x) => x.id === scenId);
    await starta(page, scenId, sc, scenId === 'k3s04_on' ? kap.scener[sc].steg.findIndex((x) => x.pussel_id === 'k3_snackorna') : 0);
    await expect.poll(() => ev(() => window.__ORDSTAVEN.scen()), { timeout: 20000 }).toBe(scenId);
    await page.waitForTimeout(1500);
    for (const r of regier) {
      const ms = await ev((b) => window.__ORDSTAVEN.regi(b), r);
      expect(ms, r).toBeGreaterThan(0);
      await page.waitForTimeout(Math.min(ms, 2600));
      await page.screenshot({ path: `test-results/kap3-regi-${r}.png` });
      await page.waitForTimeout(Math.max(0, ms - 2600) + 300);
    }
    // frukosten (103.3.1): flodbon blåser i frukosthornet, och tallrikarna kommer fram
    // frukosthornet ligger inte på däcket medan hon blåser (104.6), och tre korta tut hörs
    if (scenId === 'k3s01_floden') expect((await ev(() => window.__ORDSTAVEN.grafik())).regi).toEqual(expect.arrayContaining(['frukosten', 'frukosthornet i hennes hand', 'ljud:frukosthorn']));
    // skepparen pekar (105.4): kameran visar det stora hornet och sedan hjulet
    if (scenId === 'k3s01_floden') expect((await ev(() => window.__ORDSTAVEN.grafik())).regi).toEqual(expect.arrayContaining(['skepparen pekar', 'kameran visar hornet', 'kameran visar hjulet']));
    if (scenId === 'k3s03_hornet') expect(await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').unge.visible)).toBe(false);
    // 102.3: ön steg vid bryggan innan hissen bar honom ned, och han kom ut genom kvarnens dörr på kajen
    if (scenId === 'k3s03_hornet') {
      const regi = (await ev(() => window.__ORDSTAVEN.grafik())).regi;
      expect(regi).toEqual(expect.arrayContaining(['tallrikarna', 'skuggan stiger en bit', 'skuggan dyker', 'ungen simmar', 'ön stiger', 'säckhissen ner']));
      // 103.3.4–5: plasket, ön som stiger i takt med stycke_on, dropparna och hissen
      expect(regi).toEqual(expect.arrayContaining(['ljud:plask', 'stycke:stycke_on', 'ljud:on_stiger', 'ljud:droppar', 'ljud:sackhiss']));
      expect((await ev(() => window.__ORDSTAVEN.position())).y).toBeGreaterThan(140);
      expect(await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').hjalte.alpha)).toBe(1);
    }
    // säckhissen: hjälten har åkt ut ur rummet och syns inte (han syns igen i nästa rum)
    if (scenId === 'k3s02_kvarnen') expect(await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').hjalte.alpha)).toBe(0);
  }
  // den sista sidan: regin står i regiloggen
  expect(await ev(() => window.__ORDSTAVEN.grafik().regi)).toContain('kvällen på floden');
});

test('flodfolket lever (103.3.6), och kameran visar det stora hornet när skepparen talar om det (104.6)', async ({ page }) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // vid målet efter hjulet (ga_till dörren), där han går fritt
  const sc = kap.scener.findIndex((x) => x.id === 'k3s01_floden');
  await starta(page, 'k3s01_floden', sc, kap.scener[sc].steg.findIndex((x) => x.typ === 'ga_till'));
  await expect.poll(() => ev(() => window.__ORDSTAVEN.scen()), { timeout: 20000 }).toBe('k3s01_floden');
  await page.waitForTimeout(1500);
  const rum = () => ev(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); return { regi: [...r.regiLogg], ramar: ['flodman', 'flodbo_frukost', 'flodbo_skrattar'].map((id) => r.ritade.get(id)?.frame?.name), kamera: { ...r.kamera } }; });
  // sysslorna: alla tre står i sin syssla, och högst två rör sig på skärmen. Den tredje står i sysslans första bild
  await ev(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'), o = r.ruta('flodbo_frukost'); r.frys(false); r.pos = { x: o.x + 8, y: o.y + 70 }; r.placera(); });
  await page.waitForTimeout(1200);
  const r1 = await rum();
  expect(r1.ramar[0]).toMatch(/^flodman_lastar_hoger_0[12]$/);
  expect(r1.ramar[1]).toMatch(/^flodbo_frukost_ror_vanster_0[12]$/);
  expect(r1.ramar[2]).toMatch(/^flodbo_skrattar_fiskar_hoger_0[12]$/);
  const valda = /** @type {string} */ (r1.regi.filter((x) => x.startsWith('sysslor:')).pop()).slice(9).split(', ');
  expect(valda.length).toBeLessThanOrEqual(2);
  for (const [i, id] of ['flodman', 'flodbo_frukost', 'flodbo_skrattar'].entries()) if (!valda.includes(id)) expect(r1.ramar[i]).toMatch(/_01$/);
  // en syssla byter bild med minst 400 ms (golvet): efter 600 ms har en av dem som rör sig bytt
  const i0 = ['flodman', 'flodbo_frukost', 'flodbo_skrattar'].indexOf(valda[0]);
  await page.waitForTimeout(600);
  expect((await rum()).ramar[i0]).not.toBe(r1.ramar[i0]);
  await page.screenshot({ path: 'test-results/kap3-sysslor.png' });
  // nära: han ställer sig vid flodmannen, som vänder sig mot honom och vinkar en gång
  await ev(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'), o = r.ruta('flodman'); r.frys(false); r.pos = { x: o.x + o.b / 2 + 4, y: o.y + o.h + 10 }; r.placera(); });
  await expect.poll(async () => (await rum()).regi.includes('nära: flodman vinkar'), { timeout: 5000 }).toBe(true);
  await page.waitForTimeout(1500);
  expect((await rum()).regi.filter((x) => x === 'nära: flodman vinkar')).toHaveLength(1);
  // kameran glider till det stora hornet på avsatsen (replikens visar), och tillbaka
  expect(await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').visaForemal('hornet'))).toBe(true);
  await expect.poll(async () => (await rum()).kamera.x, { timeout: 5000 }).toBeGreaterThan(300);
  expect((await rum()).regi).toContain('kameran visar hornet');
  await page.screenshot({ path: 'test-results/kap3-visar-hornet.png' });
  await ev(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').visaForemalSlut());
  await expect.poll(async () => (await rum()).kamera.x, { timeout: 5000 }).toBeLessThan(200);
});
