import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// Semantic app version (source of truth: package.json) — shown in-app and tagged
// per deploy (see CHANGELOG.md).
const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

// Unique per build — stamped into index.html and emitted as version.json so the
// web app can detect a stale cached bundle and reload (see index.html).
const BUILD_ID = String(Date.now())

/** Stamps BUILD_ID into index.html and emits dist/version.json alongside it. */
function buildVersion() {
  return {
    name: 'idgate-build-version',
    transformIndexHtml(html: string) {
      return html.replace(/__BUILD_ID__/g, BUILD_ID)
    },
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID, version: APP_VERSION }),
      })
    },
  }
}

export default defineConfig({
  // Relative base → the static build works from any host path
  // (root domain, Netlify/Vercel, or a GitHub Pages project subpath).
  base: './',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react(), buildVersion()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
})
