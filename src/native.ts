import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { useTheme, type Theme } from './theme'

/**
 * Native-only bootstrap. Guarded by `Capacitor.isNativePlatform()` so the exact
 * same bundle runs unchanged in the browser (GitHub Pages) and inside the iOS /
 * Android shells. On web this is a no-op — the plugin calls are never reached.
 *
 * The web layout already draws under the notch via `env(safe-area-inset-*)`
 * (see index.html `viewport-fit=cover` and AppShell), so we let the status bar
 * overlay the web view. Because it overlays, the pixels behind the notch are the
 * AppShell root background, which is near-white in the light theme and near-black
 * in dark — so the status-bar icon style must track the app theme, or the clock
 * and battery icons wash out. We set it from the persisted theme at launch and
 * subscribe to the store so a runtime Appearance toggle re-applies it.
 */

// Style.Light = dark icons (for a light backdrop); Style.Dark = light icons (dark backdrop).
const styleFor = (theme: Theme) => (theme === 'dark' ? Style.Dark : Style.Light)

export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return

  // Draw behind the status bar; our safe-area insets already reserve the space.
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})

  const apply = (theme: Theme) => StatusBar.setStyle({ style: styleFor(theme) }).catch(() => {})
  apply(useTheme.getState().theme) // initial (respects a persisted dark preference)
  useTheme.subscribe((s) => apply(s.theme)) // re-apply when the user toggles Appearance

  // Hide the splash once the web view has taken over.
  SplashScreen.hide().catch(() => {})
}
