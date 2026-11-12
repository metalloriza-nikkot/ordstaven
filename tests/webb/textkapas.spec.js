// Texten kapas aldrig (beslut 79.2): varje läsval, lapp och skylt i prologen och kapitel 1–2 öppnas i spelarens två
// fönster (MacBooken i helskärm och appen, 1280 × 762), på varje nivå som pusslet har, och testet säger fel om någon
// rad går utanför sin ruta eller skärmen. Testet ställer själv in fönstrets storlek och körs bara på MacBook-profilen.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const las = (k) => JSON.parse(readFileSync(new URL(`../../content/den-gomda-dalen/${k}.json`, import.meta.url), 'utf8'));
const FONSTER = [[1280, 800, 'helskärm'], [1280, 762, 'appen']];
const NIVA = { L1: 1, L2: 2, L3: 3, L4: 4 };

/** Allt att öppna: läsvalen och lapparna (pussel med text, papper eller skylt), las_skylt och rummens skyltar. */
function fall() {
  const ut = [];
  for (const kap of ['kap-00', 'kap-01', 'kap-02']) {
    const k = las(kap);
    const ps = new Map(k.pussel.map((p) => [p.id, p]));
    const sett = new Set();
    for (const sc of k.scener) {
      sc.steg.forEach((st, i) => {
        const p = st.typ === 'pussel' ? ps.get(st.pussel_id) : null;
        if (p && (p.typ === 'P1_las_och_valj' || p.typ === 'P28_packa')) {
          for (const niva of Object.keys(p.varianter || { L2: 1 })) ut.push({ kap, scen: sc.id, steg: i, namn: `${p.id} ${niva}`, niva: NIVA[niva] ?? 2, pussel: p });
        }
        if (st.typ === 'las_skylt') { const id = st.foremal || st.skylt; sett.add(id); ut.push({ kap, scen: sc.id, steg: i, namn: `skylten ${id}`, niva: 2, skylt: id }); }
      });
    }
    // rummens skyltar som inget steg öppnar: i den första scenen i rummet (en skylt med ett pussels fråga, Farfars
    // halva vid bryggan, öppnas med sitt pussel)
    for (const p of k.pussel) if (p.skylt) sett.add(p.skylt);
    for (const r of k.rum) {
      for (const id of Object.keys(r.skyltar || {})) {
        if (sett.has(id)) continue;
        const sc = k.scener.find((s) => s.rum === r.id);
        if (sc) ut.push({ kap, scen: sc.id, steg: 0, namn: `skylten ${id}`, niva: 2, skylt: id });
      }
    }
  }
  return ut;
}

/** Rader och rutor som går utanför sin ruta eller skärmen. Körs i sidan. */
function utanfor() {
  const synlig = (e) => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); };
  const fel = [];
  const W = window.innerWidth, H = window.innerHeight;
  const text = [...document.querySelectorAll('#plattan .rad, #plattan .kort-etikett, #plattan .lapp, #tanke .rad, #tanke .instruktion, #tanke .moln-text, #ordskylt .kort, #ordskylt .rad, #skyltar .kort, #rumsskyltar .kort')].filter(synlig);
  // rummet på skärmen: skyltarna i världen (dörrarnas, stigarnas och föremålens) hör till rummet
  const c = document.querySelector('canvas')?.getBoundingClientRect();
  for (const e of text) {
    const r = e.getBoundingClientRect();
    const namn = (e.textContent || e.className).trim().slice(0, 40);
    if (c && e.closest('#skyltar, #rumsskyltar, #ordskylt')) {
      // en skylt vid ett föremål utanför bilden följer föremålet och syns när kameran kommer dit: den prövas inte
      const mx = (r.left + r.right) / 2, my = (r.top + r.bottom) / 2;
      if (mx < c.left || mx > c.right || my < c.top || my > c.bottom) continue;
      // dörrskylten på väggen sitter fast vid dörren och får gå ut över ramen (hallens BOK), men aldrig utanför skärmen
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) fel.push(`utanför skärmen: ${namn}`);
      continue;
    }
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) fel.push(`utanför skärmen: ${namn}`);
    const ruta = e.parentElement?.closest('#tanke, .lapp, .kort, .replik-ruta, .pussel-ruta, #plattan');
    if (!ruta) continue;
    const q = ruta.getBoundingClientRect();
    if (r.left < q.left - 1 || r.top < q.top - 1 || r.right > q.right + 1 || r.bottom > q.bottom + 1) fel.push(`utanför sin ruta (${ruta.id || ruta.className.split(' ')[0]}): ${namn}`);
  }
  // en ruta som klipper sitt innehåll
  for (const e of [...document.querySelectorAll('#plattan .lapp, #plattan .pussel-ruta, #tanke, #ordskylt .kort')].filter(synlig)) {
    const s = getComputedStyle(e);
    if (/(hidden|clip|auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2) fel.push(`klipps nedtill: ${(e.textContent || '').trim().slice(0, 40)}`);
  }
  return fel;
}

const vidare = async (page) => { for (const v of await page.locator('#plattan:not([hidden]) .vidare, #plattan:not([hidden]) .replik-ruta').all()) await v.click({ timeout: 300 }).catch(() => {}); };

// en frivillig scen (dammen) börjar inte ur en sparning: han går dit från navet på torget, som när han spelar
const VIA = { k2s06_dammen: { scen: 'k2s03_torget', steg: 6, stig: 'stig_dammen', extra: { pass: 2, startad: true, rumstillstand: { byn: 'fri' }, skrivet: { k2_over: 'BRO' }, visade: { byn: ['fjader', 'tant_rosa', 'brevram'] } } } };

