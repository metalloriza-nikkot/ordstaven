// @ts-check
// Tiled-kartor för rummen. Kartan säger VAR föremålen står, innehållet säger VAD som finns.
// Kartan innehåller bara id:n (objektets namn), aldrig text som spelaren ser.
// Ett objektlager med rutor: namn = föremålets id, typ = utgang, sak eller figur (frivilligt).
// Egenskaper: "till" (rummet en utgång leder till), "sida" (var hjälten ställer sig: under, over, vanster, hoger,
// eller alla = föremålet nås från alla håll, t.ex. krukor och buskar),
// "golv" (man går på det) och "visar" (pusslet vars alternativ föremålet visar, t.ex. lådorna eller krukorna).
// "riktning" (vanster, hoger, upp, ned: åt vilket håll utgången leder, nästa rum glider in därifrån),
// "klattra" (upp, ned: stegen klättras), "ute" (utedörren ritas ljusare) och "lapp" (föremålet där ordet visas
// när utgången är ett val, t.ex. skylten vid en stig), "talare" (figurens talare: ett tryck på figuren upprepar
// dess senaste instruktion). Kartans egenskap "inomhus" ger rummet väggram, och
// vagg_bak, vagg_sida och vagg_fram ger väggarnas mått i pixlar (annars 48, 32 och 16; en smal hall har tjocka sidoväggar).
// En punkt med namnet "start" är där hjälten står när rummet visas utan att hjälten kom genom en utgång.
// Punkter som heter "lampa" (eller lampa_…) lyser när rummet är mörkt, t.ex. en läslampa vid Farfars plats.
// "last_i" på en utgång (tillstånd med komma emellan, t.ex. natt): utgången är låst då, och hjälten känner på
// handtaget (ytterdörren på natten). Kartans "morker" (0–1) säger hur mörkt rummet är på natten (annars 0,72).
// Höjdnivåer: en ruta med typen "yta" och egenskapen "niva" (1, 2 …) är upphöjd (kullen, krönet), och dess kanter
// går inte att gå över. En ruta med typen "trappa" eller "stege" förbinder nivåerna och ska ligga över kanten.
// Saker på ytan (lövhögarna) når han bara uppifrån. Se karna/nivaer.js.
// "forsvinner_efter" (ett pussels id, en formel eller P26): föremålet är borta när hjälten har formeln, t.ex. lianerna som
// SVÄRD kapar. "oppning" på en stig: när den syns skär den igenom hindret den ligger över, t.ex. hålet i häcken.
// Ett rum som inte är rektangulärt (hallen: en bred entré och en smal korridor) får sin form av rutor med typen
// "vagg": massiv vägg inne i kartan. De hör till rummets form, inte till innehållet, och har inget namn som används.
import { RUM } from './skalning.js';
import { VAGG } from './rumslayout.js';
import { STORSTA } from './kamera.js';

/** @typedef {import('./rumslayout.js').Objekt} Objekt */
/**
 * @typedef {{ objekt: Objekt[], start: { x: number, y: number } | null, inomhus: boolean,
 *             in: Record<string, { x: number, y: number }>, lampor: { x: number, y: number }[],
 *             vagg: { bak: number, sida: number, fram: number }, morker: number | null,
 *             storlek: { bredd: number, hojd: number }, massiv: { x: number, y: number, b: number, h: number }[],
 *             bild?: string | null, mark?: string | null, rutlager?: { namn: string, data: number[], visasMed: string | null }[],
 *             omgivning?: { vad: string, x: number, y: number, b: number, h: number }[],
 *             overHinder?: { x: number, y: number, b: number, h: number }[] }} Karta
 * bild = rummets bild (assets/rum), mark = rutsetet för marken utomhus (assets/tiles).
 * inomhus = rummet har väggram (bakvägg, sidoväggar, främre kant). in = var hjälten kommer in från ett rum
 * som inte har någon utgång hit (punkter som heter in_<rum>, t.ex. trädgården från köket). lampor = där det lyser i mörkret.
 * storlek = områdets storlek i pixlar (kartans bredd och höjd): en skärm (320×192) eller större, högst 640×384.
 * massiv = väggar inne i rummet (typen vagg), som ger rummet en annan form än en rektangel.
 * overHinder = ridåns rutor (rutlagret over) som hinder, en ruta per rad av rutor bredvid varandra (56.3): ridån
 * ligger under figurerna, och fötterna står aldrig i den.
 */

