import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

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
        source: JSON.stringify({ buildId: BUILD_ID }),
      })
    },
  }
}

export default defineConfig({
  // Relative base → the static build works from any host path
  // (root domain, Netlify/Vercel, or a GitHub Pages project subpath).
  base: './',
  plugins: [react(), buildVersion()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
})
