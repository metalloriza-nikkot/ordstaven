// Webbläsartester. Testmatrisen beskrivs i docs/testmatris.md.
// Lokalt i en miljö utan Playwrights egna webbläsare: PW_CHROMIUM=/sökväg/till/chromium kör bara Chromium-projekten.
import { defineConfig } from '@playwright/test';

const lokalChromium = process.env.PW_CHROMIUM;
const chromium = (namn, opt) => ({
  name: namn,
  use: {
    browserName: 'chromium',
    ...opt,
    ...(lokalChromium ? { launchOptions: { executablePath: lokalChromium, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } : {}),
  },
});
const ipad = (namn, bredd, hojd) => ({
  name: namn,
  use: {
    browserName: 'webkit', viewport: { width: bredd, height: hojd }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
});

const alla = [
  chromium('mac-helskarm', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }),
  chromium('mac-lister', { viewport: { width: 1280, height: 700 }, deviceScaleFactor: 2 }),
  { name: 'mac-safari', use: { browserName: 'webkit', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
  chromium('win-1080', { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }),
  chromium('win-125', { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 }),
  chromium('win-liten', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }),
  chromium('smalt-fonster', { viewport: { width: 1000, height: 625 }, deviceScaleFactor: 1 }),
  ipad('ipad-10', 1180, 820),
  ipad('ipad-43', 1080, 810),
  ipad('ipad-mini', 1133, 744),
];

export default defineConfig({
  testDir: 'tests/webb',
  outputDir: 'test-results',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  // 'github' gör varje fel till en anteckning på körningen, läsbar via GitHubs API.
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/ordstaven/', serviceWorkers: 'allow' },
  projects: lokalChromium ? alla.filter((p) => p.use.browserName === 'chromium') : alla,
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/ordstaven/',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