const UTGANG = /^(stege_|dorr_|grind|stig_)/;
const SIDOR = new Set(['under', 'over', 'vanster', 'hoger', 'alla']);
const RIKTNINGAR = new Set(['vanster', 'hoger', 'upp', 'ned']);

/** Objektets id i rummets innehåll (ett id eller { id, syns_i }). @param {string | { id: string }} x */
export const innehallsId = (x) => (typeof x === 'string' ? x : x.id);

/**
 * Föremålen som syns i ett visst tillstånd av rummet. Ett dolt föremål (dold: true, t.ex. lådan under löven)
 * syns först när ett steg har visat det (visa_foremal), och sedan resten av äventyret.
 * @param {(string | { id: string, syns_i?: string[], dold?: boolean })[]} innehall @param {string | null} tillstand
 * @param {string[]} [visade] dolda föremål som har visats
 */
export function synligaIds(innehall, tillstand, visade = []) {
  return innehall.filter((x) => typeof x === 'string' || ((!x.syns_i || (tillstand !== null && x.syns_i.includes(tillstand))) && (!x.dold || visade.includes(x.id)))).map(innehallsId);
}

/**
 * Ridåns rutor som hinder (56.3): rutorna i rutlagret over, ihop till en ruta per rad av rutor bredvid varandra.
 * Rutorna är hela (skogens rutor har gräs där kronan inte når), så det fötterna inte får stå i är hela rutan.
 * @param {{ namn: string, data: number[] }[]} rutlager @param {number} kol @param {number} rb @param {number} rh
 * @returns {{ x: number, y: number, b: number, h: number }[]}
 */
export function overSomHinder(rutlager, kol, rb = 16, rh = 16) {
  const over = rutlager.find((l) => l.namn === 'over');
  /** @type {{ x: number, y: number, b: number, h: number }[]} */
  const ut = [];
  if (!over) return ut;
  for (let i = 0; i < over.data.length; i++) {
    if (over.data[i] < 0) continue;
    const x = (i % kol) * rb, y = Math.floor(i / kol) * rh, forra = ut.at(-1);
    if (forra && forra.y === y && forra.x + forra.b === x) forra.b += rb; else ut.push({ x, y, b: rb, h: rh });
  }
  return ut;
}

/** Sort efter id när kartan inte säger något. @param {string} id @returns {Objekt['sort']} */
export const sortFor = (id) => (UTGANG.test(id) ? 'utgang' : 'sak');

/**
 * Läs en Tiled-karta (JSON, .tmj).
 * @param {any} tmj
 * @returns {Karta}
 */
