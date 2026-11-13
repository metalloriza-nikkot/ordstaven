// Testerna styr spelets klocka (beslut 84.6): Playwrights klocka ersätter Date, setTimeout och requestAnimationFrame
// i sidan, och page.waitForTimeout(ms) spolar fram spelet ms i stället för att vänta i verklig tid. På en långsam
// maskin (iPad i CI) får spelet då lika många bildrutor och timrar som på en snabb, och testet väntar inte i onödan.
// Väntan på något som kommer utifrån (bilder som laddas, ett tryck) görs med expect.poll eller waitForFunction,
// som går i verklig tid medan spelets klocka går som vanligt.
import { test as bas, expect } from '@playwright/test';

export const test = bas.extend({
  page: async ({ page }, anvand) => {
    if (process.env.PW_VERKLIG_TID) { await anvand(page); return; } // för att jämföra med det gamla sättet
    await page.clock.install();
    page.waitForTimeout = (ms) => page.clock.runFor(ms);
    await anvand(page);
  },
});
export { expect };
