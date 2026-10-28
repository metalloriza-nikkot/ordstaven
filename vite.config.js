import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: '/ordstaven/',
  define: {
    __VERSION__: JSON.stringify(paket.version),
  },
  build: {
    // Golvet är Safari 15 (macOS Monterey) och iPadOS 15.
    target: ['es2020', 'safari15'],
    chunkSizeWarningLimit: 2000,
    // två sidor: spelet och provsidan för textgrammatiken (beslut 13.3)
    rollupOptions: { input: { main: 'index.html', textprov: 'textprov.html' } },
  },
  test: {
    include: ['tests/enhet/**/*.test.js'],
  },
  plugins: [
    VitePWA({
      // Nya versioner tas i bruk bara när spelet startar, aldrig mitt i spelet (src/grans/uppdatering.js).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'ORDSTAVEN: DEN GÖMDA DALEN',
        short_name: 'ORDSTAVEN',
        lang: 'sv',
        start_url: '/ordstaven/',
        scope: '/ordstaven/',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#2a1d16',
        theme_color: '#2a1d16',
        icons: [
          { src: 'icons/ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/ikon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/ikon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'ordstaven',
        // Allt som byggs förcachas: sidan, skript, typsnitt, bilder, kartor, data, ljud.
        globPatterns: ['**/*.{html,js,css,png,svg,json,tmj,woff2,webmanifest,ogg,mp3,m4a}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // provsidan och dess ramar (textprov.html?form=…) ska aldrig få spelet i stället
        navigateFallbackDenylist: [/textprov/],
      },
    }),
  ],
});
