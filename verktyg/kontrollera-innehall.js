// Kontrollerar allt innehåll i content/. Körs av `npm run kontroll` och i GitHub Actions.
// Fel stoppar publiceringen. Varningar skrivs ut till Innehåll men stoppar inget.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { kontrollera } from './innehall/kontroll.js';

const rot = new URL('../content/', import.meta.url);
const las = (u) => JSON.parse(readFileSync(u, 'utf8'));

const ordlistor = las(new URL('ordlistor.json', rot));
let fel = 0, varningar = 0;
for (const mapp of readdirSync(rot, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'schema')) {
  const dir = new URL(mapp.name + '/', rot);
  if (!existsSync(new URL('aventyr.json', dir))) continue;
  const aventyr = las(new URL('aventyr.json', dir));
  const kapitel = readdirSync(dir).filter((f) => /^kap-\d\d\.json$/.test(f)).sort().map((f) => las(new URL(f, dir)));
  const r = kontrollera({ aventyr, kapitel, ordlistor });
  console.log(`\n== ${mapp.name}: ${kapitel.length} kapitel ==`);
  for (const p of r.pass) console.log(`   ${p.kapitel} pass ${p.pass}: ca ${p.minuter} min, ${p.lasuppgifter} läsuppgifter`);
  for (const f of r.fel) console.log('FEL      ' + f);
  for (const v of r.varningar) console.log('varning  ' + v);
  fel += r.fel.length; varningar += r.varningar.length;
}
console.log(`\nInnehållskontroll: ${fel} fel, ${varningar} varningar.`);
process.exit(fel ? 1 : 0);
