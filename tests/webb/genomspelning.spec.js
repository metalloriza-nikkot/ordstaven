// Spelar hela prologen i webbläsaren, som en spelare: trycker på det som syns på skärmen.
// Rätt svar tas från innehållet. Testläget (?snabb) stänger av rösten och kortar pauserna.
import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const prolog = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));
const pussel = new Map(prolog.pussel.map((p) => [p.id, p]));
const rattaId = (p) => new Set(Object.values(p.varianter || {}).flatMap((v) => v.alternativ.filter((a) => a.ratt).map((a) => a.id)));
mkdirSync('tests/skarmdumpar/prolog', { recursive: true });

/** Spela tills slutskärmen syns. felFor = pussel-id där ett fel svar ska väljas först. */
async function spelaProlog(page, { dumpa = false, felFor = new Set(), stoppVid = null } = {}) {
  const sett = new Set();
  const sparadeDumpar = new Set();
  for (let varv = 0; varv < 400; varv++) {
    const lage = await page.evaluate(() => {
      const O = window.__ORDSTAVEN; const st = O.steg();
      const synlig = (s) => { const e = document.querySelector(s); return !!e && !e.closest('[hidden]') && e.offsetParent !== null; };
      return {
        scen: O.scen(), typ: st?.typ, pusselId: st?.pussel_id ?? null, mal: st?.mal ?? null,
        start: synlig('.start-knapp'), replik: synlig('#plattan .replik-ruta'), hjalte: synlig('.hjalte-ruta'),
        kort: synlig('#plattan .kortrad'), lapp: synlig('#plattan.lapp-vy'), formel: synlig('.formel-ruta'), dop: synlig('.dop-ruta'),
        bok: synlig('.bok-ruta'), passSlut: synlig('.pass-slut .fortsatt'), vidareHornet: synlig('.vidare-hornet'),
        slut: synlig('.pass-slut .om'), objekt: O.rumsobjekt(),
      };
    });
    if (lage.slut) return sett;
    if (stoppVid && lage.scen === stoppVid) return sett;
    sett.add(lage.scen);
    const nyckel = `${lage.scen}-${lage.typ}-${lage.pusselId || ''}`;
    if (dumpa && !sparadeDumpar.has(nyckel) && (lage.replik || lage.kort || lage.formel || lage.dop || lage.bok || lage.hjalte || lage.lapp)) {
      sparadeDumpar.add(nyckel);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `tests/skarmdumpar/prolog/${String(sparadeDumpar.size).padStart(2, '0')}-${nyckel}.png` });
    }
    // allt på läsplattan ska rymmas i fönstret (ingen text utanför skärmen)
    if (!lage.start) {
      const utanfor = await page.evaluate(() => {
        const p = document.querySelector('#plattan'); if (!p || p.hidden) return null;
        const r = p.getBoundingClientRect();
        return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 ? { ...r.toJSON(), text: p.textContent.slice(0, 60) } : null;
      });
      expect(utanfor, `läsplattan går utanför skärmen i ${nyckel}`).toBeNull();
    }
    if (lage.start) { await page.click('.start-knapp'); continue; }
    if (lage.passSlut) { await page.click('.pass-slut .fortsatt'); continue; }
    if (lage.replik) { await page.click('#plattan .replik-ruta'); continue; }
    if (lage.hjalte) { await page.click('.hjalte-ruta .farg >> nth=1'); await page.click('.hjalte-ruta .klar'); continue; }
    if (lage.lapp) { await page.click('#plattan .vidare'); continue; }
    if (lage.bok) { await page.click('.bok-ruta .fram'); continue; }
    if (lage.vidareHornet) { await page.click('.vidare-hornet'); continue; }
    if (lage.dop) { await page.keyboard.type(lage.pusselId === 'p0_ungenamn' ? 'KNOPP' : 'TESTA'); await page.keyboard.press('Enter'); await page.waitForTimeout(100); continue; }
    if (lage.formel) { const p = pussel.get(lage.pusselId); await page.keyboard.type(p.svar); await page.waitForTimeout(100); continue; }
    if (lage.kort) {
      const p = pussel.get(lage.pusselId); const ratt = rattaId(p);
      const ids = await page.$$eval('#plattan .kort:not(.vald)', (els) => els.map((e) => e.dataset.id));
      if (felFor.has(p.id)) { felFor.delete(p.id); const fel = ids.find((i) => !ratt.has(i)); if (fel) { await page.click(`#plattan .kort[data-id="${fel}"]`); await page.waitForTimeout(300); continue; } }
      const valj = ids.find((i) => ratt.has(i));
      if (valj) await page.click(`#plattan .kort[data-id="${valj}"]`);
      await page.waitForTimeout(150);
      continue;
    }
    // i rummet: gå till målet, eller till krukorna
    if (lage.typ === 'ga_till' && lage.mal) { const pt = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), lage.mal); if (pt) await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(400); continue; }
    if (lage.typ === 'pussel' && pussel.get(lage.pusselId)?.typ === 'P26_krukorna') {
      // gå till en kruka i taget och vänta tills hjälten står still
      const krukor = lage.objekt.filter((o) => /kruk.*_\d$/.test(o));
      for (const k of krukor) {
        const pt = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), k);
        if (!pt) continue;
        await page.mouse.click(pt.x, pt.y);
        let forra = null;
        for (let w = 0; w < 40; w++) {
          await page.waitForTimeout(150);
          const nu = JSON.stringify(await page.evaluate(() => window.__ORDSTAVEN.position()));
          if (nu === forra) break; forra = nu;
        }
        if ((await page.evaluate(() => window.__ORDSTAVEN.steg()))?.pussel_id !== lage.pusselId) break;
      }
      continue;
    }
    await page.waitForTimeout(80);
  }
  throw new Error('prologen tog inte slut');
}

