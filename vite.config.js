import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages serveert de app onder /<repo>/; de workflow geeft dat pad mee.
const base = process.env.BASE_PATH ?? '/viltje/';

export default defineConfig({
  base,
  define: {
    __VERSIE__: JSON.stringify(`${pkg.version} (${new Date().toISOString().slice(0, 10)})`),
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['viltje.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Viltje',
        short_name: 'Viltje',
        description: 'Strepen bijhouden bij toepen',
        lang: 'nl',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#9E2333',
        background_color: '#2B1A14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
