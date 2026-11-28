// Testrummet för fritt skrivande (76.9, Teknik 41): Innehålls skrivuppgifter i ett tomt rum på en egen sparplats.
// Det öppnas i INSTÄLLNINGAR, orden han skriver står i loggen, och äventyrets sparning och lärandet rörs inte.
import { test, expect } from './hjalp/klocka.js';
import { readFileSync } from 'node:fs';

const tr = JSON.parse(readFileSync(new URL('../../content/testrum-skriv.json', import.meta.url), 'utf8'));

/**
 * Rubrikerna ORDDUELL! som har visats (106.5). I testläget (?snabb) står regin bara ca 30 ms, så testet ser efter i
 * DOM:en när den visas i stället för att hinna se den på skärmen. Körs före sidan. @param {any} page
 */
const raknaRubriker = (page) => page.addInitScript(() => {
  /** @type {any} */ (window).__rubriker = [];
  const se = () => new MutationObserver(() => {
    for (const r of document.querySelectorAll('#plattan .duell-rubrik')) { const t = /** @type {HTMLElement} */ (r).innerText.trim(); const l = /** @type {any} */ (window).__rubriker; if (l.at(-1) !== t) l.push(t); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  if (document.body) se(); else document.addEventListener('DOMContentLoaded', se);
});

test('testrummet: skrivuppgifterna en i taget, orden i loggen, och äventyrets sparning rörs inte (41)', async ({ page }) => {
  test.setTimeout(120000);
  // en sparning i äventyret, med ett märke att känna igen
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  const fore = await page.evaluate(() => {
    const t = window.__ORDSTAVEN.tillstand();
    t.spelare.hjalte.namn = 'TESTA';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    return localStorage.getItem('ordstaven_spar');
  });
  // INSTÄLLNINGAR, PASS OCH KAPITEL: knappen till testrummet
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await expect(page.locator('#vuxenmeny .testrum-in')).toBeVisible();
  await Promise.all([page.waitForURL(/\?testrum$/), page.click('#vuxenmeny .testrum-in')]);
  // äventyrets sparning när testrummet öppnas (äventyrets sida sparar när INSTÄLLNINGAR stängs)
  const fore2 = await page.evaluate(() => localStorage.getItem('ordstaven_spar'));
  expect(JSON.parse(fore2).spelare.hjalte.namn).toBe(JSON.parse(fore).spelare.hjalte.namn);
  // i snabbläget i testet: samma rum med ?snabb
  await page.goto('./?snabb&testrum');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_skriv');
  const skriv = async (ord) => {
    for (let i = 0; i < 30 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    await expect(page.locator('#plattan .formel-skriv')).toBeVisible({ timeout: 10000 });
    for (const c of ord) { if ('ÅÄÖ'.includes(c)) await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), c.toLowerCase()); else await page.keyboard.type(c); }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
  };
  const forsta = tr.uppgifter[0];
  for (let i = 0; i < 30 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id)).toBe(forsta.id);
  // fälten säger inte hur långt ordet är (82.2): åtta fält, fast formeln är kortare
  expect(Math.max(...forsta.formler.map((f) => [...f.ord].length))).toBeLessThan(8);
  await expect(page.locator('#plattan .formel-skriv .platser .plats')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/testrum-forsta.png' });
  // ett rimligt ord, sedan ett ord som löser problemet
  await skriv(forsta.rimliga[0].ord);
  await skriv(forsta.formler[1].ord);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.pussel_id), { timeout: 15000 }).toBe(tr.uppgifter[1].id);
  const logg = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(logg).toContain(`[formel] ${forsta.id}: ${forsta.rimliga[0].ord} (rimligt)`);
  expect(logg).toContain(`[formel] ${forsta.id}: ${forsta.formler[1].ord} (formel)`);
  expect(logg).toContain('[testrum]');
  // äventyrets sparning är orörd, och testrummet sparar på sin egen plats
  expect(await page.evaluate(() => localStorage.getItem('ordstaven_spar'))).toBe(fore2);
  expect(await page.evaluate(() => !!localStorage.getItem('ordstaven_spar_testrum'))).toBe(true);
  // båten (89.5): ett försök som inte lagar båten tänder ledbilden, tejpen i molnet, och förebilden är TEJP
  expect(tr.uppgifter[1].id).toBe('tr_baten');
  await skriv('KATT');
  await expect(page.locator('#plattan .formel-bild.ledbild [data-bild="tankebubbla_tejp"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#plattan .forebild')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/testrum-andra.png' });
  // tillbaka till äventyret
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await Promise.all([page.waitForURL((u) => !u.search.includes('testrum')), page.click('#vuxenmeny .testrum-ut')]);
});

test('testrummet för ordduellen (61.1): samma regler som i kapitel 3, påhittade ord, och äventyrets sparning rörs inte', async ({ page }) => {
  test.setTimeout(120000);
  const prov = JSON.parse(readFileSync(new URL('../fixturer/testrum-duell-prov.json', import.meta.url), 'utf8'));
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  const fore = await page.evaluate((prov) => {
    const t = window.__ORDSTAVEN.tillstand();
    t.spelare.hjalte.namn = 'TESTA';
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
    localStorage.setItem('ordstaven_testrum_duell', JSON.stringify(prov));
    return localStorage.getItem('ordstaven_spar');
  }, prov);
  await raknaRubriker(page);
  await page.goto('./?snabb&testrum=duell');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  // äventyrets sparning när testrummet öppnas (äventyrets sida sparade när den lämnades)
  const fore2 = await page.evaluate(() => localStorage.getItem('ordstaven_spar'));
  expect(JSON.parse(fore2).spelare.hjalte.namn).toBe(JSON.parse(fore).spelare.hjalte.namn);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_duell');
  // 106.5 och 107.3: duellen börjar med rubriken ORDDUELL! stort över bilden (gransnitt.ordduell)
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__rubriker), { timeout: 10000 }).toContain('ORDDUELL!');
  const norm = (s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');
  const ronder = prov.dueller[0].ronder;
  let rond = 0, felValt = false;
  for (let i = 0; i < 200 && rond < ronder.length; i++) {
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const ratt = texter.indexOf(norm(ronder[rond].utfall[0].alternativ.find((a) => a.ratt).text));
      expect(ratt).toBeGreaterThanOrEqual(0);
      if (!felValt) { felValt = true; await kort.nth(1 - ratt).click(); await page.waitForTimeout(2500); continue; }
      await kort.nth(ratt).click(); rond++;
      await page.waitForTimeout(2500); continue;
    }
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(rond).toBe(3);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 10000 }).toContain('[rond] tr_duell_1 3:');
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('testrummet för ordduellen');
  expect(loggen).toMatch(/\[val\] tr_duell_1 rond 1: fel/);
  // äventyrets sparning är orörd
  expect(await page.evaluate(() => localStorage.getItem('ordstaven_spar'))).toBe(fore2);
});