async function sparadI(page, f0) {
  const via = VIA[f0.scen];
  const f = via ? { ...f0, scen: via.scen, steg: via.steg } : f0;
  const k = las(f.kap);
  await page.goto(`./?snabb&ny&kapitel=${f.kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([f, scen]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: f.kap, scen, scenId: f.scen, steg: f.steg, startad: false }, f.extra || {});
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    const post = { niva: f.niva, streak: 0, miss: 0, uppgifter: 3, forstaForsok: 3, hjalp: 0, aa: 0 };
    t.spelare.larande.lasning = { ...(t.spelare.larande.lasning || {}), P1_las_och_valj: post, P28_packa: post };
    av.passbilder = [];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [{ kap: f.kap, scen: f.scen, steg: f.steg, niva: f.niva, extra: via?.extra }, k.scener.findIndex((s) => s.id === f.scen)]);
  await page.goto(`./?snabb&kapitel=${f.kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe(f.scen);
  if (!via) return;
  for (let i = 0; i < 120 && (await page.evaluate(() => window.__ORDSTAVEN.scen())) !== f0.scen; i++) {
    await vidare(page);
    await page.evaluate((id) => { const o = window.__ORDSTAVEN.ruta(id); if (o) window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h / 2); }, via.stig);
    await page.waitForTimeout(250);
  }
  // fram till steget i den frivilliga scenen: han pratar med figuren, som när han spelar
  // (stegIndex hör till huvudscenen: den frivilliga scenen går vid sidan av)
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => window.__ORDSTAVEN.steg());
    if (st?.typ === 'pussel') break;
    await vidare(page);
    if (st?.typ === 'prata' && st.figur) { await page.evaluate((id) => { const o = window.__ORDSTAVEN.ruta(id); if (o) window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 6); }, st.figur); await page.waitForTimeout(150); await page.keyboard.press('Space'); }
    await page.waitForTimeout(250);
  }
}


for (const [bredd, hojd, fonster] of FONSTER) {
  test(`texten kapas aldrig: läsval, lappar och skyltar i prologen och kapitel 1–2 (${fonster}, 79.2)`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mac-helskarm', 'testet ställer in fönstret själv');
    test.setTimeout(900000);
    await page.setViewportSize({ width: bredd, height: hojd });
    const allaFel = [];
    let provade = 0;
    const prova = async (vad) => { const f = await page.evaluate(utanfor); provade++; for (const x of f) allaFel.push(`${vad}: ${x}`); };
    for (const f of fall()) {
      await sparadI(page, f);
      const vad = `${f.kap} ${f.namn}`;
      if (f.skylt) {
        await page.waitForTimeout(600);
        expect(await page.evaluate((id) => window.__ORDSTAVEN.lasSkylt(id), f.skylt), vad).toBe(true);
        await expect(page.locator('#plattan .lapp')).toBeVisible();
        await prova(vad);
        continue;
      }
      // fram till steget: repliker före klickas bort, och en lapp eller ett brev som läses först kontrolleras på vägen
      let sett = false;
      for (let i = 0; i < 60; i++) {
        const st = await page.evaluate(() => window.__ORDSTAVEN.steg());
        const plattan = await page.locator('#plattan:not([hidden])').count();
        if (plattan && (await page.locator('#plattan .lapp, #plattan .kortrad').count())) { await page.waitForTimeout(300); await prova(vad); sett = true; }
        if (st?.typ === 'pussel' && !plattan && (await page.locator('#tanke:not([hidden])').count())) { await page.waitForTimeout(300); await prova(vad); sett = true; break; }
        if (st?.typ === 'pussel' && plattan && (await page.locator('#plattan .kortrad').count())) break;
        await vidare(page);
        await page.waitForTimeout(250);
      }
      expect(sett, `${vad}: läsvalet, lappen eller skylten öppnades inte`).toBe(true);
      // läsvalet i rummet: ordet på varje föremål han kan välja, när han står vid det
      const p = f.pussel;
      if (p?.i_rummet && p.varianter) {
        const v = await page.evaluate(() => window.__ORDSTAVEN.variant());
        const alt = (p.varianter[v] || Object.values(p.varianter)[0]).alternativ.filter((a) => a.ord && a.objekt);
        for (const a of alt) {
          const sort = await page.evaluate((id) => window.__ORDSTAVEN.ruta(id)?.sort, a.objekt);
          if (!sort || sort === 'utgang') continue; // dörrarnas och stigarnas skyltar syns hela tiden och är redan prövade
          for (let i = 0; i < 25 && !(await page.locator('#ordskylt:not([hidden]) .kort').count()); i++) {
            await page.evaluate((id) => { const o = window.__ORDSTAVEN.ruta(id); window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h + 6); }, a.objekt);
            await page.waitForTimeout(200);
          }
          await expect(page.locator('#ordskylt:not([hidden]) .kort'), `${vad} ${a.id}: ordet syns inte vid föremålet`).toBeVisible();
          await page.waitForTimeout(300); await prova(`${vad} ${a.id}`);
        }
      }
    }
    if (allaFel.length) await page.screenshot({ path: `test-results/textkapas-${fonster}.png` });
    expect(allaFel).toEqual([]);
    expect(provade).toBeGreaterThan(25);
  });
}
