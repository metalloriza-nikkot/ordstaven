// Uppdragslappen (beslut 47 och 48, 2g): molnet säger vad han ska göra nu, och lappen är hopfälld bakom lappknappen.
// Den fälls ut när ett uppdrag börjar, när ett pass börjar och vid tryck, med rubrik, bild, bockar och ringar.
// Stämpeln slår ned bredvid hjälten, och MIN BOK har fliken KLART som en lista.
import { test, expect } from '@playwright/test';

async function provscen(page, scen, extra = {}, sok = '?snabb&testscen&kapitel=kap-00') {
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([sc, ex]) => {
    localStorage.setItem('ordstaven_testscen', JSON.stringify({ index: 0, scen: sc, ...ex }));
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    av.scen = 0; delete av.scenId; delete av.steg; av.startad = false; t.spelare.unge.namn = 'KNOPP'; t.spelare.unge.folj = true;
    t.spelare.hjalte.formler = ['LJUS']; // pausknappen finns
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [scen, extra]);
  await page.goto('./' + sok);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen())).toBe(scen.id);
}
const R = (text, talare = 'berattare', extra = {}) => ({ typ: 'replik', talare, text, upplast: true, ...extra });
const logg = (page) => page.evaluate(() => window.__ORDSTAVEN.logg());
const SCEN = { id: 't_lapp', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [R('Nu går vi.'), R('Gå till boken!'), { typ: 'ga_till', mal: 'dorr_bok' }, R('Här är boken.'), R('Bra.'), { typ: 'ga_till', mal: 'dorr_sov' }, R('Slut.')] };
// ersatter står kvar som i Innehålls data, men används inte (47.1)
const UPPDRAG = [{ id: 't_u', rubrik: 'HITTA {UNGE}', bild: 'uppdrag_stegen', pass: 1,
  steg: [{ text: 'GÅ TILL BOK', klart: { scen: 't_lapp', ga_till: 'dorr_bok' }, ersatter: [{ scen: 't_lapp', text: 'Gå till boken!' }] },
    { text: 'GÅ TILL SOV', klart: { scen: 't_lapp', ga_till: 'dorr_sov' } }],
  stampel: { scen: 't_lapp', efter: { replik: 'Bra.' } } }];
const dorr = async (page, id) => { const o = await page.evaluate((m) => window.__ORDSTAVEN.objekt(m), id); await page.mouse.click(o.x, o.y); };

