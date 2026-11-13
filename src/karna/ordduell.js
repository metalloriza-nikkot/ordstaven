// @ts-check
// Ordduellen (P16, schema 2.47, beslut 61.1 och 87.4). Ren logik: inget Phaser, ingen DOM, så att kapitlet och
// testrummet kör samma regler.
//
// Regeln (manus 19): turvis, utan klocka och utan livmätare, och det går inte att förlora. Motståndaren ropar något
// som inte stämmer om det som syns (pekar_pa), och hjälten väljer det av två kort som stämmer. Rätt: motståndaren blir
// förvirrad och klättrar själv ett steg upp på repstegen. Fel: han klättrar ett steg ned, och inget annat händer.
// Efter två fel i samma rond kommer hjälpen. Det sista rätta kortet vinner duellen (vinsten är hjältens).

/** Hur långt ned motståndaren kan komma, räknat i steg under där han började. */
export const MAX_NARMARE = 2;

/**
 * Korten i en blandad ordning, så att det rätta inte alltid står först. @template T
 * @param {T[]} lista @param {() => number} slump @returns {number[]} index i listan
 */
function blandadOrdning(lista, slump) {
  const ix = lista.map((_, i) => i);
  for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(slump() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
  return ix;
}

/**
 * @param {{ ronder: { form?: string, niva?: string, utfall: { pekar_pa: string, ropar: any[], alternativ: { text: string, ratt?: boolean }[], vid_ratt?: any, vid_fel?: any }[] }[], hjalp?: { efter_fel: number, handling: string }, vid_vinst?: any }} p
 * @param {{ slump?: () => number }} [opt]
 */
export function skapaOrdduell(p, { slump = Math.random } = {}) {
  const start = p.ronder.length;
  const s = {
    /** ronden som pågår (0 …) */
    rond: 0,
    /** utfallet i ronden (ett av flera, om ronden har flera) */
    utfall: 0,
    /** korten i den ordning de visas: index i utfallets alternativ */
    ordning: /** @type {number[]} */ ([]),
    /** motståndarens steg på repstegen, räknat nedifrån gondolen (0 = i gondolen) */
    steg: start,
    fel: 0, felIRond: 0, forsokIRond: 0,
    klar: false,
    /** per rond: form, nivå, antal försök och fel */
    logg: /** @type {{ rond: number, form?: string, niva?: string, forsok: number, fel: number }[]} */ ([]),
  };
  const nyRond = () => {
    const r = p.ronder[s.rond];
    s.utfall = Math.min(r.utfall.length - 1, Math.floor(slump() * r.utfall.length));
    s.ordning = blandadOrdning(r.utfall[s.utfall].alternativ, slump);
    s.felIRond = 0; s.forsokIRond = 0;
  };
  nyRond();
  const utfallNu = () => p.ronder[s.rond].utfall[s.utfall];
  return {
    s,
    /** Ronden som pågår. */
    get rond() { return p.ronder[s.rond]; },
    /** Det motståndaren ropar om, det han ropar och korten. */
    get utfall() { return utfallNu(); },
    /** Korten i den ordning de visas. */
    get kort() { const u = utfallNu(); return s.ordning.map((i) => u.alternativ[i]); },
    /** Ska hjälpen synas (efter två fel i ronden)? */
    get hjalp() { return !!p.hjalp && s.felIRond >= p.hjalp.efter_fel; },
    /** Är det sista ronden? */
    get sista() { return s.rond === p.ronder.length - 1; },
    /**
     * Han väljer kortet på plats i (i den ordning korten visas).
     * @param {number} i
     * @returns {{ resultat: 'ratt' | 'fel' | 'vinst' | 'ingen', reaktion?: any, hjalpNu?: boolean, steg: number }}
     */
    valj(i) {
      if (s.klar) return { resultat: 'ingen', steg: s.steg };
      const u = utfallNu();
      const kort = u.alternativ[s.ordning[i]];
      if (!kort) return { resultat: 'ingen', steg: s.steg };
      s.forsokIRond++;
      if (!kort.ratt) {
        s.fel++; s.felIRond++;
        s.steg = Math.min(start + MAX_NARMARE, s.steg + 1);
        return { resultat: 'fel', reaktion: u.vid_fel, hjalpNu: !!p.hjalp && s.felIRond === p.hjalp.efter_fel, steg: s.steg };
      }
      const r = p.ronder[s.rond];
      s.logg.push({ rond: s.rond + 1, form: r.form, niva: r.niva, forsok: s.forsokIRond, fel: s.felIRond });
      if (s.rond === p.ronder.length - 1) { s.klar = true; s.steg = 0; return { resultat: 'vinst', reaktion: u.vid_ratt, steg: 0 }; }
      s.steg = Math.max(1, s.steg - 1);
      s.rond++; nyRond();
      return { resultat: 'ratt', reaktion: u.vid_ratt, steg: s.steg };
    },
  };
}