test('duellens testrum med Innehålls fil (90.7): knappen i INSTÄLLNINGAR, halmdockan och båda duellerna till vinst', async ({ page }) => {
  test.setTimeout(180000);
  const fil = JSON.parse(readFileSync(new URL('../../content/testrum-duell.json', import.meta.url), 'utf8'));
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(() => localStorage.removeItem('ordstaven_testrum_duell'));
  await page.goto('./?snabb');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  // knappen syns nu när filen finns
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="pass"]');
  await expect(page.locator('#vuxenmeny .testrum-duell-in')).toBeVisible();
  await Promise.all([page.waitForURL(/\?testrum=duell$/), page.click('#vuxenmeny .testrum-duell-in')]);
  await raknaRubriker(page);
  await page.goto('./?snabb&testrum=duell');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_duell');
  // 106.5 och 107.3: duellen börjar med rubriken ORDDUELL! stort över bilden (gransnitt.ordduell)
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__rubriker), { timeout: 10000 }).toContain('ORDDUELL!');
  // det som står i replikrutan, med hur många segrar som har spelats när det visas (för raden efter segern)
  await page.evaluate(() => {
    const w = /** @type {any} */ (window); w.__sagt = [];
    new MutationObserver(() => {
      const t = document.querySelector('#plattan .replik-ruta .text')?.textContent?.trim();
      const n = (w.__ORDSTAVEN.logg().match(/\[mellanscen\] ordduell_seger/g) || []).length;
      if (t && w.__sagt.at(-1)?.t !== t) w.__sagt.push({ t, n });
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const norm = (s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');
  const ronder = fil.dueller.flatMap((d) => d.ronder);
  let rond = 0;
  for (let i = 0; i < 300 && rond < ronder.length; i++) {
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const ratt = texter.indexOf(norm(ronder[rond].utfall[0].alternativ.find((a) => a.ratt).text));
      expect(ratt).toBeGreaterThanOrEqual(0);
      // det halmdockan pekar på har en bild, aldrig ❔
      await expect(page.locator('#plattan')).not.toContainText('❔');
      if (rond === 5) await page.screenshot({ path: 'test-results/testrum-duell-solros.png' });
      await kort.nth(ratt).click(); rond++;
      await page.waitForTimeout(2500); continue;
    }
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(rond).toBe(6);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.logg()), { timeout: 15000 }).toContain('[rond] tr_duell_2 3:');
  const loggen = await page.evaluate(() => window.__ORDSTAVEN.logg());
  expect(loggen).toContain('[rond] tr_duell_1 3:');
  expect(loggen).not.toMatch(/\[val\] tr_duell_\d rond \d: fel/);
  // 106.5: duellens ram är densamma som i kapitel 3: början och segern spelas av motorn i båda duellerna
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.grafik().regi.filter((r) => r === 'ordduellen är vunnen').length), { timeout: 15000 }).toBe(2);
  expect((await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.filter((r) => r === 'ordduellen börjar').length).toBe(2);
  expect((await page.evaluate(() => window.__ORDSTAVEN.logg())).match(/\[mellanscen\] ordduell_seger/g)?.length).toBe(2);
  // 107.3: "Du vann ordduellen!" efter segern i båda duellerna
  const sagt = await page.evaluate(() => /** @type {any} */ (window).__sagt);
  expect(sagt.filter((x) => x.t === 'DU VANN ORDDUELLEN!').map((x) => x.n)).toEqual([1, 2]);
});