test('lappen ersätter inget: dialogen och molnet står som förut, och lappen fälls ut när uppdraget börjar och vid tryck', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await provscen(page, SCEN, { uppdrag: UPPDRAG });
  expect(await page.evaluate(() => document.documentElement.classList.contains('text-under'))).toBe(true);
  const lapp = page.locator('#uppdragslapp'), knapp = page.locator('#hud-lapp');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('NU GÅR VI.', { timeout: 8000 });
  await expect(lapp).toBeHidden();
  await expect(knapp).toBeHidden(); // inget uppdrag än
  await page.click('#plattan .vidare');
  // instruktionen visas (lappen ersätter den inte längre), och ingen lapp före frågan
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await expect(lapp).toBeHidden();
  await page.click('#plattan .vidare');
  // uppdraget börjar: lappen fälls ut en stund och fälls ihop, sedan står målet i molnet
  await expect.poll(() => logg(page), { timeout: 8000 }).toContain('[lappen] framme: t_u');
  await expect(page.locator('#tanke .instruktion')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await expect(lapp).toBeHidden({ timeout: 3000 });
  // molnet står inne i remsan, inte avskuret i högra kanten (47.8)
  const moln = await page.locator('#tanke').boundingBox(), rum0 = await page.locator('#varld').boundingBox();
  expect(moln.x).toBeGreaterThanOrEqual(rum0.x); expect(moln.x + moln.width).toBeLessThanOrEqual(rum0.x + rum0.width + 1);
  // lappknappen står överst bland hans knappar
  await expect(knapp).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('#hud').firstElementChild.id)).toBe('hud-lapp');
  // ett tryck på lappknappen: lappen är framme ensam i remsan, och molnet väntar
  await knapp.click();
  await expect(lapp).toBeVisible();
  await expect(lapp.locator('.lapp-rubrik')).toHaveText('HITTA KNOPP');
  await expect(lapp.locator('.lapp-bock')).toHaveCount(0);
  await expect(lapp.locator('.lapp-ring')).toHaveCount(2);
  await expect(lapp.locator('.lapp-steg, .lapp-nu')).toHaveCount(0); // ingen text för delstegen
  await expect(page.locator('#tanke')).toHaveCSS('visibility', 'hidden');
  const varld = await page.locator('#varld').boundingBox(), r = await lapp.boundingBox();
  expect(r.y).toBeGreaterThanOrEqual(varld.y + varld.height);
  expect(r.y + r.height).toBeLessThanOrEqual(800);
  expect(r.height).toBeLessThanOrEqual(160);
  expect(r.x + r.width).toBeLessThanOrEqual(varld.x + varld.width + 1);
  await page.screenshot({ path: 'test-results/lappen-framme.png' });
  // ett tryck till fäller ihop den, och molnet kommer tillbaka
  await knapp.click();
  await expect(lapp).toBeHidden({ timeout: 2000 });
  await expect(page.locator('#tanke')).toHaveCSS('visibility', 'visible');
  // framme: en bock och en ring, och dialogen tar remsan (lappen fälls ihop direkt)
  await dorr(page, 'dorr_bok');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HÄR ÄR BOKEN.', { timeout: 10000 });
  await expect(lapp.locator('.lapp-bock')).toHaveCount(1);
  await expect(lapp.locator('.lapp-ring')).toHaveCount(1);
  await page.click('#plattan .vidare');
  // stämpeln kommer efter berättelsens stund (Bra.), bredvid hjälten och aldrig över honom eller ungen
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('BRA.', { timeout: 8000 });
  await page.evaluate(() => {
    window.__stampel = null;
    new MutationObserver((m) => { for (const x of m) for (const n of x.addedNodes) if (n.classList?.contains('stampel-ruta')) {
      const a = window.__ORDSTAVEN.position(), h = window.__ORDSTAVEN.varldTillSkarm(a.x - 8, a.y - 26), h2 = window.__ORDSTAVEN.varldTillSkarm(a.x + 8, a.y);
      window.__stampel = { s: n.getBoundingClientRect().toJSON(), h: { left: h.x, top: h.y, right: h2.x, bottom: h2.y } };
    } }).observe(document.querySelector('#varldslager'), { childList: true });
  });
  await page.click('#plattan .vidare');
  await expect.poll(() => logg(page), { timeout: 8000 }).toContain('[lappen] klart: t_u');
  const st = await page.evaluate(() => window.__stampel);
  expect(st).not.toBeNull();
  const krock = st.s.left < st.h.right && st.s.right > st.h.left && st.s.top < st.h.bottom && st.s.bottom > st.h.top;
  expect(krock).toBe(false);
  expect(st.s.width).toBeGreaterThan(100); // 64 av världens pixlar (192 punkter vid 3×, utan rotationen)
  expect(st.s.top).toBeGreaterThanOrEqual(varld.y - 1); expect(st.s.bottom).toBeLessThanOrEqual(varld.y + varld.height + 1);
  await expect(page.locator('.stampel-ruta')).toHaveCount(0, { timeout: 4000 });
  await expect(knapp).toBeHidden({ timeout: 4000 }); // inget uppdrag längre
  // fliken KLART i MIN BOK: en rad med bild, rubrik och stämpel, och den är ny
  await expect.poll(async () => (await page.evaluate(() => window.__ORDSTAVEN.steg()))?.mal, { timeout: 8000 }).toBe('dorr_sov');
  await page.click('#hud-paus');
  await page.click('.paus-val[data-val="hjalteboken"]');
  await page.click('.paus-val[data-val="klart"]');
  const rad = page.locator('.paus-klart .klart-rad');
  await expect(rad).toHaveCount(1);
  await expect(rad).toHaveClass(/ny/);
  await expect(rad.locator('.klart-stampel')).toHaveCount(1);
  await expect(page.locator('.paus-klart .klart-blad')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/lappen-klart.png' });
});

