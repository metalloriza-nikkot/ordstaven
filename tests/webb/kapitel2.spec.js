// Spelar hela kapitel 2 i gråbox (Teknik 20 del 5), som en spelare med tryck på marken och tangentbordet: från
// träsket genom byn, navet (vassen först), Tant Rosas hus och till elden. Rätt svar tas från innehållet.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const kap = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));
const pussel = new Map(kap.pussel.map((p) => [p.id, p]));

test('kapitel 2 går att spela från träsket till elden (gråbox, del 5)', async ({ page }) => {
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
  for (let i = 0; i < 900; i++) {
    const [scen, st] = await ev(() => [window.__ORDSTAVEN.scen(), window.__ORDSTAVEN.steg()]);
    if (scen && scener.at(-1) !== scen) scener.push(scen);
    if (await page.locator('.pass-slut .fortsatt').isVisible()) { if (scen === 'k2s10_elden') break; await vidare(); continue; }
    if (await page.locator('#plattan .formel-skriv').isVisible()) {
      const p = pussel.get(st?.pussel_id);
      await typ(p.svar); await page.keyboard.press('Enter'); await page.waitForTimeout(800); continue;
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
    } else if (typSt === 'pussel' && pussel.get(st.pussel_id)?.i_rummet) {
      const m = await rattObjekt(pussel.get(st.pussel_id));
      if (m) await anvand(m);
    }
    await page.waitForTimeout(250);
  }
  expect(scener).toEqual(['k2s01_kanten', 'k2s02_byn', 'k2s03_torget', 'k2s05_vassen', 'k2s03_torget', 'k2s04_bryggan', 'k2s07_hela_brevet', 'k2s08_huset', 'k2s09_kartbiten', 'k2s10_elden']);
  // kapitel 2:s mellanscener rör sig i gråboxen (Teknik 32, 69.1 och 69.5)
  const regi = (await ev(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['ungen sjunker i leran', 'ungen dras upp', 'luftskeppet river brevet', 'blommorna blåser bubblor', 'halvan flyger till handen', 'ungen tas av bubblan', 'bubblan spricker och ungen plumsar']) expect(regi, r).toContain(r);
  const t = await ev(() => window.__ORDSTAVEN.tillstand());
  expect(t.spelare.hjalte.grad).toBe('Ordsmed');
  expect(t.spelare.hjalte.formler).toEqual(expect.arrayContaining(['FLYG']));
  expect(t.aventyr['den-gomda-dalen'].kartbitar).toContain(3);
  expect(t.aventyr['den-gomda-dalen'].skrivet.k2_over).toBe('BRO'); // Farfar säger det vid elden ({ord:k2_over})
  await page.screenshot({ path: 'test-results/kap2-elden.png' });
});