export function lasKarta(tmj) {
  if (!tmj || tmj.type !== 'map') throw new Error('inte en Tiled-karta');
  const bredd = tmj.width * tmj.tilewidth, hojd = tmj.height * tmj.tileheight;
  // ett område är minst en skärm och högst ungefär 2×2 skärmar (beslut 14). Är det större än skärmen följer kameran hjälten.
  if (bredd < RUM.bredd || hojd < RUM.hojd || bredd > STORSTA.bredd || hojd > STORSTA.hojd) {
    throw new Error(`kartan är ${bredd}×${hojd}, ett område är ${RUM.bredd}×${RUM.hojd} till ${STORSTA.bredd}×${STORSTA.hojd}`);
  }
  /** @type {Objekt[]} */
  const objekt = [];
  let start = null;
  /** @type {Record<string, { x: number, y: number }>} */
  const inpunkter = {};
  /** @type {{ x: number, y: number }[]} */
  const lampor = [];
  /** @type {{ x: number, y: number, b: number, h: number }[]} */
  const massiv = [];
  /** @type {{ vad: string, x: number, y: number, b: number, h: number }[]} */
  const omgivning = [];
  const kartegen = Object.fromEntries((tmj.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
  const tal = (/** @type {any} */ x, /** @type {number} */ d) => (Number.isFinite(Number(x)) && x !== '' && x !== undefined ? Math.round(Number(x)) : d);
  // rutlagren (Teknik 3): golv (marken), over (trädridån ovanför figurerna) och lager som syns med ett föremål
  // (visas_med: den hemliga stigen). Rutornas nummer i rutsetet, -1 där lagret är tomt.
  /** @type {{ namn: string, data: number[], visasMed: string | null }[]} */
  const rutlager = [];
  const forsta = (tmj.tilesets || [])[0]?.firstgid ?? 1;
  for (const lager of tmj.layers || []) {
    if (lager.type !== 'tilelayer' || !Array.isArray(lager.data)) continue;
    if (lager.width !== tmj.width || lager.height !== tmj.height) throw new Error(`rutlagret ${lager.name} har fel storlek`);
    const egen = Object.fromEntries((lager.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
    rutlager.push({ namn: String(lager.name), data: lager.data.map((/** @type {number} */ g) => (g ? (g & 0x1fffffff) - forsta : -1)), visasMed: egen.visas_med ? String(egen.visas_med) : null });
  }
  for (const lager of tmj.layers || []) {
    if (lager.type !== 'objectgroup') continue;
    for (const o of lager.objects || []) {
      const egen = Object.fromEntries((o.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
      if (o.point || o.name === 'start' || /^in_/.test(o.name) || /^lampa(_|$)/.test(o.name)) {
        const p = { x: Math.round(o.x), y: Math.round(o.y) };
        if (o.name === 'start') start = p; else if (/^in_/.test(o.name)) inpunkter[o.name.slice(3)] = p;
        else if (/^lampa(_|$)/.test(o.name)) lampor.push(p);
        continue;
      }
      const typ = o.type || o.class || '';
      if (typ === 'vagg') { massiv.push({ x: Math.round(o.x), y: Math.round(o.y), b: Math.round(o.width), h: Math.round(o.height) }); continue; }
      // liv i skogen (26.3, 10b): det som rör sig utan att man kan göra något med det. Inget föremål, inget hinder.
      if (typ === 'omgivning') { omgivning.push({ vad: String(egen.vad || ''), x: Math.round(o.x), y: Math.round(o.y), b: Math.round(o.width), h: Math.round(o.height) }); continue; }
      /** @type {Objekt} */
      const ut = {
        id: o.name,
        x: Math.round(o.x), y: Math.round(o.y), b: Math.round(o.width), h: Math.round(o.height),
        sort: typ === 'utgang' || typ === 'sak' || typ === 'figur' ? typ : typ === 'yta' || typ === 'trappa' || typ === 'stege' ? 'yta' : sortFor(o.name),
      };
      if (typ === 'yta') ut.niva = Math.max(1, Math.round(Number(egen.niva) || 1));
      if (typ === 'trappa' || typ === 'stege') ut.forbinder = typ;
      if (egen.till) ut.till = String(egen.till);
      if (SIDOR.has(egen.sida)) ut.sida = egen.sida;
      if (egen.golv) ut.golv = true;
      if (egen.visar) ut.visar = String(egen.visar);
      if (RIKTNINGAR.has(egen.riktning)) ut.riktning = egen.riktning;
      if (egen.klattra === 'upp' || egen.klattra === 'ned') ut.klattra = egen.klattra;
      if (egen.ute) ut.ute = true;
      if (egen.lapp) ut.lapp = String(egen.lapp);
      if (egen.talare) ut.talare = String(egen.talare);
      if (egen.forsvinner_efter) ut.forsvinnerEfter = String(egen.forsvinner_efter);
      if (egen.oppning) ut.oppning = true;
      if (egen.last_i) ut.lastI = String(egen.last_i).split(',').map((t) => t.trim()).filter(Boolean);
      // grafiken (2.14): bildens namn, bilden på natten, och föremålet vars nederkant bilden står på
      if (egen.bild) ut.bild = String(egen.bild);
      if (egen.bild_natt) ut.bildNatt = String(egen.bild_natt);
      if (egen.bild_pa) ut.bildPa = String(egen.bild_pa);
      if (egen.bild_del) ut.bildDel = String(egen.bild_del);
      if (egen.sovplats) ut.sovplats = true;
      if (egen.skata_fonster) ut.skataFonster = true;
      if (egen.lyser) ut.lyser = true;
      // delas: "hela" = när ett pussel delar föremålet (P26) fyller delarna hela föremålet (lianväggen), annars krukor
      if (egen.delas === 'hela') ut.delasHela = true;
      // delas: "djup" (50.2) = delarna står efter varandra från norr till söder (liangången), den södra närmast
      if (egen.delas === 'djup') ut.delasDjup = true;
      // dekor (52.2) = står i kartan och ritas, utan samspel och utan text, och behöver inte stå i rummets innehåll
      if (egen.dekor) ut.dekor = true;
      // ovanpa (5d) = ritas ovanpå trädkronorna och figurerna (ugglorna i kronan)
      if (egen.ovanpa) ut.ovanpa = true;
      // hugget (39.3): bild_rad = bilder som upprepas längs föremålet (lianväggen, en lian var bildbredd),
      // bild_hugg = bilderna när det huggs, bild_kvar = det som står kvar efteråt (inget hinder)
      if (egen.bild_rad) ut.bildRad = String(egen.bild_rad).split(',').map((t) => t.trim()).filter(Boolean);
      if (egen.bild_hugg) ut.bildHugg = String(egen.bild_hugg).split(',').map((t) => t.trim()).filter(Boolean);
      if (egen.bild_kvar) ut.bildKvar = String(egen.bild_kvar);
      // skogens grafik (Teknik 3): bild_sedan = bilden efter att `sedan` har hänt (ett pussel, en formel eller ett
      // dolt föremål som har visats: häcken med hålet), bild_anim = bilder som byts i tomgång var anim_ms
      // (minst 250 ms, golvets gräns), rutor = föremålet är ritat i rutlagret (kullen, bäcken) och har ingen egen bild
      if (egen.bild_sedan && egen.sedan) { ut.bildSedan = String(egen.bild_sedan); ut.sedan = String(egen.sedan); }
      // bild_sitter (34.4): bilden när hjälten sitter i föremålet (fåtöljen med honom i), när han har gått dit
      if (egen.bild_sitter) ut.bildSitter = String(egen.bild_sitter);
      // prologens nya animationer (51.4, 10f v0.3): bild_ta_emot = figuren tar emot det han bär (Farfar och boken),
      // bild_las = sedan läser figuren (en slinga), kommer_fran = figuren går själv hit från en utgång när den visas
      // (Farfar från köket till ytterdörren), bild_vinka = figuren vinkar när den har kommit fram
      if (egen.bild_ta_emot) ut.bildTaEmot = String(egen.bild_ta_emot).split(',').map((t) => t.trim()).filter(Boolean);
      if (egen.bild_las) ut.bildLas = String(egen.bild_las).split(',').map((t) => t.trim()).filter(Boolean);
      if (egen.kommer_fran) ut.kommerFran = String(egen.kommer_fran);
      // klattrar_fran (56.4) = figuren klättrar ned för stegen när den visas i ett rum han redan är i (apan när den
      // är räddad), med bilderna <namn>_klattra_ned_01–02 (annars <namn>_klattra_01–02)
      if (egen.klattrar_fran) ut.klattrarFran = String(egen.klattrar_fran);
      if (egen.bild_vinka) ut.bildVinka = String(egen.bild_vinka).split(',').map((t) => t.trim()).filter(Boolean);
      if (egen.bild_anim) { ut.bildAnim = String(egen.bild_anim).split(',').map((t) => t.trim()).filter(Boolean); ut.animMs = Math.max(250, tal(egen.anim_ms, 500)); }
      if (egen.rutor) ut.rutor = true;
      objekt.push(ut);
    }
  }
  const vagg = { bak: tal(kartegen.vagg_bak, VAGG.bak), sida: tal(kartegen.vagg_sida, VAGG.sida), fram: tal(kartegen.vagg_fram, VAGG.fram) };
  const m = Number(kartegen.morker);
  const morker = kartegen.morker !== undefined && Number.isFinite(m) ? Math.max(0, Math.min(1, m)) : null;
  // vinka_fran (51.4): kommer han in från det rummet vinkar han mot huset (trädgården, när han har sagt hejdå)
  const vinkaFran = kartegen.vinka_fran ? String(kartegen.vinka_fran) : null;
  return { vinkaFran, objekt, start, overHinder: overSomHinder(rutlager, tmj.width, tmj.tilewidth, tmj.tileheight), inomhus: !!kartegen.inomhus, in: inpunkter, lampor, vagg, morker, storlek: { bredd, hojd }, massiv, bild: kartegen.bild ? String(kartegen.bild) : null, mark: kartegen.mark ? String(kartegen.mark) : null, rutlager, omgivning };
}
