import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/**
 * Native-only bootstrap. Guarded by `Capacitor.isNativePlatform()` so the exact
 * same bundle runs unchanged in the browser (GitHub Pages) and inside the iOS /
 * Android shells. On web this is a no-op — the plugin calls are never reached.
 *
 * The web layout already draws under the notch via `env(safe-area-inset-*)`
 * (see index.html `viewport-fit=cover` and AppShell), so we let the status bar
 * overlay the web view. Icon contrast is set reactively by `applyStatusBarStyle`
 * (called from App), because what sits behind the notch depends on both the
 * theme and the auth state.
 */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return

  // Draw behind the status bar; our safe-area insets already reserve the space.
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})

  // Hide the splash once the web view has taken over.
  SplashScreen.hide().catch(() => {})
}

/**
 * Match status-bar icon contrast to the backdrop currently behind the notch.
 * `darkBackdrop` true → light icons (Style.Dark); false → dark icons (Style.Light).
 * No-op on web. The logged-out Onboarding screen always shows the dark brand
 * gradient, while the signed-in shell shows the theme surface (light in light mode),
 * so App drives this from `!signedIn || theme === 'dark'`.
 */
export function applyStatusBarStyle(darkBackdrop: boolean): void {
  if (!Capacitor.isNativePlatform()) return
  StatusBar.setStyle({ style: darkBackdrop ? Style.Dark : Style.Light }).catch(() => {})
}
