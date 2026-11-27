// Kontrollerar allt innehåll i content/. Körs av `npm run kontroll` och i GitHub Actions.
// Fel stoppar publiceringen. Varningar skrivs ut till Innehåll men stoppar inget.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { kontrollera } from './innehall/kontroll.js';
import { lasKarta } from '../src/karna/karta.js';
import { testrumKapitel, testrumAventyr, testrumDuellKapitel, testrumDuellAventyr } from '../src/karna/testrum.js';
import { kontrolleraStig } from '../src/karna/bokstavsstig.js';

const rot = new URL('../content/', import.meta.url);
const las = (u) => JSON.parse(readFileSync(u, 'utf8'));

const ordlistor = las(new URL('ordlistor.json', rot));
let fel = 0, varningar = 0;
for (const mapp of readdirSync(rot, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'schema')) {
  const dir = new URL(mapp.name + '/', rot);
  if (!existsSync(new URL('aventyr.json', dir))) continue;
  const aventyr = las(new URL('aventyr.json', dir));
  const kapitel = readdirSync(dir).filter((f) => /^kap-\d\d\.json$/.test(f)).sort().map((f) => las(new URL(f, dir)));
  // Tiled-kartorna ligger i kartor/<äventyr>/<rum>.tmj
  const kartdir = new URL(`../kartor/${mapp.name}/`, import.meta.url);
  const kartor = {};
  if (existsSync(kartdir)) for (const f of readdirSync(kartdir).filter((x) => x.endsWith('.tmj'))) {
    try { kartor[f.replace(/\.tmj$/, '')] = lasKarta(las(new URL(f, kartdir))); }
    catch (e) { console.log(`FEL      kartan ${f}: ${e.message}`); fel++; }
  }
  const r = kontrollera({ aventyr, kapitel, ordlistor, kartor });
  console.log(`\n== ${mapp.name}: ${kapitel.length} kapitel ==`);
  for (const p of r.pass) console.log(`   ${p.kapitel} pass ${p.pass}: ca ${p.minuter} min, ${p.lasuppgifter} läs- och skrivuppgifter som avgör`);
  // mellanscener som fortfarande visar texten för den vuxne (beslut 65): fel först när kapitlet är klart
  for (const b of r.beskrivningar || []) {
    const n = b.platser.length, m = (b.reaktioner || []).length;
    if (!n && !m) continue;
    const delar = [n ? `${n} mellanscener` : '', m ? `${m} reaktioner och knuffar` : ''].filter(Boolean).join(' och ');
    console.log(`   ${b.kapitel === 'aventyr' ? 'aventyr.json' : b.kapitel}: ${delar} visar texten för den vuxne${b.klart ? '' : b.kapitel === 'aventyr' ? ' (äventyret är inte klart)' : ' (kapitlet är inte klart)'}`);
  }
  // 135.7: rummen där molnet visar berättelsens instruktion i stället för gå-steget (pa_vagen)
  if (r.molnet?.length) {
    console.log(`   molnet i rummen före stegets rum, utan pa_vagen (${r.molnet.length}):`);
    for (const m of r.molnet) console.log(`     ${m.kapitel} ${m.rum} (${m.scen} steg ${m.steg + 1}, ${m.typ}): boken säger ${m.boken} i ${m.stegetsRum}, molnet ${m.visas ? `visar "${m.instruktion}"` : `är tomt${m.instruktion ? ` ("${m.instruktion}" är ingen uppgift)` : ''}`}`);
  }
  for (const f of r.fel) console.log('FEL      ' + f);
  for (const v of r.varningar) console.log('varning  ' + v);
  fel += r.fel.length; varningar += r.varningar.length;
}
// testrummet för fritt skrivande (41): Innehålls uppgifter som ett kapitel, med samma kontroll som skrivpusslen
const testrumFil = new URL('testrum-skriv.json', rot);
if (existsSync(testrumFil)) {
  const aventyr = las(new URL('den-gomda-dalen/aventyr.json', rot));
  const r = kontrollera({ aventyr: testrumAventyr(aventyr), kapitel: [testrumKapitel(las(testrumFil))], ordlistor, kartor: {} });
  console.log(`\n== testrummet: ${r.pass.length ? 'ett pass' : 'inga pass'} ==`);
  for (const f of r.fel) console.log('FEL      testrummet: ' + f);
  for (const v of r.varningar) console.log('varning  testrummet: ' + v);
  fel += r.fel.length; varningar += r.varningar.length;
}
// testrummet för ordduellen (61.1): Innehålls dueller som ett kapitel, med samma kontroll som duellen i kapitel 3
const duellFil = new URL('testrum-duell.json', rot);
if (existsSync(duellFil)) {
  const aventyr = las(new URL('den-gomda-dalen/aventyr.json', rot)), data = las(duellFil);
  const r = kontrollera({ aventyr: testrumDuellAventyr(aventyr, data), kapitel: [testrumDuellKapitel(data)], ordlistor, kartor: {} });
  console.log(`\n== testrummet för ordduellen: ${testrumDuellKapitel(data).pussel.length} dueller ==`);
  for (const f of r.fel) console.log('FEL      testrummet för ordduellen: ' + f);
  for (const v of r.varningar) console.log('varning  testrummet för ordduellen: ' + v);
  fel += r.fel.length; varningar += r.varningar.length;
}
// testrummet för bokstavsstigen (114.6): varje stig går att stava hela vägen, och inga förväxlingsbara gemener bredvid varandra
const stigFil = new URL('testrum-stig.json', rot);
if (existsSync(stigFil)) {
  const data = las(stigFil);
  const stigar = (data.stigar || []).filter((/** @type {any} */ p) => p.typ === 'P18_bokstavsstig');
  console.log(`\n== testrummet för bokstavsstigen: ${stigar.length} stigar ==`);
  if (!stigar.length) { console.log('FEL      testrummet för bokstavsstigen: inga stigar'); fel++; }
  for (const p of stigar) {
    const r = kontrolleraStig(p);
    for (const f of r.fel) console.log('FEL      testrummet för bokstavsstigen: ' + f);
    for (const v of r.varningar) console.log('varning  testrummet för bokstavsstigen: ' + v);
    fel += r.fel.length; varningar += r.varningar.length;
  }
}
console.log(`\nInnehållskontroll: ${fel} fel, ${varningar} varningar.`);
process.exit(fel ? 1 : 0);
