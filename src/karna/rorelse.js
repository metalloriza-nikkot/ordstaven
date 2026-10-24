// @ts-check
// Rörelse för en figur i ett rum. Positionen är figurens fötter (mitten nertill), som i spel snett uppifrån.
import { RUM } from './skalning.js';

export const FIGUR = Object.freeze({ bredd: 16, hojd: 24, fart: 80 }); // fart i rumspixlar per sekund

/**
 * @param {{ x: number, y: number }} pos
 * @param {{ riktning: { x: number, y: number }, gaTill: { x: number, y: number } | null }} styr
 * @param {number} dt sekunder
 * @returns {{ x: number, y: number, framme: boolean }} ny position, och om gå-till-målet är nått
 */
export function steg(pos, styr, dt, fart = FIGUR.fart) {
  let { x, y } = pos;
  let framme = false;
  const d = Math.min(dt, 0.1) * fart; // tak för dt så att en hackande bildruta inte teleporterar figuren
  if (styr.riktning.x || styr.riktning.y) {
    x += styr.riktning.x * d; y += styr.riktning.y * d;
  } else if (styr.gaTill) {
    const mal = begransa(styr.gaTill);
    const dx = mal.x - x, dy = mal.y - y, l = Math.hypot(dx, dy);
    if (l <= d) { x = mal.x; y = mal.y; framme = true; }
    else { x += (dx / l) * d; y += (dy / l) * d; }
  }
  const b = begransa({ x, y });
  return { x: b.x, y: b.y, framme };
}

/** Håll figuren helt inne i rummet. @param {{ x: number, y: number }} p */
export function begransa(p) {
  const halv = FIGUR.bredd / 2;
  return {
    x: Math.min(RUM.bredd - halv, Math.max(halv, p.x)),
    y: Math.min(RUM.hojd, Math.max(FIGUR.hojd, p.y)),
  };
}
