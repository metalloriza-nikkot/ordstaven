// @ts-check
// Ljudeffekter för gråboxen, syntetiserade som i TURBO-RACE (04_audio.js, Snd) men med mjukare klanger
// (triangel och sinus, stilguiden). Riktiga ljud och musik kommer i fas 4. Ljudet startas av första trycket (iPad).

/** @param {{ tyst?: () => boolean }} [opt] */
export function skapaLjud({ tyst = () => false } = {}) {
  /** @type {AudioContext | null} */
  let ac = null;
  /** @type {GainNode | null} */
  let ut = null;

  function starta() {
    if (ac) { if (ac.state !== 'running') ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ac = new AC(); ut = ac.createGain(); ut.gain.value = 0.35; ut.connect(ac.destination);
  }

  /** @param {{ f: number, f2?: number, t?: number, v?: number, typ?: OscillatorType, d?: number }} o */
  function ton(o) {
    if (!ac || !ut) return;
    const t0 = ac.currentTime + (o.d || 0), t = o.t || 0.15;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.typ || 'triangle';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + t);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.v ?? 0.5, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    osc.connect(g); g.connect(ut); osc.start(t0); osc.stop(t0 + t + 0.05);
  }

  /** @type {Record<string, () => void>} */
  const fx = {
    dunk: () => { ton({ f: 120, f2: 50, t: 0.35, v: 0.8, typ: 'sine' }); },
    tick: () => { for (let i = 0; i < 4; i++) ton({ f: 1800, t: 0.03, v: 0.2, typ: 'square', d: i * 0.18 }); },
    kras: () => { ton({ f: 900, f2: 300, t: 0.2, v: 0.4 }); ton({ f: 600, f2: 200, t: 0.25, v: 0.3, d: 0.08 }); },
    unge: () => { ton({ f: 700, f2: 1100, t: 0.18, v: 0.4, typ: 'sine' }); ton({ f: 1100, f2: 900, t: 0.2, v: 0.35, typ: 'sine', d: 0.2 }); },
    mage: () => { for (let i = 0; i < 5; i++) ton({ f: 90 + i * 12, f2: 70, t: 0.12, v: 0.5, typ: 'sine', d: i * 0.1 }); },
    ratt: () => { [784, 988, 1175].forEach((f, i) => ton({ f, t: 0.14, v: 0.35, d: i * 0.08 })); },
    fel: () => { ton({ f: 300, f2: 180, t: 0.25, v: 0.35, typ: 'sine' }); },
    fest: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => ton({ f, t: i === 5 ? 0.4 : 0.12, v: 0.3, d: i * 0.1 })); },
    bar: () => { ton({ f: 988, t: 0.07, v: 0.3 }); ton({ f: 1319, t: 0.15, v: 0.3, d: 0.07 }); },
    klick: () => { ton({ f: 660, f2: 880, t: 0.06, v: 0.2 }); },
    bricka: () => { ton({ f: 520, t: 0.06, v: 0.25 }); },
    sla: () => { ton({ f: 260, f2: 120, t: 0.15, v: 0.5 }); },
    allmant: () => { ton({ f: 440, f2: 660, t: 0.2, v: 0.3, typ: 'sine' }); },
    // en fel bricka studsar tillbaka i kasta-läget ("pff"): mjukt och kort, inget fel
    pff: () => { ton({ f: 340, f2: 240, t: 0.09, v: 0.22, typ: 'sine' }); },
    // kodlåset skakar vid fel
    klonk: () => { ton({ f: 160, f2: 110, t: 0.12, v: 0.5, typ: 'square' }); ton({ f: 140, f2: 90, t: 0.14, v: 0.4, typ: 'square', d: 0.11 }); },
    // ett lås som klickar upp, och prassel i löv och buskar
    klick_las: () => { ton({ f: 1200, t: 0.04, v: 0.3, typ: 'square' }); ton({ f: 900, t: 0.05, v: 0.25, typ: 'square', d: 0.06 }); },
    prassel: () => { for (let i = 0; i < 5; i++) ton({ f: 2400 - i * 200, t: 0.04, v: 0.08, typ: 'sawtooth', d: i * 0.04 }); },
  };
  /** Ljud-id i innehållet → effekt. Okända id:n får ett allmänt ljud. */
  const LJUD_ID = /** @type {Record<string, string>} */ ({
    dunk: 'dunk', klaffen_tick: 'tick', unge_forsta_late: 'unge', unge_langtan: 'unge', unge_svarar: 'unge', mage_kurrar: 'mage',
  });

  return {
    starta,
    /** @param {string} namn effekt eller ljud-id ur innehållet */
    spela(namn) {
      if (tyst()) return;
      starta();
      try { (fx[namn] || fx[LJUD_ID[namn]] || fx.allmant)(); } catch (e) { /* ljud får aldrig krascha spelet */ }
    },
  };
}