test('utan remsa finns ingen lapp: instruktionen och molnet står som förut', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  await page.setViewportSize({ width: 1280, height: 700 });
  await provscen(page, SCEN, { uppdrag: UPPDRAG });
  await page.click('#plattan .vidare');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await page.click('#plattan .vidare');
  await expect(page.locator('#tanke .instruktion')).toHaveText('GÅ TILL BOKEN!', { timeout: 8000 });
  await expect(page.locator('#uppdragslapp')).toBeHidden();
  await expect(page.locator('#hud-lapp')).toBeHidden();
});

test('MIN BOK, fliken KLART: tio rader per uppslag, öppnas på det senaste, och inget skärs av (48.1)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  await page.goto('./?snabb&ny');
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.keyboard.press('Control+Shift+KeyM');
  await page.click('#vuxenmeny .del[data-del="test"]');
  await page.click('#vuxenmeny .scenlista .scen[data-kapitel="kap-01"][data-i="11"]'); // k1s13: prologen och sju uppdrag i kapitel 1
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  for (const namn of ['TESTA', 'KNOPP']) {
    await expect(page.locator('#plattan :is(.dop-ruta, .replik-ruta)')).toBeVisible({ timeout: 10000 });
    if (await page.locator('#plattan .replik-ruta').isVisible()) await page.click('#plattan .replik-ruta');
    await expect(page.locator('#plattan .dop-ruta')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(200); await page.keyboard.type(namn);
    await expect(page.locator('#plattan .namnrutor .ruta.fylld')).toHaveCount(namn.length, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('#plattan .dop-ruta')).toBeHidden({ timeout: 10000 });
  }
  await expect(page.locator('#hud-paus')).toBeVisible({ timeout: 10000 });
  // fram till första steget där läsplattan är stängd (pausknappen går inte medan en replik står)
  for (let i = 0; i < 20 && !(await page.locator('#plattan').isHidden()); i++) {
    const v = page.locator('#plattan .vidare'); if (await v.isVisible()) await v.click().catch(() => {}); await page.waitForTimeout(300);
  }
  await page.click('#hud-paus');
  await page.click('.paus-val[data-val="hjalteboken"]');
  await page.click('.paus-val[data-val="klart"]');
  const klart = page.locator('.paus-klart');
  await expect(klart).toHaveAttribute('data-uppslag', '1');
  await expect(klart.locator('.klart-rad')).toHaveCount(9);
  await expect(klart.locator('.klart-blad.bak')).toHaveCount(1);
  await expect(klart.locator('.klart-blad.fram')).toHaveCount(0);
  await expect(klart.locator('.klart-prickar span')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/klart-uppslag-2.png' });
  await klart.locator('.klart-blad.bak').click();
  await expect(page.locator('.paus-klart')).toHaveAttribute('data-uppslag', '0');
  await expect(page.locator('.paus-klart .klart-rad')).toHaveCount(10);
  // ingen rad, rubrik eller stämpel skärs av, och allt står inne i fönstret
  const fel = await page.evaluate(() => [...document.querySelectorAll('.paus-klart .klart-rad')].flatMap((r) => {
    const q = r.getBoundingClientRect(), sida = r.parentElement.getBoundingClientRect(), rub = r.querySelector('.klart-rubrik');
    const ut = [];
    if (q.bottom > innerHeight || q.right > sida.right + 1 || q.bottom > sida.bottom + 1) ut.push('rad utanför: ' + r.textContent);
    if (rub.scrollWidth > rub.clientWidth + 1) ut.push('rubrik avskuren: ' + rub.textContent);
    return ut;
  }));
  expect(fel).toEqual([]);
  await page.screenshot({ path: 'test-results/klart-uppslag-1.png' });
});

test('ungen knuffar också när han ska ta emot något och står still (51.3)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(30000);
  // knuffen kommer efter 15 s som vid varje mål; här efter 1 s, så att testet går fort
  const scen = { id: 't_emot', pass: 1, rum: 'kontoret', steg: [R('Nu.'), { typ: 'ta_emot', fran: 'farfar_i_fatoljen', bild: 'lapp', knuff: { efter_sek: 1, handling: '' } }, R('Slut.')] };
  await provscen(page, scen);
  await page.click('#plattan .vidare');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), { timeout: 8000 }).toBe('ta_emot');
  await expect.poll(() => logg(page), { timeout: 8000 }).toMatch(/\[knuff\] (ungen nosar mot målet|målet glimtar): farfar_i_fatoljen/);
});

