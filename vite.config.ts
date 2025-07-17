import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      short_name: 'CalTrack',
      name: 'Calorie Tracker PWA',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      start_url: '.',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#4caf50',
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
    },
    srcDir: 'src',
    filename: 'sw.js',
  })],
})
