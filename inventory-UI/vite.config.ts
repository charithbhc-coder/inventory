import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: '/inventory/',
  define: {
    // Inject version from package.json so Sidebar reads it dynamically
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== 'production' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',
      workbox: {
        // Precache all static assets including the manifest itself
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // Serve index.html for all navigation requests within /inventory/
        navigateFallback: '/inventory/index.html',
        // Do NOT intercept API, uploads, or socket requests with the SW
        navigateFallbackDenylist: [
          /^\/inventory-api/,
          /^\/uploads/,
          /^\/socket\.io/,
        ],
        // Only handle navigation within the app's base path
        navigateFallbackAllowlist: [/^\/inventory/],
        // Clean up old caches on SW activation
        cleanupOutdatedCaches: true,
        // Skip waiting so the new SW takes over immediately after update
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 4000000,
      },
      manifest: {
        name: 'KTMG Vault',
        short_name: 'KTMG Vault',
        description: 'Advanced Inventory & Asset Management System',
        theme_color: '#1b475d',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/inventory/',
        start_url: '/inventory/',
        icons: [
          {
            src: 'pwa-192x192.png?v=3',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/inventory-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})