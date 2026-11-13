// Spelar hela kapitel 2 i gråbox (Teknik 20 del 5), som en spelare med tryck på marken och tangentbordet: från
// träsket genom byn, navet (vassen först), Tant Rosas hus och till elden. Rätt svar tas från innehållet.
import { test, expect } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));

test('kapitel 2 går att spela från träsket till elden (gråbox, del 5)', { tag: '@rok-mac' }, async ({ page }, info) => {
  test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker, som prologen (84.6)');
  test.setTimeout(360000);
  await page.goto('./?snabb&ny&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  // namnen finns redan (kapitlen före spolas fram när sidan laddas)
  await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: 'kap-02', scen: 0, scenId: 'k2s01_kanten', startad: false });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  });
  await page.goto('./?snabb&kapitel=kap-02');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  const O = () => window.__ORDSTAVEN;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta), .pass-slut .fortsatt').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  /** Gå mot ett föremål som ett tryck på marken: mitt i en utgång, annars framför (under) det. */
  const gaMot = (id) => ev((id) => { const o = window.__ORDSTAVEN.ruta(id); if (!o) return false; window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.sort === 'utgang' ? o.y + o.h / 2 : o.y + o.h + 6); return true; }, id);
  /** Gå ut genom en utgång: gå dit, och tryck sedan på den (som ett finger) om han står kvar vid den. */
  const gaUt = async (id) => {
    await gaMot(id); await page.waitForTimeout(700);
    const p = await ev((id) => window.__ORDSTAVEN.objekt(id), id);
    if (p) await page.mouse.click(p.x, p.y);
  };
  const gaTillUngen = () => ev(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x + 14, u.y); });
  const typ = async (ord) => { for (const c of ord) { if ('ÅÄÖ'.includes(c)) await ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); } };
  const rattObjekt = async (p) => {
    const v = await ev(() => window.__ORDSTAVEN.variant());
    return v ? p.varianter[v].alternativ.find((a) => a.ratt)?.objekt : null;
  };
  /** Använd ett föremål: gå dit och tryck Mellanslag när han är nära. */
  const anvand = async (id) => { await gaMot(id); await page.waitForTimeout(500); if (await page.locator('#plattan').isVisible()) return; await page.keyboard.press('Space'); };
  const scener = [];
  /** @type {Record<string, any>} rummens bilder (82.7), en gång per rum */
  const bilder = {};
  let vassBild = false;
  for (let i = 0; i < 900; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    const rb = await ev(() => ({ ...window.__ORDSTAVEN.rumsbilder(), vass: window.__ORDSTAVEN.vassVidFotter() }));
    if (rb.rum && !bilder[rb.rum]) bilder[rb.rum] = rb;
    if (rb.vass.hjalte && !vassBild && !(await page.locator('#plattan').isVisible())) { vassBild = true; await page.screenshot({ path: 'test-results/kap2-vassen-fotterna.png' }); }
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) { if (scen === 'k2s10_elden') break; await vidare(); continue; }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      const p = pussel.get(st?.pussel_id);
      await typ(p.svar); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
    }
    // ett läsval på läsplattan (stocken och bryggan, 76.2 och 76.4): det första rätta kortet
    if (await page.locator('#plattan .kortrad .kort').first().isVisible().catch(() => false) && st?.typ === 'pussel' && pussel.get(st.pussel_id)?.typ === 'P1_las_och_valj') {
      const v = await ev(() => window.__ORDSTAVEN.variant());
      const p = pussel.get(st.pussel_id); const ratt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ.find((a) => a.ratt);
      await page.locator(`#plattan .kort[data-id="${ratt.id}"]`).click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(600); continue;
    }
    if (await page.locator('#plattan').isVisible()) { await vidare(); await page.waitForTimeout(150); continue; }
    const typSt = st?.typ;
    if (typSt === 'ga_till' && st.mal === 'unge') await gaTillUngen();
    else if (typSt === 'ga_till') { const o = await ev((m) => window.__ORDSTAVEN.ruta(m), st.mal); if (o?.sort === 'utgang') await gaUt(st.mal); else await anvand(st.mal); }
    else if (typSt === 'las_skylt' || typSt === 'prata') await gaMot(st.foremal || st.figur);
    else if (typSt === 'ta_emot') await anvand(st.fran); // Tant Rosa räcker fram brevet (69.9)
    else if (typSt === 'nav') {
      const klara = (await ev(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].nav?.klara)) || [];
      const g = [...st.grenar].reverse().find((x) => !klara.includes(x.scen)); // vassen först
      await gaUt(g.mal);
    } else if (typSt === 'bara') {
      if (await ev((m) => !!window.__ORDSTAVEN.ruta(m), st.till)) await anvand(st.till);
      else await gaUt(scen === 'k2s04_bryggan' ? 'stig_byn_bryggan' : 'stig_byn_vassen');
    } else if (typSt === 'pussel' && pussel.get(st.pussel_id)?.verb === 'hugga') {
      // vassväggen (75.3): tussarna i gången, från väster, tills gången är öppen, och sedan genom gången
      const p = pussel.get(st.pussel_id);
      const gang = p.innehall.map((x, i) => (x === p.falt.klar_nar ? `vass_tat_${i}` : null)).filter(Boolean);
      const kvar = await ev((g) => g.map((id) => window.__ORDSTAVEN.ruta(id)).filter(Boolean).sort((a, b) => a.x - b.x || a.y - b.y), gang);
      if (kvar.length) { await ev(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [kvar[0].x - 8, kvar[0].y + kvar[0].h / 2]); await page.waitForTimeout(500); await page.keyboard.press('Space'); }
      else await ev(() => { const p = window.__ORDSTAVEN.position(); window.__ORDSTAVEN.gaMot(p.x + 60, p.y); });
    } else if (typSt === 'pussel' && pussel.get(st.pussel_id)?.i_rummet) {
      const m = await rattObjekt(pussel.get(st.pussel_id));
      if (m) await anvand(m);
    }
    await page.waitForTimeout(250);
  }
  // Stils rum som bilder (82.7): varje rum har sin bild, och träskkanten, bryggan och vassen den höga vassen ovanför
  for (const rum of ['trasket_kanten', 'byn', 'bryggan', 'vassen', 'tant_rosas_hus']) expect(bilder[rum]?.golv, rum).toMatch(new RegExp(`^rum_${rum}`));
  for (const rum of ['trasket_kanten', 'bryggan', 'vassen']) expect(bilder[rum]?.over, rum).toBe(`rum_${rum}_over`);
  expect(bilder.tant_rosas_hus?.over ?? null).toBe(null);
  // kvällen i byn är en egen bild (82.7), och vasstopparna kom fram vid hans fötter i vassen (82.8)
  expect(await ev(() => window.__ORDSTAVEN.rumsbilder().golv)).toBe('rum_byn_kvall');
  expect((await ev(() => window.__ORDSTAVEN.vassVidFotter())).sedd).toBeGreaterThan(0);
  expect(scener).toEqual(['k2s01_kanten', 'k2s02_byn', 'k2s03_torget', 'k2s05_vassen', 'k2s03_torget', 'k2s04_bryggan', 'k2s07_hela_brevet', 'k2s08_huset', 'k2s09_kartbiten', 'k2s10_elden']);
  // kapitel 2:s mellanscener och formler rör sig i gråboxen (Teknik 32 och 34, beslut 69 och 71)
  const regi = (await ev(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['ungen biter i vass_tat', 'staven blir ett svärd', 'ungen sjunker i leran', 'ungen dras upp', 'luftskeppet river brevet', 'blommorna blåser bubblor', 'ungen jagar bubblor', 'halvan flyger till handen',
    // beslut 71 (Teknik 34): stocken, Tant Rosa, lyktorna och elden
    'ungen hoppar på stocken', 'ungen piper på stocken', 'stocken flyger till stranden', 'ungen hoppar i land', 'Tant Rosa når inte', 'ljuset hoppar mellan lyktorna', 'elden tänds',
    // 79.3: Tant Rosa vid lyktorna innan han ska tända dem
    'Tant Rosa vid lyktorna']) expect(regi, r).toContain(r);
  // 80.3: fjädern plockas upp (leta: true) och ligger inte kvar, och vedpinnarna likaså (78.4)
  const loggen = await ev(() => window.__ORDSTAVEN.logg());
  for (const id of ['fjader', 'ved_1', 'ved_2', 'ved_3']) expect(loggen, id).toContain('[plockar upp] ' + id);
  const t = await ev(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.hjalte.lager.ryggsack).toBe('ryggsack_rosa'); // Tant Rosas ryggsäck (72.11)
  // i Stils bild (del 3b), inte den bruna tonad
  await expect.poll(() => ev(() => window.__ORDSTAVEN.gavobilder().sack), { timeout: 10000 }).toMatch(/^ryggsack_rosa_(ner|upp|hoger|vanster)_01$/);
  expect(t.spelare.hjalte.grad).toBe('Ordsmed');
  expect(t.spelare.hjalte.formler).toEqual(expect.arrayContaining(['FLYG']));
  expect(t.aventyr['den-gomda-dalen'].kartbitar).toContain(3);
  expect(t.aventyr['den-gomda-dalen'].skrivet.k2_over).toBe('BRO'); // Farfar säger det vid elden ({ord:k2_over})
  await page.screenshot({ path: 'test-results/kap2-elden.png' });
});