test('stegen går man på direkt: når han stegen medan beskrivningen och ljudet pågår klättrar han med en gång (50.5)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(40000);
  const scen = { id: 't_stegen', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [
    { typ: 'mellanscen', beskrivning: 'Hallen på natten, med en nattlampa. En bred entré med stegen upp, och en korridor med fem stängda dörrar med Farfars lappar.' },
    { typ: 'ljud', id: 'dunk', ljudord: 'dunk' },
    R('Klättra upp för stegen!'), { typ: 'ga_till', mal: 'stege_upp' }, R('Uppe.')] };
  // utan snabbläget, så att beskrivningen tar sin vanliga tid
  await provscen(page, scen, {}, '?test&testscen&kapitel=kap-00');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.steg()?.typ), { timeout: 5000 }).toBe('mellanscen');
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('stege_upp'));
  await page.mouse.click(o.x, o.y);
  await expect.poll(() => logg(page), { timeout: 10000 }).toContain('[stegen] klättrar direkt: stege_upp');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('UPPE.', { timeout: 15000 });
  expect(await logg(page)).not.toContain('KLÄTTRA UPP');
});

test('liangången i vanlig takt: sex lianer, från första hugget tills vägen är fri på högst ca 15 s (50.2, 51.5)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(90000);
  const { readFileSync } = await import('node:fs');
  const kap1 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-01.json', import.meta.url), 'utf8'));
  const brynet = kap1.rum.find((r) => r.id === 'skogsbrynet');
  // pusslet med sex delar, som Innehåll gör det i sitt andra pass (52.5)
  const pussel = { ...kap1.pussel.find((p) => p.id === 'k1_lianerna'), innehall: ['tom', 'tom', 'tom', 'tom', 'tom', 'tom'] };
  const scen = { id: 't_lianer', pass: 1, rum: 'skogsbrynet', steg: [{ typ: 'visa_foremal', foremal: 'stig_genom_hacken' }, { typ: 'pussel', pussel_id: 'k1_lianerna' }, R('Vägen är fri.')] };
  await provscen(page, scen, { pussel: [pussel], rum: { skogsbrynet: { innehall: brynet.innehall, skyltar: brynet.skyltar } } }, '?test&testscen&kapitel=kap-00');
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('HUGG LIANERNA MED SVÄRDET!', { timeout: 15000 });
  for (let k = 0; k < 40 && (await page.locator('#plattan .replik-ruta').isVisible()); k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(300); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => /^lianer_/.test(id)).length), { timeout: 10000 }).toBe(6);
  // han står nedanför gången (östra skärmen) och trycker Mellanslag så fort handen syns: det som mäts är spelets tid
  await page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum'); r.pos = { x: 464, y: 112 }; r.ungePos = { x: 448, y: 112 }; r.placera(); });
  await page.waitForTimeout(1500); // kameran glider dit
  for (let i = 5; i >= 0; i--) {
    const id = `lianer_${i}`;
    const o = await page.evaluate((x) => window.__ORDSTAVEN.objekt(x), id);
    await page.mouse.click(o.x, o.y);
    await expect.poll(async () => (await page.locator('#handknapp').isVisible()) || !(await page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id)), { timeout: 20000 }).toBe(true);
    if (await page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id)) await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate((x) => window.__ORDSTAVEN.rumsobjekt().includes(x), id), { timeout: 10000 }).toBe(false);
  }
  await expect(page.locator('#plattan .replik-ruta .text')).toHaveText('VÄGEN ÄR FRI.', { timeout: 15000 });
  // tiden i loggen: från första hugget till att pusslet är klart och berättelsen går vidare
  const rader = (await logg(page)).split('\n').filter((r) => /^\d\d:\d\d:\d\d\.\d{3}/.test(r));
  const tid = (r) => { const [h, m, s] = r.slice(0, 12).split(':'); return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000; };
  const forsta = rader.find((r) => r.includes('[hugg] ')), sista = rader.filter((r) => r.includes('[hugga] lianer_')).at(-1);
  const hugg = rader.filter((r) => r.includes('[hugg] ')).map((r) => r.match(/\[hugg\] (\w+)/)[1]);
  expect(hugg).toEqual(['sida', 'uppifran', 'sida', 'uppifran', 'sida', 'snurr']);
  const ms = tid(sista) - tid(forsta);
  console.log(`liangången: sex lianer på ${ms} ms från första hugget till sista`);
  expect(ms).toBeLessThan(15000);
  await page.screenshot({ path: 'test-results/liangangen-fri.png' });
});