test('halmdockan i duellens testrum (91.5): ropar, blir förvirrad och tappar sin sak, backar, hoppar närmare vid fel och trillar i höet', async ({ page }) => {
  test.setTimeout(180000);
  const fil = JSON.parse(readFileSync(new URL('../../content/testrum-duell.json', import.meta.url), 'utf8'));
  // utan ?snabb: reaktionerna väntar på bilderna som i spelet (spelets klocka spolas)
  await page.goto('./?test&testrum=duell');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  const fig = () => page.evaluate(() => {
    const f = window.__ORDSTAVEN.spel.scene.getScene('Rum').duellFig;
    return f ? { ram: f.img.frame.name, y: f.img.y, x: f.img.x, saker: f.saker.map((s) => s.frame.name), synlig: f.img.visible && f.img.active } : null;
  });
  await expect.poll(fig, { timeout: 15000 }).not.toBeNull();
  const start = await fig();
  expect(start.synlig).toBe(true);
  const hjalten = await page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').pos);
  expect(start.y).toBeLessThan(hjalten.y - 24); // fötterna ovanför hjältens huvud: de står mittemot varandra
  const norm = (s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');
  const ronder = fil.dueller.flatMap((d) => d.ronder);
  /** spolar fram och samlar bilderna som visas */
  const sett = new Set();
  const spola = async (ms) => { for (let t = 0; t < ms; t += 50) { await page.waitForTimeout(50); const f = await fig(); if (f) sett.add(f.ram); } };
  let rond = 0, felGjort = false, yForeFel = 0, roparBild = false, portrattBild = false;
  const portratt = new Set();
  for (let i = 0; i < 400 && rond < 3; i++) {
    const f = await fig(); if (f) sett.add(f.ram);
    if (f?.ram.includes('_ropar_') && !roparBild) { roparBild = true; await page.screenshot({ path: 'test-results/halmdockan-ropar.png' }); }
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const ratt = texter.indexOf(norm(ronder[rond].utfall[0].alternativ.find((a) => a.ratt).text));
      // ett fel i rond 1: den hoppar ett steg närmare
      if (rond === 0 && !felGjort) { felGjort = true; yForeFel = f.y; await kort.nth(1 - ratt).click(); await spola(800); expect((await fig()).y).toBe(yForeFel + 10); continue; }
      const fore = await fig(); 
      await kort.nth(ratt).click(); rond++;
      await spola(1200);
      const efter = await fig();
      expect(efter.y).toBe(fore.y - 10); // backar ett steg
      expect(efter.saker.length).toBe(rond);
      if (rond === 2) { expect(efter.ram).toMatch(/_utan_hatt$/); await page.screenshot({ path: 'test-results/halmdockan-utan-hatt.png' }); }
      continue;
    }
    // Stils porträtt i pratrutan (93.5): bilden efter vad halmdockan gör
    // (Vite lägger små bilder direkt i stilmallen, så det är klassen som säger vilket ansikte och bilden att det finns ett)
    for (const [b, k] of await page.locator('#plattan .p-halmdockan').evaluateAll((el) => el.map((e) => [getComputedStyle(e).backgroundImage, e.className]))) portratt.add(b === 'none' ? 'ingen' : (k.match(/u-([a-z]+)/) || [0, 'ropar'])[1]);
    if (portratt.size === 1 && !portrattBild) { portrattBild = true; await page.screenshot({ path: 'test-results/halmdockan-portratt.png' }); }
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  expect(rond).toBe(3);
  expect([...portratt]).toContain('ropar');
  expect([...portratt]).not.toContain('ingen');
  // vinsten i duell 1: trillar i höet, utan hatt och knapp, och ligger kvar
  await expect.poll(async () => { await page.waitForTimeout(100); const f = await fig(); if (f) sett.add(f.ram); return f?.ram; }, { timeout: 15000 }).toBe('halmdockan_trillar_03_utan_hatt_knapp');
  await page.screenshot({ path: 'test-results/halmdockan-i-hoet.png' });
  for (const l of ['grund', 'ropar', 'forvirrad', 'backar', 'narmare', 'trillar']) expect([...sett].some((r) => r.startsWith(`halmdockan_${l}_`)), l).toBe(true);
  const saker = (await fig()).saker;
  expect(saker).toEqual(['halmdocka_sak_halmstra_01', 'halmdocka_sak_hatt_01', 'halmdocka_sak_knapp_01']);
});

test('fäktningens ram (132.4, lev139): baronen från sidan backar vid rätt kort, poserar och tar ett steg fram vid fel, och paraplyet fäller ihop sig vid segern', async ({ page }) => {
  test.setTimeout(120000);
  // testrummets fixtur, med baronen som motståndare och fäktningens ram (kapitel 5)
  const prov = JSON.parse(readFileSync(new URL('../fixturer/testrum-duell-prov.json', import.meta.url), 'utf8'));
  const d = prov.dueller[0];
  d.motstandare = 'baronen'; d.ram = 'faktning';
  for (const r of d.ronder) for (const u of r.utfall) for (const x of u.ropar || []) x.talare = 'baronen';
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate((prov) => localStorage.setItem('ordstaven_testrum_duell', JSON.stringify(prov)), prov);
  await page.goto('./?snabb&testrum=duell');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('tr_duell');
  const regi = () => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').regiLogg.join(' | '));
  // från sidan (Stils bilder): han står öster om hjälten, så bakåt är österut (x växer)
  const fot = () => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').duellFig?.x ?? null);
  // baronen står på marken (inte på repstegen)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').duellFig?.slag ?? null), { timeout: 15000 }).toBe('faktning');
  const norm = (s) => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('sv-SE');
  let rond = 0, felValt = false, bild = false;
  for (let i = 0; i < 200 && rond < d.ronder.length; i++) {
    if (await page.locator('#plattan .duell-kort').isVisible()) {
      const kort = page.locator('#plattan .duell-kort .kort');
      const texter = (await kort.allTextContents()).map(norm);
      const ratt = texter.indexOf(norm(d.ronder[rond].utfall[0].alternativ.find((a) => a.ratt).text));
      const fore = await fot();
      if (!felValt) {
        felValt = true; await kort.nth(1 - ratt).click();
        await expect.poll(regi, { timeout: 4000 }).toContain('baronen_poserar');
        await expect.poll(fot, { timeout: 3000 }).toBeLessThan(fore);
        await page.waitForTimeout(1500); continue;
      }
      await kort.nth(ratt).click(); rond++;
      await expect.poll(fot, { timeout: 3000 }).toBeGreaterThan(fore);
      if (!bild) { bild = true; await page.waitForTimeout(400); await page.locator('canvas').first().screenshot({ path: 'test-results/faktning-baronen-backar.png' }); }
      await page.waitForTimeout(2000); continue;
    }
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  expect(rond).toBe(3);
  expect(await regi()).toContain('faktning_borjar');
  expect(await regi()).toContain('baronen_backar');
  await expect.poll(regi, { timeout: 10000 }).toContain('paraplyet_faller_ihop');
  await page.locator('canvas').first().screenshot({ path: 'test-results/faktning-segern.png' });
});