test('byborna i Stils bilder (42.2): fiskaren, tvätterskan och barnet på torget, med en skugga under var och en', async ({ page }) => {
  test.setTimeout(90000);
  const iRummet = async (scenId, rum) => {
    await page.goto('./?snabb&ny&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.evaluate(({ scenId, rum }) => {
      const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
      Object.assign(av, { kapitelId: 'kap-02', scen: 2, scenId, steg: 6, pass: 2, startad: true, rumstillstand: { byn: 'fri' }, skrivet: { k2_over: 'BRO' } });
      if (rum) av.plats = { rum, x: 160, y: 140 };
      t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
      localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    }, { scenId, rum });
    await page.goto('./?snabb&kapitel=kap-02');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    await page.click('.start-knapp');
    for (let i = 0; i < 40 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'nav'; i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.waitForFunction(() => !window.__ORDSTAVEN.fryst() && document.querySelector('#plattan').hidden);
  };
  await iRummet('k2s03_torget');
  // Tant Rosa står inte på torget i det här läget, och Bo är vid dammen: deras bilder prövar enhetstestet för kartorna
  for (const [id, bild] of [['fiskaren', 'fiskaren'], ['tvatterskan', 'tvatterskan'], ['barnet_drake', 'barnet']]) {
    expect(await page.evaluate((id) => window.__ORDSTAVEN.bildFor(id), id), id).toMatch(new RegExp(`^${bild}_[a-z]+_01$`));
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.skuggor())).toBe(3);
  await page.screenshot({ path: 'test-results/kap2-byborna-torget.png' });
  // fiskaren vid stranden: kameran dit, så att skärmdumpen visar honom
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('fiskaren'));
  await page.mouse.click(o.x, o.y - 40);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/kap2-byborna-stranden.png' });
});