test('sidovyn vid bron (5d): baronen sitter bakom busken på andra stranden, och Herr Skata landar på hjälmen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(40000);
  const scen = { id: 't_bron', pass: 1, rum: 'hallen', tillstand: 'natt', steg: [
    { typ: 'mellanscen', beskrivning: 'Sidovy vid bron.', bild: 'vid_bron' }, R('Förbi.')] };
  await provscen(page, scen, {}, '?test&testscen&kapitel=kap-00');
  const baron = () => page.evaluate(() => {
    const r = window.__ORDSTAVEN.spel.scene.getScene('Rum');
    const b = r.sidovy.list.find((x) => /baronen/.test(x.texture?.key || ''));
    return b ? { x: b.x, y: b.y, b: b.width, h: b.height, bild: b.texture.key } : null;
  });
  await expect.poll(baron, { timeout: 5000 }).toMatchObject({ x: 252, y: 86, b: 48, h: 40 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/sidovy-vid-bron.png' });
  await expect.poll(async () => (await baron())?.bild, { timeout: 6000 }).toBe('sidovy_vid_bron_baronen_03');
});

test('sängdags (51.4): han lägger sig med hjälmen på, och ungen hoppar upp, trampar runt och somnar', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(40000);
  const scen = { id: 't_sang', pass: 1, rum: 'sovrummet', tillstand: 'natt', steg: [R('Kryp ner i sängen!'), { typ: 'ga_till', mal: 'sang' }, { typ: 'mellanscen', beskrivning: 'Hjälten kryper ner.' }, R('God natt.')] };
  await provscen(page, scen, {}, '?test&testscen&kapitel=kap-00');
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(300); }
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('sang'));
  await page.mouse.click(o.x, o.y);
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect.poll(() => logg(page), { timeout: 10000 }).toContain('[hjälten] lägger sig: sang');
  const ungen = () => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').ungeBild?.frame?.name);
  const sett = new Set();
  for (let k = 0; k < 40; k++) { sett.add(await ungen()); if ((await ungen())?.startsWith('unge1_sover')) break; await page.waitForTimeout(150); }
  expect([...sett].some((n) => /unge1_glad_ner/.test(n || ''))).toBe(true); // hoppet
  expect([...sett].filter((n) => /unge1_tomgang_/.test(n || '')).length).toBeGreaterThanOrEqual(3); // varven
  expect(await ungen()).toMatch(/^unge1_sover_ner_0[12]$/);
  // han sover i sängen (bilderna med hjälmen på), och han syns inte bredvid den
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('sang'))).toMatch(/^hjalte_sang_0[34]$/);
  await page.screenshot({ path: 'test-results/sangdags.png' });
});

