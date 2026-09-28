import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor packaging config for the IDGate native shell.
 *
 * The web build is already native-friendly: `vite.config.ts` uses `base: './'`
 * (relative asset URLs work under `capacitor://` / `file://`) and the app uses
 * `HashRouter`, so no server config is needed — Capacitor serves the bundled
 * `dist/` directly. Run `npm run cap:sync` to (re)build the web app and copy it
 * into the native projects. See CAPACITOR.md for the full runbook.
 */
const config: CapacitorConfig = {
  appId: 'io.github.mhisham744.idgate',
  appName: 'IDGate',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // We hide the splash manually in src/native.ts as soon as the bundle runs
      // (the web view restores the dark theme pre-paint), so keep the native hold
      // minimal to avoid a white flash for dark-mode users. A fully theme-matched
      // launch screen needs per-platform assets — see CAPACITOR.md.
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
}

export default config