test.describe('genomspelning av prologen', () => {
  test('hela prologen går att spela, med fel svar och omstart mitt i', async ({ page }, info) => {
    test.skip(!['mac-helskarm', 'ipad-10', 'mac-safari'].includes(info.project.name), 'tre projekt räcker');
    test.setTimeout(240000);
    const fel = []; page.on('pageerror', (e) => fel.push(String(e)));
    await page.goto('./?snabb&ny');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    const dumpa = info.project.name === 'mac-helskarm';
    // pass 1 och en bit in i pass 2, med fel svar på FILT och dörrarna
    await spelaProlog(page, { dumpa, felFor: new Set(['p0_filt', 'p0_dorrar']), stoppVid: 's09_lappen' });
    // starta om (utan ?ny): spelet ska fortsätta där det var, med Farfars "Var var vi?"
    await page.goto('./?snabb');
    await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
    const omstartRepliker = [];
    page.on('console', () => {});
    const samla = setInterval(async () => { try { const t = await page.$eval('#plattan .replik-ruta .text', (e) => e.textContent); if (t) omstartRepliker.push(t); } catch (e) { /* ingen replik just nu */ } }, 50);
    const sett = await spelaProlog(page, { dumpa, felFor: new Set(['p0_packlista']) });
    clearInterval(samla);
    expect([...sett].filter(Boolean)[0]).toBe('s09_lappen');
    expect(omstartRepliker.some((t) => /VAR VAR VI/.test(t))).toBe(true);
    const t = await page.evaluate(() => window.__ORDSTAVEN.tillstand());
    const av = t.aventyr['den-gomda-dalen'];
    expect(t.spelare.hjalte.namn).toBe('TESTA');
    expect(av.ungen.namn).toBe('KNOPP');
    expect(t.spelare.hjalte.formler).toContain('LJUS');
    expect(t.spelare.hjalte.grad).toBe('Lärling');
    expect(av.kartbitar).toEqual([1]);
    expect(av.bar).toBeGreaterThanOrEqual(3);
    expect(t.spelare.larande.historik.map((h) => h.pussel_id)).toEqual(expect.arrayContaining(['p0_filt', 'p0_dorrar', 'p0_ljus', 'p0_bar', 'p0_skylten']));
    expect(t.spelare.larande.historik.find((h) => h.pussel_id === 'p0_filt').ratt).toBe(false);
    await page.screenshot({ path: `tests/skarmdumpar/prolog-slut-${info.project.name}.png` });
    expect(fel).toEqual([]);
  });
});