/** Räknar hur många hjältar som syns, var 20:e ms, tills mätningen läses (56.2). */
const raknaHjaltar = (page) => page.evaluate(() => {
  const w = /** @type {any} */ (window);
  w.__hjaltar = { max: 0, fler: [] };
  clearInterval(w.__hjaltarTid);
  w.__hjaltarTid = setInterval(() => {
    const n = w.__ORDSTAVEN.hjaltar();
    w.__hjaltar.max = Math.max(w.__hjaltar.max, n);
    if (n > 1 && w.__hjaltar.fler.length < 5) w.__hjaltar.fler.push({ n, scen: w.__ORDSTAVEN.scen(), sang: w.__ORDSTAVEN.bildFor('sang'), synlig: w.__ORDSTAVEN.synlig() });
  }, 20);
});
const hjaltarHittills = (page) => page.evaluate(() => /** @type {any} */ (window).__hjaltar);

test('aldrig två hjältar (56.2): han lägger sig, sover, vaknar på morgonen och kliver ur, utan en kopia på golvet eller i sängen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  // som s18 och s19: samma rum, så att sängen inte ritas om mellan kvällen och morgonen
  const kvall = { id: 't_kvall', pass: 1, rum: 'sovrummet', tillstand: 'natt', steg: [R('Kryp ner i sängen!'), { typ: 'ga_till', mal: 'sang' }, { typ: 'mellanscen', beskrivning: 'Hjälten kryper ner.' }, R('God natt.')] };
  const morgon = { id: 't_morgon', pass: 1, rum: 'sovrummet', tillstand: 'morgon', hjalte: 'sover', steg: [{ typ: 'mellanscen', beskrivning: 'Morgon.', bild: 'hjalte_sang_morgon' }, R('God morgon!'), { typ: 'ga_till', mal: 'dorr_hallen' }] };
  await provscen(page, kvall, { efter: [morgon] }, '?test&testscen&kapitel=kap-00');
  await raknaHjaltar(page);
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(300); }
  const o = await page.evaluate(() => window.__ORDSTAVEN.objekt('sang'));
  await page.mouse.click(o.x, o.y);
  await expect(page.locator('#handknapp')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Space');
  await expect.poll(() => logg(page), { timeout: 10000 }).toContain('[hjälten] lägger sig: sang');
  // repliken direkt efter: rummet ritas om medan han kryper ned
  for (let k = 0; k < 30 && (await page.evaluate(() => window.__ORDSTAVEN.scen())) !== 't_morgon'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(250); }
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 10000 }).toBe('t_morgon');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('sang')), { timeout: 5000 }).toMatch(/^hjalte_sang_(0[34]|morgon_0[12])$/);
  await page.screenshot({ path: 'test-results/hjaltar-morgon.png' });
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(250); }
  // han kliver ur: sängen är tom (dagens bild), och han står bredvid den
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.synlig()), { timeout: 5000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('sang')), { timeout: 5000 }).toBe('sang');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/hjaltar-uppe.png' });
  const m = await hjaltarHittills(page);
  expect(m.fler, JSON.stringify(m.fler)).toEqual([]);
  expect(m.max).toBe(1);
});

test('farväl (51.4): Farfar går själv från köket till ytterdörren och vinkar, och hjälten vinkar mot huset i trädgården', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(60000);
  const scen = { id: 't_farval', pass: 1, rum: 'hallen', tillstand: 'morgon', steg: [{ typ: 'visa_foremal', foremal: 'farfar_vid_dorren' }, R('Hej då!'), { typ: 'ga_till', mal: 'dorr_ut' }] };
  const ute = { id: 't_ute', pass: 1, rum: 'tradgarden', steg: [R('Ute.')] };
  await provscen(page, scen, { efter: [ute] }, '?test&testscen&kapitel=kap-00');
  await expect.poll(() => logg(page), { timeout: 10000 }).toContain('[figur] farfar_vid_dorren kommer från dorr_mat');
  // han går: läget ändras, med gångbilderna
  const farfar = () => page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum').ritade.get('farfar_vid_dorren'); return r ? { x: r.x, y: r.y, bild: r.frame.name } : null; });
  const bilder = new Set(); const lagen = new Set();
  for (let k = 0; k < 60; k++) { const f = await farfar(); bilder.add(f?.bild); lagen.add(`${f?.x},${f?.y}`); if (/vinka/.test(f?.bild || '')) break; await page.waitForTimeout(150); }
  expect([...bilder].some((b) => /^farfar_morgon_(ner|upp|hoger|vanster)_0[234]$/.test(b || ''))).toBe(true);
  expect(lagen.size).toBeGreaterThan(5);
  await expect.poll(async () => (await farfar())?.bild, { timeout: 15000 }).toMatch(/^farfar_morgon_vinka_(ner|vanster|hoger)_0[12]$/);
  const fram = await farfar(); expect(fram).toMatchObject({ x: 334, y: 172 }); // vid ytterdörren, där kartan har honom
  await page.screenshot({ path: 'test-results/farval-hallen.png' });
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__ORDSTAVEN.steg()?.typ)) !== 'ga_till'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(300); }
  const d = await page.evaluate(() => window.__ORDSTAVEN.objekt('dorr_ut'));
  await page.mouse.click(d.x, d.y);
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe('t_ute');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.spel.scene.getScene('Rum').hjaltePose), { timeout: 5000, intervals: [50] }).toMatch(/^hjalte_vinka_upp_0[12]$/);
  // husets fasad står i trädgårdens kant (berg har bilden fasad)
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('berg'))).toBe('fasad');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/farval-tradgarden.png' });
});

test('apan klättrar ned för stegen när den är räddad, och vinkar sedan (56.4)', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac-helskarm', 'ett projekt räcker');
  test.setTimeout(40000);
  const fangen = { id: 't_fangen', pass: 1, rum: 'glantan', tillstand: 'fangen', steg: [R('Apan hänger i nätet.')] };
  const raddad = { id: 't_raddad', pass: 1, rum: 'glantan', tillstand: 'raddad', steg: [R('Apan är räddad!'), R('Tack.')] };
  // gläntan som i kapitel 1, i prologen där provscenerna står
  const { readFileSync } = await import('node:fs');
  const glantan = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-01.json', import.meta.url), 'utf8')).rum.find((r) => r.id === 'glantan');
  await provscen(page, fangen, { efter: [raddad], rum: { glantan: { innehall: glantan.innehall, tillstand: glantan.tillstand } } }, '?test&testscen&kapitel=kap-00');
  const apan = () => page.evaluate(() => { const r = window.__ORDSTAVEN.spel.scene.getScene('Rum').ritade.get('apan'); return r?.active ? { x: r.x, y: r.y, bild: r.frame.name } : null; });
  expect(await apan()).toBeNull();
  for (let k = 0; k < 10 && (await page.evaluate(() => window.__ORDSTAVEN.scen())) !== 't_raddad'; k++) { await page.click('#plattan .replik-ruta').catch(() => {}); await page.waitForTimeout(300); }
  await expect.poll(() => logg(page), { timeout: 8000 }).toContain('[figur] apan klättrar ned från stege');
  const bilder = new Set(), y = new Set();
  for (let k = 0; k < 40; k++) { const a = await apan(); bilder.add(a?.bild); y.add(a?.y); if (/vinka/.test(a?.bild || '') && a?.x === 104) break; await page.waitForTimeout(80); }
  expect([...bilder].some((b) => /^apa_klattra_ned_0[12]$/.test(b || ''))).toBe(true); // Stils bilder (57.5)
  expect(y.size).toBeGreaterThan(3); // den flyttas nedför stegen
  // framme: på sin plats vid stegens fot, och den vinkar som förut
  await expect.poll(apan, { timeout: 5000 }).toMatchObject({ x: 104, y: 282 });
  await expect.poll(async () => (await apan())?.bild, { timeout: 3000 }).toMatch(/^apa_vinka_0[12]$/);
  await page.screenshot({ path: 'test-results/apan-nere.png' });
});
